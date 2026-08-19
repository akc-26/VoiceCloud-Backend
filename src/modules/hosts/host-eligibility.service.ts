import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SystemSetting } from '../admin/entities/system-setting.entity';
import {
  ModerationAction,
  ModerationActionType,
} from '../moderation/entities/moderation-action.entity';
import { Room } from '../rooms/entities/room.entity';
import { User } from '../users/entities/user.entity';
import { HostEligibilityResponseDto } from './dto/host-eligibility-response.dto';

const ELIGIBILITY_SETTING_KEYS = [
  'host_applications_enabled',
  'min_host_followers',
  'min_host_completed_rooms',
  'require_host_good_standing',
] as const;

interface HostEligibilityConfig {
  applicationsEnabled: boolean;
  minFollowers: number;
  minCompletedRooms: number;
  requireGoodStanding: boolean;
}

@Injectable()
export class HostEligibilityService {
  private readonly logger = new Logger(HostEligibilityService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(ModerationAction)
    private readonly moderationActionRepository: Repository<ModerationAction>,
    @InjectRepository(SystemSetting)
    private readonly settingRepository: Repository<SystemSetting>,
  ) {}

  async evaluate(userId: string): Promise<HostEligibilityResponseDto> {
    const [user, config] = await Promise.all([
      this.userRepository.findOne({
        where: { id: userId },
        select: { id: true, followersCount: true },
      }),
      this.loadConfig(),
    ]);
    if (!user) {
      throw new NotFoundException(
        'Authenticated user account was not found for Host eligibility',
      );
    }

    const [completedRooms, moderationActions] = await Promise.all([
      this.roomRepository.count({
        where: { hostId: userId, status: 'ended' },
      }),
      config.requireGoodStanding
        ? this.moderationActionRepository.find({
            where: {
              targetUserId: userId,
              actionType: In([
                ModerationActionType.BAN,
                ModerationActionType.UNBAN,
                ModerationActionType.SUSPEND,
                ModerationActionType.UNSUSPEND,
              ]),
            },
            order: { createdAt: 'DESC' },
          })
        : Promise.resolve([]),
    ]);

    const followers = Math.max(0, user.followersCount || 0);
    const followersMet = followers >= config.minFollowers;
    const completedRoomsMet = completedRooms >= config.minCompletedRooms;
    const communityStandingMet =
      !config.requireGoodStanding ||
      !this.hasActiveModerationRestriction(moderationActions, new Date());
    const reasons: string[] = [];

    if (!config.applicationsEnabled) {
      reasons.push('Host applications are currently disabled.');
    }
    if (!followersMet) {
      reasons.push(
        `At least ${config.minFollowers} followers are required; current count is ${followers}.`,
      );
    }
    if (!completedRoomsMet) {
      reasons.push(
        `At least ${config.minCompletedRooms} completed rooms are required; current count is ${completedRooms}.`,
      );
    }
    if (!communityStandingMet) {
      reasons.push(
        'The account has an active moderation restriction and is not currently in good standing.',
      );
    }

    return {
      eligible:
        config.applicationsEnabled &&
        followersMet &&
        completedRoomsMet &&
        communityStandingMet,
      applicationsEnabled: config.applicationsEnabled,
      requirements: {
        followers: {
          current: followers,
          minimum: config.minFollowers,
          met: followersMet,
        },
        completedRooms: {
          current: completedRooms,
          minimum: config.minCompletedRooms,
          met: completedRoomsMet,
        },
        communityStanding: {
          required: config.requireGoodStanding,
          met: communityStandingMet,
        },
      },
      reasons,
      evaluatedAt: new Date().toISOString(),
    };
  }

  async assertEligible(userId: string): Promise<HostEligibilityResponseDto> {
    const result = await this.evaluate(userId);
    if (!result.applicationsEnabled) {
      throw new ForbiddenException({
        message: 'Host applications are currently disabled',
        eligibility: result,
      });
    }
    if (!result.eligible) {
      throw new BadRequestException({
        message: 'Host eligibility requirements are not met',
        eligibility: result,
      });
    }
    return result;
  }

  private async loadConfig(): Promise<HostEligibilityConfig> {
    const settings = await this.settingRepository.find({
      where: { key: In([...ELIGIBILITY_SETTING_KEYS]) },
    });
    const values = new Map(settings.map((setting) => [setting.key, setting]));

    return {
      applicationsEnabled: this.booleanSetting(
        values.get('host_applications_enabled'),
        true,
      ),
      minFollowers: this.nonNegativeIntegerSetting(
        values.get('min_host_followers'),
        50,
      ),
      minCompletedRooms: this.nonNegativeIntegerSetting(
        values.get('min_host_completed_rooms'),
        3,
      ),
      requireGoodStanding: this.booleanSetting(
        values.get('require_host_good_standing'),
        true,
      ),
    };
  }

  private nonNegativeIntegerSetting(
    setting: SystemSetting | undefined,
    fallback: number,
  ): number {
    if (!setting) return fallback;
    const value = Number(setting.value);
    if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000) {
      this.invalidSetting(setting.key);
    }
    return value;
  }

  private booleanSetting(
    setting: SystemSetting | undefined,
    fallback: boolean,
  ): boolean {
    if (!setting) return fallback;
    if (setting.value === 'true') return true;
    if (setting.value === 'false') return false;
    this.invalidSetting(setting.key);
  }

  private invalidSetting(key: string): never {
    this.logger.error(`Invalid Host eligibility setting: ${key}`);
    throw new ServiceUnavailableException(
      'Host eligibility configuration is invalid',
    );
  }

  private hasActiveModerationRestriction(
    actions: ModerationAction[],
    now: Date,
  ): boolean {
    let banActive: boolean | undefined;
    let suspensionActive: boolean | undefined;

    for (const action of actions) {
      if (
        action.actionType === ModerationActionType.UNBAN &&
        banActive === undefined
      ) {
        banActive = false;
      } else if (
        action.actionType === ModerationActionType.BAN &&
        banActive === undefined
      ) {
        banActive = this.isRestrictionCurrent(action, now);
      } else if (
        action.actionType === ModerationActionType.UNSUSPEND &&
        suspensionActive === undefined
      ) {
        suspensionActive = false;
      } else if (
        action.actionType === ModerationActionType.SUSPEND &&
        suspensionActive === undefined
      ) {
        suspensionActive = this.isRestrictionCurrent(action, now);
      }

      if (banActive !== undefined && suspensionActive !== undefined) break;
    }

    return banActive === true || suspensionActive === true;
  }

  private isRestrictionCurrent(action: ModerationAction, now: Date): boolean {
    return (
      action.isPermanent ||
      action.expiresAt === null ||
      new Date(action.expiresAt).getTime() > now.getTime()
    );
  }
}
