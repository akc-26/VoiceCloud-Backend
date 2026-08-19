import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { SystemSetting } from '../admin/entities/system-setting.entity';
import {
  ModerationAction,
  ModerationActionType,
} from '../moderation/entities/moderation-action.entity';
import { Room } from '../rooms/entities/room.entity';
import { User } from '../users/entities/user.entity';
import { HostEligibilityService } from './host-eligibility.service';

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

function setting(key: string, value: string): SystemSetting {
  return { key, value } as SystemSetting;
}

function action(
  actionType: ModerationActionType,
  overrides: Partial<ModerationAction> = {},
): ModerationAction {
  return {
    actionType,
    isPermanent: false,
    expiresAt: null,
    createdAt: new Date('2026-08-03T00:00:00.000Z'),
    ...overrides,
  } as ModerationAction;
}

describe('Backend-authoritative Host eligibility (B3-1)', () => {
  const userRepository = {
    findOne: jest.fn(),
  };
  const roomRepository = {
    count: jest.fn(),
  };
  const moderationActionRepository = {
    find: jest.fn(),
  };
  const settingRepository = {
    find: jest.fn(),
  };

  let service: HostEligibilityService;

  beforeEach(() => {
    jest.clearAllMocks();
    userRepository.findOne.mockResolvedValue({
      id: 'creator-user-id',
      followersCount: 75,
    });
    roomRepository.count.mockResolvedValue(4);
    moderationActionRepository.find.mockResolvedValue([]);
    settingRepository.find.mockResolvedValue([
      setting('host_applications_enabled', 'true'),
      setting('min_host_followers', '50'),
      setting('min_host_completed_rooms', '3'),
      setting('require_host_good_standing', 'true'),
    ]);

    service = new HostEligibilityService(
      userRepository as unknown as Repository<User>,
      roomRepository as unknown as Repository<Room>,
      moderationActionRepository as unknown as Repository<ModerationAction>,
      settingRepository as unknown as Repository<SystemSetting>,
    );
  });

  it('evaluates actual persisted follower and completed-room counts', async () => {
    const result = await service.evaluate('creator-user-id');

    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'creator-user-id' },
      select: { id: true, followersCount: true },
    });
    expect(roomRepository.count).toHaveBeenCalledWith({
      where: { hostId: 'creator-user-id', status: 'ended' },
    });
    expect(result.eligible).toBe(true);
    expect(result.requirements.followers).toEqual({
      current: 75,
      minimum: 50,
      met: true,
    });
    expect(result.requirements.completedRooms).toEqual({
      current: 4,
      minimum: 3,
      met: true,
    });
  });

  it('rejects insufficient followers using the configured requirement', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 'creator-user-id',
      followersCount: 49,
    });

    const result = await service.evaluate('creator-user-id');

    expect(result.eligible).toBe(false);
    expect(result.requirements.followers.met).toBe(false);
    expect(result.reasons).toContain(
      'At least 50 followers are required; current count is 49.',
    );
  });

  it('rejects insufficient completed rooms using the configured requirement', async () => {
    roomRepository.count.mockResolvedValue(2);

    const result = await service.evaluate('creator-user-id');

    expect(result.eligible).toBe(false);
    expect(result.requirements.completedRooms.met).toBe(false);
    expect(result.reasons).toContain(
      'At least 3 completed rooms are required; current count is 2.',
    );
  });

  it('blocks an active permanent moderation ban', async () => {
    moderationActionRepository.find.mockResolvedValue([
      action(ModerationActionType.BAN, { isPermanent: true }),
    ]);

    const result = await service.evaluate('creator-user-id');

    expect(result.eligible).toBe(false);
    expect(result.requirements.communityStanding.met).toBe(false);
  });

  it('does not treat an expired restriction as active', async () => {
    moderationActionRepository.find.mockResolvedValue([
      action(ModerationActionType.SUSPEND, {
        expiresAt: new Date('2025-01-01T00:00:00.000Z'),
      }),
    ]);

    const result = await service.evaluate('creator-user-id');

    expect(result.requirements.communityStanding.met).toBe(true);
    expect(result.eligible).toBe(true);
  });

  it('honors a newer unban over an older permanent ban', async () => {
    moderationActionRepository.find.mockResolvedValue([
      action(ModerationActionType.UNBAN, {
        createdAt: new Date('2026-08-03T00:00:00.000Z'),
      }),
      action(ModerationActionType.BAN, {
        isPermanent: true,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
      }),
    ]);

    const result = await service.evaluate('creator-user-id');

    expect(result.requirements.communityStanding.met).toBe(true);
  });

  it('skips moderation lookup when good standing is not required', async () => {
    settingRepository.find.mockResolvedValue([
      setting('host_applications_enabled', 'true'),
      setting('min_host_followers', '50'),
      setting('min_host_completed_rooms', '3'),
      setting('require_host_good_standing', 'false'),
    ]);

    const result = await service.evaluate('creator-user-id');

    expect(moderationActionRepository.find).not.toHaveBeenCalled();
    expect(result.requirements.communityStanding).toEqual({
      required: false,
      met: true,
    });
  });

  it('supports an explicit zero requirement without replacing it with a fallback', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 'creator-user-id',
      followersCount: 0,
    });
    roomRepository.count.mockResolvedValue(0);
    settingRepository.find.mockResolvedValue([
      setting('host_applications_enabled', 'true'),
      setting('min_host_followers', '0'),
      setting('min_host_completed_rooms', '0'),
      setting('require_host_good_standing', 'false'),
    ]);

    await expect(service.evaluate('creator-user-id')).resolves.toMatchObject({
      eligible: true,
      requirements: {
        followers: { minimum: 0, met: true },
        completedRooms: { minimum: 0, met: true },
      },
    });
  });

  it('uses secure defaults when eligibility settings have not been seeded yet', async () => {
    settingRepository.find.mockResolvedValue([]);

    const result = await service.evaluate('creator-user-id');

    expect(result.applicationsEnabled).toBe(true);
    expect(result.requirements.followers.minimum).toBe(50);
    expect(result.requirements.completedRooms.minimum).toBe(3);
    expect(result.requirements.communityStanding.required).toBe(true);
  });

  it('fails closed for invalid numeric configuration', async () => {
    settingRepository.find.mockResolvedValue([
      setting('min_host_followers', '-1'),
    ]);

    await expect(service.evaluate('creator-user-id')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('fails closed for invalid boolean configuration', async () => {
    settingRepository.find.mockResolvedValue([
      setting('host_applications_enabled', 'yes'),
    ]);

    await expect(service.evaluate('creator-user-id')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('rejects eligibility checks for a missing authenticated user', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.evaluate('missing-user')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('blocks applications when the platform setting disables them', async () => {
    settingRepository.find.mockResolvedValue([
      setting('host_applications_enabled', 'false'),
      setting('min_host_followers', '50'),
      setting('min_host_completed_rooms', '3'),
      setting('require_host_good_standing', 'true'),
    ]);

    await expect(service.assertEligible('creator-user-id')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('returns a controlled bad request when requirements are not met', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 'creator-user-id',
      followersCount: 1,
    });

    await expect(service.assertEligible('creator-user-id')).rejects.toThrow(
      BadRequestException,
    );
  });

  describe('Backend and Creator contract integration', () => {
    const hostsService = source('src/modules/hosts/hosts.service.ts');
    const controller = source('src/modules/hosts/hosts.controller.ts');
    const settings = source('src/modules/admin/admin-settings.service.ts');
    const creatorApi = source('creator/src/services/creator-api.service.ts');
    const creatorPage = source('creator/src/pages/HostVerificationPage.tsx');

    it('enforces eligibility before every new or rejected application path', () => {
      expect(
        hostsService.match(
          /getEligibilityService\(\)\.assertEligible\(userId\)/g,
        ),
      ).toHaveLength(2);
    });

    it('exposes an authenticated Swagger-documented eligibility endpoint', () => {
      expect(controller).toContain("@Get('eligibility')");
      expect(controller).toContain('type: HostEligibilityResponseDto');
      expect(controller).toContain('@UseGuards(JwtAuthGuard)');
    });

    it('seeds the approved configurable eligibility requirements', () => {
      expect(settings).toContain("key: 'host_applications_enabled'");
      expect(settings).toContain("key: 'min_host_followers'");
      expect(settings).toContain("key: 'min_host_completed_rooms'");
      expect(settings).toContain("key: 'require_host_good_standing'");
    });

    it('uses the backend eligibility response in Creator Studio without fabricated results', () => {
      expect(creatorApi).toContain("'/hosts/eligibility'");
      expect(creatorPage).toContain('eligibility?.requirements.followers');
      expect(creatorPage).toContain('eligibility?.requirements.completedRooms');
      expect(creatorPage).toContain(
        'eligibility?.requirements.communityStanding',
      );
      expect(creatorPage).not.toContain('Min 3 public voice rooms hosted');
      expect(creatorPage).not.toContain(
        'label="Good Standing" color="success"',
      );
    });
  });
});
