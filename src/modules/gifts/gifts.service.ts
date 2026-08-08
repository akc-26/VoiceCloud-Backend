import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Gift } from './entities/gift.entity';
import { GiftCategory } from './entities/gift-category.entity';
import { CreateDynamicGiftDto } from './dto/create-dynamic-gift.dto';
import { CreateGiftCategoryDto } from './dto/create-category.dto';
import { ReorderCatalogDto } from './dto/reorder-catalog.dto';
import { StorageService } from '../storage/storage.service';
import { MediaCategory } from '../storage/enums/media-category.enum';
import { EventsGateway } from '../../common/events/events.gateway';
import { RedisService } from '../../redis/redis.service';

export interface CatalogFilterOptions {
  category?: string;
  type?: string;
  countryCode?: string;
  seasonTag?: string;
  isVipOnly?: boolean;
  isHostExclusive?: boolean;
  includeHidden?: boolean;
  includeArchived?: boolean;
}

@Injectable()
export class GiftsService {
  private readonly logger = new Logger(GiftsService.name);

  constructor(
    @InjectRepository(Gift)
    private readonly giftRepository: Repository<Gift>,
    @InjectRepository(GiftCategory)
    private readonly categoryRepository: Repository<GiftCategory>,
    private readonly storageService: StorageService,
    private readonly eventsGateway: EventsGateway,
    private readonly redisService: RedisService,
  ) {}

  async createDynamicGift(dto: CreateDynamicGiftDto): Promise<Gift> {
    const gift = this.giftRepository.create({
      name: dto.name,
      description: dto.description || null,
      type: dto.type || 'static',
      rarity: dto.rarity || 'common',
      category: dto.category || 'Popular',
      coinPrice: dto.coinPrice,
      creatorEarningsPercentage: dto.creatorEarningsPercentage ?? 70.0,
      iconUrl: dto.iconUrl || null,
      animationUrl: dto.animationUrl || null,
      previewUrl: dto.previewUrl || null,
      isActive: dto.isActive ?? true,
      isArchived: dto.isArchived ?? false,
      isHidden: dto.isHidden ?? false,
      isVipOnly: dto.isVipOnly ?? false,
      isHostExclusive: dto.isHostExclusive ?? false,
      allowedCountries: dto.allowedCountries || null,
      availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : null,
      availableUntil: dto.availableUntil ? new Date(dto.availableUntil) : null,
      isLimitedEdition: dto.isLimitedEdition || false,
      totalStock: dto.totalStock || null,
      remainingStock: dto.totalStock || null,
      isSeasonal: dto.isSeasonal || false,
      seasonTag: dto.seasonTag || null,
      sortOrder: dto.sortOrder ?? 0,
      tags: dto.tags || null,
    });

    const saved = await this.giftRepository.save(gift);
    await this.redisService.del('cache:gift:catalog');
    return saved;
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
    if (dto.description !== undefined) gift.description = dto.description;
    if (dto.type !== undefined) gift.type = dto.type;
    if (dto.rarity !== undefined) gift.rarity = dto.rarity;
    if (dto.category !== undefined) gift.category = dto.category;
    if (dto.coinPrice !== undefined) gift.coinPrice = dto.coinPrice;
    if (dto.creatorEarningsPercentage !== undefined)
      gift.creatorEarningsPercentage = dto.creatorEarningsPercentage;
    if (dto.iconUrl !== undefined) gift.iconUrl = dto.iconUrl;
    if (dto.animationUrl !== undefined) gift.animationUrl = dto.animationUrl;
    if (dto.previewUrl !== undefined) gift.previewUrl = dto.previewUrl;
    if (dto.isActive !== undefined) gift.isActive = dto.isActive;
    if (dto.isArchived !== undefined) gift.isArchived = dto.isArchived;
    if (dto.isHidden !== undefined) gift.isHidden = dto.isHidden;
    if (dto.isVipOnly !== undefined) gift.isVipOnly = dto.isVipOnly;
    if (dto.isHostExclusive !== undefined)
      gift.isHostExclusive = dto.isHostExclusive;
    if (dto.allowedCountries !== undefined)
      gift.allowedCountries = dto.allowedCountries;
    if (dto.availableFrom !== undefined)
      gift.availableFrom = dto.availableFrom
        ? new Date(dto.availableFrom)
        : null;
    if (dto.availableUntil !== undefined)
      gift.availableUntil = dto.availableUntil
        ? new Date(dto.availableUntil)
        : null;
    if (dto.isLimitedEdition !== undefined)
      gift.isLimitedEdition = dto.isLimitedEdition;
    if (dto.totalStock !== undefined) {
      gift.totalStock = dto.totalStock;
      if (
        gift.remainingStock === null ||
        gift.remainingStock > dto.totalStock
      ) {
        gift.remainingStock = dto.totalStock;
      }
    }
    if (dto.isSeasonal !== undefined) gift.isSeasonal = dto.isSeasonal;
    if (dto.seasonTag !== undefined) gift.seasonTag = dto.seasonTag;
    if (dto.sortOrder !== undefined) gift.sortOrder = dto.sortOrder;
    if (dto.tags !== undefined) gift.tags = dto.tags;

    const updated = await this.giftRepository.save(gift);
    await this.redisService.del('cache:gift:catalog');
    return updated;
  }

