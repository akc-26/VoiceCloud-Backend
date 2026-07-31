import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import {
  FriendRequest,
  FriendRequestStatus,
} from './entities/friend-request.entity';
import { UserFriend } from './entities/user-friend.entity';
import { User } from './entities/user.entity';
import { UserSettings } from './entities/user-settings.entity';
import {
  SendFriendRequestDto,
  UpdateFriendCategoryDto,
  NearbyUsersQueryDto,
} from './dto/friend.dto';

@Injectable()
export class FriendsService {
  private readonly logger = new Logger(FriendsService.name);

  constructor(
    @InjectRepository(FriendRequest)
    private readonly friendRequestRepository: Repository<FriendRequest>,
    @InjectRepository(UserFriend)
    private readonly userFriendRepository: Repository<UserFriend>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSettings)
    private readonly settingsRepository: Repository<UserSettings>,
  ) {}

  async sendFriendRequest(senderId: string, dto: SendFriendRequestDto) {
    if (senderId === dto.receiverId) {
      throw new BadRequestException('Cannot send a friend request to yourself');
    }

    const receiver = await this.userRepository.findOne({
      where: { id: dto.receiverId },
    });
    if (!receiver) {
      throw new NotFoundException('Receiver user not found');
    }

    // Check if already friends
    const existingFriend = await this.userFriendRepository.findOne({
      where: { userId: senderId, friendId: dto.receiverId },
    });
    if (existingFriend) {
      throw new ConflictException('You are already friends with this user');
    }

    // Check if request already pending
    const existingRequest = await this.friendRequestRepository.findOne({
      where: {
        senderId,
        receiverId: dto.receiverId,
        status: FriendRequestStatus.PENDING,
      },
    });
    if (existingRequest) {
      throw new ConflictException('Friend request is already pending');
    }

    const request = this.friendRequestRepository.create({
      senderId,
      receiverId: dto.receiverId,
      message: dto.message,
      category: dto.category || 'friends',
      status: FriendRequestStatus.PENDING,
    });

    await this.friendRequestRepository.save(request);
    return request;
  }

  async acceptFriendRequest(userId: string, requestId: string) {
    const request = await this.friendRequestRepository.findOne({
      where: {
        id: requestId,
        receiverId: userId,
        status: FriendRequestStatus.PENDING,
      },
    });

    if (!request) {
      throw new NotFoundException('Pending friend request not found');
    }

    request.status = FriendRequestStatus.ACCEPTED;
    await this.friendRequestRepository.save(request);

    // Create bidirectional friendship
    const friendEntry1 = this.userFriendRepository.create({
      userId: request.senderId,
      friendId: request.receiverId,
      category: request.category || 'friends',
    });

    const friendEntry2 = this.userFriendRepository.create({
      userId: request.receiverId,
      friendId: request.senderId,
      category: 'friends',
    });

    await this.userFriendRepository.save([friendEntry1, friendEntry2]);

    return { success: true, friendshipId: friendEntry2.id };
  }

  async rejectFriendRequest(userId: string, requestId: string) {
    const request = await this.friendRequestRepository.findOne({
      where: {
        id: requestId,
        receiverId: userId,
        status: FriendRequestStatus.PENDING,
      },
    });

    if (!request) {
      throw new NotFoundException('Pending friend request not found');
    }

    request.status = FriendRequestStatus.REJECTED;
    await this.friendRequestRepository.save(request);

    return { success: true };
  }

  async cancelFriendRequest(userId: string, requestId: string) {
    const request = await this.friendRequestRepository.findOne({
      where: {
        id: requestId,
        senderId: userId,
        status: FriendRequestStatus.PENDING,
      },
    });

    if (!request) {
      throw new NotFoundException('Pending friend request not found');
    }

    request.status = FriendRequestStatus.CANCELLED;
    await this.friendRequestRepository.save(request);

    return { success: true };
  }

  async getPendingRequests(userId: string) {
    const incoming = await this.friendRequestRepository.find({
      where: { receiverId: userId, status: FriendRequestStatus.PENDING },
      order: { createdAt: 'DESC' },
    });

    const outgoing = await this.friendRequestRepository.find({
      where: { senderId: userId, status: FriendRequestStatus.PENDING },
      order: { createdAt: 'DESC' },
    });

    const allSenderIds = incoming.map((r) => r.senderId);
    const allReceiverIds = outgoing.map((r) => r.receiverId);
    const allUserIds = Array.from(
      new Set([...allSenderIds, ...allReceiverIds]),
    );

    let userMap = new Map<string, Partial<User>>();
    if (allUserIds.length > 0) {
      const users = await this.userRepository.findBy({ id: In(allUserIds) });
      userMap = new Map(
        users.map((u) => [
          u.id,
          {
            id: u.id,
            username: u.username,
            displayName: u.displayName,
            avatarUrl: u.avatarUrl,
            wealthLevel: u.wealthLevel || 1,
            charmLevel: u.charmLevel || 1,
            isOnline: u.isOnline,
          },
        ]),
      );
    }

    return {
      incoming: incoming.map((r) => ({
        ...r,
        sender: userMap.get(r.senderId),
      })),
      outgoing: outgoing.map((r) => ({
        ...r,
        receiver: userMap.get(r.receiverId),
      })),
    };
  }

  async getFriendsList(
    userId: string,
    category?: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const query = this.userFriendRepository
      .createQueryBuilder('f')
      .where('f.userId = :userId', { userId });

    if (category) {
      query.andWhere('f.category = :category', { category });
    }

    query.orderBy('f.createdAt', 'DESC').skip(skip).take(limit);

    const [friends, total] = await query.getManyAndCount();
    const friendUserIds = friends.map((f) => f.friendId);

    let userMap = new Map<string, Partial<User>>();
    if (friendUserIds.length > 0) {
      const users = await this.userRepository.findBy({ id: In(friendUserIds) });
      userMap = new Map(
        users.map((u) => [
          u.id,
          {
            id: u.id,
            username: u.username,
            displayName: u.displayName,
            avatarUrl: u.avatarUrl,
            statusMessage: u.statusMessage,
            wealthLevel: u.wealthLevel || 1,
            charmLevel: u.charmLevel || 1,
            isOnline: u.isOnline,
            country: u.country,
            vipBadge: u.vipBadge,
          },
        ]),
      );
    }

    const data = friends.map((f) => ({
      friendshipId: f.id,
      category: f.category,
      alias: f.alias,
      addedAt: f.createdAt,
      user: userMap.get(f.friendId) || {
        id: f.friendId,
        displayName: 'Unknown',
      },
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async updateFriendCategory(
    userId: string,
    friendId: string,
    dto: UpdateFriendCategoryDto,
  ) {
    const friendEntry = await this.userFriendRepository.findOne({
      where: { userId, friendId },
    });

    if (!friendEntry) {
      throw new NotFoundException('Friendship record not found');
    }

    if (dto.category !== undefined) {
      friendEntry.category = dto.category;
    }
    if (dto.alias !== undefined) {
      friendEntry.alias = dto.alias;
    }

    await this.userFriendRepository.save(friendEntry);
    return friendEntry;
  }

  async removeFriend(userId: string, friendId: string) {
    await this.userFriendRepository.delete({ userId, friendId });
    await this.userFriendRepository.delete({
      userId: friendId,
      friendId: userId,
    });
    return { success: true };
  }

  async getMutualFriends(userId: string, targetUserId: string) {
    const userFriends = await this.userFriendRepository.find({
      where: { userId },
      select: { friendId: true },
    });
    const targetFriends = await this.userFriendRepository.find({
      where: { userId: targetUserId },
      select: { friendId: true },
    });

    const userFriendSet = new Set(userFriends.map((f) => f.friendId));
    const mutualIds = targetFriends
      .map((f) => f.friendId)
      .filter((id) => userFriendSet.has(id));

    let mutualUsers: Partial<User>[] = [];
    if (mutualIds.length > 0) {
      const users = await this.userRepository.findBy({ id: In(mutualIds) });
      mutualUsers = users.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        wealthLevel: u.wealthLevel || 1,
        charmLevel: u.charmLevel || 1,
      }));
    }

    return {
      count: mutualIds.length,
      mutualFriends: mutualUsers,
    };
  }

  async getSuggestedFriends(userId: string, page = 1, limit = 20) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Existing friends & pending requests to exclude
    const friends = await this.userFriendRepository.find({
      where: { userId },
      select: { friendId: true },
    });
    const excludedIds = new Set([userId, ...friends.map((f) => f.friendId)]);

    const query = this.userRepository
      .createQueryBuilder('u')
      .where('u.id NOT IN (:...excludedIds)', {
        excludedIds: Array.from(excludedIds),
      });

    if (user.country) {
      query.andWhere('u.country = :country', { country: user.country });
    }

    query.orderBy('u.popularityScore', 'DESC').take(limit);

    const suggestions = await query.getMany();

    return {
      data: suggestions.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        country: u.country,
        wealthLevel: u.wealthLevel || 1,
        charmLevel: u.charmLevel || 1,
        popularityScore: u.popularityScore || 0,
        interests: u.interests || [],
      })),
      total: suggestions.length,
    };
  }

  async getNearbyUsers(userId: string, dto: NearbyUsersQueryDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.userRepository
      .createQueryBuilder('u')
      .where('u.id != :userId', { userId });

    if (dto.country) {
      query.andWhere('u.country = :country', { country: dto.country });
    }

    if (dto.minLevel) {
      query.andWhere(
        '(u.wealthLevel >= :minLevel OR u.charmLevel >= :minLevel)',
        {
          minLevel: dto.minLevel,
        },
      );
    }

    query
      .orderBy('u.isOnline', 'DESC')
      .addOrderBy('u.lastActiveAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [users, total] = await query.getManyAndCount();

    return {
      data: users.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        country: u.country,
        statusMessage: u.statusMessage,
        isOnline: u.isOnline,
        wealthLevel: u.wealthLevel || 1,
        charmLevel: u.charmLevel || 1,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
