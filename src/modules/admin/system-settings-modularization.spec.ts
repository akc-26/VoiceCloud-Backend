import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
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
import { AdminSettingsService } from './admin-settings.service';
import { UpdateOperationalSettingsDto } from './dto/operational-settings.dto';
import { UpdateStreamingInfrastructureSettingsDto } from './dto/streaming-infrastructure-settings.dto';
import {
  SettingValueType,
  SystemSetting,
} from './entities/system-setting.entity';
import {
  OPERATIONAL_SETTING_KEYS,
  STREAMING_INFRASTRUCTURE_SETTING_DEFINITIONS,
  STREAMING_INFRASTRUCTURE_SETTING_KEYS,
} from './system-settings/system-settings.registry';

function setting(
  key: string,
  value: string,
  valueType: SettingValueType = SettingValueType.STRING,
): SystemSetting {
  return {
    id: `id-${key}`,
    key,
    group: key.includes('stream') ? 'streaming' : 'maintenance',
    title: key,
    value,
    valueType,
    isEditable: true,
    isPublic: false,
    createdAt: new Date('2026-08-04T00:00:00.000Z'),
    updatedAt: new Date('2026-08-04T00:00:00.000Z'),
  };
}

function managedSettings(): SystemSetting[] {
  return [
    setting('maintenance_mode', 'false', SettingValueType.BOOLEAN),
    setting('maintenance_message', 'Available'),
    setting('max_room_capacity', '500', SettingValueType.NUMBER),
    setting('max_speaker_seats', '12', SettingValueType.NUMBER),
    setting('streaming_provider', 'mediamtx'),
    setting('rtmp_server_url', 'rtmps://live.voicecloud.app:443/live'),
    setting('webrtc_server_url', 'wss://webrtc.voicecloud.app:443/v1'),
    setting(
      'turn_stun_servers',
      JSON.stringify([
        'turn:turn.voicecloud.app:3478',
        'stun:stun.l.google.com:19302',
      ]),
      SettingValueType.JSON,
    ),
    setting('recording_enabled', 'true', SettingValueType.BOOLEAN),
    setting('low_latency_mode', 'true', SettingValueType.BOOLEAN),
    setting('default_bitrate', '324', SettingValueType.NUMBER),
    setting('codec', 'opus'),
    setting('region', 'us-east'),
    setting('stream_key_policy', 'auto_rotate_90d'),
  ];
}

