import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { EventsGateway } from '../../common/events/events.gateway';
import { ScheduledRoomStatus, VisibilityType } from '../../common/enums';
import { RealtimeRoomStateService } from '../../common/events/services/realtime-room-state.service';
import { HostsService } from '../hosts/hosts.service';
import {
  HostProfile,
  HostVerificationStatus,
} from '../hosts/entities/host-profile.entity';
import { StorageService } from '../storage/storage.service';
import { Room } from './entities/room.entity';
import { ScheduledRoom } from './entities/scheduled-room.entity';
import { RoomLifecycleStatus } from './enums/room-lifecycle-status.enum';
import { RoomLifecycleService } from './room-lifecycle.service';
import { RoomsService } from './rooms.service';
import { RoomAuthorityService } from './room-authority.service';

describe('RoomsService WP08-02 lifecycle authority', () => {
  let service: RoomsService;
  let roomRepository: jest.Mocked<Repository<Room>>;
  let transactionRoomRepository: jest.Mocked<Repository<Room>>;
  let scheduledRoomRepository: jest.Mocked<Repository<ScheduledRoom>>;
  let hostsService: { getHostProfile: jest.Mock };
  let eventsGateway: { broadcastToRoom: jest.Mock; server: { emit: jest.Mock } };
  let realtimeRoomStateService: {
    openRoom: jest.Mock;
    setRoomPaused: jest.Mock;
    closeRoom: jest.Mock;
    cleanupRoomState: jest.Mock;
  };

  const host = (status = HostVerificationStatus.APPROVED) =>
    ({ id: 'host-profile-1', userId: 'host-1', status }) as HostProfile;

  const room = (status = RoomLifecycleStatus.OFFLINE): Room =>
    ({
      id: 'room-1',
      title: 'WP08-02 room',
      hostId: 'host-1',
      status,
      isLive: status === RoomLifecycleStatus.LIVE,
      listenerCount: 3,
      speakerCount: 2,
      giftActivity: 0,
      popularityScore: 100,
      scheduledRoomId: 'scheduled-1',
    }) as Room;

  const scheduled = (
    status = ScheduledRoomStatus.SCHEDULED,
  ): ScheduledRoom =>
    ({
      id: 'scheduled-1',
      title: 'Scheduled WP08-02 room',
      hostId: 'host-1',
      status,
      maxParticipants: 100,
      category: 'Technology',
      language: 'ta',
      coverUrl: 'https://example.test/scheduled-cover.jpg',
      clubId: null,
      visibility: VisibilityType.PUBLIC,
      isInviteOnly: false,
      isPremium: false,
      ticketPriceAmount: 0,
    }) as ScheduledRoom;

  beforeEach(() => {
    roomRepository = {
      findOne: jest.fn(),
      create: jest.fn((value) => value as Room),
      save: jest.fn(async (value) => value as Room),
      remove: jest.fn(async (value) => value as Room),
    } as unknown as jest.Mocked<Repository<Room>>;

    transactionRoomRepository = {
      findOne: jest.fn(),
      create: jest.fn((value) => value as Room),
      save: jest.fn(async (value) =>
        ({ ...value, id: (value as Room).id ?? 'room-1' }) as Room,
      ),
    } as unknown as jest.Mocked<Repository<Room>>;

    scheduledRoomRepository = {
      findOne: jest.fn(),
      save: jest.fn(async (value) => value as ScheduledRoom),
    } as unknown as jest.Mocked<Repository<ScheduledRoom>>;

    const manager = {
      getRepository: jest.fn((entity) =>
        entity === Room ? transactionRoomRepository : scheduledRoomRepository,
      ),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    } as unknown as DataSource;

    hostsService = {
      getHostProfile: jest.fn().mockResolvedValue(host()),
    };
    realtimeRoomStateService = {
      openRoom: jest.fn().mockResolvedValue(undefined),
      setRoomPaused: jest.fn().mockResolvedValue(undefined),
      closeRoom: jest.fn().mockResolvedValue(undefined),
      cleanupRoomState: jest.fn().mockResolvedValue(undefined),
    };
    eventsGateway = {
      broadcastToRoom: jest.fn(),
      server: { emit: jest.fn() },
    };

    service = new RoomsService(
      roomRepository,
      {} as StorageService,
      eventsGateway as unknown as EventsGateway,
      new RoomLifecycleService(),
      realtimeRoomStateService as unknown as RealtimeRoomStateService,
      dataSource,
      hostsService as unknown as HostsService,
      { assertOwnerOrCoHost: jest.fn().mockResolvedValue(undefined) } as unknown as RoomAuthorityService,
    );
  });

  it('allows only an approved Host to create an offline room', async () => {
    transactionRoomRepository.findOne.mockResolvedValue(null);
    scheduledRoomRepository.findOne.mockResolvedValue(scheduled());

    const result = await service.createRoom('host-1', {
      title: 'WP08-02 room',
      scheduledRoomId: 'scheduled-1',
    });

    expect(result.status).toBe(RoomLifecycleStatus.OFFLINE);
    expect(result.isLive).toBe(false);
    expect(result.speakerCount).toBe(0);
    expect(result.hostId).toBe('host-1');
  });

  it('inherits protected scheduled-room access rules authoritatively', async () => {
    const linked = scheduled();
    linked.visibility = VisibilityType.PRIVATE;
    linked.isInviteOnly = true;
    linked.isPremium = true;
    linked.ticketPriceAmount = 25;
    linked.clubId = 'club-1';
    scheduledRoomRepository.findOne.mockResolvedValue(linked);
    transactionRoomRepository.findOne.mockResolvedValue(null);

    const result = await service.createRoom('host-1', {
      title: 'Protected live room',
      scheduledRoomId: linked.id,
    });

    expect(result.clubId).toBe('club-1');
    expect(result.category).toBe(linked.category);
    expect(result.language).toBe(linked.language);
    expect(result.isPremium).toBe(true);
    expect(result.isTicketRequired).toBe(true);
    expect(result.isInviteOnly).toBe(true);
    expect(result.ticketPriceAmount).toBe(25);
  });


  it('does not announce a restricted room to every connected client', async () => {
    const linked = scheduled();
    linked.visibility = VisibilityType.PRIVATE;
    linked.isInviteOnly = true;
    scheduledRoomRepository.findOne.mockResolvedValue(linked);
    transactionRoomRepository.findOne.mockResolvedValue(null);

    const result = await service.createRoom('host-1', {
      title: 'Private room',
      scheduledRoomId: linked.id,
    });

    expect(eventsGateway.broadcastToRoom).toHaveBeenCalledWith(
      result.id,
      'room.created',
      result,
    );
    expect(eventsGateway.server.emit).not.toHaveBeenCalledWith(
      'room_created',
      expect.anything(),
    );
  });

  it('continues announcing public rooms for discovery compatibility', async () => {
    transactionRoomRepository.findOne.mockResolvedValue(null);

    const result = await service.createRoom('host-1', {
      title: 'Public room',
    });

    expect(eventsGateway.server.emit).toHaveBeenCalledWith(
      'room_created',
      result,
    );
  });

  it('keeps invite-only, locked and club-only rooms out of public discovery', async () => {
    const queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    roomRepository.createQueryBuilder = jest
      .fn()
      .mockReturnValue(queryBuilder);

    await service.findAll({ page: 1, limit: 10 });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'room.isInviteOnly = false',
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'room.isLocked = false',
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('room.clubId IS NULL');
  });

  it('rejects room creation by a non-approved Host', async () => {
    hostsService.getHostProfile.mockResolvedValue(
      host(HostVerificationStatus.SUSPENDED),
    );

    await expect(
      service.createRoom('host-1', { title: 'Blocked room' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('starts a room and its scheduled-room record atomically', async () => {
    const target = room();
    const linked = scheduled();
    transactionRoomRepository.findOne.mockResolvedValue(target);
    scheduledRoomRepository.findOne.mockResolvedValue(linked);

    const result = await service.startRoom('room-1', 'host-1');

    expect(transactionRoomRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
    expect(result.status).toBe(RoomLifecycleStatus.LIVE);
    expect(result.isLive).toBe(true);
    expect(linked.status).toBe(ScheduledRoomStatus.LIVE);
    expect(scheduledRoomRepository.save).toHaveBeenCalledWith(linked);
    expect(realtimeRoomStateService.openRoom).toHaveBeenCalledWith(result);
  });


  it('restarts an ended manual room on the same room id without cloning it', async () => {
    const target = room(RoomLifecycleStatus.ENDED);
    target.scheduledRoomId = null;
    target.endedAt = new Date('2026-08-05T12:00:00.000Z');
    transactionRoomRepository.findOne.mockResolvedValue(target);
    scheduledRoomRepository.findOne.mockResolvedValue(null);

    const result = await service.startRoom('room-1', 'host-1');

    expect(result.id).toBe('room-1');
    expect(result.status).toBe(RoomLifecycleStatus.LIVE);
    expect(result.endedAt).toBeNull();
    expect(transactionRoomRepository.create).not.toHaveBeenCalled();
    expect(roomRepository.create).not.toHaveBeenCalled();
    expect(realtimeRoomStateService.openRoom).toHaveBeenCalledWith(result);
  });

  it('rejects a repeated start transition', async () => {
    transactionRoomRepository.findOne.mockResolvedValue(
      room(RoomLifecycleStatus.LIVE),
    );
    scheduledRoomRepository.findOne.mockResolvedValue(
      scheduled(ScheduledRoomStatus.LIVE),
    );

    await expect(service.startRoom('room-1', 'host-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('pauses a live room and clears its live flag', async () => {
    transactionRoomRepository.findOne.mockResolvedValue(
      room(RoomLifecycleStatus.LIVE),
    );
    scheduledRoomRepository.findOne.mockResolvedValue(
      scheduled(ScheduledRoomStatus.LIVE),
    );

    const result = await service.pauseRoom('room-1', 'host-1');

    expect(result.status).toBe(RoomLifecycleStatus.PAUSED);
    expect(result.isLive).toBe(false);
    expect(realtimeRoomStateService.setRoomPaused).toHaveBeenCalledWith(result);
  });

  it('ends a paused room and completes the linked scheduled room', async () => {
    const target = room(RoomLifecycleStatus.PAUSED);
    const linked = scheduled(ScheduledRoomStatus.LIVE);
    transactionRoomRepository.findOne.mockResolvedValue(target);
    scheduledRoomRepository.findOne.mockResolvedValue(linked);

    const result = await service.endRoom('room-1', 'host-1');

    expect(result.status).toBe(RoomLifecycleStatus.ENDED);
    expect(result.isLive).toBe(false);
    expect(result.listenerCount).toBe(0);
    expect(result.speakerCount).toBe(0);
    expect(linked.status).toBe(ScheduledRoomStatus.COMPLETED);
    expect(realtimeRoomStateService.closeRoom).toHaveBeenCalledWith('room-1');
  });

  it('rejects lifecycle management by a different user', async () => {
    transactionRoomRepository.findOne.mockResolvedValue(room());
    scheduledRoomRepository.findOne.mockResolvedValue(scheduled());

    await expect(
      service.startRoom('room-1', 'attacker-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
