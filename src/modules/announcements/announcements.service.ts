import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import {
  Announcement,
  AnnouncementTarget,
} from './entities/announcement.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { QueryAnnouncementDto } from './dto/query-announcement.dto';
import { EventsGateway } from '../../common/events/events.gateway';
import { StorageService } from '../storage/storage.service';
import { MediaCategory } from '../storage/enums/media-category.enum';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private readonly announcementRepository: Repository<Announcement>,
    private readonly eventsGateway: EventsGateway,
    private readonly storageService: StorageService,
  ) {}

  async createAnnouncement(
    createdById: string,
    dto: CreateAnnouncementDto,
  ): Promise<Announcement> {
    const announcement = this.announcementRepository.create({
      title: dto.title,
      content: dto.content,
      mediaUrl: dto.mediaUrl ?? undefined,
      targetAudience: dto.targetAudience ?? AnnouncementTarget.GLOBAL,
      priority: dto.priority,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      isActive: dto.isActive ?? true,
      createdById,
    });

    const saved = await this.announcementRepository.save(announcement);

    // Broadcast Realtime Announcement Event
    this.eventsGateway.broadcastAnnouncementEvent('announcement:new', {
      announcement: saved,
    });

    return saved;
  }

  async getActiveAnnouncements(
    targetAudience?: AnnouncementTarget,
    query?: QueryAnnouncementDto,
  ): Promise<{
    data: Announcement[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query?.page && query.page > 0 ? query.page : 1;
    const limit = query?.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const now = new Date();

    const queryBuilder = this.announcementRepository
      .createQueryBuilder('announcement')
      .where('announcement.isActive = :isActive', { isActive: true })
      .andWhere(
        '(announcement.scheduledAt IS NULL OR announcement.scheduledAt <= :now)',
        { now },
      )
      .andWhere(
        '(announcement.expiresAt IS NULL OR announcement.expiresAt >= :now)',
        { now },
      );

    if (targetAudience) {
      queryBuilder.andWhere(
        '(announcement.targetAudience = :target OR announcement.targetAudience = :global)',
        { target: targetAudience, global: AnnouncementTarget.GLOBAL },
      );
    }

    if (query?.priority) {
      queryBuilder.andWhere('announcement.priority = :priority', {
        priority: query.priority,
      });
    }

    queryBuilder
      .orderBy('announcement.priority', 'DESC')
      .addOrderBy('announcement.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getAllAnnouncementsAdmin(query: QueryAnnouncementDto): Promise<{
    data: Announcement[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Announcement> = {};

    if (query.targetAudience) {
      where.targetAudience = query.targetAudience;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    const [data, total] = await this.announcementRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getAnnouncementById(id: string): Promise<Announcement> {
    const announcement = await this.announcementRepository.findOne({
      where: { id },
    });
    if (!announcement) {
      throw new NotFoundException(`Announcement with ID ${id} not found`);
    }
    return announcement;
  }

  async updateAnnouncement(
    id: string,
    dto: UpdateAnnouncementDto,
  ): Promise<Announcement> {
    const announcement = await this.getAnnouncementById(id);

    if (dto.title !== undefined) announcement.title = dto.title;
    if (dto.content !== undefined) announcement.content = dto.content;
    if (dto.mediaUrl !== undefined) announcement.mediaUrl = dto.mediaUrl;
    if (dto.targetAudience !== undefined)
      announcement.targetAudience = dto.targetAudience;
    if (dto.priority !== undefined) announcement.priority = dto.priority;
    if (dto.scheduledAt !== undefined)
      announcement.scheduledAt = dto.scheduledAt
        ? new Date(dto.scheduledAt)
        : null;
    if (dto.expiresAt !== undefined)
      announcement.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.isActive !== undefined) announcement.isActive = dto.isActive;

    return await this.announcementRepository.save(announcement);
  }

  async deleteAnnouncement(id: string): Promise<{ success: boolean }> {
    const announcement = await this.getAnnouncementById(id);
    await this.announcementRepository.remove(announcement);
    return { success: true };
  }

  async uploadBanner(id: string, file: Express.Multer.File, userId: string) {
    const announcement = await this.getAnnouncementById(id);
    const media = await this.storageService.uploadFile(
      file,
      {
        category: MediaCategory.ANNOUNCEMENT_BANNER,
        entityType: 'announcement',
        entityId: id,
      },
      userId,
    );

    announcement.mediaUrl = media.publicUrl;
    await this.announcementRepository.save(announcement);

    this.eventsGateway.broadcastAnnouncementUpdated({
      announcementId: id,
      mediaType: 'banner',
      url: media.publicUrl,
    });

    return {
      message: 'Announcement banner uploaded successfully',
      bannerUrl: media.publicUrl,
      media,
    };
  }

  async uploadThumbnail(id: string, file: Express.Multer.File, userId: string) {
    await this.getAnnouncementById(id);
    const media = await this.storageService.uploadFile(
      file,
      {
        category: MediaCategory.ANNOUNCEMENT_THUMBNAIL,
        entityType: 'announcement',
        entityId: id,
      },
      userId,
    );

    this.eventsGateway.broadcastAnnouncementUpdated({
      announcementId: id,
      mediaType: 'thumbnail',
      url: media.publicUrl,
    });

    return {
      message: 'Announcement thumbnail uploaded successfully',
      thumbnailUrl: media.publicUrl,
      media,
    };
  }

  async uploadAttachment(
    id: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    await this.getAnnouncementById(id);
    const media = await this.storageService.uploadFile(
      file,
      {
        category: MediaCategory.ANNOUNCEMENT_ATTACHMENT,
        entityType: 'announcement',
        entityId: id,
      },
      userId,
    );

    this.eventsGateway.broadcastAnnouncementUpdated({
      announcementId: id,
      mediaType: 'attachment',
      url: media.publicUrl,
    });

    return {
      message: 'Announcement attachment uploaded successfully',
      attachmentUrl: media.publicUrl,
      media,
    };
  }
}
