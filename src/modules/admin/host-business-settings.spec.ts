import { BadRequestException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as fs from 'fs';
import * as path from 'path';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminController } from './admin.controller';
import {
  AdminSettingsService,
  HOST_BUSINESS_SETTING_KEYS,
} from './admin-settings.service';
import { UpdateHostBusinessSettingsDto } from './dto/host-business-settings.dto';
import {
  SettingValueType,
  SystemSetting,
} from './entities/system-setting.entity';

const levels = [
  {
    level: 1,
    name: 'Starter Host',
    minimumXp: 0,
    benefits: [{ key: 'host_badge', label: 'Host badge' }],
  },
  {
    level: 2,
    name: 'Rising Host',
    minimumXp: 1000,
    benefits: [{ key: 'priority_discovery', label: 'Priority discovery' }],
  },
];

function setting(key: string, value: string): SystemSetting {
  return {
    id: `id-${key}`,
    key,
    group: 'host',
    title: key,
    value,
    valueType:
      key === 'host_level_definitions'
        ? SettingValueType.JSON
        : key.startsWith('min_')
          ? SettingValueType.NUMBER
          : SettingValueType.BOOLEAN,
    isEditable: true,
    isPublic: true,
    createdAt: new Date('2026-08-03T00:00:00.000Z'),
    updatedAt: new Date('2026-08-03T00:00:00.000Z'),
  };
}

function hostSettings(): SystemSetting[] {
  return [
    setting('host_applications_enabled', 'true'),
    setting('min_host_followers', '50'),
    setting('min_host_completed_rooms', '3'),
    setting('require_host_good_standing', 'true'),
    setting('host_level_definitions', JSON.stringify(levels)),
  ];
}

describe('B3-4 Admin Host business settings', () => {
  let service: AdminSettingsService;
  let repository: any;
  let transactionRepository: any;
  let redisService: any;
  let eventsGateway: any;
  let auditLogsService: any;

  beforeEach(() => {
    const storedSettings = hostSettings();
    transactionRepository = {
      find: jest.fn().mockResolvedValue(storedSettings),
      create: jest.fn((value) => ({ ...value })),
      save: jest.fn(async (values: SystemSetting[]) =>
        values.map((value) => ({
          ...value,
          updatedAt: new Date('2026-08-03T01:00:00.000Z'),
        })),
      ),
    };
    repository = {
      find: jest.fn().mockResolvedValue(storedSettings),
      findOne: jest.fn(),
      manager: {
        transaction: jest.fn(async (callback) =>
          callback({ getRepository: () => transactionRepository }),
        ),
      },
    };
    redisService = { del: jest.fn().mockResolvedValue(undefined) };
    eventsGateway = { broadcastSystemConfigEvent: jest.fn() };
    auditLogsService = { log: jest.fn().mockResolvedValue({}) };
    service = new AdminSettingsService(
      repository,
      redisService,
      eventsGateway,
      auditLogsService,
    );
  });

  it('returns the typed authoritative Host business configuration', async () => {
    const result = await service.getHostBusinessSettings();

    expect(result).toMatchObject({
      applicationsEnabled: true,
      minFollowers: 50,
      minCompletedRooms: 3,
      requireGoodStanding: true,
    });
    expect(result.levels).toEqual(levels);
  });

  it('updates all five settings in one transaction and emits one audit event', async () => {
    const result = await service.updateHostBusinessSettings(
      {
        applicationsEnabled: false,
        minFollowers: 100,
        minCompletedRooms: 10,
        requireGoodStanding: true,
        levels,
      },
      'admin-user-id',
    );

    expect(repository.manager.transaction).toHaveBeenCalledTimes(1);
    expect(transactionRepository.save).toHaveBeenCalledTimes(1);
    const saved = transactionRepository.save.mock.calls[0][0];
    expect(saved).toHaveLength(HOST_BUSINESS_SETTING_KEYS.length);
    expect(saved.map((item: SystemSetting) => item.key).sort()).toEqual(
      [...HOST_BUSINESS_SETTING_KEYS].sort(),
    );
    expect(result.applicationsEnabled).toBe(false);
    expect(result.minFollowers).toBe(100);
    expect(redisService.del).toHaveBeenCalledTimes(2);
    expect(eventsGateway.broadcastSystemConfigEvent).toHaveBeenCalledWith(
      'host_business_settings_updated',
      { keys: [...HOST_BUSINESS_SETTING_KEYS] },
    );
    expect(auditLogsService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin-user-id',
        module: 'host_business_settings',
        action: 'update',
      }),
    );
  });

  it('rejects invalid cross-level rules before opening a transaction', async () => {
    await expect(
      service.updateHostBusinessSettings({
        applicationsEnabled: true,
        minFollowers: 50,
        minCompletedRooms: 3,
        requireGoodStanding: true,
        levels: [
          { level: 1, name: 'One', minimumXp: 0, benefits: [] },
          { level: 3, name: 'Three', minimumXp: 100, benefits: [] },
        ],
      }),
    ).rejects.toThrow(BadRequestException);

    expect(repository.manager.transaction).not.toHaveBeenCalled();
  });

  it('does not invalidate cache, broadcast, or audit when the transaction fails', async () => {
    transactionRepository.save.mockRejectedValue(new Error('database failed'));

    await expect(
      service.updateHostBusinessSettings({
        applicationsEnabled: true,
        minFollowers: 50,
        minCompletedRooms: 3,
        requireGoodStanding: true,
        levels,
      }),
    ).rejects.toThrow('database failed');

    expect(redisService.del).not.toHaveBeenCalled();
    expect(eventsGateway.broadcastSystemConfigEvent).not.toHaveBeenCalled();
    expect(auditLogsService.log).not.toHaveBeenCalled();
  });

  it('blocks partial Host business changes through the generic setting endpoint', async () => {
    await expect(
      service.update('min_host_followers', { value: '500' }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('validates nested API input before it reaches the service', async () => {
    const dto = plainToInstance(UpdateHostBusinessSettingsDto, {
      applicationsEnabled: true,
      minFollowers: -1,
      minCompletedRooms: 3,
      requireGoodStanding: true,
      levels: [
        {
          level: 1,
          name: 'Starter',
          minimumXp: 0,
          benefits: [{ key: '../unsafe', label: '' }],
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('protects both Host business endpoints with JWT and Admin RBAC', () => {
    const getMethod = AdminController.prototype.getHostBusinessSettings;
    const updateMethod = AdminController.prototype.updateHostBusinessSettings;

    expect(Reflect.getMetadata(ROLES_KEY, getMethod)).toEqual([
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, updateMethod)).toEqual([
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN,
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, getMethod)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, updateMethod)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });

  it('provides a structured Admin editor instead of raw JSON input', () => {
    const component = fs.readFileSync(
      path.join(
        process.cwd(),
        'admin/src/components/settings/HostBusinessSettingsCard.tsx',
      ),
      'utf8',
    );
    const serviceSource = fs.readFileSync(
      path.join(process.cwd(), 'admin/src/services/admin.service.ts'),
      'utf8',
    );

    expect(component).toContain('Save Host Business Rules');
    expect(component).toContain('Add Host level');
    expect(component).toContain('Add benefit');
    expect(component).not.toContain('JSON.stringify(settings.levels');
    expect(serviceSource).toContain("'/admin/settings/host-business'");
  });
});
