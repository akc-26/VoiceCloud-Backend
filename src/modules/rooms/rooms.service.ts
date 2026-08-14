import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Room } from './entities/room.entity';
import { StorageService } from '../storage/storage.service';
import { MediaCategory } from '../storage/enums/media-category.enum';
import { EventsGateway } from '../../common/events/events.gateway';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { QueryRoomDto } from './dto/query-room.dto';
import {
  RoomLifecycleAction,
  RoomLifecycleService,
} from './room-lifecycle.service';
import { RoomLifecycleStatus } from './enums/room-lifecycle-status.enum';
import { RealtimeRoomStateService } from '../../common/events/services/realtime-room-state.service';
import { ScheduledRoom } from './entities/scheduled-room.entity';
import { ScheduledRoomStatus, VisibilityType } from '../../common/enums';
import { HostsService } from '../hosts/hosts.service';
import { HostVerificationStatus } from '../hosts/entities/host-profile.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    private readonly storageService: StorageService,
    private readonly eventsGateway: EventsGateway,
    private readonly roomLifecycleService: RoomLifecycleService,
    private readonly realtimeRoomStateService: RealtimeRoomStateService,
    private readonly dataSource: DataSource,
    private readonly hostsService: HostsService,
  ) {}

  async createRoom(userId: string, dto: CreateRoomDto): Promise<Room> {
    await this.assertApprovedHost(userId);

    const saved = await this.dataSource.transaction(
      async (manager: EntityManager) => {
        const roomRepository = manager.getRepository(Room);
        const scheduledRoomRepository = manager.getRepository(ScheduledRoom);

        let scheduled: ScheduledRoom | null = null;
        if (dto.scheduledRoomId) {
          scheduled = await scheduledRoomRepository.findOne({
            where: { id: dto.scheduledRoomId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!scheduled) {
            throw new NotFoundException(
              `Scheduled room with ID "${dto.scheduledRoomId}" not found`,
            );
          }
          if (scheduled.hostId !== userId) {
            throw new ForbiddenException(
              'Only the scheduled room host can create its live room',
            );
          }
          if (
            scheduled.status !== ScheduledRoomStatus.SCHEDULED &&
            scheduled.status !== ScheduledRoomStatus.POSTPONED
          ) {
            throw new BadRequestException(
              `Cannot create a live room from a scheduled room in ${scheduled.status} status`,
            );
          }

          if (dto.clubId && scheduled.clubId && dto.clubId !== scheduled.clubId) {
            throw new BadRequestException(
              'Live room club must match the linked scheduled room',
            );
          }

          const existing = await roomRepository.findOne({
            where: { scheduledRoomId: dto.scheduledRoomId },
          });
          if (existing) {
            throw new BadRequestException(
              'A live room already exists for this scheduled room',
            );
          }
        }

        const { isPrivate, ...roomInput } = dto;
        const room = roomRepository.create({
          ...roomInput,
          clubId: scheduled?.clubId ?? dto.clubId,
          category: dto.category ?? scheduled?.category,
          language: dto.language ?? scheduled?.language,
          coverUrl: dto.coverUrl ?? scheduled?.coverUrl,
          isPremium: !!(dto.isPremium || scheduled?.isPremium),
          isTicketRequired: !!(
            dto.isTicketRequired ||
            scheduled?.isPremium
          ),
          isInviteOnly: !!(
            isPrivate ||
            dto.isInviteOnly ||
            scheduled?.isInviteOnly ||
            (scheduled && scheduled.visibility !== VisibilityType.PUBLIC)
          ),
          ticketPriceAmount:
            scheduled?.ticketPriceAmount ?? dto.ticketPriceAmount ?? 0,
          hostId: userId,
          status: RoomLifecycleStatus.OFFLINE,
          isLive: false,
          listenerCount: 0,
          speakerCount: 0,
          giftActivity: 0,
          popularityScore: 100,
        });

        return roomRepository.save(room);
      },
    );

    this.broadcastLifecycleEvent(saved, 'room.created', 'room_created', saved);
    return saved;
  }

  async findAll(queryDto: QueryRoomDto) {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.roomRepository.createQueryBuilder('room');

    // Public discovery must never enumerate restricted rooms. Direct room
    // lookup remains available for invite/deep-link workflows, while joining
    // is still authorized by RealtimeRoomStateService.
    qb.andWhere('room.isInviteOnly = false');
    qb.andWhere('room.isLocked = false');
    qb.andWhere('room.clubId IS NULL');

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

  async findMine(userId: string, queryDto: QueryRoomDto) {
    return this.findAllInternal({ ...queryDto, hostId: userId }, false);
  }

  async findAllAdmin(queryDto: QueryRoomDto) {
    return this.findAllInternal(queryDto, true);
  }

  async findOneAdmin(id: string) {
    const room = await this.findOne(id);
    const userRepository = this.dataSource.getRepository(User);
    const host = await userRepository.findOne({ where: { id: room.hostId } });
    return this.toAdminRoomView(room, host || undefined);
  }

  private async findAllInternal(queryDto: QueryRoomDto, includeRestricted: boolean) {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const skip = (page - 1) * limit;
    const qb = this.roomRepository.createQueryBuilder('room');

    if (!includeRestricted) {
      // Creator-owned listing must include the Creator's private rooms. Public
      // discovery retains restricted-room filtering in findAll().
    }

    if (queryDto.search) {
      qb.andWhere(
        '(LOWER(room.title) LIKE LOWER(:search) OR LOWER(room.description) LIKE LOWER(:search))',
        { search: `%${queryDto.search}%` },
      );
    }
    if (queryDto.category) {
      qb.andWhere('LOWER(room.category) = LOWER(:category)', { category: queryDto.category });
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
    const [rooms, total] = await qb.getManyAndCount();
    const userRepository = this.dataSource.getRepository(User);
    const hostIds = [...new Set(rooms.map((room) => room.hostId).filter(Boolean))];
    const hosts = hostIds.length
      ? await userRepository.createQueryBuilder('user').where('user.id IN (:...hostIds)', { hostIds }).getMany()
      : [];
    const hostMap = new Map(hosts.map((host) => [host.id, host]));
    const data = rooms.map((room) => this.toAdminRoomView(room, hostMap.get(room.hostId)));
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  private toAdminRoomView(room: Room, host?: User) {
    return {
      ...room,
      hostName: host?.displayName || host?.username || room.hostId,
      hostUsername: host?.username || null,
      isPrivate: !!(room.isInviteOnly || room.isLocked || room.clubId),
      participantCount: Number(room.listenerCount || 0) + Number(room.speakerCount || 0),
    };
  }

  async adminTerminateRoom(id: string) {
    const room = await this.findOne(id);
    const current = this.roomLifecycleService.normalize(room.status);
    if (current === RoomLifecycleStatus.LIVE || current === RoomLifecycleStatus.PAUSED) {
      this.roomLifecycleService.applyEnd(room);
      const saved = await this.roomRepository.save(room);
      await this.realtimeRoomStateService.closeRoom(id);
      this.broadcastLifecycleEvent(saved, 'room.ended', 'room_ended', {
        roomId: id,
        hostId: room.hostId,
        endedAt: room.endedAt,
        status: 'ended',
        endedBy: 'ADMIN',
      });
      return saved;
    }
    return room;
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

    const { isPrivate, ...updateData } = dto;
    Object.assign(room, updateData);
    if (isPrivate !== undefined) {
      room.isInviteOnly = isPrivate;
    }
    const updated = await this.roomRepository.save(room);

    this.broadcastLifecycleEvent(updated, 'room.updated', 'room_updated', updated);
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

    this.roomLifecycleService.assertDeletable(room);
    await this.realtimeRoomStateService.cleanupRoomState(id);
    await this.roomRepository.remove(room);
    this.broadcastLifecycleEvent(room, 'room.deleted', 'room_deleted', {
      roomId: id,
    });

    return { success: true, message: `Room ${id} deleted successfully` };
  }

  async startRoom(id: string, userId: string): Promise<Room> {
    await this.assertApprovedHost(userId);
    const existing = await this.findOne(id);
    if (this.roomLifecycleService.normalize(existing.status) === RoomLifecycleStatus.ENDED) {
      if (existing.hostId !== userId) {
        throw new ForbiddenException('Only the host can restart this broadcast');
      }
      const restarted = this.roomRepository.create({
        title: existing.title,
        description: existing.description,
        hostId: existing.hostId,
        coverUrl: existing.coverUrl,
        isLocked: existing.isLocked,
        isLive: false,
        status: RoomLifecycleStatus.OFFLINE,
        audioQuality: existing.audioQuality,
        startedAt: null,
        endedAt: null,
        language: existing.language,
        category: existing.category,
        listenerCount: 0,
        speakerCount: 0,
        giftActivity: 0,
        popularityScore: existing.popularityScore || 100,
        scheduledRoomId: null,
        clubId: existing.clubId,
        isPremium: existing.isPremium,
        isTicketRequired: existing.isTicketRequired,
        isSubscriberOnly: existing.isSubscriberOnly,
        isInviteOnly: existing.isInviteOnly,
        isVerifiedOnly: existing.isVerifiedOnly,
        ticketPriceAmount: existing.ticketPriceAmount,
        currency: existing.currency,
      });
      const savedRestart = await this.roomRepository.save(restarted);
      this.broadcastLifecycleEvent(savedRestart, 'room.created', 'room_created', savedRestart);
      return this.startRoom(savedRestart.id, userId);
    }
    const updated = await this.transitionRoom(id, userId, 'start');
    await this.realtimeRoomStateService.openRoom(updated);
    const room = updated;

    const payload = {
      roomId: id,
      title: room.title,
      hostId: userId,
      startedAt: room.startedAt,
      status: 'live',
    };

    this.broadcastLifecycleEvent(room, 'room.started', 'room_started', payload);
    return updated;
  }

  async pauseRoom(id: string, userId: string): Promise<Room> {
    const updated = await this.transitionRoom(id, userId, 'pause');
    await this.realtimeRoomStateService.setRoomPaused(updated);

    const payload = { roomId: id, hostId: userId, status: 'paused' };
    this.broadcastLifecycleEvent(updated, 'room.paused', 'room_paused', payload);
    return updated;
  }

  async resumeRoom(id: string, userId: string): Promise<Room> {
    await this.assertApprovedHost(userId);
    const updated = await this.transitionRoom(id, userId, 'resume');
    await this.realtimeRoomStateService.openRoom(updated);

    const payload = { roomId: id, hostId: userId, status: 'live' };
    this.broadcastLifecycleEvent(updated, 'room.resumed', 'room_resumed', payload);
    return updated;
  }

  async endRoom(id: string, userId: string): Promise<Room> {
    const updated = await this.transitionRoom(id, userId, 'end');
    await this.realtimeRoomStateService.closeRoom(id);
    const room = updated;

    const payload = {
      roomId: id,
      hostId: userId,
      endedAt: room.endedAt,
      status: 'ended',
    };

    this.broadcastLifecycleEvent(room, 'room.ended', 'room_ended', payload);
    return updated;
  }

  private broadcastLifecycleEvent(
    room: Room,
    roomEvent: string,
    publicEvent: string,
    payload: unknown,
  ): void {
    this.eventsGateway.broadcastToRoom(room.id, roomEvent, payload);
    if (this.isPubliclyDiscoverable(room)) {
      this.eventsGateway.server?.emit(publicEvent, payload);
    }
  }

  private isPubliclyDiscoverable(room: Room): boolean {
    return !room.isInviteOnly && !room.isLocked && !room.clubId;
  }

  private async transitionRoom(
    roomId: string,
    userId: string,
    action: RoomLifecycleAction,
  ): Promise<Room> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const roomRepository = manager.getRepository(Room);
      const scheduledRoomRepository = manager.getRepository(ScheduledRoom);
      const room = await roomRepository.findOne({
        where: { id: roomId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!room) {
        throw new NotFoundException(`Room with ID "${roomId}" not found`);
      }
      if (room.hostId !== userId) {
        throw new ForbiddenException(
          `Only the host can ${action} this broadcast`,
        );
      }

      let scheduled: ScheduledRoom | null = null;
      if (room.scheduledRoomId) {
        scheduled = await scheduledRoomRepository.findOne({
          where: { id: room.scheduledRoomId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!scheduled) {
          throw new BadRequestException('Linked scheduled room was not found');
        }
        if (scheduled.hostId !== userId) {
          throw new ForbiddenException(
            'Only the scheduled room host can manage this broadcast',
          );
        }
      }

      if (action === 'start') {
        if (
          scheduled &&
          scheduled.status !== ScheduledRoomStatus.SCHEDULED &&
          scheduled.status !== ScheduledRoomStatus.POSTPONED
        ) {
          throw new BadRequestException(
            `Scheduled room cannot go live while it is ${scheduled.status}`,
          );
        }
        this.roomLifecycleService.applyStart(room);
      } else if (action === 'pause') {
        this.roomLifecycleService.applyPause(room);
      } else if (action === 'resume') {
        this.roomLifecycleService.applyResume(room);
      } else {
        if (scheduled && scheduled.status !== ScheduledRoomStatus.LIVE) {
          throw new BadRequestException(
            `Scheduled room cannot complete while it is ${scheduled.status}`,
          );
        }
        this.roomLifecycleService.applyEnd(room);
      }

      const savedRoom = await roomRepository.save(room);
      if (scheduled) {
        if (action === 'start') {
          scheduled.status = ScheduledRoomStatus.LIVE;
        } else if (action === 'end') {
          scheduled.status = ScheduledRoomStatus.COMPLETED;
        }
        scheduled.liveRoom = savedRoom;
        await scheduledRoomRepository.save(scheduled);
      }
      return savedRoom;
    });
  }

  private async assertApprovedHost(userId: string): Promise<void> {
    let host;
    try {
      host = await this.hostsService.getHostProfile(userId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ForbiddenException(
          'Only an approved Host can create or start live rooms',
        );
      }
      throw error;
    }
    if (host.status !== HostVerificationStatus.APPROVED) {
      throw new ForbiddenException(
        'Only an approved Host can create or start live rooms',
      );
    }
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
      replayAudioUrl: null,
      listenerPeak: room.listenerCount || 0,
      totalGifts: room.giftActivity || 0,
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
