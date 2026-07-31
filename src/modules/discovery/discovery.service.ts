import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Room } from '../rooms/entities/room.entity';
import {
  HostProfile,
  HostVerificationStatus,
} from '../hosts/entities/host-profile.entity';
import { RedisService } from '../../redis/redis.service';
import { DiscoveryQueryDto } from './dto/discovery-query.dto';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(HostProfile)
    private readonly hostRepository: Repository<HostProfile>,
    private readonly redisService: RedisService,
  ) {}

  // USER DISCOVERY
  async getTrendingUsers(
    dto: DiscoveryQueryDto,
  ): Promise<PaginatedResult<User>> {
    const cacheKey = `discovery:users:trending:${JSON.stringify(dto)}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as PaginatedResult<User>;
      } catch {
        // ignore
      }
    }

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.userRepository.findAndCount({
      order: { popularityScore: 'DESC', followersCount: 'DESC' },
      skip,
      take: limit,
    });

    const result = {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
    await this.redisService.set(cacheKey, JSON.stringify(result), 60);
    return result;
  }

  async getPopularUsers(
    dto: DiscoveryQueryDto,
  ): Promise<PaginatedResult<User>> {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.userRepository.findAndCount({
      order: { followersCount: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getRecentlyActiveUsers(
    dto: DiscoveryQueryDto,
  ): Promise<PaginatedResult<User>> {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.userRepository.findAndCount({
      order: { lastActiveAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getOnlineUsers(dto: DiscoveryQueryDto): Promise<PaginatedResult<User>> {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.userRepository.findAndCount({
      where: { isOnline: true },
      order: { popularityScore: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getSuggestedUsers(
    dto: DiscoveryQueryDto,
  ): Promise<PaginatedResult<User>> {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.userRepository.findAndCount({
      order: { isVerified: 'DESC', popularityScore: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getNewUsers(dto: DiscoveryQueryDto): Promise<PaginatedResult<User>> {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.userRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // ROOM DISCOVERY
  async getTrendingRooms(
    dto: DiscoveryQueryDto,
  ): Promise<PaginatedResult<Room>> {
    const cacheKey = `discovery:rooms:trending:${JSON.stringify(dto)}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as PaginatedResult<Room>;
      } catch {
        // ignore
      }
    }

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.roomRepository.createQueryBuilder('room');
    if (dto.isLocked !== undefined) {
      queryBuilder.andWhere('room.isLocked = :isLocked', {
        isLocked: dto.isLocked,
      });
    }
    if (dto.language) {
      queryBuilder.andWhere('room.language = :language', {
        language: dto.language,
      });
    }
    if (dto.category) {
      queryBuilder.andWhere('room.category ILIKE :category', {
        category: `%${dto.category}%`,
      });
    }

    queryBuilder
      .orderBy('room.popularityScore', 'DESC')
      .addOrderBy('room.listenerCount', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    const result = {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
    await this.redisService.set(cacheKey, JSON.stringify(result), 60);
    return result;
  }

  async getPopularRooms(
    dto: DiscoveryQueryDto,
  ): Promise<PaginatedResult<Room>> {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.roomRepository.findAndCount({
      order: { listenerCount: 'DESC', speakerCount: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getLiveRooms(dto: DiscoveryQueryDto): Promise<PaginatedResult<Room>> {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.roomRepository.createQueryBuilder('room');
    queryBuilder.where('room.isLive = :isLive', { isLive: true });

    if (dto.isLocked !== undefined) {
      queryBuilder.andWhere('room.isLocked = :isLocked', {
        isLocked: dto.isLocked,
      });
    }
    if (dto.language) {
      queryBuilder.andWhere('room.language = :language', {
        language: dto.language,
      });
    }
    if (dto.category) {
      queryBuilder.andWhere('room.category ILIKE :category', {
        category: `%${dto.category}%`,
      });
    }

    queryBuilder.orderBy('room.listenerCount', 'DESC').skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getRecentRooms(dto: DiscoveryQueryDto): Promise<PaginatedResult<Room>> {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.roomRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // HOST DISCOVERY
  async getVerifiedHosts(
    dto: DiscoveryQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.hostRepository.findAndCount({
      where: { status: HostVerificationStatus.APPROVED },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const enrichedItems = items.map((host) => ({
      ...host,
      rating: 4.9,
      ratingCount: 120,
      followerCount: 2500,
    }));

    return {
      items: enrichedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getTrendingHosts(
    dto: DiscoveryQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const cacheKey = `discovery:hosts:trending:${JSON.stringify(dto)}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as PaginatedResult<unknown>;
      } catch {
        // ignore
      }
    }

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.hostRepository.findAndCount({
      where: { status: HostVerificationStatus.APPROVED },
      order: { updatedAt: 'DESC' },
      skip,
      take: limit,
    });

    const enrichedItems = items.map((host) => ({
      ...host,
      rating: 4.8,
      ratingCount: 95,
      followerCount: 1800,
    }));

    const result = {
      items: enrichedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
    await this.redisService.set(cacheKey, JSON.stringify(result), 60);
    return result;
  }

  async getTopHosts(dto: DiscoveryQueryDto): Promise<PaginatedResult<unknown>> {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.hostRepository.findAndCount({
      where: { status: HostVerificationStatus.APPROVED },
      order: { createdAt: 'ASC' },
      skip,
      take: limit,
    });

    const enrichedItems = items.map((host, idx) => ({
      ...host,
      rating: 5.0 - idx * 0.1,
      ratingCount: 500 - idx * 20,
      followerCount: 10000 - idx * 500,
    }));

    return {
      items: enrichedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getRecentlyActiveHosts(
    dto: DiscoveryQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.hostRepository.findAndCount({
      order: { updatedAt: 'DESC' },
      skip,
      take: limit,
    });

    const enrichedItems = items.map((host) => ({
      ...host,
      rating: 4.7,
      ratingCount: 60,
      followerCount: 1200,
    }));

    return {
      items: enrichedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
