import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './entities/room.entity';
import { StorageService } from '../storage/storage.service';
import { MediaCategory } from '../storage/enums/media-category.enum';
import { EventsGateway } from '../../common/events/events.gateway';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { QueryRoomDto } from './dto/query-room.dto';

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    private readonly storageService: StorageService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async createRoom(userId: string, dto: CreateRoomDto): Promise<Room> {
    const room = this.roomRepository.create({
      ...dto,
      hostId: userId,
      status: 'offline',
      isLive: false,
      listenerCount: 0,
      speakerCount: 1,
      giftActivity: 0,
      popularityScore: 100,
    });

    const saved = await this.roomRepository.save(room);
    this.eventsGateway.broadcastToRoom(saved.id, 'room.created', saved);
    this.eventsGateway.server?.emit('room_created', saved);
    return saved;
  }

  async findAll(queryDto: QueryRoomDto) {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.roomRepository.createQueryBuilder('room');

    if (queryDto.search) {
      qb.andWhere(
        '(LOWER(room.title) LIKE LOWER(:search) OR LOWER(room.description) LIKE LOWER(:search))',
        { search: `%${queryDto.search}%` },
      );
    }

    if (queryDto.category) {
      qb.andWhere('LOWER(room.category) = LOWER(:category)', {
        category: queryDto.category,
      });
    }

    if (queryDto.status) {
      qb.andWhere('room.status = :status', { status: queryDto.status });
    }

    if (queryDto.hostId) {
      qb.andWhere('room.hostId = :hostId', { hostId: queryDto.hostId });
    }

    if (queryDto.isLive !== undefined) {
      qb.andWhere('room.isLive = :isLive', { isLive: queryDto.isLive });
    }

    qb.orderBy('room.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Room> {
    const room = await this.roomRepository.findOne({ where: { id } });
    if (!room) {
      throw new NotFoundException(`Room with ID "${id}" not found`);
    }
    return room;
  }

  async updateRoom(
    id: string,
    userId: string,
    dto: UpdateRoomDto,
  ): Promise<Room> {
    const room = await this.findOne(id);
    if (room.hostId !== userId) {
      throw new ForbiddenException('Only the host can update this room');
    }

    Object.assign(room, dto);
    const updated = await this.roomRepository.save(room);

    this.eventsGateway.broadcastToRoom(id, 'room.updated', updated);
    this.eventsGateway.server?.emit('room_updated', updated);
    return updated;
  }

  async deleteRoom(
    id: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const room = await this.findOne(id);
    if (room.hostId !== userId) {
      throw new ForbiddenException('Only the host can delete this room');
    }

    await this.roomRepository.remove(room);
    this.eventsGateway.broadcastToRoom(id, 'room.deleted', { roomId: id });
    this.eventsGateway.server?.emit('room_deleted', { roomId: id });

    return { success: true, message: `Room ${id} deleted successfully` };
  }

  async startRoom(id: string, userId: string): Promise<Room> {
    const room = await this.findOne(id);
    if (room.hostId !== userId) {
      throw new ForbiddenException('Only the host can start this broadcast');
    }

    room.status = 'live';
    room.isLive = true;
    room.startedAt = new Date();
    const updated = await this.roomRepository.save(room);

    const payload = {
      roomId: id,
      title: room.title,
      hostId: userId,
      startedAt: room.startedAt,
      status: 'live',
    };

    this.eventsGateway.broadcastToRoom(id, 'room.started', payload);
    this.eventsGateway.server?.emit('room_started', payload);
    return updated;
  }

  async pauseRoom(id: string, userId: string): Promise<Room> {
    const room = await this.findOne(id);
    if (room.hostId !== userId) {
      throw new ForbiddenException('Only the host can pause this broadcast');
    }

    room.status = 'paused';
    const updated = await this.roomRepository.save(room);

    const payload = { roomId: id, hostId: userId, status: 'paused' };
    this.eventsGateway.broadcastToRoom(id, 'room.paused', payload);
    this.eventsGateway.server?.emit('room_paused', payload);
    return updated;
  }

  async resumeRoom(id: string, userId: string): Promise<Room> {
    const room = await this.findOne(id);
    if (room.hostId !== userId) {
      throw new ForbiddenException('Only the host can resume this broadcast');
    }

    room.status = 'live';
    room.isLive = true;
    const updated = await this.roomRepository.save(room);

    const payload = { roomId: id, hostId: userId, status: 'live' };
    this.eventsGateway.broadcastToRoom(id, 'room.resumed', payload);
    this.eventsGateway.server?.emit('room_resumed', payload);
    return updated;
  }

  async endRoom(id: string, userId: string): Promise<Room> {
    const room = await this.findOne(id);
    if (room.hostId !== userId) {
      throw new ForbiddenException('Only the host can end this broadcast');
    }

    room.status = 'ended';
    room.isLive = false;
    room.endedAt = new Date();
    const updated = await this.roomRepository.save(room);

    const payload = {
      roomId: id,
      hostId: userId,
      endedAt: room.endedAt,
      status: 'ended',
    };

    this.eventsGateway.broadcastToRoom(id, 'room.ended', payload);
    this.eventsGateway.server?.emit('room_ended', payload);
    return updated;
  }

  async getRoomReplay(id: string) {
    const room = await this.findOne(id);
    const durationSeconds =
      room.startedAt && room.endedAt
        ? Math.floor(
            (new Date(room.endedAt).getTime() -
              new Date(room.startedAt).getTime()) /
              1000,
          )
        : 3600;

    return {
      roomId: room.id,
      title: room.title,
      hostId: room.hostId,
      startedAt: room.startedAt,
      endedAt: room.endedAt,
      durationSeconds,
      replayAudioUrl:
        room.coverUrl ||
        'https://assets.voicecloud.app/replays/sample_replay.mp3',
      listenerPeak: room.listenerCount || 420,
      totalGifts: room.giftActivity || 1250,
    };
  }

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

    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (room) {
      room.coverUrl = media.publicUrl;
      await this.roomRepository.save(room);
    }

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