  async deleteGift(id: string): Promise<{ success: boolean }> {
    const gift = await this.giftRepository.findOne({ where: { id } });
    if (!gift) {
      throw new NotFoundException('Gift not found');
    }

    await this.giftRepository.remove(gift);
    await this.redisService.del('cache:gift:catalog');
    return { success: true };
  }

  async archiveGift(id: string): Promise<Gift> {
    const gift = await this.giftRepository.findOne({ where: { id } });
    if (!gift) throw new NotFoundException('Gift not found');

    gift.isArchived = true;
    gift.isActive = false;
    const saved = await this.giftRepository.save(gift);
    await this.redisService.del('cache:gift:catalog');
    return saved;
  }

  async restoreGift(id: string): Promise<Gift> {
    const gift = await this.giftRepository.findOne({ where: { id } });
    if (!gift) throw new NotFoundException('Gift not found');

    gift.isArchived = false;
    gift.isActive = true;
    const saved = await this.giftRepository.save(gift);
    await this.redisService.del('cache:gift:catalog');
    return saved;
  }

  async enableGift(id: string): Promise<Gift> {
    const gift = await this.giftRepository.findOne({ where: { id } });
    if (!gift) throw new NotFoundException('Gift not found');

    gift.isActive = true;
    const saved = await this.giftRepository.save(gift);
    await this.redisService.del('cache:gift:catalog');
    return saved;
  }

  async disableGift(id: string): Promise<Gift> {
    const gift = await this.giftRepository.findOne({ where: { id } });
    if (!gift) throw new NotFoundException('Gift not found');

    gift.isActive = false;
    const saved = await this.giftRepository.save(gift);
    await this.redisService.del('cache:gift:catalog');
    return saved;
  }

  async reorderCatalog(dto: ReorderCatalogDto): Promise<{ success: boolean }> {
    for (const item of dto.items) {
      await this.giftRepository.update(item.id, { sortOrder: item.sortOrder });
    }
    await this.redisService.del('cache:gift:catalog');
    return { success: true };
  }

  async getAdminCatalog(): Promise<Gift[]> {
    return this.giftRepository.find({
      order: { sortOrder: 'ASC', coinPrice: 'ASC' },
    });
  }

  async getAdminCategories(): Promise<GiftCategory[]> {
    return this.categoryRepository.find({
      order: { sortOrder: 'ASC' },
    });
  }

