import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RtcService } from './rtc.service';
import { RtcQualityService } from './rtc-quality.service';
import { RtcConfig, RtcProviderType } from './entities/rtc-config.entity';
import {
  RtcSession,
  RtcSessionStatus,
  AudioQualityProfile,
} from './entities/rtc-session.entity';
import {
  RtcSpeakerHistory,
  SpeakerRole,
} from './entities/rtc-speaker-history.entity';
import {
  RtcRecordingJob,
  RecordingJobStatus,
} from './entities/rtc-recording-job.entity';
import { RtcAnalytics } from './entities/rtc-analytics.entity';
import { RtcQualityMetric } from './entities/rtc-quality-metric.entity';
import { Room } from '../rooms/entities/room.entity';
import { RtcProviderFactory } from './providers/rtc-provider.factory';
import { DefaultMockProvider } from './providers/default-mock.provider';
import { AgoraProvider } from './providers/agora.provider';
import { ZegoCloudProvider } from './providers/zegocloud.provider';
import { LiveKitProvider } from './providers/livekit.provider';
import { RedisService } from '../../redis/redis.service';
import { RedisStateService } from '../../redis/redis-state.service';
import { EventsGateway } from '../../common/events/events.gateway';
import { DynamicConfigService } from '../config/dynamic-config.service';
import { AdminSettingsService } from '../admin/admin-settings.service';
import { RealtimeRoomStateService } from '../../common/events/services/realtime-room-state.service';

