import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Follow } from './entities/follow.entity';
import { CreatorSubscription } from './entities/creator-subscription.entity';
import { CreatorPayoutRequest } from './entities/creator-payout-request.entity';
import { CreatorPayoutLifecycleService } from '../wallet/creator-payout-lifecycle.service';
import { CreatorPlan } from './entities/creator-plan.entity';
import { StorageService } from '../storage/storage.service';
import { ExperienceType } from './dto/experience.dto';

describe('Phase 17 - User Profile & Social Identity Platform', () => {
  let service: UsersService;
  let mockUserRepository: any;
  let mockFollowRepository: any;
  let mockStorageService: any;

  beforeEach(async () => {
    mockUserRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn((u) => Promise.resolve({ ...u })),
      update: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
    };

    mockFollowRepository = {
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn().mockResolvedValue(null),
    };

    mockStorageService = {
      uploadFile: jest
        .fn()
        .mockResolvedValue({ publicUrl: 'https://cdn.example.com/cover.jpg' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: CreatorPayoutLifecycleService,
          useValue: { reserve: jest.fn() },
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(Follow), useValue: mockFollowRepository },
        { provide: getRepositoryToken(CreatorSubscription), useValue: {} },
        { provide: getRepositoryToken(CreatorPayoutRequest), useValue: {} },
        { provide: getRepositoryToken(CreatorPlan), useValue: {} },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('User Entity & Initialization', () => {
    it('should correctly set Phase 17 fields on User entity', () => {
      const user = new User();
      user.id = 'user-123';
      user.displayName = 'Alice Morgan';
      user.username = 'alice_m';
      user.statusMessage = 'Hosting live music rooms tonight!';
      user.wealthLevel = 5;
      user.wealthExp = 2500;
      user.charmLevel = 10;
      user.charmExp = 5000;
      user.badges = ['Top-Giver-2026', 'VIP-Host'];
      user.customTags = ['Singer', 'DJ', 'Tech'];
      user.privacySettings = {
        showOnlineStatus: true,
        showLastSeen: false,
        allowDirectMessages: true,
        showGifts: true,
      };

      expect(user.displayName).toBe('Alice Morgan');
      expect(user.statusMessage).toBe('Hosting live music rooms tonight!');
      expect(user.wealthLevel).toBe(5);
      expect(user.charmLevel).toBe(10);
      expect(user.badges).toContain('Top-Giver-2026');
      expect(user.customTags).toHaveLength(3);
      expect(user.privacySettings.showLastSeen).toBe(false);
    });
  });

  describe('Profile Completion & Level Titles', () => {
    it('should calculate profile completion percentage accurately', () => {
      const user = new User();
      user.displayName = 'Alice';
      user.username = 'alice';
      user.bio = 'Singer and Voice host';
      user.statusMessage = 'Available';
      user.gender = 'female';
      user.avatarUrl = 'https://cdn.example.com/avatar.jpg';
      user.coverUrl = 'https://cdn.example.com/cover.jpg';
      user.country = 'US';
      user.interests = ['music', 'podcasts'];
      user.socialLinks = { twitter: 'https://twitter.com/alice' };

      const percentage = service.calculateProfileCompletion(user);
      expect(percentage).toBe(100);
    });

    it('should return correct wealth titles for given levels', () => {
      expect(service.getWealthTitle(1)).toBe('Citizen');
      expect(service.getWealthTitle(10)).toBe('Baron');
      expect(service.getWealthTitle(20)).toBe('Viscount');
      expect(service.getWealthTitle(40)).toBe('Earl');
      expect(service.getWealthTitle(60)).toBe('Duke');
      expect(service.getWealthTitle(80)).toBe('Prince');
      expect(service.getWealthTitle(100)).toBe('King');
    });

    it('should return correct charm titles for given levels', () => {
      expect(service.getCharmTitle(2)).toBe('Newcomer');
      expect(service.getCharmTitle(12)).toBe('Attractive');
      expect(service.getCharmTitle(25)).toBe('Popular');
      expect(service.getCharmTitle(45)).toBe('Star');
      expect(service.getCharmTitle(70)).toBe('Idol');
      expect(service.getCharmTitle(90)).toBe('Legend');
      expect(service.getCharmTitle(100)).toBe('Goddess');
    });
  });

  describe('Experience & Badges Management', () => {
    it('should add wealth experience and upgrade wealth level', async () => {
      const user = new User();
      user.id = 'user-1';
      user.wealthExp = 0;
      user.wealthLevel = 1;

      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.addExperience('user-1', {
        type: ExperienceType.WEALTH,
        amount: 2500,
      });

      expect(result.wealthExp).toBe(2500);
      expect(result.wealthLevel).toBe(6);
      expect(result.wealthTitle).toBe('Baron');
    });

    it('should assign and remove badges correctly', async () => {
      const user = new User();
      user.id = 'user-1';
      user.badges = ['Early-Adopter'];

      mockUserRepository.findOne.mockResolvedValue(user);

      const assignResult = await service.assignBadge('user-1', 'Super-Star');
      expect(assignResult.badges).toEqual(['Early-Adopter', 'Super-Star']);

      const removeResult = await service.removeBadge('user-1', 'Early-Adopter');
      expect(removeResult.badges).toEqual(['Super-Star']);
    });
  });

  describe('Privacy Settings', () => {
    it('should return default privacy settings if not set', async () => {
      const user = new User();
      user.id = 'user-1';
      mockUserRepository.findOne.mockResolvedValue(user);

      const settings = await service.getPrivacySettings('user-1');
      expect(settings.showOnlineStatus).toBe(true);
      expect(settings.showLastSeen).toBe(true);
      expect(settings.allowDirectMessages).toBe(true);
    });

    it('should update privacy settings successfully', async () => {
      const user = new User();
      user.id = 'user-1';
      user.privacySettings = {
        showOnlineStatus: true,
        showLastSeen: true,
        allowDirectMessages: true,
        showGifts: true,
      };
      mockUserRepository.findOne.mockResolvedValue(user);

      await service.updatePrivacySettings('user-1', {
        showOnlineStatus: false,
      });

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          privacySettings: expect.objectContaining({
            showOnlineStatus: false,
            showLastSeen: true,
          }),
        }),
      );
    });
  });
});
