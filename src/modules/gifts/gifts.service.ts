import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Gift } from './entities/gift.entity';
import { CreateDynamicGiftDto } from './dto/create-dynamic-gift.dto';
import { StorageService } from '../storage/storage.service';
import { MediaCategory } from '../storage/enums/media-category.enum';
import { EventsGateway } from '../../common/events/events.gateway';

@Injectable()
export class GiftsService {
  private readonly logger = new Logger(GiftsService.name);

  constructor(
    @InjectRepository(Gift)
    private readonly giftRepository: Repository<Gift>,
    private readonly storageService: StorageService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async createDynamicGift(dto: CreateDynamicGiftDto): Promise<Gift> {
    const gift = this.giftRepository.create({
      name: dto.name,
      category: dto.category || 'General',
      coinPrice: dto.coinPrice,
      iconUrl: dto.iconUrl,
      animationUrl: dto.animationUrl,
      allowedCountries: dto.allowedCountries || null,
      availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : null,
      availableUntil: dto.availableUntil ? new Date(dto.availableUntil) : null,
      isLimitedEdition: dto.isLimitedEdition || false,
      totalStock: dto.totalStock || null,
      remainingStock: dto.totalStock || null,
      isSeasonal: dto.isSeasonal || false,
      seasonTag: dto.seasonTag || null,
      isActive: true,
    });

    return this.giftRepository.save(gift);
  }

  async updateDynamicGift(
    id: string,
    dto: Partial<CreateDynamicGiftDto>,
  ): Promise<Gift> {
    const gift = await this.giftRepository.findOne({ where: { id } });
    if (!gift) {
      throw new NotFoundException('Gift not found');
    }

    if (dto.name !== undefined) gift.name = dto.name;
    if (dto.category !== undefined) gift.category = dto.category;
    if (dto.coinPrice !== undefined) gift.coinPrice = dto.coinPrice;
    if (dto.iconUrl !== undefined) gift.iconUrl = dto.iconUrl;
    if (dto.animationUrl !== undefined) gift.animationUrl = dto.animationUrl;
    if (dto.allowedCountries !== undefined) gift.allowedCountries = dto.allowedCountries;
    if (dto.availableFrom !== undefined)
      gift.availableFrom = dto.availableFrom ? new Date(dto.availableFrom) : null;
    if (dto.availableUntil !== undefined)
      gift.availableUntil = dto.availableUntil ? new Date(dto.availableUntil) : null;
    if (dto.isLimitedEdition !== undefined)
      gift.isLimitedEdition = dto.isLimitedEdition;
    if (dto.totalStock !== undefined) {
      gift.totalStock = dto.totalStock;
      if (gift.remainingStock === null || gift.remainingStock > dto.totalStock) {
        gift.remainingStock = dto.totalStock;
      }
    }
    if (dto.isSeasonal !== undefined) gift.isSeasonal = dto.isSeasonal;
    if (dto.seasonTag !== undefined) gift.seasonTag = dto.seasonTag;

    return this.giftRepository.save(gift);
  }

  async deleteGift(id: string): Promise<{ success: boolean }> {
    const gift = await this.giftRepository.findOne({ where: { id } });
    if (!gift) {
      throw new NotFoundException('Gift not found');
    }

    await this.giftRepository.remove(gift);
    return { success: true };
  }

  async getCatalog(countryCode?: string, seasonTag?: string): Promise<Gift[]> {
    const now = new Date();
    const gifts = await this.giftRepository.find({
      where: { isActive: true },
      order: { coinPrice: 'ASC' },
    });

    return gifts.filter((gift) => {
      // 1. Regional check
      if (
        countryCode &&
        gift.allowedCountries &&
        gift.allowedCountries.length > 0
      ) {
        const uppercaseAllowed = gift.allowedCountries.map((c) =>
          c.toUpperCase(),
        );
        if (!uppercaseAllowed.includes(countryCode.toUpperCase())) {
          return false;
        }
      }

      // 2. Scheduled time availability check
      if (gift.availableFrom && now < new Date(gift.availableFrom)) {
        return false;
      }
      if (gift.availableUntil && now > new Date(gift.availableUntil)) {
        return false;
      }

      // 3. Limited stock check
      if (
        gift.isLimitedEdition &&
        gift.remainingStock !== null &&
        gift.remainingStock <= 0
      ) {
        return false;
      }

      // 4. Seasonal tag check
      if (seasonTag && gift.seasonTag && gift.seasonTag !== seasonTag) {
        return false;
      }

      return true;
    });
  }

  async uploadGiftIcon(
    giftId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    if (!file) throw new BadRequestException('Icon file is required');

    const media = await this.storageService.uploadFile(
      file,
      {
        category: MediaCategory.GIFT_ICON,
        entityType: 'gift',
        entityId: giftId,
      },
      userId,
    );

    const payload = {
      giftId,
      mediaType: 'icon',
      url: media.publicUrl,
      mediaId: media.id,
      updatedAt: media.createdAt,
    };

    this.eventsGateway.broadcastGiftMediaUpdated(payload);
    this.logger.log(`Uploaded icon for gift ${giftId}`);

    return {
      message: 'Gift icon uploaded successfully',
      iconUrl: media.publicUrl,
      media,
    };
  }

  async uploadGiftAnimation(
    giftId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    if (!file) throw new BadRequestException('Animation file is required');

    const media = await this.storageService.uploadFile(
      file,
      {
        category: MediaCategory.GIFT_ANIMATION,
        entityType: 'gift',
        entityId: giftId,
      },
      userId,
    );

    const payload = {
      giftId,
      mediaType: 'animation',
      url: media.publicUrl,
      mediaId: media.id,
      updatedAt: media.createdAt,
    };

    this.eventsGateway.broadcastGiftMediaUpdated(payload);
    this.logger.log(`Uploaded animation for gift ${giftId}`);

    return {
      message: 'Gift animation uploaded successfully',
      animationUrl: media.publicUrl,
      media,
    };
  }

  async uploadGiftPreview(
    giftId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    if (!file) throw new BadRequestException('Preview image file is required');

    const media = await this.storageService.uploadFile(
      file,
      {
        category: MediaCategory.GIFT_PREVIEW,
        entityType: 'gift',
        entityId: giftId,
      },
      userId,
    );

    const payload = {
      giftId,
      mediaType: 'preview',
      url: media.publicUrl,
      mediaId: media.id,
      updatedAt: media.createdAt,
    };

    this.eventsGateway.broadcastGiftMediaUpdated(payload);
    this.logger.log(`Uploaded preview for gift ${giftId}`);

    return {
      message: 'Gift preview uploaded successfully',
      previewUrl: media.publicUrl,
      media,
    };
  }
}
