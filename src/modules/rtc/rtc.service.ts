import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
import { ClientDiagnostics } from './entities/client-diagnostics.entity';
import { Room } from '../rooms/entities/room.entity';
import { RtcProviderFactory } from './providers/rtc-provider.factory';
import { RedisService } from '../../redis/redis.service';
import { EventsGateway } from '../../common/events/events.gateway';
import { UpdateRtcConfigDto } from './dto/update-rtc-config.dto';
import { GenerateTokenDto } from './dto/generate-token.dto';
import { StartSessionDto } from './dto/session-actions.dto';
import { ClientDiagnosticsDto } from './dto/client-diagnostics.dto';
import {
  RaiseHandDto,
  SpeakerActionDto,
  MuteUserDto,
  LockSeatDto,
  AudioProfileDto,
} from './dto/speaking-controls.dto';
import {
  StartRecordingDto,
  QueryRtcSessionsDto,
} from './dto/recording-and-query.dto';

@Injectable()
export class RtcService {
  private readonly logger = new Logger(RtcService.name);

  constructor(
    @InjectRepository(RtcConfig)
    private readonly configRepository: Repository<RtcConfig>,
    @InjectRepository(RtcSession)
    private readonly sessionRepository: Repository<RtcSession>,
    @InjectRepository(RtcSpeakerHistory)
    private readonly speakerHistoryRepository: Repository<RtcSpeakerHistory>,
    @InjectRepository(RtcRecordingJob)
    private readonly recordingJobRepository: Repository<RtcRecordingJob>,
    @InjectRepository(RtcAnalytics)
    private readonly analyticsRepository: Repository<RtcAnalytics>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    private readonly providerFactory: RtcProviderFactory,
    private readonly redisService: RedisService,
    private readonly eventsGateway: EventsGateway,
    private readonly dataSource: DataSource,
  ) {}

  // 1. RTC Configuration
  async getRtcConfig(): Promise<RtcConfig> {
    let config = await this.configRepository.findOne({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });

    if (!config) {
      config = this.configRepository.create({
        activeProvider: RtcProviderType.DEFAULT_MOCK,
        appId: 'VOICECLOUD_MOCK_APP_ID',
        tokenExpiration: 3600,
        recordingEnabled: true,
        audioEnabled: true,
        videoEnabled: false,
        isActive: true,
      });
      config = await this.configRepository.save(config);
    }

    return config;
  }

  async updateRtcConfig(dto: UpdateRtcConfigDto): Promise<RtcConfig> {
    const config = await this.getRtcConfig();
    Object.assign(config, dto);
    const updated = await this.configRepository.save(config);

    this.eventsGateway.server?.emit('rtc_provider_changed', {
      activeProvider: updated.activeProvider,
      updatedAt: updated.updatedAt,
    });

    return updated;
  }

  // 2. Token Generation
  async generateToken(userId: string, dto: GenerateTokenDto) {
    const room = await this.roomRepository.findOne({
      where: { id: dto.roomId },
    });
    if (!room) {
      throw new NotFoundException(`Room ${dto.roomId} not found`);
    }

    const config = await this.getRtcConfig();
    const providerName = dto.providerOverride || config.activeProvider;
    const provider = this.providerFactory.getProvider(providerName);

    const role =
      dto.role ||
      (room.hostId === userId ? SpeakerRole.HOST : SpeakerRole.LISTENER);

    const result = await provider.generateToken(config, {
      roomId: dto.roomId,
      userId,
      role,
      expirationSeconds: dto.expirationSeconds || config.tokenExpiration,
    });

    // Cache token in Redis
    const redis = this.redisService.getClient();
    if (redis) {
      try {
        await redis.set(
          `rtc:token:${dto.roomId}:${userId}`,
          JSON.stringify(result),
          'EX',
          dto.expirationSeconds || 3600,
        );
      } catch (e) {
        this.logger.warn(`Failed to cache RTC token in Redis: ${e}`);
      }
    }

    this.eventsGateway.server?.emit('rtc_token_generated', {
      roomId: dto.roomId,
      userId,
      role,
      provider: result.provider,
      expiresAt: result.expiresAt,
    });

    return result;
  }

