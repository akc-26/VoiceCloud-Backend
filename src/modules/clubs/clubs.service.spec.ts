import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { Club } from './entities/club.entity';
import { ClubMember } from './entities/club-member.entity';
import { ScheduledRoom } from '../rooms/entities/scheduled-room.entity';
import { ClubRole, VisibilityType } from '../../common/enums';
import { CreateClubDto } from './dto/create-club.dto';

describe('ClubsService (Phase 2A Business Layer)', () => {
  let service: ClubsService;
  let clubRepo: jest.Mocked<Repository<Club>>;
  let memberRepo: jest.Mocked<Repository<ClubMember>>;
  let scheduledRoomRepo: jest.Mocked<Repository<ScheduledRoom>>;

  const mockClub: Club = {
    id: 'club-123',
    name: 'Tech Enthusiasts',
    handle: 'tech_enthusiasts',
    description: 'A club for tech lovers',
    imageUrl: 'http://example.com/logo.png',
    bannerUrl: 'http://example.com/banner.png',
    category: 'Technology',
    rules: ['Be respectful'],
    visibility: VisibilityType.PUBLIC,
    memberCount: 1,
    hostCount: 1,
    upcomingRoomsCount: 0,
    ownerId: 'user-owner',
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: {} as any,
    members: [],
    scheduledRooms: [],
    rooms: [],
  };

  const mockOwnerMember: ClubMember = {
    id: 'mem-1',
    clubId: 'club-123',
    userId: 'user-owner',
    role: ClubRole.OWNER,
    joinedAt: new Date(),
    updatedAt: new Date(),
    club: mockClub,
    user: {} as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClubsService,
        {
          provide: getRepositoryToken(Club),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ClubMember),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ScheduledRoom),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ClubsService>(ClubsService);
    clubRepo = module.get(getRepositoryToken(Club));
    memberRepo = module.get(getRepositoryToken(ClubMember));
    scheduledRoomRepo = module.get(getRepositoryToken(ScheduledRoom));
  });

  describe('createClub', () => {
    it('should create a club and assign owner as member', async () => {
      const dto: CreateClubDto = {
        name: 'Tech Enthusiasts',
        handle: 'tech_enthusiasts',
        category: 'Technology',
      };

      clubRepo.findOne.mockResolvedValue(null);
      clubRepo.create.mockReturnValue(mockClub);
      clubRepo.save.mockResolvedValue(mockClub);

      memberRepo.create.mockReturnValue(mockOwnerMember);
      memberRepo.save.mockResolvedValue(mockOwnerMember);

      const result = await service.createClub('user-owner', dto);

      expect(clubRepo.findOne).toHaveBeenCalledWith({
        where: { handle: 'tech_enthusiasts' },
      });
      expect(clubRepo.create).toHaveBeenCalled();
      expect(memberRepo.create).toHaveBeenCalledWith({
        clubId: 'club-123',
        userId: 'user-owner',
        role: ClubRole.OWNER,
      });
      expect(result).toBe(mockClub);
    });

    it('should throw ConflictException if handle is taken', async () => {
      clubRepo.findOne.mockResolvedValue(mockClub);

      await expect(
        service.createClub('user-owner', {
          name: 'Tech Enthusiasts',
          handle: 'tech_enthusiasts',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return a club if found', async () => {
      clubRepo.findOne.mockResolvedValue(mockClub);

      const result = await service.findOne('club-123');
      expect(result).toBe(mockClub);
    });

    it('should throw NotFoundException if club not found', async () => {
      clubRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateClub', () => {
    it('should update club if user is owner or admin', async () => {
      clubRepo.findOne.mockResolvedValue(mockClub);
      memberRepo.findOne.mockResolvedValue(mockOwnerMember);
      clubRepo.save.mockResolvedValue({ ...mockClub, name: 'Updated Name' });

      const result = await service.updateClub('club-123', 'user-owner', {
        name: 'Updated Name',
      });
      expect(result.name).toBe('Updated Name');
    });

    it('should throw ForbiddenException if user is not owner/admin', async () => {
      clubRepo.findOne.mockResolvedValue(mockClub);
      memberRepo.findOne.mockResolvedValue({
        ...mockOwnerMember,
        userId: 'user-regular',
        role: ClubRole.MEMBER,
      });

      await expect(
        service.updateClub('club-123', 'user-regular', {
          name: 'Unauthorized',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('joinClub', () => {
    it('should allow joining a public club', async () => {
      const regularMember: ClubMember = {
        id: 'mem-2',
        clubId: 'club-123',
        userId: 'user-regular',
        role: ClubRole.MEMBER,
        joinedAt: new Date(),
        updatedAt: new Date(),
        club: mockClub,
        user: {} as any,
      };

      clubRepo.findOne.mockResolvedValue(mockClub);
      memberRepo.findOne.mockResolvedValue(null);
      memberRepo.create.mockReturnValue(regularMember);
      memberRepo.save.mockResolvedValue(regularMember);
      clubRepo.save.mockResolvedValue(mockClub);

      const result = await service.joinClub('club-123', 'user-regular');
      expect(result.role).toBe(ClubRole.MEMBER);
    });

    it('should throw ConflictException if user is already a member', async () => {
      clubRepo.findOne.mockResolvedValue(mockClub);
      memberRepo.findOne.mockResolvedValue(mockOwnerMember);

      await expect(service.joinClub('club-123', 'user-owner')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ForbiddenException if joining private club without invite code', async () => {
      const privateClub = { ...mockClub, visibility: VisibilityType.PRIVATE };
      clubRepo.findOne.mockResolvedValue(privateClub);
      memberRepo.findOne.mockResolvedValue(null);

      await expect(
        service.joinClub('club-123', 'user-regular'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('leaveClub', () => {
    it('should throw BadRequestException if owner attempts to leave', async () => {
      clubRepo.findOne.mockResolvedValue(mockClub);
      memberRepo.findOne.mockResolvedValue(mockOwnerMember);

      await expect(service.leaveClub('club-123', 'user-owner')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow regular member to leave', async () => {
      const regularMember = {
        ...mockOwnerMember,
        userId: 'user-regular',
        role: ClubRole.MEMBER,
      };
      clubRepo.findOne.mockResolvedValue(mockClub);
      memberRepo.findOne.mockResolvedValue(regularMember);
      memberRepo.remove.mockResolvedValue(regularMember);
      clubRepo.save.mockResolvedValue(mockClub);

      const response = await service.leaveClub('club-123', 'user-regular');
      expect(response.message).toContain('Successfully left');
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role when requested by owner', async () => {
      const targetMember = {
        ...mockOwnerMember,
        id: 'mem-2',
        userId: 'user-target',
        role: ClubRole.MEMBER,
      };
      clubRepo.findOne.mockResolvedValue(mockClub);
      memberRepo.findOne
        .mockResolvedValueOnce(mockOwnerMember) // caller
        .mockResolvedValueOnce(targetMember); // target

      memberRepo.save.mockResolvedValue({
        ...targetMember,
        role: ClubRole.ADMIN,
      });

      const result = await service.updateMemberRole(
        'club-123',
        'user-target',
        'user-owner',
        {
          role: ClubRole.ADMIN,
        },
      );

      expect(result.role).toBe(ClubRole.ADMIN);
    });
  });

  describe('getScheduledRooms & linkScheduledRoom', () => {
    it('should return scheduled rooms for a valid club', async () => {
      clubRepo.findOne.mockResolvedValue(mockClub);
      scheduledRoomRepo.find.mockResolvedValue([
        { id: 'room-1', title: 'Tech Talk', clubId: 'club-123' } as any,
      ]);

      const rooms = await service.getScheduledRooms('club-123');
      expect(rooms).toHaveLength(1);
      expect(rooms[0].title).toBe('Tech Talk');
    });

    it('should throw NotFoundException if club does not exist when fetching scheduled rooms', async () => {
      clubRepo.findOne.mockResolvedValue(null);
      await expect(service.getScheduledRooms('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should link a scheduled room to a club if caller is a member', async () => {
      clubRepo.findOne.mockResolvedValue(mockClub);
      memberRepo.findOne.mockResolvedValue(mockOwnerMember);
      const mockScheduledRoom = {
        id: 'room-1',
        title: 'Unlinked Room',
        clubId: null,
      };
      scheduledRoomRepo.findOne.mockResolvedValue(mockScheduledRoom as any);
      scheduledRoomRepo.save.mockImplementation((r) => Promise.resolve(r));

      const linked = await service.linkScheduledRoom(
        'club-123',
        'user-owner',
        'room-1',
      );
      expect(linked.clubId).toBe('club-123');
    });

    it('should throw ForbiddenException if non-member tries to link room', async () => {
      clubRepo.findOne.mockResolvedValue(mockClub);
      memberRepo.findOne.mockResolvedValue(null);

      await expect(
        service.linkScheduledRoom('club-123', 'outsider', 'room-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
