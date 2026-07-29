import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { RoomTicketsService } from './room-tickets.service';
import { RoomTicket } from './entities/room-ticket.entity';
import { ScheduledRoom } from './entities/scheduled-room.entity';
import { ScheduledRoomStatus, TicketStatus } from '../../common/enums';

describe('RoomTicketsService (Phase 2B)', () => {
  let service: RoomTicketsService;
  let ticketRepo: jest.Mocked<Repository<RoomTicket>>;
  let roomRepo: jest.Mocked<Repository<ScheduledRoom>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockScheduledRoom: ScheduledRoom = {
    id: 'sroom-123',
    title: 'Paid Exclusive Talk',
    description: 'Exclusive talk',
    category: 'General',
    language: 'en',
    tags: [],
    coverUrl: null,
    hostId: 'user-host',
    clubId: null,
    scheduledStartTime: new Date(Date.now() + 86400000),
    durationMinutes: 60,
    timeZone: 'UTC',
    status: ScheduledRoomStatus.SCHEDULED,
    visibility: 'PUBLIC' as any,
    isInviteOnly: false,
    maxParticipants: 2,
    rsvpCount: 0,
    isPremium: true,
    ticketPriceAmount: 15.0,
    currency: 'USD',
    reminderSettings: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    host: {} as any,
    club: null,
    tickets: [],
    liveRoom: null,
  };

  const mockTicket: RoomTicket = {
    id: 'tkt-123',
    ticketCode: 'TKT-ABC123',
    scheduledRoomId: 'sroom-123',
    roomId: null,
    userId: 'user-buyer',
    priceUsd: 15.0,
    status: TicketStatus.ACTIVE,
    isValid: true,
    purchasedAt: new Date(),
    usedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    scheduledRoom: mockScheduledRoom,
    room: null,
    user: {} as any,
  };

  beforeEach(async () => {
    const mockEntityManager = {
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomTicketsService,
        {
          provide: getRepositoryToken(RoomTicket),
          useValue: {
            findAndCount: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ScheduledRoom),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest
              .fn()
              .mockImplementation((cb) => cb(mockEntityManager)),
          },
        },
      ],
    }).compile();

    service = module.get<RoomTicketsService>(RoomTicketsService);
    ticketRepo = module.get(getRepositoryToken(RoomTicket));
    roomRepo = module.get(getRepositoryToken(ScheduledRoom));
    dataSource = module.get(DataSource);
  });

  describe('buyTicket', () => {
    it('should purchase a ticket successfully', async () => {
      const mockEntityManager = (dataSource.transaction as jest.Mock).mock
        .calls[0]?.[0];

      // Re-setup transaction execution for test
      (dataSource.transaction as jest.Mock).mockImplementationOnce(
        async (cb) => {
          const em = {
            findOne: jest
              .fn()
              .mockResolvedValueOnce(mockScheduledRoom) // room
              .mockResolvedValueOnce(null), // existing ticket check
            count: jest.fn().mockResolvedValue(0), // capacity check
            create: jest.fn().mockReturnValue(mockTicket),
            save: jest
              .fn()
              .mockResolvedValueOnce(mockTicket)
              .mockResolvedValueOnce(mockScheduledRoom),
          };
          return cb(em);
        },
      );

      const ticket = await service.buyTicket('sroom-123', 'user-buyer');

      expect(ticket).toBe(mockTicket);
    });

    it('should throw ConflictException if user already owns an active ticket', async () => {
      (dataSource.transaction as jest.Mock).mockImplementationOnce(
        async (cb) => {
          const em = {
            findOne: jest
              .fn()
              .mockResolvedValueOnce(mockScheduledRoom)
              .mockResolvedValueOnce(mockTicket), // existing ticket found
            count: jest.fn().mockResolvedValue(0),
          };
          return cb(em);
        },
      );

      await expect(
        service.buyTicket('sroom-123', 'user-buyer'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if capacity full', async () => {
      (dataSource.transaction as jest.Mock).mockImplementationOnce(
        async (cb) => {
          const em = {
            findOne: jest
              .fn()
              .mockResolvedValueOnce(mockScheduledRoom)
              .mockResolvedValueOnce(null),
            count: jest.fn().mockResolvedValue(2), // maxParticipants is 2
          };
          return cb(em);
        },
      );

      await expect(
        service.buyTicket('sroom-123', 'user-buyer'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMyTickets', () => {
    it('should return paginated tickets for user', async () => {
      ticketRepo.findAndCount.mockResolvedValue([[mockTicket], 1]);

      const result = await service.getMyTickets('user-buyer', 1, 10);

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getTicketById', () => {
    it('should return ticket if user is owner', async () => {
      ticketRepo.findOne.mockResolvedValue(mockTicket);

      const ticket = await service.getTicketById('tkt-123', 'user-buyer');
      expect(ticket).toBe(mockTicket);
    });

    it('should throw ForbiddenException if user is not ticket owner', async () => {
      ticketRepo.findOne.mockResolvedValue(mockTicket);

      await expect(
        service.getTicketById('tkt-123', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
