import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ScheduledRoomsService } from './scheduled-rooms.service';
import { ScheduledRoom } from './entities/scheduled-room.entity';
import { RoomTicket } from './entities/room-ticket.entity';
import { Club } from '../clubs/entities/club.entity';
import {
  ScheduledRoomStatus,
  VisibilityType,
  TicketStatus,
} from '../../common/enums';
import { CreateScheduledRoomDto } from './dto/create-scheduled-room.dto';
import { AdminSettingsService } from '../admin/admin-settings.service';
import { HostsService } from '../hosts/hosts.service';
import { HostVerificationStatus } from '../hosts/entities/host-profile.entity';

describe('ScheduledRoomsService (Phase 2B)', () => {
  let service: ScheduledRoomsService;
  let roomRepo: jest.Mocked<Repository<ScheduledRoom>>;
  let ticketRepo: jest.Mocked<Repository<RoomTicket>>;
  let clubRepo: jest.Mocked<Repository<Club>>;
  let adminSettingsService: { getOperationalSettings: jest.Mock };
  let hostsService: { getHostProfile: jest.Mock };

  const mockFutureDate = new Date(Date.now() + 86400000).toISOString();

  const getMockRoom = (): ScheduledRoom => ({
    id: 'sroom-123',
    title: 'Future Tech Keynote',
    description: 'A scheduled keynote about AI',
    category: 'Technology',
    language: 'en',
    tags: ['ai', 'tech'],
    coverUrl: 'http://example.com/cover.png',
    hostId: 'user-host',
    clubId: null,
    scheduledStartTime: new Date(Date.now() + 86400000),
    durationMinutes: 60,
    timeZone: 'UTC',
    status: ScheduledRoomStatus.SCHEDULED,
    visibility: VisibilityType.PUBLIC,
    isInviteOnly: false,
    maxParticipants: 100,
    rsvpCount: 5,
    isPremium: false,
    ticketPriceAmount: 0,
    currency: 'USD',
    reminderSettings: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    host: {} as any,
    club: null,
    tickets: [],
    liveRoom: null,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduledRoomsService,
        {
          provide: getRepositoryToken(ScheduledRoom),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RoomTicket),
          useValue: {
            count: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Club),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: HostsService,
          useValue: {
            getHostProfile: jest.fn().mockResolvedValue({
              id: 'host-profile-1',
              userId: 'user-host',
              status: HostVerificationStatus.APPROVED,
            }),
          },
        },
        {
          provide: AdminSettingsService,
          useValue: {
            getOperationalSettings: jest.fn().mockResolvedValue({
              maintenanceMode: false,
              maintenanceMessage: 'Available',
              maxRoomCapacity: 500,
              maxSpeakerSeats: 12,
              updatedAt: new Date(0).toISOString(),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ScheduledRoomsService>(ScheduledRoomsService);
    roomRepo = module.get(getRepositoryToken(ScheduledRoom));
    ticketRepo = module.get(getRepositoryToken(RoomTicket));
    clubRepo = module.get(getRepositoryToken(Club));
    adminSettingsService = module.get(AdminSettingsService);
    hostsService = module.get(HostsService);
  });

  describe('createScheduledRoom', () => {
    it('should create a scheduled room successfully', async () => {
      const room = getMockRoom();
      const dto: CreateScheduledRoomDto = {
        title: 'Future Tech Keynote',
        scheduledStartTime: mockFutureDate,
      };

      roomRepo.create.mockReturnValue(room);
      roomRepo.save.mockResolvedValue(room);

      const result = await service.createScheduledRoom('user-host', dto);

      expect(roomRepo.create).toHaveBeenCalled();
      expect(result).toBe(room);
    });

    it('rejects scheduling by a non-approved Host', async () => {
      hostsService.getHostProfile.mockResolvedValue({
        id: 'host-profile-1',
        userId: 'user-host',
        status: HostVerificationStatus.SUSPENDED,
      });

      await expect(
        service.createScheduledRoom('user-host', {
          title: 'Blocked Scheduled Room',
          scheduledStartTime: mockFutureDate,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(roomRepo.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for past start time', async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const dto: CreateScheduledRoomDto = {
        title: 'Past Room',
        scheduledStartTime: pastDate,
      };

      await expect(
        service.createScheduledRoom('user-host', dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if associated club does not exist', async () => {
      clubRepo.findOne.mockResolvedValue(null);
      const dto: CreateScheduledRoomDto = {
        title: 'Club Room',
        scheduledStartTime: mockFutureDate,
        clubId: 'non-existent-club',
      };

      await expect(
        service.createScheduledRoom('user-host', dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('uses the configured room capacity when none is supplied', async () => {
      const room = getMockRoom();
      adminSettingsService.getOperationalSettings.mockResolvedValue({
        maintenanceMode: false,
        maintenanceMessage: 'Available',
        maxRoomCapacity: 275,
        maxSpeakerSeats: 12,
        updatedAt: new Date(0).toISOString(),
      });
      roomRepo.create.mockImplementation((value) => value as ScheduledRoom);
      roomRepo.save.mockImplementation(async (value) => value as ScheduledRoom);

      const result = await service.createScheduledRoom('user-host', {
        title: 'Configured Capacity Room',
        scheduledStartTime: mockFutureDate,
      });

      expect(result.maxParticipants).toBe(275);
      expect(roomRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ maxParticipants: 275 }),
      );
    });

    it('rejects a requested capacity above the configured maximum', async () => {
      adminSettingsService.getOperationalSettings.mockResolvedValue({
        maintenanceMode: false,
        maintenanceMessage: 'Available',
        maxRoomCapacity: 200,
        maxSpeakerSeats: 12,
        updatedAt: new Date(0).toISOString(),
      });

      await expect(
        service.createScheduledRoom('user-host', {
          title: 'Oversized Room',
          scheduledStartTime: mockFutureDate,
          maxParticipants: 201,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(roomRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return scheduled room if found', async () => {
      const room = getMockRoom();
      roomRepo.findOne.mockResolvedValue(room);

      const result = await service.findOne('sroom-123');
      expect(result).toBe(room);
    });

    it('should throw NotFoundException if room not found', async () => {
      roomRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('sroom-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateScheduledRoom', () => {
    it('should update scheduled room when caller is host', async () => {
      const room = getMockRoom();
      roomRepo.findOne.mockResolvedValue(room);
      roomRepo.save.mockResolvedValue({
        ...room,
        title: 'Updated Title',
      });

      const result = await service.updateScheduledRoom(
        'sroom-123',
        'user-host',
        { title: 'Updated Title' },
      );

      expect(result.title).toBe('Updated Title');
    });

    it('should throw ForbiddenException when caller is not host', async () => {
      const room = getMockRoom();
      roomRepo.findOne.mockResolvedValue(room);

      await expect(
        service.updateScheduledRoom('sroom-123', 'other-user', {
          title: 'Unauthorized',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects edits after the linked room has gone live', async () => {
      const room = getMockRoom();
      room.status = ScheduledRoomStatus.LIVE;
      roomRepo.findOne.mockResolvedValue(room);

      await expect(
        service.updateScheduledRoom('sroom-123', 'user-host', {
          title: 'Late edit',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(roomRepo.save).not.toHaveBeenCalled();
    });

    it('rejects capacity updates above the configured maximum', async () => {
      const room = getMockRoom();
      roomRepo.findOne.mockResolvedValue(room);
      adminSettingsService.getOperationalSettings.mockResolvedValue({
        maintenanceMode: false,
        maintenanceMessage: 'Available',
        maxRoomCapacity: 150,
        maxSpeakerSeats: 12,
        updatedAt: new Date(0).toISOString(),
      });

      await expect(
        service.updateScheduledRoom('sroom-123', 'user-host', {
          maxParticipants: 151,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(roomRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('deleteScheduledRoom', () => {
    it('rejects cancellation after the linked room has gone live', async () => {
      const room = getMockRoom();
      room.status = ScheduledRoomStatus.LIVE;
      roomRepo.findOne.mockResolvedValue(room);

      await expect(
        service.deleteScheduledRoom('sroom-123', 'user-host'),
      ).rejects.toThrow(BadRequestException);
      expect(roomRepo.save).not.toHaveBeenCalled();
    });

    it('should cancel room when caller is host', async () => {
      const room = getMockRoom();
      roomRepo.findOne.mockResolvedValue(room);
      roomRepo.save.mockResolvedValue({
        ...room,
        status: ScheduledRoomStatus.CANCELLED,
      });

      const result = await service.deleteScheduledRoom(
        'sroom-123',
        'user-host',
      );

      expect(result.message).toContain('cancelled successfully');
    });
  });

  describe('getLobbyInfo', () => {
    it('should return lobby info with countdown and ticket status', async () => {
      const room = getMockRoom();
      roomRepo.findOne.mockResolvedValue(room);
      ticketRepo.count.mockResolvedValue(10);
      ticketRepo.findOne.mockResolvedValue(null);

      const lobby = await service.getLobbyInfo('sroom-123', 'user-guest');

      expect(lobby.ticketsSold).toBe(10);
      expect(lobby.hasTicket).toBe(false);
      expect(lobby.countdownSeconds).toBeGreaterThan(0);
    });
  });

  describe('registerReminder', () => {
    it('should increment rsvp count and return confirmation', async () => {
      const room = getMockRoom();
      roomRepo.findOne.mockResolvedValue(room);
      roomRepo.save.mockImplementation(async (entity: any) => entity);

      const result = await service.registerReminder('sroom-123', 'user-guest');

      expect(result.rsvpCount).toBe(6);
    });
  });
});
