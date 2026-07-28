import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProfileVisitorsService } from './visitors.service';
import { FriendsService } from './friends.service';
import { UserSettingsService } from './user-settings.service';
import { SocialIdentityService } from './social-identity.service';
import { ProfileVisitor } from './entities/profile-visitor.entity';
import { FriendRequest, FriendRequestStatus } from './entities/friend-request.entity';
import { UserFriend } from './entities/user-friend.entity';
import { UserSettings } from './entities/user-settings.entity';
import { User } from './entities/user.entity';
import { Badge } from './entities/badge.entity';

describe('Phase 17 - Profile, Social Identity & Visitors System Unit Tests', () => {
  let visitorsService: ProfileVisitorsService;
  let friendsService: FriendsService;
  let settingsService: UserSettingsService;
  let socialIdentityService: SocialIdentityService;

  const mockUserRepo = {
    findOne: jest.fn(),
    findBy: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockVisitorRepo = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ sum: '10' }),
      getCount: jest.fn().mockResolvedValue(5),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
    }),
  };

  const mockFriendRequestRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockUserFriendRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    }),
  };

  const mockSettingsRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockBadgeRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileVisitorsService,
        FriendsService,
        UserSettingsService,
        SocialIdentityService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(ProfileVisitor),
          useValue: mockVisitorRepo,
        },
        {
          provide: getRepositoryToken(FriendRequest),
          useValue: mockFriendRequestRepo,
        },
        {
          provide: getRepositoryToken(UserFriend),
          useValue: mockUserFriendRepo,
        },
        {
          provide: getRepositoryToken(UserSettings),
          useValue: mockSettingsRepo,
        },
        {
          provide: getRepositoryToken(Badge),
          useValue: mockBadgeRepo,
        },
      ],
    }).compile();

    visitorsService = module.get<ProfileVisitorsService>(ProfileVisitorsService);
    friendsService = module.get<FriendsService>(FriendsService);
    settingsService = module.get<UserSettingsService>(UserSettingsService);
    socialIdentityService = module.get<SocialIdentityService>(SocialIdentityService);

    jest.clearAllMocks();
  });

  describe('Profile Visitors', () => {
    it('should skip recording visit if target and visitor are identical', async () => {
      const result = await visitorsService.recordVisit('user-1', 'user-1');
      expect(result).toEqual({ skipped: true, reason: 'self-visit' });
    });

    it('should record a valid visit', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 'target-1', popularityScore: 10 });
      mockSettingsRepo.findOne.mockResolvedValue(null);
      mockVisitorRepo.findOne.mockResolvedValue(null);
      mockVisitorRepo.create.mockImplementation((data) => ({ ...data, visitedAt: new Date() }));
      mockVisitorRepo.save.mockImplementation((data) => Promise.resolve(data));

      const res = await visitorsService.recordVisit('target-1', 'visitor-1');
      expect(res.success).toBe(true);
      expect(mockVisitorRepo.save).toHaveBeenCalled();
    });
  });

  describe('Friends System', () => {
    it('should send a friend request successfully', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 'receiver-1' });
      mockUserFriendRepo.findOne.mockResolvedValue(null);
      mockFriendRequestRepo.findOne.mockResolvedValue(null);
      mockFriendRequestRepo.create.mockImplementation((data) => ({ id: 'req-1', ...data }));
      mockFriendRequestRepo.save.mockImplementation((data) => Promise.resolve(data));

      const res = await friendsService.sendFriendRequest('sender-1', {
        receiverId: 'receiver-1',
        message: 'Hello!',
      });

      expect(res.senderId).toBe('sender-1');
      expect(res.receiverId).toBe('receiver-1');
      expect(res.status).toBe(FriendRequestStatus.PENDING);
    });
  });

  describe('User Settings', () => {
    it('should create default settings if none exist', async () => {
      mockSettingsRepo.findOne.mockResolvedValue(null);
      mockSettingsRepo.create.mockImplementation((data) => data);
      mockSettingsRepo.save.mockImplementation((data) => Promise.resolve(data));

      const settings = await settingsService.getOrCreateUserSettings('user-1');
      expect(settings.userId).toBe('user-1');
      expect(settings.messagingPermission).toBe('everyone');
      expect(settings.allowVisitorTracking).toBe(true);
    });
  });

  describe('Social Identity', () => {
    it('should generate personal QR code payload with referral code', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 'user-1',
        username: 'john_doe',
        displayName: 'John Doe',
        referralCode: 'JOHN1234',
      });

      const qr = await socialIdentityService.getPersonalQrCode('user-1');
      expect(qr.userId).toBe('user-1');
      expect(qr.referralCode).toBe('JOHN1234');
      expect(qr.qrCodeDataUrl).toContain('https://api.qrserver.com');
    });
  });
});
