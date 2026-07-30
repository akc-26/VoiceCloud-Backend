import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from './entities/user.entity';
import { Follow } from './entities/follow.entity';
import { CreatorSubscription } from './entities/creator-subscription.entity';
import { CreatorPayoutRequest } from './entities/creator-payout-request.entity';
import { CreatorPlan } from './entities/creator-plan.entity';
import { StorageService } from '../storage/storage.service';
import { MediaCategory } from '../storage/enums/media-category.enum';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePrivacySettingsDto } from './dto/update-privacy-settings.dto';
import { AddExperienceDto, ExperienceType } from './dto/experience.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import {
  SubscriptionStatus,
  PayoutStatus,
  PayoutMethod,
} from '../../common/enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(CreatorSubscription)
    private readonly creatorSubscriptionRepository: Repository<CreatorSubscription>,
    @InjectRepository(CreatorPayoutRequest)
    private readonly creatorPayoutRepository: Repository<CreatorPayoutRequest>,
    @InjectRepository(CreatorPlan)
    private readonly creatorPlanRepository: Repository<CreatorPlan>,
    private readonly storageService: StorageService,
  ) {}

  // =================== CORE USER METHODS ===================

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async getProfile(id: string): Promise<User> {
    return this.findById(id);
  }

  async findByUsername(username: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }

  async findByPhone(phoneNumber: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { phoneNumber } });
    if (!user) {
      throw new NotFoundException(`User with phone ${phoneNumber} not found`);
    }
    return user;
  }

  async create(userData: Partial<User>): Promise<User> {
    if (!userData.referralCode) {
      userData.referralCode =
        'VC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    const user = this.userRepository.create(userData);
    return await this.userRepository.save(user);
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, userData);
    return await this.userRepository.save(user);
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findById(id);
    if (dto.username && dto.username !== user.username) {
      const existing = await this.userRepository.findOne({
        where: { username: dto.username },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Username is already taken');
      }
    }
    Object.assign(user, dto);
    user.profileCompletion = this.calculateProfileCompletion(user);
    return await this.userRepository.save(user);
  }

  // =================== AVATAR MANAGEMENT ===================

  async updateAvatar(id: string, file: Express.Multer.File): Promise<User> {
    const user = await this.findById(id);
    const media = await this.storageService.uploadFile(
      file,
      { category: MediaCategory.AVATAR },
      id,
    );
    user.avatarUrl = media.publicUrl;
    user.profileCompletion = this.calculateProfileCompletion(user);
    return await this.userRepository.save(user);
  }

  async uploadAvatar(id: string, file: Express.Multer.File): Promise<User> {
    return this.updateAvatar(id, file);
  }

  async replaceAvatar(id: string, file: Express.Multer.File): Promise<User> {
    return this.updateAvatar(id, file);
  }

  async deleteAvatar(id: string): Promise<User> {
    const user = await this.findById(id);
    user.avatarUrl = null;
    user.profileCompletion = this.calculateProfileCompletion(user);
    return await this.userRepository.save(user);
  }

  async getAvatarMetadata(id: string) {
    const user = await this.findById(id);
    return {
      userId: user.id,
      avatarUrl: user.avatarUrl,
      updatedAt: user.updatedAt,
    };
  }

  // =================== COVER MANAGEMENT ===================

  async uploadCover(id: string, file: Express.Multer.File): Promise<User> {
    const user = await this.findById(id);
    const media = await this.storageService.uploadFile(
      file,
      { category: MediaCategory.ANNOUNCEMENT_BANNER },
      id,
    );
    user.coverUrl = media.publicUrl;
    user.profileCompletion = this.calculateProfileCompletion(user);
    return await this.userRepository.save(user);
  }

  async replaceCover(id: string, file: Express.Multer.File): Promise<User> {
    return this.uploadCover(id, file);
  }

  async deleteCover(id: string): Promise<User> {
    const user = await this.findById(id);
    user.coverUrl = null;
    user.profileCompletion = this.calculateProfileCompletion(user);
    return await this.userRepository.save(user);
  }

  // =================== PRIVACY SETTINGS ===================

  async getPrivacySettings(userId: string) {
    const user = await this.findById(userId);
    return (
      user.privacySettings || {
        showOnlineStatus: true,
        showLastSeen: true,
        allowDirectMessages: true,
        showGifts: true,
      }
    );
  }

  async updatePrivacySettings(userId: string, dto: UpdatePrivacySettingsDto) {
    const user = await this.findById(userId);
    const current = user.privacySettings || {
      showOnlineStatus: true,
      showLastSeen: true,
      allowDirectMessages: true,
      showGifts: true,
    };
    user.privacySettings = { ...current, ...dto };
    return await this.userRepository.save(user);
  }

  // =================== GAMIFICATION & EXP ===================

  async addExperience(userId: string, dto: AddExperienceDto) {
    const user = await this.findById(userId);
    if (dto.type === ExperienceType.WEALTH) {
      user.wealthExp = (user.wealthExp || 0) + dto.amount;
      user.wealthLevel = Math.min(100, Math.floor(user.wealthExp / 500) + 1);
    } else if (dto.type === ExperienceType.CHARM) {
      user.charmExp = (user.charmExp || 0) + dto.amount;
      user.charmLevel = Math.min(100, Math.floor(user.charmExp / 500) + 1);
    }
    await this.userRepository.save(user);
    return {
      userId: user.id,
      wealthLevel: user.wealthLevel,
      wealthExp: user.wealthExp,
      wealthTitle: this.getWealthTitle(user.wealthLevel),
      charmLevel: user.charmLevel,
      charmExp: user.charmExp,
      charmTitle: this.getCharmTitle(user.charmLevel),
    };
  }

  async assignBadge(userId: string, badge: string) {
    const user = await this.findById(userId);
    const badges = user.badges || [];
    if (!badges.includes(badge)) {
      badges.push(badge);
      user.badges = badges;
      await this.userRepository.save(user);
    }
    return { userId: user.id, badges: user.badges };
  }

  async removeBadge(userId: string, badge: string) {
    const user = await this.findById(userId);
    let badges = user.badges || [];
    badges = badges.filter((b) => b !== badge);
    user.badges = badges;
    await this.userRepository.save(user);
    return { userId: user.id, badges: user.badges };
  }

  // =================== FOLLOW & SOCIAL ===================

  async follow(followerId: string, followingId: string): Promise<Follow> {
    if (followerId === followingId) {
      throw new BadRequestException('Users cannot follow themselves');
    }
    const existing = await this.followRepository.findOne({
      where: { followerId, followingId },
    });
    if (existing) {
      return existing;
    }
    const follow = this.followRepository.create({ followerId, followingId });
    const saved = await this.followRepository.save(follow);

    // Update user stats counters
    const followerCount = await this.followRepository.count({
      where: { followingId },
    });
    const followingCount = await this.followRepository.count({
      where: { followerId },
    });
    await this.userRepository.update(followingId, {
      followersCount: followerCount,
    });
    await this.userRepository.update(followerId, { followingCount });

    return saved;
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    await this.followRepository.delete({ followerId, followingId });

    const followerCount = await this.followRepository.count({
      where: { followingId },
    });
    const followingCount = await this.followRepository.count({
      where: { followerId },
    });
    await this.userRepository.update(followingId, {
      followersCount: followerCount,
    });
    await this.userRepository.update(followerId, { followingCount });
  }

  async getFollowers(userId: string): Promise<User[]> {
    const follows = await this.followRepository.find({
      where: { followingId: userId },
    });
    const ids = follows.map((f) => f.followerId);
    if (ids.length === 0) return [];
    return await this.userRepository.find({ where: { id: In(ids) } });
  }

  async getFollowing(userId: string): Promise<User[]> {
    const follows = await this.followRepository.find({
      where: { followerId: userId },
    });
    const ids = follows.map((f) => f.followingId);
    if (ids.length === 0) return [];
    return await this.userRepository.find({ where: { id: In(ids) } });
  }

  async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await this.userRepository.update(userId, {
      isOnline,
      lastActiveAt: new Date(),
    });
  }

  async updateLocation(
    userId: string,
    latitude: number,
    longitude: number,
    city?: string,
    country?: string,
  ): Promise<void> {
    if (country) {
      await this.userRepository.update(userId, { country });
    }
  }

  // =================== CALCULATIONS & PROFILES ===================

  calculateProfileCompletion(user: User): number {
    const fields = [
      user.displayName,
      user.username,
      user.bio,
      user.statusMessage,
      user.gender,
      user.avatarUrl,
      user.coverUrl,
      user.country,
      user.interests && user.interests.length > 0,
      user.socialLinks && Object.keys(user.socialLinks).length > 0,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }

  getWealthTitle(level: number): string {
    if (level < 6) return 'Citizen';
    if (level < 16) return 'Baron';
    if (level < 31) return 'Viscount';
    if (level < 51) return 'Earl';
    if (level < 76) return 'Duke';
    if (level < 100) return 'Prince';
    return 'King';
  }

  getCharmTitle(level: number): string {
    if (level < 6) return 'Newcomer';
    if (level < 16) return 'Attractive';
    if (level < 31) return 'Popular';
    if (level < 51) return 'Star';
    if (level < 76) return 'Idol';
    if (level < 100) return 'Legend';
    return 'Goddess';
  }

  async getProfileWithStats(targetUserId: string, currentUserId?: string) {
    const user = await this.findById(targetUserId);

    const followersCount = await this.followRepository.count({
      where: { followingId: targetUserId },
    });
    const followingCount = await this.followRepository.count({
      where: { followerId: targetUserId },
    });

    let isFollowing = false;
    let isFollowedBy = false;

    if (currentUserId && currentUserId !== targetUserId) {
      const followExisting = await this.followRepository.findOne({
        where: { followerId: currentUserId, followingId: targetUserId },
      });
      isFollowing = !!followExisting;

      const followedByExisting = await this.followRepository.findOne({
        where: { followerId: targetUserId, followingId: currentUserId },
      });
      isFollowedBy = !!followedByExisting;
    }

    const completion = this.calculateProfileCompletion(user);

    const privacy = user.privacySettings || {
      showOnlineStatus: true,
      showLastSeen: true,
      allowDirectMessages: true,
      showGifts: true,
    };

    const isSelf = currentUserId === targetUserId;

    return {
      ...user,
      isOnline: isSelf || privacy.showOnlineStatus ? user.isOnline : false,
      lastActiveAt: isSelf || privacy.showLastSeen ? user.lastActiveAt : null,
      profileCompletionPercentage: completion,
      wealthLevel: user.wealthLevel || 1,
      wealthExp: user.wealthExp || 0,
      wealthTitle: this.getWealthTitle(user.wealthLevel || 1),
      charmLevel: user.charmLevel || 1,
      charmExp: user.charmExp || 0,
      charmTitle: this.getCharmTitle(user.charmLevel || 1),
      badges: user.badges || [],
      customTags: user.customTags || [],
      relationship: {
        isFollowing,
        isFollowedBy,
        isMutual: isFollowing && isFollowedBy,
      },
      stats: {
        followersCount: user.followersCount || followersCount,
        followingCount: user.followingCount || followingCount,
        badgesCount:
          (user.badges ? user.badges.length : 0) + (user.vipBadge ? 1 : 0),
        visitorsCount: user.popularityScore || 0,
      },
    };
  }

  async getProfileStats(userId: string) {
    return this.getProfileWithStats(userId);
  }

  // =================== SEARCH & ADMIN ===================

  async searchUsersAdvanced(dto: SearchUsersDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.userRepository.createQueryBuilder('u');

    if (dto.query) {
      query.andWhere(
        '(u.username ILIKE :q OR u.displayName ILIKE :q OR u.email ILIKE :q OR u.bio ILIKE :q)',
        { q: `%${dto.query}%` },
      );
    }

    if (dto.country) {
      query.andWhere('u.country = :country', { country: dto.country });
    }

    if (dto.isVerified !== undefined) {
      query.andWhere('u.isVerified = :isVerified', {
        isVerified: dto.isVerified,
      });
    }

    if (dto.minLevel !== undefined) {
      query.andWhere(
        '(u.wealthLevel >= :minLevel OR u.charmLevel >= :minLevel)',
        {
          minLevel: dto.minLevel,
        },
      );
    }

    if (dto.maxLevel !== undefined) {
      query.andWhere(
        '(u.wealthLevel <= :maxLevel AND u.charmLevel <= :maxLevel)',
        {
          maxLevel: dto.maxLevel,
        },
      );
    }

    query.skip(skip).take(limit).orderBy('u.popularityScore', 'DESC');

    const [items, total] = await query.getManyAndCount();
    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async searchUsers(queryStr: string, filters?: any) {
    return this.searchUsersAdvanced({
      query: queryStr,
      country: filters?.country,
      isVerified: filters?.isVerified,
      page: 1,
      limit: 30,
    });
  }

  async adminGetUsers(page = 1, limit = 10, search?: string, status?: string) {
    const query = this.userRepository.createQueryBuilder('u');

    if (search) {
      query.andWhere(
        '(u.username ILIKE :s OR u.email ILIKE :s OR u.displayName ILIKE :s)',
        { s: `%${search}%` },
      );
    }

    if (status === 'verified') query.andWhere('u.isVerified = true');

    query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('u.createdAt', 'DESC');

    const [items, total] = await query.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async adminVerifyUser(
    userId: string,
    isVerified: boolean,
    badge?: string,
    category?: string,
  ) {
    const user = await this.findById(userId);
    user.isVerified = isVerified;
    if (badge) user.vipBadge = badge;
    if (category) user.creatorCategory = category;
    return await this.userRepository.save(user);
  }

  // =================== CREATOR SUBSCRIPTION METHODS ===================

  async getCreatorSubscription(
    subscriberId: string,
    creatorId: string,
  ): Promise<CreatorSubscription | null> {
    return await this.creatorSubscriptionRepository.findOne({
      where: { subscriberId, creatorId, status: SubscriptionStatus.ACTIVE },
    });
  }

  async createCreatorSubscription(
    subscriberId: string,
    creatorId: string,
    planId: string,
  ): Promise<CreatorSubscription> {
    const sub = this.creatorSubscriptionRepository.create({
      subscriberId,
      creatorId,
      planId,
      status: SubscriptionStatus.ACTIVE,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    return await this.creatorSubscriptionRepository.save(sub);
  }

  async requestCreatorPayout(
    creatorId: string,
    amount: number,
    method: PayoutMethod,
    accountDetails: Record<string, unknown>,
  ): Promise<CreatorPayoutRequest> {
    const req = this.creatorPayoutRepository.create({
      creatorId,
      payoutAmount: amount,
      payoutMethod: method || PayoutMethod.BANK_TRANSFER,
      accountDetails,
      status: PayoutStatus.PENDING,
    });
    return await this.creatorPayoutRepository.save(req);
  }

  async getCreatorPayoutRequests(
    creatorId: string,
  ): Promise<CreatorPayoutRequest[]> {
    return await this.creatorPayoutRepository.find({
      where: { creatorId },
      order: { createdAt: 'DESC' },
    });
  }

  async getCreatorPlans(): Promise<CreatorPlan[]> {
    return await this.creatorPlanRepository.find();
  }
}
