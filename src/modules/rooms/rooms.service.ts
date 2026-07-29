import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { MediaCategory } from '../storage/enums/media-category.enum';
import { EventsGateway } from '../../common/events/events.gateway';

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(
    private readonly storageService: StorageService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async uploadRoomCover(
    roomId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    if (!file) throw new BadRequestException('Cover file is required');

    const media = await this.storageService.uploadFile(
      file,
      {
        category: MediaCategory.ROOM_COVER,
        entityType: 'room',
        entityId: roomId,
      },
      userId,
    );

    const payload = {
      roomId,
      imageType: 'cover',
      url: media.publicUrl,
      mediaId: media.id,
      updatedAt: media.createdAt,
    };

    this.eventsGateway.broadcastRoomImageUpdated(payload);
    this.logger.log(`Uploaded cover for room ${roomId}`);

    return {
      message: 'Room cover uploaded successfully',
      coverUrl: media.publicUrl,
      media,
    };
  }

  async uploadRoomThumbnail(
    roomId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    if (!file) throw new BadRequestException('Thumbnail file is required');

    const media = await this.storageService.uploadFile(
      file,
      {
        category: MediaCategory.ROOM_THUMBNAIL,
        entityType: 'room',
        entityId: roomId,
      },
      userId,
    );

    const payload = {
      roomId,
      imageType: 'thumbnail',
      url: media.publicUrl,
      mediaId: media.id,
      updatedAt: media.createdAt,
    };

    this.eventsGateway.broadcastRoomImageUpdated(payload);
    this.logger.log(`Uploaded thumbnail for room ${roomId}`);

    return {
      message: 'Room thumbnail uploaded successfully',
      thumbnailUrl: media.publicUrl,
      media,
    };
  }

  async uploadRoomBackground(
    roomId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    if (!file)
      throw new BadRequestException('Background image file is required');

    const media = await this.storageService.uploadFile(
      file,
      {
        category: MediaCategory.ROOM_BG,
        entityType: 'room',
        entityId: roomId,
      },
      userId,
    );

    const payload = {
      roomId,
      imageType: 'background',
      url: media.publicUrl,
      mediaId: media.id,
      updatedAt: media.createdAt,
    };

    this.eventsGateway.broadcastRoomImageUpdated(payload);
    this.logger.log(`Uploaded background for room ${roomId}`);

    return {
      message: 'Room background uploaded successfully',
      backgroundUrl: media.publicUrl,
      media,
    };
  }
}