  // 3. Voice Session Management
  async startVoiceSession(userId: string, dto: StartSessionDto) {
    const room = await this.roomRepository.findOne({
      where: { id: dto.roomId },
    });
    if (!room) {
      throw new NotFoundException(`Room ${dto.roomId} not found`);
    }

    if (room.hostId !== userId) {
      throw new ForbiddenException('Only room host can start RTC session');
    }

    const config = await this.getRtcConfig();

    // End previous active sessions if any
    const existingActive = await this.sessionRepository.find({
      where: { roomId: dto.roomId, status: RtcSessionStatus.ACTIVE },
    });
    for (const sess of existingActive) {
      sess.status = RtcSessionStatus.ENDED;
      sess.endTime = new Date();
      await this.sessionRepository.save(sess);
    }

    const session = this.sessionRepository.create({
      roomId: dto.roomId,
      hostId: userId,
      provider: config.activeProvider,
      status: RtcSessionStatus.ACTIVE,
      qualityProfile: dto.qualityProfile || AudioQualityProfile.SPEECH,
      startTime: new Date(),
      peakAudience: 1,
      concurrentUsers: 1,
      totalParticipants: 1,
      activeSpeakersList: [userId],
    });

    const saved = await this.sessionRepository.save(session);

    // Initial speaker history for host
    const hostHistory = this.speakerHistoryRepository.create({
      sessionId: saved.id,
      roomId: dto.roomId,
      userId,
      role: SpeakerRole.HOST,
      seatIndex: 0,
      joinedAt: new Date(),
      isMuted: false,
    });
    await this.speakerHistoryRepository.save(hostHistory);

    // Sync Redis
    const redis = this.redisService.getClient();
    if (redis) {
      try {
        await redis.set(`rtc:room:${dto.roomId}:active_session`, saved.id);
        await redis.sadd(`rtc:room:${dto.roomId}:speakers`, userId);
      } catch (e) {
        this.logger.warn(`Redis session sync error: ${e}`);
      }
    }

    this.eventsGateway.server?.emit('rtc_session_started', {
      sessionId: saved.id,
      roomId: dto.roomId,
      hostId: userId,
      provider: saved.provider,
      qualityProfile: saved.qualityProfile,
      startTime: saved.startTime,
    });

    return saved;
  }

  async stopVoiceSession(userId: string, sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException(`RTC Session ${sessionId} not found`);
    }

    if (session.hostId !== userId) {
      throw new ForbiddenException('Only room host can stop RTC session');
    }

    const now = new Date();
    const duration = Math.floor(
      (now.getTime() - new Date(session.startTime).getTime()) / 1000,
    );

    session.status = RtcSessionStatus.ENDED;
    session.endTime = now;
    session.durationSeconds = duration;
    const saved = await this.sessionRepository.save(session);

    // Close open speaker histories
    await this.speakerHistoryRepository
      .createQueryBuilder()
      .update(RtcSpeakerHistory)
      .set({
        leftAt: now,
      })
      .where('sessionId = :sessionId AND leftAt IS NULL', { sessionId })
      .execute();

    // Create Analytics Entry
    const analytics = this.analyticsRepository.create({
      sessionId: saved.id,
      roomId: saved.roomId,
      peakAudience: saved.peakAudience,
      avgAudience: Math.ceil(saved.peakAudience / 2),
      totalUniqueListeners: saved.totalParticipants,
      totalSpeakers: (saved.activeSpeakersList || []).length,
      totalSpeakingTimeSeconds: duration,
      networkQualityScore: 98,
    });
    await this.analyticsRepository.save(analytics);

