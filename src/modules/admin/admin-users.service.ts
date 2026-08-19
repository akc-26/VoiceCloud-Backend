import {
  Injectable,
  Optional,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { Badge } from '../users/entities/badge.entity';
import { UserSettings } from '../users/entities/user-settings.entity';
import { UserConnectionHistory } from '../users/entities/user-connection-history.entity';
import { QueryAdminUsersDto } from './dto/query-admin-users.dto';
import {
  AdminAdjustLevelDto,
  AdminCreateUserDto,
  AdminResetPasswordDto,
  CreateBadgeDto,
  UpdateBadgeDto,
} from '../users/dto/admin-user-management.dto';
import { UserRole } from '../../common/enums';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Badge)
    private readonly badgeRepository: Repository<Badge>,
    @InjectRepository(UserSettings)
    private readonly settingsRepository: Repository<UserSettings>,
    @Optional()
    @InjectRepository(UserConnectionHistory)
    private readonly connectionHistoryRepository?: Repository<UserConnectionHistory>,
  ) {}

  private sanitizeUser(user: User) {
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }

  private async findUserEntityById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user || user.role === UserRole.SUPER_ADMIN) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }
    return user;
  }

  async findAllUsers(query: QueryAdminUsersDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;
    const qb = this.userRepository.createQueryBuilder('user');

    // Admin user directory contains registered accounts only. SUPER_ADMIN is
    // managed exclusively from the Super Admin profile/security area.
    qb.where('user.isGuest = :isGuest', { isGuest: false });
    qb.andWhere('user.role != :superAdminRole', { superAdminRole: UserRole.SUPER_ADMIN });

    if (query.search?.trim()) {
      const search = query.search.trim().toLowerCase();
      qb.andWhere(
        '(LOWER(user.username) LIKE :search OR LOWER(user.displayName) LIKE :search OR LOWER(user.email) LIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    qb.orderBy('user.createdAt', 'DESC').skip(skip).take(limit);
    const [entities, total] = await qb.getManyAndCount();
    return {
      data: entities.map((user) => this.sanitizeUser(user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async createUser(dto: AdminCreateUserDto) {
    const username = dto.username.trim();
    const email = dto.email.trim().toLowerCase();
    const existing = await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.username) = LOWER(:username)', { username })
      .orWhere('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
    if (existing) throw new BadRequestException('Username or email already exists');

    const user = this.userRepository.create({
      username,
      displayName: dto.displayName.trim(),
      email,
      phoneNumber: dto.phoneNumber?.trim() || undefined,
      country: dto.country?.trim() || undefined,
      preferredLanguage: dto.preferredLanguage?.trim() || 'en',
      role: dto.role,
      isGuest: false,
      isCreatorEnabled: dto.role === UserRole.CREATOR,
      passwordHash: await bcrypt.hash(dto.password, 12),
      failedLoginAttempts: 0,
      lockoutUntil: undefined,
    });
    const saved = await this.userRepository.save(user);
    return this.sanitizeUser(saved);
  }

  async findUserById(id: string) {
    return this.sanitizeUser(await this.findUserEntityById(id));
  }

  async updateUser(id: string, updateData: Partial<User>) {
    const user = await this.findUserEntityById(id);
    // Authentication secrets and SUPER_ADMIN promotion cannot be changed through
    // the general profile patch endpoint.
    delete (updateData as any).passwordHash;
    delete (updateData as any).failedLoginAttempts;
    delete (updateData as any).lockoutUntil;
    if ((updateData as any).role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('SUPER_ADMIN role is managed from the Super Admin profile only');
    }
    Object.assign(user, updateData);
    return this.sanitizeUser(await this.userRepository.save(user));
  }

  async resetPassword(id: string, dto: AdminResetPasswordDto) {
    const user = await this.findUserEntityById(id);
    user.passwordHash = await bcrypt.hash(dto.password, 12);
    user.failedLoginAttempts = 0;
    user.lockoutUntil = undefined;
    await this.userRepository.save(user);
    return { success: true, userId: user.id, message: 'Password reset successfully' };
  }

  async deleteUser(id: string): Promise<{ message: string; id: string }> {
    const user = await this.findUserEntityById(id);
    await this.userRepository.remove(user);
    return { message: 'User deleted successfully', id };
  }

  async adjustUserLevel(userId: string, dto: AdminAdjustLevelDto) {
    const user = await this.findUserEntityById(userId);
    if (dto.type === 'wealth') {
      user.wealthLevel = dto.level;
      if (dto.exp !== undefined) user.wealthExp = dto.exp;
    } else {
      user.charmLevel = dto.level;
      if (dto.exp !== undefined) user.charmExp = dto.exp;
    }
    return this.sanitizeUser(await this.userRepository.save(user));
  }

  async createBadge(dto: CreateBadgeDto): Promise<Badge> {
    const existing = await this.badgeRepository.findOne({ where: { code: dto.code } });
    if (existing) throw new BadRequestException(`Badge code '${dto.code}' already exists`);
    return this.badgeRepository.save(this.badgeRepository.create(dto));
  }

  async getAllBadges(): Promise<Badge[]> {
    return this.badgeRepository.find({ order: { createdAt: 'DESC' } });
  }

  async updateBadge(id: string, dto: UpdateBadgeDto): Promise<Badge> {
    const badge = await this.badgeRepository.findOne({ where: { id } });
    if (!badge) throw new NotFoundException('Badge not found');
    Object.assign(badge, dto);
    return this.badgeRepository.save(badge);
  }

  async deleteBadge(id: string) {
    const badge = await this.badgeRepository.findOne({ where: { id } });
    if (!badge) throw new NotFoundException('Badge not found');
    const users = await this.userRepository.createQueryBuilder('user')
      .where('user.badges IS NOT NULL')
      .getMany();
    const affected = users.filter((user) => Array.isArray(user.badges) && user.badges.includes(badge.code));
    for (const user of affected) {
      user.badges = user.badges.filter((code) => code !== badge.code);
    }
    if (affected.length) await this.userRepository.save(affected);
    await this.badgeRepository.remove(badge);
    return { success: true, id, code: badge.code, removedAssignments: affected.length };
  }

  async assignBadgeToUser(userId: string, badgeCode: string) {
    const user = await this.findUserEntityById(userId);
    const badge = await this.badgeRepository.findOne({ where: { code: badgeCode } });
    if (!badge || !badge.isActive) throw new BadRequestException('Badge is not active or does not exist');
    const badges = user.badges || [];
    if (!badges.includes(badgeCode)) {
      user.badges = [...badges, badgeCode];
      await this.userRepository.save(user);
    }
    return this.sanitizeUser(user);
  }

  async revokeBadgeFromUser(userId: string, badgeCode: string) {
    const user = await this.findUserEntityById(userId);
    user.badges = (user.badges || []).filter((badge) => badge !== badgeCode);
    return this.sanitizeUser(await this.userRepository.save(user));
  }

  async getAuthenticationHistory(limit = 50) {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    if (!this.connectionHistoryRepository) return [];
    const rows = await this.connectionHistoryRepository.find({
      order: { createdAt: 'DESC' },
      take: safeLimit,
    });
    const userIds = [...new Set(rows.map((row) => row.userId).filter(Boolean))];
    const users = userIds.length
      ? await this.userRepository.createQueryBuilder('user')
          .where('user.id IN (:...userIds)', { userIds })
          .getMany()
      : [];
    const userMap = new Map(users.map((user) => [user.id, user]));
    return rows.map((row) => {
      const user = userMap.get(row.userId);
      return {
        ...row,
        userName: user?.displayName || user?.username || row.userId,
        username: user?.username || null,
      };
    });
  }

  async getUserSettings(userId: string): Promise<UserSettings> {
    await this.findUserEntityById(userId);
    let settings = await this.settingsRepository.findOne({ where: { userId } });
    if (!settings) {
      settings = this.settingsRepository.create({
        userId,
        messagingPermission: 'everyone',
        followPermission: 'everyone',
        invitationPermission: 'everyone',
        visitorPermission: 'everyone',
        allowVisitorTracking: true,
        anonymousVisiting: false,
        notificationPreferences: { email: true, push: true },
        language: 'en',
        theme: 'light',
        timezone: 'UTC',
      });
      await this.settingsRepository.save(settings);
    }
    return settings;
  }

  async updateUserSettings(userId: string, dto: Partial<UserSettings>): Promise<UserSettings> {
    const settings = await this.getUserSettings(userId);
    Object.assign(settings, dto);
    return this.settingsRepository.save(settings);
  }
}