describe('Phase 20 - Enterprise RTC Infrastructure Integration', () => {
  const originalFetch = global.fetch;
  let service: RtcService;
  let qualityService: RtcQualityService;
  let factory: RtcProviderFactory;
  let adminSettingsService: { getOperationalSettings: jest.Mock };
  let redisStateService: { isModerator: jest.Mock; isSpeaker: jest.Mock };

  const mockConfig: RtcConfig = {
    id: '1',
    activeProvider: RtcProviderType.DEFAULT_MOCK,
    appId: 'test_app_id',
    apiKey: 'test_api_key',
    secret: 'test_secret_32_chars_long_key_000',
    tokenExpiration: 3600,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as RtcConfig;

  const mockRoom: Room = {
    id: 'room-101',
    name: 'Voice Stage 101',
    hostId: 'host-user-1',
    status: 'live',
    isLive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Room;

  const mockSession: RtcSession = {
    id: 'sess-202',
    roomId: 'room-101',
    provider: 'agora',
    status: RtcSessionStatus.ACTIVE,
    concurrentUsers: 5,
    peakAudience: 10,
    totalParticipants: 12,
    activeSpeakersList: ['user-1'],
    startedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as RtcSession;

  const mockRecordingJob: RtcRecordingJob = {
    id: 'job-505',
    sessionId: 'sess-202',
    roomId: 'room-101',
    provider: 'agora',
    providerJobId: 'agora_cloud_rec_99',
    status: RecordingJobStatus.RECORDING,
    recordingUrl: 'https://storage.voicecloud.app/rec.mp4',
    durationSeconds: 120,
    fileSizeBytes: 1024000,
    uploadStatus: 'completed',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as RtcRecordingJob;

  const mockRedisClient = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    sadd: jest.fn().mockResolvedValue(1),
    srem: jest.fn().mockResolvedValue(1),
    smembers: jest.fn().mockResolvedValue(['user-1', 'user-2']),
    sismember: jest.fn().mockResolvedValue(0),
    rpush: jest.fn().mockResolvedValue(1),
  };

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn((entity) =>
      Promise.resolve({ id: 'generated-id', ...entity }),
    ),
    create: jest.fn((entity) => ({ id: 'generated-id', ...entity })),
    count: jest.fn().mockResolvedValue(1),
    createQueryBuilder: jest.fn().mockReturnValue({
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          rtt: 35,
          packetLoss: 0.5,
          audioLevel: 80,
          providerConnectionState: 'connected',
        },
      ]),
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRecordingJob.status = RecordingJobStatus.RECORDING;
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_RTC_MOCK_PROVIDER = 'true';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ rooms: [] }),
    }) as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RtcService,
        RtcQualityService,
        RtcProviderFactory,
        DefaultMockProvider,
        AgoraProvider,
        ZegoCloudProvider,
        LiveKitProvider,
        {
          provide: getRepositoryToken(RtcConfig),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(RtcSession),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(RtcSpeakerHistory),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(RtcRecordingJob),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(RtcAnalytics),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(RtcQualityMetric),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Room),
          useValue: mockRepository,
        },
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockRedisClient),
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue('OK'),
          },
        },
        {
          provide: RedisStateService,
          useValue: {
            isModerator: jest.fn().mockResolvedValue(false),
            isSpeaker: jest.fn().mockResolvedValue(false),
            setSpeaker: jest.fn().mockResolvedValue([]),
            removeSpeaker: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: EventsGateway,
          useValue: {
            server: {
              emit: jest.fn(),
            },
            broadcastRtcEvent: jest.fn(),
            broadcastToRoom: jest.fn(),
          },
        },
        {
          provide: DynamicConfigService,
          useValue: {
            getActiveProviderConfig: jest.fn().mockResolvedValue({
              providerType: 'livekit',
              healthStatus: 'healthy',
              config: {
                serverUrl: 'wss://example.livekit.cloud',
                apiKey: mockConfig.apiKey,
                apiSecret: mockConfig.secret,
              },
            }),
            getProviderConfig: jest.fn().mockResolvedValue({
              providerType: 'livekit',
              healthStatus: 'healthy',
              config: {
                serverUrl: 'wss://example.livekit.cloud',
                apiKey: mockConfig.apiKey,
                apiSecret: mockConfig.secret,
              },
            }),
          },
        },
        {
          provide: RealtimeRoomStateService,
          useValue: {
            assertRoomJoinable: jest.fn().mockResolvedValue(mockRoom),
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

    service = module.get<RtcService>(RtcService);
    qualityService = module.get<RtcQualityService>(RtcQualityService);
    factory = module.get<RtcProviderFactory>(RtcProviderFactory);
    adminSettingsService = module.get(AdminSettingsService);
    redisStateService = module.get(RedisStateService);

    mockRepository.findOne.mockImplementation(({ where }) => {
      if (where?.id === 'room-101' || where?.roomId === 'room-101')
        return Promise.resolve(mockRoom);
      if (where?.id === 'job-505') return Promise.resolve(mockRecordingJob);
      if (where?.status === RtcSessionStatus.ACTIVE)
        return Promise.resolve(mockSession);
      return Promise.resolve(mockConfig);
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('RTC Provider Abstraction & Switching', () => {
    it('should resolve registered providers (agora, livekit, zegocloud, default_mock)', () => {
      expect(factory.getProvider('agora')).toBeInstanceOf(AgoraProvider);
      expect(factory.getProvider('livekit')).toBeInstanceOf(LiveKitProvider);
      expect(factory.getProvider('zegocloud')).toBeInstanceOf(
        ZegoCloudProvider,
      );
      expect(factory.getProvider('default_mock')).toBeInstanceOf(
        DefaultMockProvider,
      );
    });

    it('generates signed LiveKit tokens while unsupported provider adapters fail closed', async () => {
      const options = {
        roomId: 'room-101',
        userId: 'user-1',
        role: SpeakerRole.HOST,
      };

      await expect(
        factory.getProvider('agora').generateToken(mockConfig, options),
      ).rejects.toThrow(/official server-side Agora adapter/);
      await expect(
        factory.getProvider('zegocloud').generateToken(mockConfig, options),
      ).rejects.toThrow(/official server-side ZEGOCLOUD adapter/);

      const livekitToken = await factory
        .getProvider('livekit')
        .generateToken(mockConfig, options);
      expect(livekitToken.token.split('.')).toHaveLength(3);
      await expect(
        factory.getProvider('livekit').validateToken(mockConfig, livekitToken.token),
      ).resolves.toBe(true);
    });
  });

  describe('Token Refresh Pipeline', () => {
    it('should refresh RTC token and update Redis cache', async () => {
      const refreshDto = {
        roomId: 'room-101',
        oldToken: 'expired_token_123',
        role: SpeakerRole.SPEAKER,
        expirationSeconds: 7200,
      };

      const result = await service.refreshToken('user-1', refreshDto);
      expect(result.token).toBeDefined();
      expect(mockRedisClient.set).toHaveBeenCalled();
    });
  });

  describe('Room Join, Leave, Rejoin & Force Disconnect Pipeline', () => {
    it('should join room, generate token, update presence and emit participant_joined event', async () => {
      const joinDto = {
        roomId: 'room-101',
        role: SpeakerRole.SPEAKER,
        deviceInfo: 'ios',
      };
      const res = await service.joinRoom('user-1', joinDto);

      expect(res.message).toContain('Joined RTC room successfully');
      expect(res.token).toBeDefined();
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'rtc:presence:room-101:user-1',
        expect.any(String),
        'EX',
        86400,
      );
    });

    it('should leave room, clear presence and emit participant_left event', async () => {
      const res = await service.leaveRoom('user-1', { roomId: 'room-101' });
      expect(res.message).toContain('Left RTC room successfully');
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'rtc:presence:room-101:user-1',
      );
    });

    it('should rejoin room and update presence', async () => {
      const res = await service.rejoinRoom('user-1', { roomId: 'room-101' });
      expect(res.message).toContain('Rejoined RTC room successfully');
    });

    it('should force disconnect participant by host/admin', async () => {
      const res = await service.forceDisconnectParticipant('host-user-1', {
        roomId: 'room-101',
        targetUserId: 'bad-user',
        reason: 'Violation of room terms',
      });

      expect(res.message).toContain(
        'Participant force disconnected successfully',
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'rtc:presence:room-101:bad-user',
      );
    });
  });

  describe('Backend-authoritative speaker-seat limits', () => {
    it('accepts the configured maximum speaker seat', async () => {
      adminSettingsService.getOperationalSettings.mockResolvedValue({
        maintenanceMode: false,
        maintenanceMessage: 'Available',
        maxRoomCapacity: 500,
        maxSpeakerSeats: 8,
        updatedAt: new Date(0).toISOString(),
      });

      await expect(
        service.raiseHand('user-1', 'room-101', { seatIndex: 8 }),
      ).resolves.toMatchObject({ message: 'Hand raised successfully' });
    });

    it('rejects speaker seats above the configured maximum', async () => {
      adminSettingsService.getOperationalSettings.mockResolvedValue({
        maintenanceMode: false,
        maintenanceMessage: 'Available',
        maxRoomCapacity: 500,
        maxSpeakerSeats: 8,
        updatedAt: new Date(0).toISOString(),
      });

      await expect(
        service.lockSeat('host-user-1', 'room-101', {
          seatIndex: 9,
          lock: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('defaults approved speakers to seat one', async () => {
      await service.approveSpeaker('host-user-1', 'room-101', {
        targetUserId: 'speaker-user-1',
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ seatIndex: 1 }),
      );
    });
  });


  describe('RTC room stage authority', () => {
    it('rejects speaker approval from an authenticated non-host/non-moderator', async () => {
      redisStateService.isModerator.mockResolvedValue(false);

      await expect(
        service.approveSpeaker('ordinary-user', 'room-101', {
          targetUserId: 'speaker-user-1',
        }),
      ).rejects.toThrow(
        'Only room host, authorized co-host, or authorized moderator can manage the RTC stage',
      );
    });

    it('allows an explicitly authorized moderator to approve a speaker', async () => {
      redisStateService.isModerator.mockResolvedValue(true);

      await expect(
        service.approveSpeaker('moderator-user', 'room-101', {
          targetUserId: 'speaker-user-1',
        }),
      ).resolves.toMatchObject({ message: 'Speaker approved successfully' });
    });

    it('prevents a moderator from muting the room host', async () => {
      redisStateService.isModerator.mockResolvedValue(true);

      await expect(
        service.muteUser('moderator-user', 'room-101', {
          targetUserId: 'host-user-1',
          mute: true,
        }),
      ).rejects.toThrow('Only the room host can change the host stage state');
    });

    it('keeps room-wide audio profile changes host-only', async () => {
      redisStateService.isModerator.mockResolvedValue(true);

      await expect(
        service.updateAudioProfile('moderator-user', 'room-101', {
          qualityProfile: AudioQualityProfile.SPEECH,
        }),
      ).rejects.toThrow('Only room host can perform this RTC action');
    });
  });

  describe('Active Speaker Detection', () => {
    it('should report active speaking state for an authoritative speaker and update active speaker in Redis', async () => {
      redisStateService.isSpeaker.mockResolvedValueOnce(true);

      const res = await service.reportSpeakingState('user-1', {
        roomId: 'room-101',
        isSpeaking: true,
        audioLevel: 85,
      });

      expect(res.isSpeaking).toBe(true);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'rtc:room:room-101:active_speaker',
        'user-1',
      );
    });
  });

  describe('Cloud Recording Pause & Resume Lifecycle', () => {
    it('fails closed when Agora recording pause has no authoritative server adapter', async () => {
      await expect(
        service.pauseRecording('host-user-1', { jobId: 'job-505' }),
      ).rejects.toThrow(/official server-side Agora adapter/);
      expect(mockRecordingJob.status).toEqual(RecordingJobStatus.RECORDING);
    });

    it('fails closed when Agora recording resume has no authoritative server adapter', async () => {
      mockRecordingJob.status = RecordingJobStatus.PAUSED;
      await expect(
        service.resumeRecording('host-user-1', { jobId: 'job-505' }),
      ).rejects.toThrow(/official server-side Agora adapter/);
      expect(mockRecordingJob.status).toEqual(RecordingJobStatus.PAUSED);
    });
  });

  describe('WebRTC Quality Metrics & Monitoring', () => {
    it('should record WebRTC metrics including audio level and provider connection state', async () => {
      const metric = await qualityService.reportMetrics('user-1', {
        roomId: 'room-101',
        bitrate: 128,
        packetLoss: 0.2,
        jitter: 10,
        rtt: 35,
        audioLevel: 80,
        providerConnectionState: 'connected',
      });

      expect(metric.roomId).toEqual('room-101');
      expect(metric.audioLevel).toEqual(80);
      expect(metric.providerConnectionState).toEqual('connected');
    });

    it('should generate admin RTC monitoring stats', async () => {
      const stats = await service.getAdminMonitoringStats();
      expect(stats.activeRoomsCount).toBeGreaterThanOrEqual(0);
      expect(stats.activeProvider).toEqual(mockConfig.activeProvider);
      expect(stats.averageRtt).toBeDefined();
    });
  });
});