    // Clean Redis
    const redis = this.redisService.getClient();
    if (redis) {
      try {
        await redis.del(`rtc:room:${saved.roomId}:active_session`);
        await redis.del(`rtc:room:${saved.roomId}:speakers`);
        await redis.del(`rtc:room:${saved.roomId}:hand_queue`);
      } catch (e) {
        this.logger.warn(`Redis session cleanup error: ${e}`);
      }
    }

    this.eventsGateway.server?.emit('rtc_session_ended', {
      sessionId: saved.id,
      roomId: saved.roomId,
      durationSeconds: duration,
      endTime: now,
    });

    return saved;
  }

  async getActiveSessions(query: QueryRtcSessionsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.sessionRepository.createQueryBuilder('s');

    if (query.roomId) {
      qb.andWhere('s.roomId = :roomId', { roomId: query.roomId });
    }
    if (query.status) {
      qb.andWhere('s.status = :status', { status: query.status });
    } else {
      qb.andWhere('s.status = :status', { status: RtcSessionStatus.ACTIVE });
    }

    qb.orderBy('s.startTime', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getSessionDetails(sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const speakerHistory = await this.speakerHistoryRepository.find({
      where: { sessionId },
      order: { joinedAt: 'ASC' },
    });

    const analytics = await this.analyticsRepository.findOne({
      where: { sessionId },
    });

    return {
      session,
      speakerHistory,
      analytics,
    };
  }

  // 4. Speaking Controls
  async raiseHand(userId: string, roomId: string, dto: RaiseHandDto) {
    const redis = this.redisService.getClient();
    if (redis) {
      try {
        await redis.rpush(
          `rtc:room:${roomId}:hand_queue`,
          JSON.stringify({
            userId,
            seatIndex: dto.seatIndex,
            timestamp: Date.now(),
          }),
        );
      } catch (e) {
        this.logger.warn(`Redis queue push error: ${e}`);
      }
    }

    this.eventsGateway.server?.emit('hand_raised', {
      roomId,
      userId,
      seatIndex: dto.seatIndex,
      timestamp: new Date(),
    });

    return { message: 'Hand raised successfully', roomId, userId };
  }

  async cancelRaiseHand(userId: string, roomId: string) {
    this.eventsGateway.server?.emit('hand_rejected', {
      roomId,
      userId,
      reason: 'cancelled_by_user',
    });

    return Promise.resolve({
      message: 'Hand raise request cancelled',
      roomId,
      userId,
    });
  }

  async approveSpeaker(hostId: string, roomId: string, dto: SpeakerActionDto) {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException(`Room ${roomId} not found`);

    const activeSession = await this.sessionRepository.findOne({
      where: { roomId, status: RtcSessionStatus.ACTIVE },
    });

    if (activeSession) {
      const speakers = activeSession.activeSpeakersList || [];
      if (!speakers.includes(dto.targetUserId)) {
        speakers.push(dto.targetUserId);
        activeSession.activeSpeakersList = speakers;
        await this.sessionRepository.save(activeSession);
      }

      const history = this.speakerHistoryRepository.create({
        sessionId: activeSession.id,
        roomId,
        userId: dto.targetUserId,
        role: SpeakerRole.SPEAKER,
        seatIndex: dto.seatIndex || 1,
        joinedAt: new Date(),
      });
      await this.speakerHistoryRepository.save(history);
    }

    this.eventsGateway.server?.emit('hand_approved', {
      roomId,
      targetUserId: dto.targetUserId,
      approvedBy: hostId,
      seatIndex: dto.seatIndex || 1,
    });

    this.eventsGateway.server?.emit('speaker_joined', {
      roomId,
      userId: dto.targetUserId,
      seatIndex: dto.seatIndex || 1,
      role: SpeakerRole.SPEAKER,
    });

    return {
      message: 'Speaker approved successfully',
      roomId,
      targetUserId: dto.targetUserId,
    };
  }

  async rejectSpeaker(hostId: string, roomId: string, dto: SpeakerActionDto) {
    this.eventsGateway.server?.emit('hand_rejected', {
      roomId,
      targetUserId: dto.targetUserId,
      rejectedBy: hostId,
    });

    return Promise.resolve({
      message: 'Speaker request rejected',
      roomId,
      targetUserId: dto.targetUserId,
    });
  }

  async inviteSpeaker(hostId: string, roomId: string, dto: SpeakerActionDto) {
    return this.approveSpeaker(hostId, roomId, dto);
  }

  async removeSpeaker(hostId: string, roomId: string, dto: SpeakerActionDto) {
    const activeSession = await this.sessionRepository.findOne({
      where: { roomId, status: RtcSessionStatus.ACTIVE },
    });

    if (activeSession) {
      activeSession.activeSpeakersList = (
        activeSession.activeSpeakersList || []
      ).filter((id) => id !== dto.targetUserId);
      await this.sessionRepository.save(activeSession);

      await this.speakerHistoryRepository
        .createQueryBuilder()
        .update(RtcSpeakerHistory)
        .set({ leftAt: new Date() })
        .where(
          'sessionId = :sessionId AND userId = :userId AND leftAt IS NULL',
          {
            sessionId: activeSession.id,
            userId: dto.targetUserId,
          },
        )
        .execute();
    }

    this.eventsGateway.server?.emit('speaker_left', {
      roomId,
      userId: dto.targetUserId,
      removedBy: hostId,
    });

    return {
      message: 'Speaker removed successfully',
      roomId,
      targetUserId: dto.targetUserId,
    };
  }

  async muteUser(hostId: string, roomId: string, dto: MuteUserDto) {
    const config = await this.getRtcConfig();
    const provider = this.providerFactory.getProvider(config.activeProvider);
    await provider.muteUser(config, roomId, dto.targetUserId, dto.mute);

    const eventName = dto.mute ? 'microphone_muted' : 'microphone_unmuted';
    this.eventsGateway.server?.emit(eventName, {
      roomId,
      targetUserId: dto.targetUserId,
      isMuted: dto.mute,
      updatedBy: hostId,
    });

    return {
      message: `User mute status updated to ${dto.mute}`,
      roomId,
      targetUserId: dto.targetUserId,
    };
  }

  async lockSeat(hostId: string, roomId: string, dto: LockSeatDto) {
    const eventName = dto.lock ? 'seat_locked' : 'seat_unlocked';
    this.eventsGateway.server?.emit(eventName, {
      roomId,
      seatIndex: dto.seatIndex,
      isLocked: dto.lock,
      lockedBy: hostId,
    });

    return Promise.resolve({
      message: `Seat ${dto.seatIndex} locked=${dto.lock}`,
      roomId,
    });
  }

  async updateAudioProfile(
    hostId: string,
    roomId: string,
    dto: AudioProfileDto,
  ) {
    const activeSession = await this.sessionRepository.findOne({
      where: { roomId, status: RtcSessionStatus.ACTIVE },
    });

    if (activeSession) {
      activeSession.qualityProfile = dto.qualityProfile;
      await this.sessionRepository.save(activeSession);
    }

    this.eventsGateway.server?.emit('network_quality_changed', {
      roomId,
      qualityProfile: dto.qualityProfile,
      updatedBy: hostId,
    });

    return {
      message: 'Audio quality profile updated',
      roomId,
      qualityProfile: dto.qualityProfile,
    };
  }

  // 5. Recording Infrastructure
  async startRecording(userId: string, dto: StartRecordingDto) {
    const config = await this.getRtcConfig();
    if (!config.recordingEnabled) {
      throw new BadRequestException(
        'Recording is disabled in RTC Configuration',
      );
    }

    const provider = this.providerFactory.getProvider(config.activeProvider);
    const recResult = await provider.startRecording(config, {
      sessionId: dto.sessionId,
      roomId: dto.roomId,
      layout: dto.layout,
    });

    const job = this.recordingJobRepository.create({
      sessionId: dto.sessionId,
      roomId: dto.roomId,
      provider: config.activeProvider,
      providerJobId: recResult.providerJobId,
      status: RecordingJobStatus.RECORDING,
      recordingUrl: recResult.recordingUrl || undefined,
      uploadStatus: 'in_progress',
    });

    const saved = await this.recordingJobRepository.save(job);

    this.eventsGateway.server?.emit('recording_started', {
      jobId: saved.id,
      sessionId: dto.sessionId,
      roomId: dto.roomId,
      provider: saved.provider,
    });

    return saved;
  }

  async stopRecording(userId: string, jobId: string) {
    const job = await this.recordingJobRepository.findOne({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException(`Recording job ${jobId} not found`);

    const config = await this.getRtcConfig();
    const provider = this.providerFactory.getProvider(job.provider);

    if (job.providerJobId) {
      const res = await provider.stopRecording(config, job.providerJobId);
      job.recordingUrl = res.recordingUrl || job.recordingUrl;
    }

    job.status = RecordingJobStatus.COMPLETED;
    job.uploadStatus = 'completed';
    const saved = await this.recordingJobRepository.save(job);

    this.eventsGateway.server?.emit('recording_finished', {
      jobId: saved.id,
      sessionId: saved.sessionId,
      recordingUrl: saved.recordingUrl,
    });

    return saved;
  }

  async getRecordingJobs(roomId?: string) {
    if (roomId) {
      return this.recordingJobRepository.find({
        where: { roomId },
        order: { createdAt: 'DESC' },
      });
    }
    return this.recordingJobRepository.find({
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  // 6. Webhook Handler
  async handleWebhook(
    providerName: string,
    headers: Record<string, string>,
    body: unknown,
  ) {
    this.logger.log(
      `Received RTC Webhook callback for provider ${providerName}`,
    );
    const config = await this.getRtcConfig();
    const provider = this.providerFactory.getProvider(providerName);

    const isValid = provider.verifyWebhookSignature(config, headers, body);
    if (!isValid) {
      throw new ForbiddenException('Invalid webhook signature');
    }

    const payload = body as Record<string, unknown>;
    const eventType = (payload.event ||
      payload.eventType ||
      'unknown') as string;

    this.eventsGateway.server?.emit('rtc_webhook_event', {
      provider: providerName,
      eventType,
      payload,
    });

    return { success: true, provider: providerName, eventType };
  }

  // 7. Analytics
  async getRoomAnalytics(roomId: string) {
    const analyticsList = await this.analyticsRepository.find({
      where: { roomId },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const activeSession = await this.sessionRepository.findOne({
      where: { roomId, status: RtcSessionStatus.ACTIVE },
    });

    return {
      roomId,
      activeSession,
      recentSessionsAnalytics: analyticsList,
    };
  }

  // 8. Client Diagnostics Ingestion
  async recordDiagnostics(
    userId: string | null,
    dto: ClientDiagnosticsDto,
  ): Promise<{ success: boolean; id: string; timestamp: Date }> {
    const repository = this.dataSource.getRepository(ClientDiagnostics);

    let ts: Date | null = null;
    if (dto.timestamp) {
      ts = new Date(dto.timestamp);
      if (isNaN(ts.getTime())) {
        ts = new Date();
      }
    } else {
      ts = new Date();
    }

    const diagnostic = repository.create({
      roomId: dto.roomId,
      userId: userId || null,
      latency: dto.latency ?? null,
      jitter: dto.jitter ?? null,
      packetLoss: dto.packetLoss ?? null,
      audioBitrate: dto.audioBitrate ?? null,
      audioCodec: dto.audioCodec ?? null,
      deviceModel: dto.deviceModel ?? null,
      osVersion: dto.osVersion ?? null,
      appVersion: dto.appVersion ?? null,
      timestamp: ts,
    });

    const saved = await repository.save(diagnostic);

    return {
      success: true,
      id: saved.id,
      timestamp: saved.createdAt,
    };
  }
}