describe('WP07 Admin System Settings Modularization', () => {
  let service: AdminSettingsService;
  let repository: any;
  let transactionRepository: any;
  let redisService: any;
  let eventsGateway: any;
  let auditLogsService: any;

  beforeEach(() => {
    const storedSettings = managedSettings();
    transactionRepository = {
      find: jest.fn().mockResolvedValue(storedSettings),
      create: jest.fn((value) => ({ ...value })),
      save: jest.fn(async (values: SystemSetting[]) =>
        values.map((value) => ({
          ...value,
          updatedAt: new Date('2026-08-04T01:00:00.000Z'),
        })),
      ),
    };
    repository = {
      find: jest.fn().mockResolvedValue(storedSettings),
      findOne: jest.fn(),
      create: jest.fn((value) => ({ ...value })),
      manager: {
        transaction: jest.fn(async (callback) =>
          callback({ getRepository: () => transactionRepository }),
        ),
      },
    };
    redisService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };
    eventsGateway = {
      broadcastMaintenanceModeToggled: jest.fn(),
      broadcastSystemConfigEvent: jest.fn(),
    };
    auditLogsService = { log: jest.fn().mockResolvedValue({}) };
    service = new AdminSettingsService(
      repository,
      redisService,
      eventsGateway,
      auditLogsService,
    );
  });

  it('reads typed operational and streaming settings', async () => {
    const operational = await service.getOperationalSettings();
    const streaming = await service.getStreamingInfrastructureSettings();

    expect(operational).toMatchObject({
      maintenanceMode: false,
      maintenanceMessage: 'Available',
      maxRoomCapacity: 500,
      maxSpeakerSeats: 12,
    });
    expect(streaming).toMatchObject({
      provider: 'mediamtx',
      defaultBitrate: 324,
      codec: 'opus',
      region: 'us-east',
    });
    expect(streaming.turnStunServers).toHaveLength(2);
  });

  it('atomically updates operational settings and emits one configuration event', async () => {
    const result = await service.updateOperationalSettings(
      {
        maintenanceMode: true,
        maintenanceMessage: 'Scheduled maintenance',
        maxRoomCapacity: 700,
        maxSpeakerSeats: 16,
      },
      'admin-user',
    );

    expect(repository.manager.transaction).toHaveBeenCalledTimes(1);
    expect(transactionRepository.save).toHaveBeenCalledTimes(1);
    expect(transactionRepository.save.mock.calls[0][0]).toHaveLength(
      OPERATIONAL_SETTING_KEYS.length,
    );
    expect(result.maxRoomCapacity).toBe(700);
    expect(eventsGateway.broadcastMaintenanceModeToggled).toHaveBeenCalledWith({
      isMaintenance: true,
    });
    expect(eventsGateway.broadcastSystemConfigEvent).toHaveBeenCalledWith(
      'operational_settings_updated',
      { keys: [...OPERATIONAL_SETTING_KEYS] },
    );
  });

  it('rejects invalid operational cross-field values before a transaction', async () => {
    await expect(
      service.updateOperationalSettings({
        maintenanceMode: false,
        maintenanceMessage: 'Available',
        maxRoomCapacity: 10,
        maxSpeakerSeats: 10,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.manager.transaction).not.toHaveBeenCalled();
  });

  it('atomically updates private streaming infrastructure settings', async () => {
    const result = await service.updateStreamingInfrastructureSettings(
      {
        provider: 'livekit',
        rtmpUrl: 'rtmps://ingest.voicecloud.app/live',
        webrtcUrl: 'wss://rtc.voicecloud.app/v1',
        turnStunServers: ['turn:turn.voicecloud.app:3478'],
        recordingEnabled: false,
        lowLatencyMode: true,
        defaultBitrate: 256,
        codec: 'opus',
        region: 'ap-south',
        streamKeyPolicy: 'auto_rotate_30d',
      },
      'admin-user',
    );

    expect(transactionRepository.save.mock.calls[0][0]).toHaveLength(
      STREAMING_INFRASTRUCTURE_SETTING_KEYS.length,
    );
    expect(result).toMatchObject({
      provider: 'livekit',
      defaultBitrate: 256,
      region: 'ap-south',
    });
    expect(eventsGateway.broadcastSystemConfigEvent).toHaveBeenCalledWith(
      'streaming_infrastructure_settings_updated',
      { keys: [...STREAMING_INFRASTRUCTURE_SETTING_KEYS] },
    );
  });

  it('rejects duplicate TURN/STUN servers before opening a transaction', async () => {
    await expect(
      service.updateStreamingInfrastructureSettings({
        provider: 'mediamtx',
        rtmpUrl: 'rtmps://live.voicecloud.app/live',
        webrtcUrl: 'wss://webrtc.voicecloud.app/v1',
        turnStunServers: [
          'turn:turn.voicecloud.app:3478',
          'turn:turn.voicecloud.app:3478',
        ],
        recordingEnabled: true,
        lowLatencyMode: true,
        defaultBitrate: 324,
        codec: 'opus',
        region: 'us-east',
        streamKeyPolicy: 'auto_rotate_90d',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.manager.transaction).not.toHaveBeenCalled();
  });

  it('rejects invalid persisted operational settings as unavailable', async () => {
    repository.find.mockResolvedValue([
      setting('maintenance_mode', 'false', SettingValueType.BOOLEAN),
      setting('maintenance_message', 'Available'),
      setting('max_room_capacity', '50', SettingValueType.NUMBER),
      setting('max_speaker_seats', '50', SettingValueType.NUMBER),
    ]);

    await expect(service.getOperationalSettings()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('removes private streaming keys from cached public settings', async () => {
    redisService.get.mockResolvedValue(
      JSON.stringify({
        app_name: 'VoiceCloud',
        streaming_provider: 'mediamtx',
        rtmp_server_url: 'rtmps://private.example/live',
        turn_stun_servers: ['turn:private.example:3478'],
      }),
    );

    await expect(service.getPublicSettings()).resolves.toEqual({
      app_name: 'VoiceCloud',
    });
    expect(repository.find).not.toHaveBeenCalled();
  });

  it('keeps all streaming infrastructure definitions private', () => {
    expect(
      STREAMING_INFRASTRUCTURE_SETTING_DEFINITIONS.every(
        (definition) => definition.isPublic === false,
      ),
    ).toBe(true);
  });

  it('blocks managed keys through generic create and update endpoints', async () => {
    await expect(
      service.create({
        key: 'streaming_provider',
        group: 'streaming',
        title: 'Provider',
        value: 'agora',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.update('max_room_capacity', { value: '900' }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('validates operational and streaming DTOs', async () => {
    const operational = plainToInstance(UpdateOperationalSettingsDto, {
      maintenanceMode: false,
      maintenanceMessage: '',
      maxRoomCapacity: 1,
      maxSpeakerSeats: 0,
    });
    const streaming = plainToInstance(
      UpdateStreamingInfrastructureSettingsDto,
      {
        provider: 'unknown',
        rtmpUrl: 'https://not-rtmp.example.com',
        webrtcUrl: 'https://not-webrtc.example.com',
        turnStunServers: [],
        recordingEnabled: true,
        lowLatencyMode: true,
        defaultBitrate: 999,
        codec: 'unknown',
        region: 'unknown',
        streamKeyPolicy: 'unknown',
      },
    );

    expect((await validate(operational)).length).toBeGreaterThan(0);
    expect((await validate(streaming)).length).toBeGreaterThan(0);
  });

  it('protects every system-settings contract with JWT and Admin RBAC', () => {
    const methods = [
      AdminController.prototype.getAllSettings,
      AdminController.prototype.getSettingsByGroup,
      AdminController.prototype.getOperationalSettings,
      AdminController.prototype.updateOperationalSettings,
      AdminController.prototype.getStreamingInfrastructureSettings,
      AdminController.prototype.updateStreamingInfrastructureSettings,
      AdminController.prototype.getHostBusinessSettings,
      AdminController.prototype.updateHostBusinessSettings,
      AdminController.prototype.createSetting,
      AdminController.prototype.updateSetting,
    ];

    for (const method of methods) {
      expect(Reflect.getMetadata(ROLES_KEY, method)).toEqual([
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
      ]);
      expect(Reflect.getMetadata(GUARDS_METADATA, method)).toEqual([
        JwtAuthGuard,
        RolesGuard,
      ]);
    }
  });

  it('uses dedicated Admin editors and database-backed runtime ownership', () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), 'admin/src/pages/SystemSettingsPage.tsx'),
      'utf8',
    );
    const operationalCard = fs.readFileSync(
      path.join(
        process.cwd(),
        'admin/src/components/settings/OperationalSettingsCard.tsx',
      ),
      'utf8',
    );
    const streamingCard = fs.readFileSync(
      path.join(
        process.cwd(),
        'admin/src/components/settings/StreamingInfrastructureSettingsCard.tsx',
      ),
      'utf8',
    );
    const creatorService = fs.readFileSync(
      path.join(process.cwd(), 'src/modules/creator/creator.service.ts'),
      'utf8',
    );
    const environmentExample = fs.readFileSync(
      path.join(process.cwd(), '.env.example'),
      'utf8',
    );

    expect(page).toContain('OperationalSettingsCard');
    expect(page).toContain('StreamingInfrastructureSettingsCard');
    expect(operationalCard).not.toContain('.catch(() => {})');
    expect(streamingCard).not.toContain('.catch(() => {})');
    expect(creatorService).toContain('getStreamingInfrastructureSettings()');
    expect(environmentExample).not.toContain('STREAM_RTMP_URL');
    expect(environmentExample).not.toContain('STREAM_WEBRTC_URL');
    expect(environmentExample).not.toContain('STREAM_DEFAULT_BITRATE');
    expect(environmentExample).not.toContain('STREAM_RECORDING_ENABLED');
    expect(environmentExample).not.toContain('STREAM_LOW_LATENCY_ENABLED');
    expect(environmentExample).toContain('STREAM_KEY_LENGTH=32');
  });
});