  async getCatalog(
    countryCode?: string,
    seasonTag?: string,
    options: CatalogFilterOptions = {},
  ): Promise<Gift[]> {
    const now = new Date();

    const gifts = await this.giftRepository.find({
      order: { sortOrder: 'ASC', coinPrice: 'ASC' },
    });

    return gifts.filter((gift) => {
      // Archived filter
      if (!options.includeArchived && gift.isArchived) return false;

      // Active filter
      if (!options.includeHidden && !gift.isActive) return false;

      // Hidden filter
      if (!options.includeHidden && gift.isHidden) return false;

      // Category filter
      if (
        options.category &&
        gift.category.toLowerCase() !== options.category.toLowerCase()
      ) {
        return false;
      }

      // Type filter
      if (
        options.type &&
        gift.type.toLowerCase() !== options.type.toLowerCase()
      ) {
        return false;
      }

      // Country check
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

      // Time frame availability check
      if (gift.availableFrom && now < new Date(gift.availableFrom)) {
        return false;
      }
      if (gift.availableUntil && now > new Date(gift.availableUntil)) {
        return false;
      }

      // Limited stock check
      if (
        gift.isLimitedEdition &&
        gift.remainingStock !== null &&
        gift.remainingStock <= 0
      ) {
        return false;
      }

      // Seasonal tag check
      if (seasonTag && gift.seasonTag && gift.seasonTag !== seasonTag) {
        return false;
      }

      return true;
    });
  }

  async searchGifts(query: string): Promise<Gift[]> {
    if (!query) return this.getCatalog();
    const q = query.toLowerCase();
    const gifts = await this.giftRepository.find({
      where: { isActive: true, isArchived: false, isHidden: false },
      order: { sortOrder: 'ASC', coinPrice: 'ASC' },
    });

    return gifts.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        (g.description && g.description.toLowerCase().includes(q)) ||
        (g.tags && g.tags.some((t) => t.toLowerCase().includes(q))),
    );
  }

  async getFeaturedGifts(): Promise<Gift[]> {
    const gifts = await this.getCatalog();
    return gifts
      .filter(
        (g) =>
          g.rarity === 'epic' ||
          g.rarity === 'legendary' ||
          g.isLimitedEdition ||
          g.isSeasonal,
      )
      .slice(0, 10);
  }

  async getTrendingGifts(): Promise<Gift[]> {
    const gifts = await this.getCatalog();
    return gifts.slice(0, 8);
  }

  // --- Categories Management ---
  async getCategories(): Promise<GiftCategory[]> {
    const categories = await this.categoryRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });

    if (categories.length > 0) return categories;

    // Fallback default categories if empty
    const defaultNames = [
      'Popular',
      'Trending',
      'Premium',
      'Seasonal',
      'Event',
      'Limited',
      'New',
      'VIP-only',
      'Host-exclusive',
    ];

    return defaultNames.map((name, idx) => ({
      id: `cat-${idx + 1}`,
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      description: `${name} gifts category`,
      iconUrl: null,
      sortOrder: idx,
      isActive: true,
      isVipOnly: name.includes('VIP'),
      isHostExclusive: name.includes('Host'),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  async createCategory(dto: CreateGiftCategoryDto): Promise<GiftCategory> {
    const slug = dto.slug || dto.name.toLowerCase().replace(/\s+/g, '-');
    const category = this.categoryRepository.create({
      name: dto.name,
      slug,
      description: dto.description || null,
      iconUrl: dto.iconUrl || null,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
      isVipOnly: dto.isVipOnly ?? false,
      isHostExclusive: dto.isHostExclusive ?? false,
    });

    return this.categoryRepository.save(category);
  }

  async updateCategory(
    id: string,
    dto: Partial<CreateGiftCategoryDto>,
  ): Promise<GiftCategory> {
    const cat = await this.categoryRepository.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');

    if (dto.name !== undefined) {
      cat.name = dto.name;
      cat.slug = dto.slug || dto.name.toLowerCase().replace(/\s+/g, '-');
    }
    if (dto.description !== undefined) cat.description = dto.description;
    if (dto.iconUrl !== undefined) cat.iconUrl = dto.iconUrl;
    if (dto.sortOrder !== undefined) cat.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) cat.isActive = dto.isActive;
    if (dto.isVipOnly !== undefined) cat.isVipOnly = dto.isVipOnly;
    if (dto.isHostExclusive !== undefined)
      cat.isHostExclusive = dto.isHostExclusive;

    return this.categoryRepository.save(cat);
  }

  async deleteCategory(id: string): Promise<{ success: boolean }> {
    const cat = await this.categoryRepository.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');

    await this.categoryRepository.remove(cat);
    return { success: true };
  }

  // --- Upload Handlers ---
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
