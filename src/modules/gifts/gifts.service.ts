import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { MediaCategory } from '../storage/enums/media-category.enum';
import { EventsGateway } from '../../common/events/events.gateway';

@Injectable()
export class GiftsService {
  private readonly logger = new Logger(GiftsService.name);

  constructor(
    private readonly storageService: StorageService,
    private readonly eventsGateway: EventsGateway,
  ) {}

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
