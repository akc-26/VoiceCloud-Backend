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

describe('ScheduledRoomsService (Phase 2B)', () => {
  let service: ScheduledRoomsService;
  let roomRepo: jest.Mocked<Repository<ScheduledRoom>>;
  let ticketRepo: jest.Mocked<Repository<RoomTicket>>;
  let clubRepo: jest.Mocked<Repository<Club>>;

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
      ],
    }).compile();

    service = module.get<ScheduledRoomsService>(ScheduledRoomsService);
    roomRepo = module.get(getRepositoryToken(ScheduledRoom));
    ticketRepo = module.get(getRepositoryToken(RoomTicket));
    clubRepo = module.get(getRepositoryToken(Club));
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
  });

  describe('deleteScheduledRoom', () => {
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
