import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { UserBookmark } from './entities/user-bookmark.entity';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { QuerySocialDto } from './dto/query-social.dto';

@Injectable()
export class BookmarksService {
  constructor(
    @InjectRepository(UserBookmark)
    private readonly bookmarkRepository: Repository<UserBookmark>,
  ) {}

  /**
   * Create or update a bookmark for a user.
   */
  async createBookmark(
    userId: string,
    dto: CreateBookmarkDto,
  ): Promise<UserBookmark> {
    const existing = await this.bookmarkRepository.findOne({
      where: {
        userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
      },
    });

    if (existing) {
      // Update existing bookmark fields if provided
      if (dto.title !== undefined) existing.title = dto.title;
      if (dto.description !== undefined) existing.description = dto.description;
      if (dto.imageUrl !== undefined) existing.imageUrl = dto.imageUrl;
      if (dto.metadata !== undefined) existing.metadata = dto.metadata;
      return this.bookmarkRepository.save(existing);
    }

    const bookmark = this.bookmarkRepository.create({
      userId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      title: dto.title,
      description: dto.description,
      imageUrl: dto.imageUrl,
      metadata: dto.metadata,
    });

    return this.bookmarkRepository.save(bookmark);
  }

  /**
   * Get paginated bookmarks for a specific user.
   */
  async getUserBookmarks(userId: string, query: QuerySocialDto) {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.bookmarkRepository
      .createQueryBuilder('bookmark')
      .where('bookmark.userId = :userId', { userId });

    if (query.search) {
      queryBuilder.andWhere(
        '(LOWER(bookmark.title) LIKE LOWER(:search) OR LOWER(bookmark.targetType) LIKE LOWER(:search))',
        { search: `%${query.search}%` },
      );
    }

    queryBuilder
      .orderBy('bookmark.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Remove a bookmark by ID or targetId for a user.
   */
  async removeBookmark(userId: string, bookmarkIdOrTargetId: string) {
    // Try finding by primary key ID first
    let bookmark = await this.bookmarkRepository.findOne({
      where: { id: bookmarkIdOrTargetId, userId },
    });

    // If not found by primary key, check if parameter matches targetId
    if (!bookmark) {
      bookmark = await this.bookmarkRepository.findOne({
        where: { targetId: bookmarkIdOrTargetId, userId },
      });
    }

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    await this.bookmarkRepository.remove(bookmark);
    return { success: true, id: bookmark.id, targetId: bookmark.targetId };
  }

  /**
   * Check if a given item is bookmarked by user.
   */
  async checkIsBookmarked(
    userId: string,
    targetType: string,
    targetId: string,
  ): Promise<{ isBookmarked: boolean }> {
    const count = await this.bookmarkRepository.count({
      where: { userId, targetType, targetId },
    });
    return { isBookmarked: count > 0 };
  }
}
