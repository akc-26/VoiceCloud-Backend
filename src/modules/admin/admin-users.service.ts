import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Badge } from '../users/entities/badge.entity';
import { UserSettings } from '../users/entities/user-settings.entity';
import { QueryAdminUsersDto } from './dto/query-admin-users.dto';
import { AdminAdjustLevelDto, CreateBadgeDto } from '../users/dto/admin-user-management.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Badge)
    private readonly badgeRepository: Repository<Badge>,
    @InjectRepository(UserSettings)
    private readonly settingsRepository: Repository<UserSettings>,
  ) {}

  async findAllUsers(query: QueryAdminUsersDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.userRepository.createQueryBuilder('user');

    if (query.search && query.search.trim() !== '') {
      const search = query.search.trim().toLowerCase();
      qb.where(
        '(LOWER(user.username) LIKE :search OR LOWER(user.displayName) LIKE :search OR LOWER(user.email) LIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('user.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }
    return user;
  }

  async updateUser(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.findUserById(id);
    Object.assign(user, updateData);
    return this.userRepository.save(user);
  }

  async deleteUser(id: string): Promise<{ message: string; id: string }> {
    const user = await this.findUserById(id);
    await this.userRepository.remove(user);
    return { message: 'User deleted successfully', id };
  }

  // Level & EXP Management
  async adjustUserLevel(userId: string, dto: AdminAdjustLevelDto): Promise<User> {
    const user = await this.findUserById(userId);
    if (dto.type === 'wealth') {
      user.wealthLevel = dto.level;
      if (dto.exp !== undefined) {
        user.wealthExp = dto.exp;
      }
    } else if (dto.type === 'charm') {
      user.charmLevel = dto.level;
      if (dto.exp !== undefined) {
        user.charmExp = dto.exp;
      }
    }
    return this.userRepository.save(user);
  }

  // Badge Definition & Assignment
  async createBadge(dto: CreateBadgeDto): Promise<Badge> {
    const existing = await this.badgeRepository.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new BadRequestException(`Badge code '${dto.code}' already exists`);
    }
    const badge = this.badgeRepository.create(dto);
    return this.badgeRepository.save(badge);
  }

  async getAllBadges(): Promise<Badge[]> {
    return this.badgeRepository.find({ order: { createdAt: 'DESC' } });
  }

  async assignBadgeToUser(userId: string, badgeCode: string): Promise<User> {
    const user = await this.findUserById(userId);
    const badges = user.badges || [];
    if (!badges.includes(badgeCode)) {
      badges.push(badgeCode);
      user.badges = badges;
      await this.userRepository.save(user);
    }
    return user;
  }

  async revokeBadgeFromUser(userId: string, badgeCode: string): Promise<User> {
    const user = await this.findUserById(userId);
    let badges = user.badges || [];
    badges = badges.filter((b) => b !== badgeCode);
    user.badges = badges;
    return this.userRepository.save(user);
  }

  // Settings & Privacy Management
  async getUserSettings(userId: string): Promise<UserSettings> {
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

