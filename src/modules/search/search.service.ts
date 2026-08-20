import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Room } from '../rooms/entities/room.entity';
import { HostProfile } from '../hosts/entities/host-profile.entity';
import { Gift } from '../gifts/entities/gift.entity';
import { Announcement } from '../announcements/entities/announcement.entity';
import { SearchHistory } from './entities/search-history.entity';
import { RedisService } from '../../redis/redis.service';
import { SearchQueryDto, SearchEntityType } from './dto/search-query.dto';
import { SearchUsersQueryDto } from './dto/search-users-query.dto';
import { SearchRoomsQueryDto } from './dto/search-rooms-query.dto';
import { SearchHostsQueryDto } from './dto/search-hosts-query.dto';
import { SearchGiftsQueryDto } from './dto/search-gifts-query.dto';
import { SearchAnnouncementsQueryDto } from './dto/search-announcements-query.dto';
import { CreateSearchHistoryDto } from './dto/create-search-history.dto';
import { UserRole } from '../../common/enums';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly consumerUserRoles: string[] = [UserRole.USER, UserRole.CREATOR];

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(HostProfile)
    private readonly hostRepository: Repository<HostProfile>,
    @InjectRepository(Gift)
    private readonly giftRepository: Repository<Gift>,
    @InjectRepository(Announcement)
    private readonly announcementRepository: Repository<Announcement>,
    @InjectRepository(SearchHistory)
    private readonly searchHistoryRepository: Repository<SearchHistory>,
    private readonly redisService: RedisService,
  ) {}

  async globalSearch(dto: SearchQueryDto) {
    const cacheKey = `search:global:${JSON.stringify(dto)}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as Record<string, unknown>;
      } catch {
        // ignore JSON parse error
      }
    }

    const term = dto.q || '';
    const page = dto.page || 1;
    const limit = dto.limit || 20;

    const results: Record<string, unknown> = {};

    if (
      dto.type === SearchEntityType.ALL ||
      dto.type === SearchEntityType.USERS
    ) {
      results.users = await this.searchUsers({ ...dto, q: term, page, limit });
    }

    if (
      dto.type === SearchEntityType.ALL ||
      dto.type === SearchEntityType.ROOMS
    ) {
      results.rooms = await this.searchRooms({ ...dto, q: term, page, limit });
    }

    if (
      dto.type === SearchEntityType.ALL ||
      dto.type === SearchEntityType.HOSTS
    ) {
      results.hosts = await this.searchHosts({ ...dto, q: term, page, limit });
    }

    if (
      dto.type === SearchEntityType.ALL ||
      dto.type === SearchEntityType.GIFTS
    ) {
      results.gifts = await this.searchGifts({ ...dto, q: term, page, limit });
    }

    if (
      dto.type === SearchEntityType.ALL ||
      dto.type === SearchEntityType.ANNOUNCEMENTS
    ) {
      results.announcements = await this.searchAnnouncements({
        ...dto,
        q: term,
        page,
        limit,
      });
    }

    const response = {
      query: term,
      type: dto.type,
      results,
    };

    await this.redisService.set(cacheKey, JSON.stringify(response), 300);
    return response;
  }

  async searchUsers(dto: SearchUsersQueryDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository.createQueryBuilder('user');
    queryBuilder.andWhere('user.role IN (:...consumerRoles)', {
      consumerRoles: this.consumerUserRoles,
    });

    if (dto.q) {
      const condition = dto.prefixOnly ? `${dto.q}%` : `%${dto.q}%`;
      queryBuilder.andWhere(
        '(user.username ILIKE :q OR user.displayName ILIKE :q OR user.bio ILIKE :q)',
        { q: condition },
      );
    }

    if (dto.isOnline !== undefined) {
      queryBuilder.andWhere('user.isOnline = :isOnline', {
        isOnline: dto.isOnline,
      });
    }

    if (dto.isVerified !== undefined) {
      queryBuilder.andWhere('user.isVerified = :isVerified', {
        isVerified: dto.isVerified,
      });
    }

    if (dto.isVip !== undefined) {
      queryBuilder.andWhere('user.isVip = :isVip', { isVip: dto.isVip });
    }

    const sortOrder = dto.sortOrder || 'DESC';
    queryBuilder
      .orderBy(`user.${dto.sortBy || 'createdAt'}`, sortOrder)
      .skip(skip)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async searchRooms(dto: SearchRoomsQueryDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.roomRepository.createQueryBuilder('room');

    if (dto.q) {
      const condition = dto.prefixOnly ? `${dto.q}%` : `%${dto.q}%`;
      queryBuilder.andWhere(
        '(room.title ILIKE :q OR room.description ILIKE :q OR room.category ILIKE :q)',
        { q: condition },
      );
    }

    if (dto.isLocked !== undefined) {
      queryBuilder.andWhere('room.isLocked = :isLocked', {
        isLocked: dto.isLocked,
      });
    }

    if (dto.isLive !== undefined) {
      queryBuilder.andWhere('room.isLive = :isLive', { isLive: dto.isLive });
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

    const sortOrder = dto.sortOrder || 'DESC';
    queryBuilder
      .orderBy(`room.${dto.sortBy || 'popularityScore'}`, sortOrder)
      .skip(skip)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async searchHosts(dto: SearchHostsQueryDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.hostRepository
      .createQueryBuilder('host')
      .leftJoin(User, 'hostUser', 'hostUser.id = host.userId')
      .andWhere('hostUser.role IN (:...consumerRoles)', {
        consumerRoles: this.consumerUserRoles,
      });

    if (dto.q) {
      const condition = dto.prefixOnly ? `${dto.q}%` : `%${dto.q}%`;
      queryBuilder.andWhere(
        `(
          host.bio ILIKE :q OR
          host.realName ILIKE :q OR
          CAST(host.categories AS TEXT) ILIKE :q OR
          hostUser.displayName ILIKE :q OR
          hostUser.username ILIKE :q
        )`,
        { q: condition },
      );
    }

    if (dto.status) {
      queryBuilder.andWhere('host.status = :status', { status: dto.status });
    }

    const sortOrder = dto.sortOrder || 'DESC';
    queryBuilder
      .orderBy(`host.${dto.sortBy || 'createdAt'}`, sortOrder)
      .skip(skip)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async searchGifts(dto: SearchGiftsQueryDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.giftRepository.createQueryBuilder('gift');

    if (dto.q) {
      const condition = dto.prefixOnly ? `${dto.q}%` : `%${dto.q}%`;
      queryBuilder.andWhere('(gift.name ILIKE :q OR gift.category ILIKE :q)', {
        q: condition,
      });
    }

    if (dto.category) {
      queryBuilder.andWhere('gift.category ILIKE :category', {
        category: `%${dto.category}%`,
      });
    }

    if (dto.minPrice !== undefined) {
      queryBuilder.andWhere('gift.coinPrice >= :minPrice', {
        minPrice: dto.minPrice,
      });
    }

    if (dto.maxPrice !== undefined) {
      queryBuilder.andWhere('gift.coinPrice <= :maxPrice', {
        maxPrice: dto.maxPrice,
      });
    }

    const sortOrder = dto.sortOrder || 'DESC';
    queryBuilder
      .orderBy(`gift.${dto.sortBy || 'coinPrice'}`, sortOrder)
      .skip(skip)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async searchAnnouncements(dto: SearchAnnouncementsQueryDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder =
      this.announcementRepository.createQueryBuilder('announcement');

    if (dto.q) {
      const condition = dto.prefixOnly ? `${dto.q}%` : `%${dto.q}%`;
      queryBuilder.andWhere(
        '(announcement.title ILIKE :q OR announcement.content ILIKE :q)',
        { q: condition },
      );
    }

    if (dto.targetAudience) {
      queryBuilder.andWhere('announcement.targetAudience = :targetAudience', {
        targetAudience: dto.targetAudience,
      });
    }

    if (dto.priority) {
      queryBuilder.andWhere('announcement.priority = :priority', {
        priority: dto.priority,
      });
    }

    const sortOrder = dto.sortOrder || 'DESC';
    queryBuilder
      .orderBy(`announcement.${dto.sortBy || 'createdAt'}`, sortOrder)
      .skip(skip)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getSearchHistory(userId: string) {
    return this.searchHistoryRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  async addSearchHistory(userId: string, dto: CreateSearchHistoryDto) {
    const history = this.searchHistoryRepository.create({
      userId,
      query: dto.query.trim(),
    });
    return this.searchHistoryRepository.save(history);
  }

  async clearSearchHistory(userId: string) {
    await this.searchHistoryRepository.delete({ userId });
    return { message: 'Search history cleared successfully' };
  }

  async getSuggestions(q: string) {
    if (!q || !q.trim()) {
      return { suggestions: ['music', 'gaming', 'chitchat', 'singing', 'vip'] };
    }

    const clean = q.trim();
    const suggestions: string[] = [];

    const roomMatches = await this.roomRepository.find({
      where: { title: ILike(`%${clean}%`) },
      take: 5,
    });
    roomMatches.forEach((r) => suggestions.push(r.title));

    const userMatches = await this.userRepository.find({
      where: { displayName: ILike(`%${clean}%`) },
      take: 5,
    });
    userMatches.forEach((u) => suggestions.push(u.displayName));

    const giftMatches = await this.giftRepository.find({
      where: { name: ILike(`%${clean}%`) },
      take: 5,
    });
    giftMatches.forEach((g) => suggestions.push(g.name));

    const uniqueSuggestions = Array.from(new Set(suggestions)).slice(0, 10);
    return { query: clean, suggestions: uniqueSuggestions };
  }
}
