import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Follow } from './entities/follow.entity';
import { User } from './entities/user.entity';
import { BlockedUser } from '../moderation/entities/blocked-user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { EventsGateway } from '../../common/events/events.gateway';
import { QuerySocialDto } from './dto/query-social.dto';

@Injectable()
export class FollowsService {
  private readonly logger = new Logger(FollowsService.name);

  constructor(
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(BlockedUser)
    private readonly blockedUserRepository: Repository<BlockedUser>,
    private readonly notificationsService: NotificationsService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async followUser(followerId: string, targetUserId: string) {
    if (followerId === targetUserId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    // 1. Verify target user exists
    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException(`User with ID ${targetUserId} not found`);
    }

    // 2. Check if users are blocked
    const isBlocked = await this.blockedUserRepository.findOne({
      where: [
        { blockerId: followerId, blockedId: targetUserId },
        { blockerId: targetUserId, blockedId: followerId },
      ],
    });

    if (isBlocked) {
      throw new BadRequestException(
        'Cannot follow user due to privacy or blocking restrictions',
      );
    }

    // 3. Check duplicate follow
    const existingFollow = await this.followRepository.findOne({
      where: { followerId, followingId: targetUserId },
    });

    if (existingFollow) {
      throw new ConflictException('You are already following this user');
    }

    // 4. Create follow relationship
    const follow = this.followRepository.create({
      followerId,
      followingId: targetUserId,
    });
    await this.followRepository.save(follow);

    // 5. Update counts
    await this.userRepository.increment(
      { id: followerId },
      'followingCount',
      1,
    );
    await this.userRepository.increment(
      { id: targetUserId },
      'followersCount',
      1,
    );

    // Fetch updated stats
    const followerUser = await this.userRepository.findOne({
      where: { id: followerId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        followingCount: true,
      },
    });

    const updatedTargetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
      select: { id: true, followersCount: true },
    });

    // 6. Optional Notification
    try {
      await this.notificationsService.createNotification({
        userId: targetUserId,
        senderId: followerId,
        type: NotificationType.IN_APP,
        title: 'New Follower',
        message: `${followerUser?.displayName || 'A user'} started following you`,
        data: { followerId },
      });
    } catch (err) {
      this.logger.warn(`Failed to send follow notification: ${err}`);
    }

    // 7. WebSocket Events
    const followPayload = {
      followerId,
      followingId: targetUserId,
      createdAt: follow.createdAt,
    };

    this.eventsGateway.broadcastFollowAdded(followPayload);
    this.eventsGateway.broadcastFollowersUpdated({
      userId: targetUserId,
      followersCount: updatedTargetUser?.followersCount || 0,
    });
    this.eventsGateway.broadcastFollowingUpdated({
      userId: followerId,
      followingCount: followerUser?.followingCount || 0,
    });

    return {
      message: 'Successfully followed user',
      follow,
      isFollowing: true,
    };
  }

  async unfollowUser(followerId: string, targetUserId: string) {
    const existingFollow = await this.followRepository.findOne({
      where: { followerId, followingId: targetUserId },
    });

    if (!existingFollow) {
      throw new NotFoundException('Follow relationship does not exist');
    }

    await this.followRepository.remove(existingFollow);

    // Decrement counts safely
    const follower = await this.userRepository.findOne({
      where: { id: followerId },
    });
    if (follower && follower.followingCount > 0) {
      await this.userRepository.decrement(
        { id: followerId },
        'followingCount',
        1,
      );
    }

    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (targetUser && targetUser.followersCount > 0) {
      await this.userRepository.decrement(
        { id: targetUserId },
        'followersCount',
        1,
      );
    }

    const updatedFollower = await this.userRepository.findOne({
      where: { id: followerId },
      select: { id: true, followingCount: true },
    });

    const updatedTarget = await this.userRepository.findOne({
      where: { id: targetUserId },
      select: { id: true, followersCount: true },
    });

    // WebSocket events
    const payload = { followerId, followingId: targetUserId };
    this.eventsGateway.broadcastFollowRemoved(payload);
    this.eventsGateway.broadcastFollowersUpdated({
      userId: targetUserId,
      followersCount: updatedTarget?.followersCount || 0,
    });
    this.eventsGateway.broadcastFollowingUpdated({
      userId: followerId,
      followingCount: updatedFollower?.followingCount || 0,
    });

    return {
      message: 'Successfully unfollowed user',
      isFollowing: false,
    };
  }

  async getFollowers(userId: string, query: QuerySocialDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [follows, total] = await this.followRepository.findAndCount({
      where: { followingId: userId },
      order: { createdAt: query.sortOrder === 'ASC' ? 'ASC' : 'DESC' },
      skip,
      take: limit,
    });

    const followerIds = follows.map((f) => f.followerId);

    if (followerIds.length === 0) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    let qb = this.userRepository
      .createQueryBuilder('u')
      .where('u.id IN (:...followerIds)', { followerIds });

    if (query.search) {
      qb = qb.andWhere(
        '(u.username ILIKE :search OR u.displayName ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const users = await qb.getMany();

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getFollowing(userId: string, query: QuerySocialDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [follows, total] = await this.followRepository.findAndCount({
      where: { followerId: userId },
      order: { createdAt: query.sortOrder === 'ASC' ? 'ASC' : 'DESC' },
      skip,
      take: limit,
    });

    const followingIds = follows.map((f) => f.followingId);

    if (followingIds.length === 0) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    let qb = this.userRepository
      .createQueryBuilder('u')
      .where('u.id IN (:...followingIds)', { followingIds });

    if (query.search) {
      qb = qb.andWhere(
        '(u.username ILIKE :search OR u.displayName ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const users = await qb.getMany();

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getMutualFollowers(userId: string, query: QuerySocialDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Users following this user
    const followers = await this.followRepository.find({
      where: { followingId: userId },
      select: { followerId: true },
    });

    // Users this user follows
    const following = await this.followRepository.find({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followerSet = new Set(followers.map((f) => f.followerId));
    const mutualIds = following
      .map((f) => f.followingId)
      .filter((id) => followerSet.has(id));

    if (mutualIds.length === 0) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const total = mutualIds.length;
    const paginatedIds = mutualIds.slice(skip, skip + limit);

    let qb = this.userRepository
      .createQueryBuilder('u')
      .where('u.id IN (:...paginatedIds)', { paginatedIds });

    if (query.search) {
      qb = qb.andWhere(
        '(u.username ILIKE :search OR u.displayName ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const users = await qb.getMany();

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getFollowStats(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
        followersCount: true,
        followingCount: true,
        popularityScore: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const mutualCountRes = await this.getMutualFollowers(userId, {
      page: 1,
      limit: 1,
    });

    return {
      userId,
      followersCount: user.followersCount || 0,
      followingCount: user.followingCount || 0,
      mutualCount: mutualCountRes.total || 0,
      popularityScore: user.popularityScore || 0,
    };
  }

  async isFollowing(
    followerId: string,
    targetUserId: string,
  ): Promise<boolean> {
    const count = await this.followRepository.count({
      where: { followerId, followingId: targetUserId },
    });
    return count > 0;
  }
}
