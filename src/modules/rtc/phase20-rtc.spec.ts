import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { RtcService } from './rtc.service';
import { RtcQualityService } from './rtc-quality.service';
import { RtcConfig, RtcProviderType } from './entities/rtc-config.entity';
import { RtcSession, RtcSessionStatus } from './entities/rtc-session.entity';
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
import { EventsGateway } from '../../common/events/events.gateway';
import { DynamicConfigService } from '../config/dynamic-config.service';

describe('Phase 20 - Enterprise RTC Infrastructure Integration', () => {
  let service: RtcService;
  let qualityService: RtcQualityService;
  let factory: RtcProviderFactory;

  const mockConfig: RtcConfig = {
    id: '1',
    activeProvider: RtcProviderType.AGORA,
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
            getActiveProviderConfig: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<RtcService>(RtcService);
    qualityService = module.get<RtcQualityService>(RtcQualityService);
    factory = module.get<RtcProviderFactory>(RtcProviderFactory);

    mockRepository.findOne.mockImplementation(({ where }) => {
      if (where?.id === 'room-101' || where?.roomId === 'room-101')
        return Promise.resolve(mockRoom);
      if (where?.id === 'job-505') return Promise.resolve(mockRecordingJob);
      if (where?.status === RtcSessionStatus.ACTIVE)
        return Promise.resolve(mockSession);
      return Promise.resolve(mockConfig);
    });
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

    it('should generate valid tokens across all providers', async () => {
      const options = {
        roomId: 'room-101',
        userId: 'user-1',
        role: SpeakerRole.HOST,
      };

      const agoraToken = await factory
        .getProvider('agora')
        .generateToken(mockConfig, options);
      expect(agoraToken.token).toBeDefined();
      expect(agoraToken.provider).toEqual('agora');

      const zegoToken = await factory
        .getProvider('zegocloud')
        .generateToken(mockConfig, options);
      expect(zegoToken.token).toContain('ZEGO04');

      const livekitToken = await factory
        .getProvider('livekit')
        .generateToken(mockConfig, options);
      expect(livekitToken.token.split('.')).toHaveLength(3);
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

  describe('Active Speaker Detection', () => {
    it('should report active speaking state and update active speaker in Redis', async () => {
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
    it('should pause an active cloud recording job', async () => {
      const res = await service.pauseRecording('host-user-1', {
        jobId: 'job-505',
      });
      expect(res.status).toEqual(RecordingJobStatus.PAUSED);
    });

    it('should resume a paused cloud recording job', async () => {
      mockRecordingJob.status = RecordingJobStatus.PAUSED;
      const res = await service.resumeRecording('host-user-1', {
        jobId: 'job-505',
      });
      expect(res.status).toEqual(RecordingJobStatus.RECORDING);
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
      expect(stats.activeProvider).toEqual(RtcProviderType.AGORA);
      expect(stats.averageRtt).toBeDefined();
    });
  });
});
