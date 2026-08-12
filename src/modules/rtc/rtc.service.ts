import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { Room } from '../rooms/entities/room.entity';
import { RtcProviderFactory } from './providers/rtc-provider.factory';
import { RedisService } from '../../redis/redis.service';
import { RedisStateService } from '../../redis/redis-state.service';
import { EventsGateway } from '../../common/events/events.gateway';
import { UpdateRtcConfigDto } from './dto/update-rtc-config.dto';
import { GenerateTokenDto } from './dto/generate-token.dto';
import { StartSessionDto } from './dto/session-actions.dto';
import {
  RaiseHandDto,
  SpeakerActionDto,
  RtcMuteUserDto,
  LockSeatDto,
  AudioProfileDto,
} from './dto/speaking-controls.dto';
import {
  StartRecordingDto,
  QueryRtcSessionsDto,
} from './dto/recording-and-query.dto';
import {
  JoinRoomDto,
  LeaveRoomDto,
  RejoinRoomDto,
  ForceDisconnectDto,
  RefreshRtcTokenDto,
  SpeakingStateDto,
} from './dto/join-leave-room.dto';
import {
  PauseRecordingDto,
  ResumeRecordingDto,
} from './dto/recording-actions.dto';
import { RtcQualityMetric } from './entities/rtc-quality-metric.entity';
import { AdminSettingsService } from '../admin/admin-settings.service';

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
    @InjectRepository(RtcQualityMetric)
    private readonly qualityRepository: Repository<RtcQualityMetric>,
    private readonly providerFactory: RtcProviderFactory,
    private readonly redisService: RedisService,
    private readonly redisStateService: RedisStateService,
    private readonly eventsGateway: EventsGateway,
    private readonly adminSettingsService: AdminSettingsService,
  ) {}

  private async assertRoomStageManager(
    requesterId: string,
    roomId: string,
    options?: { ownerOnly?: boolean; targetUserId?: string },
  ): Promise<Room> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }

    if (room.hostId === requesterId) {
      return room;
    }

    if (options?.ownerOnly) {
      throw new ForbiddenException('Only room host can perform this RTC action');
    }

    const isModerator = await this.redisStateService.isModerator(
      roomId,
      requesterId,
    );
    if (!isModerator) {
      throw new ForbiddenException(
        'Only room host or authorized moderator can manage the RTC stage',
      );
    }

    if (options?.targetUserId === room.hostId) {
      throw new ForbiddenException(
        'Only the room host can change the host stage state',
      );
    }

    return room;
  }

  private async validateSpeakerSeatIndex(seatIndex?: number): Promise<void> {
    if (seatIndex === undefined) return;
    const { maxSpeakerSeats } =
      await this.adminSettingsService.getOperationalSettings();
    if (
      !Number.isSafeInteger(seatIndex) ||
      seatIndex < 1 ||
      seatIndex > maxSpeakerSeats
    ) {
      throw new BadRequestException(
        `Speaker seat index must be between 1 and ${maxSpeakerSeats}`,
      );
    }
  }

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
    const provider = dto.providerOverride
      ? this.providerFactory.getProvider(dto.providerOverride)
      : await this.providerFactory.getActiveProvider();

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
    await this.validateSpeakerSeatIndex(dto.seatIndex);
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
    const seatIndex = dto.seatIndex ?? 1;
    await this.validateSpeakerSeatIndex(seatIndex);
    await this.assertRoomStageManager(hostId, roomId, {
      targetUserId: dto.targetUserId,
    });

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
        seatIndex,
        joinedAt: new Date(),
      });
      await this.speakerHistoryRepository.save(history);
    }

    this.eventsGateway.server?.emit('hand_approved', {
      roomId,
      targetUserId: dto.targetUserId,
      approvedBy: hostId,
      seatIndex,
    });

    this.eventsGateway.server?.emit('speaker_joined', {
      roomId,
      userId: dto.targetUserId,
      seatIndex,
      role: SpeakerRole.SPEAKER,
    });

    return {
      message: 'Speaker approved successfully',
      roomId,
      targetUserId: dto.targetUserId,
    };
  }

  async rejectSpeaker(hostId: string, roomId: string, dto: SpeakerActionDto) {
    await this.assertRoomStageManager(hostId, roomId, {
      targetUserId: dto.targetUserId,
    });

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
    await this.assertRoomStageManager(hostId, roomId, {
      targetUserId: dto.targetUserId,
    });

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

  async muteUser(hostId: string, roomId: string, dto: RtcMuteUserDto) {
    await this.assertRoomStageManager(hostId, roomId, {
      targetUserId: dto.targetUserId,
    });

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
    await this.assertRoomStageManager(hostId, roomId);
    await this.validateSpeakerSeatIndex(dto.seatIndex);
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
    await this.assertRoomStageManager(hostId, roomId, { ownerOnly: true });

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

  // 8. Refresh Token Pipeline
  async refreshToken(userId: string, dto: RefreshRtcTokenDto) {
    const config = await this.getRtcConfig();
    const provider = await this.providerFactory.getActiveProvider();

    const role = dto.role || SpeakerRole.LISTENER;
    const expirationSeconds = dto.expirationSeconds || config.tokenExpiration;

    let result;
    if (provider.refreshToken) {
      result = await provider.refreshToken(config, dto.oldToken, {
        roomId: dto.roomId,
        userId,
        role,
        expirationSeconds,
      });
    } else {
      result = await provider.generateToken(config, {
        roomId: dto.roomId,
        userId,
        role,
        expirationSeconds,
      });
    }

    const redis = this.redisService.getClient();
    if (redis) {
      try {
        await redis.set(
          `rtc:token:${dto.roomId}:${userId}`,
          JSON.stringify(result),
          'EX',
          expirationSeconds,
        );
      } catch (e) {
        this.logger.warn(`Failed to cache refreshed token: ${e}`);
      }
    }

    this.eventsGateway.server?.emit('rtc_token_refreshed', {
      roomId: dto.roomId,
      userId,
      role,
      provider: result.provider,
      expiresAt: result.expiresAt,
    });

    return result;
  }

  // 9. Room Join & Leave Pipeline
  async joinRoom(userId: string, dto: JoinRoomDto) {
    const room = await this.roomRepository.findOne({
      where: { id: dto.roomId },
    });
    if (!room) throw new NotFoundException(`Room ${dto.roomId} not found`);

    const role =
      dto.role ||
      (room.hostId === userId ? SpeakerRole.HOST : SpeakerRole.LISTENER);
    const tokenResult = await this.generateToken(userId, {
      roomId: dto.roomId,
      role,
    });

    const presenceState = {
      userId,
      roomId: dto.roomId,
      role,
      status: 'connected',
      isMuted: false,
      isSpeaking: false,
      handRaised: false,
      deviceInfo: dto.deviceInfo || 'web',
      joinedAt: new Date().toISOString(),
    };

    const redis = this.redisService.getClient();
    if (redis) {
      try {
        await redis.set(
          `rtc:presence:${dto.roomId}:${userId}`,
          JSON.stringify(presenceState),
          'EX',
          86400,
        );
        await redis.sadd(`rtc:room:${dto.roomId}:participants`, userId);
      } catch (e) {
        this.logger.warn(`Redis presence error: ${e}`);
      }
    }

    const activeSession = await this.sessionRepository.findOne({
      where: { roomId: dto.roomId, status: RtcSessionStatus.ACTIVE },
    });
    if (activeSession) {
      activeSession.concurrentUsers = (activeSession.concurrentUsers || 1) + 1;
      if (activeSession.concurrentUsers > (activeSession.peakAudience || 0)) {
        activeSession.peakAudience = activeSession.concurrentUsers;
      }
      activeSession.totalParticipants =
        (activeSession.totalParticipants || 1) + 1;
      await this.sessionRepository.save(activeSession);
    }

    this.eventsGateway.server?.emit('participant_joined', {
      roomId: dto.roomId,
      userId,
      role,
      joinedAt: presenceState.joinedAt,
    });

    return {
      message: 'Joined RTC room successfully',
      roomId: dto.roomId,
      userId,
      role,
      token: tokenResult.token,
      expiresAt: tokenResult.expiresAt,
      presenceState,
    };
  }

  async leaveRoom(userId: string, dto: LeaveRoomDto) {
    const redis = this.redisService.getClient();
    if (redis) {
      try {
        await redis.del(`rtc:presence:${dto.roomId}:${userId}`);
        await redis.srem(`rtc:room:${dto.roomId}:participants`, userId);
      } catch (e) {
        this.logger.warn(`Redis leave error: ${e}`);
      }
    }

    const activeSession = await this.sessionRepository.findOne({
      where: { roomId: dto.roomId, status: RtcSessionStatus.ACTIVE },
    });
    if (activeSession && activeSession.concurrentUsers > 0) {
      activeSession.concurrentUsers -= 1;
      await this.sessionRepository.save(activeSession);
    }

    this.eventsGateway.server?.emit('participant_left', {
      roomId: dto.roomId,
      userId,
      leftAt: new Date().toISOString(),
    });

    return {
      message: 'Left RTC room successfully',
      roomId: dto.roomId,
      userId,
    };
  }

  async rejoinRoom(userId: string, dto: RejoinRoomDto) {
    const presenceState = {
      userId,
      roomId: dto.roomId,
      status: 'connected',
      reconnectedAt: new Date().toISOString(),
    };

    const redis = this.redisService.getClient();
    if (redis) {
      try {
        await redis.set(
          `rtc:presence:${dto.roomId}:${userId}`,
          JSON.stringify(presenceState),
          'EX',
          86400,
        );
        await redis.sadd(`rtc:room:${dto.roomId}:participants`, userId);
      } catch (e) {
        this.logger.warn(`Redis rejoin error: ${e}`);
      }
    }

    this.eventsGateway.server?.emit('participant_reconnected', {
      roomId: dto.roomId,
      userId,
      reconnectedAt: presenceState.reconnectedAt,
    });

    return {
      message: 'Rejoined RTC room successfully',
      roomId: dto.roomId,
      userId,
    };
  }

  async forceDisconnectParticipant(
    adminOrHostId: string,
    dto: ForceDisconnectDto,
  ) {
    await this.assertRoomStageManager(adminOrHostId, dto.roomId, {
      targetUserId: dto.targetUserId,
    });

    const config = await this.getRtcConfig();
    const provider = this.providerFactory.getProvider(config.activeProvider);
    await provider.kickUser(config, dto.roomId, dto.targetUserId);

    const redis = this.redisService.getClient();
    if (redis) {
      try {
        await redis.del(`rtc:presence:${dto.roomId}:${dto.targetUserId}`);
        await redis.srem(
          `rtc:room:${dto.roomId}:participants`,
          dto.targetUserId,
        );
      } catch (e) {
        this.logger.warn(`Redis kick error: ${e}`);
      }
    }

    this.eventsGateway.server?.emit('participant_force_disconnected', {
      roomId: dto.roomId,
      targetUserId: dto.targetUserId,
      disconnectedBy: adminOrHostId,
      reason: dto.reason || 'Kicked by host',
    });

    this.eventsGateway.server?.emit('participant_left', {
      roomId: dto.roomId,
      userId: dto.targetUserId,
      leftAt: new Date().toISOString(),
      reason: dto.reason || 'Kicked',
    });

    return {
      message: 'Participant force disconnected successfully',
      roomId: dto.roomId,
      targetUserId: dto.targetUserId,
    };
  }

  async getRoomParticipants(roomId: string) {
    const redis = this.redisService.getClient();
    const participantIds: string[] = [];
    if (redis) {
      try {
        const members = await redis.smembers(`rtc:room:${roomId}:participants`);
        participantIds.push(...members);
      } catch (e) {
        this.logger.warn(`Failed to fetch room participants from Redis: ${e}`);
      }
    }

    const presenceList = [];
    if (redis) {
      for (const uid of participantIds) {
        try {
          const raw = await redis.get(`rtc:presence:${roomId}:${uid}`);
          if (raw) {
            presenceList.push(JSON.parse(raw));
          } else {
            presenceList.push({ userId: uid, status: 'connected', roomId });
          }
        } catch {
          presenceList.push({ userId: uid, status: 'connected', roomId });
        }
      }
    }

    return {
      roomId,
      totalCount: presenceList.length,
      participants: presenceList,
    };
  }

  // 10. Active Speaker Detection
  async reportSpeakingState(userId: string, dto: SpeakingStateDto) {
    const redis = this.redisService.getClient();
    if (redis) {
      try {
        if (dto.isSpeaking) {
          await redis.set(`rtc:room:${dto.roomId}:active_speaker`, userId);
        }
      } catch (e) {
        this.logger.warn(`Redis speaking state error: ${e}`);
      }
    }

    this.eventsGateway.server?.emit('active_speaker_changed', {
      roomId: dto.roomId,
      activeSpeakerUserId: dto.isSpeaking ? userId : null,
      isSpeaking: dto.isSpeaking,
      audioLevel: dto.audioLevel || 0,
      timestamp: new Date().toISOString(),
    });

    return {
      message: 'Speaking state updated',
      roomId: dto.roomId,
      userId,
      isSpeaking: dto.isSpeaking,
    };
  }

  // 11. Recording Pause / Resume
  async pauseRecording(userId: string, dto: PauseRecordingDto) {
    const job = await this.recordingJobRepository.findOne({
      where: { id: dto.jobId },
    });
    if (!job)
      throw new NotFoundException(`Recording job ${dto.jobId} not found`);

    const config = await this.getRtcConfig();
    const provider = this.providerFactory.getProvider(job.provider);
    if (provider.pauseRecording && job.providerJobId) {
      await provider.pauseRecording(config, job.providerJobId);
    }

    job.status = RecordingJobStatus.PAUSED;
    const saved = await this.recordingJobRepository.save(job);

    this.eventsGateway.server?.emit('recording_paused', {
      jobId: saved.id,
      sessionId: saved.sessionId,
      roomId: saved.roomId,
    });

    return saved;
  }

  async resumeRecording(userId: string, dto: ResumeRecordingDto) {
    const job = await this.recordingJobRepository.findOne({
      where: { id: dto.jobId },
    });
    if (!job)
      throw new NotFoundException(`Recording job ${dto.jobId} not found`);

    const config = await this.getRtcConfig();
    const provider = this.providerFactory.getProvider(job.provider);
    if (provider.resumeRecording && job.providerJobId) {
      await provider.resumeRecording(config, job.providerJobId);
    }

    job.status = RecordingJobStatus.RECORDING;
    const saved = await this.recordingJobRepository.save(job);

    this.eventsGateway.server?.emit('recording_resumed', {
      jobId: saved.id,
      sessionId: saved.sessionId,
      roomId: saved.roomId,
    });

    return saved;
  }

  // 12. Admin RTC Monitoring Stats
  async getAdminMonitoringStats() {
    const config = await this.getRtcConfig();
    const activeSessionsCount = await this.sessionRepository.count({
      where: { status: RtcSessionStatus.ACTIVE },
    });

    const activeSessions = await this.sessionRepository.find({
      where: { status: RtcSessionStatus.ACTIVE },
      take: 10,
    });

    const totalParticipants = activeSessions.reduce(
      (acc, s) => acc + (s.concurrentUsers || 0),
      0,
    );

    const recordingJobs = await this.recordingJobRepository.find({
      where: { status: RecordingJobStatus.RECORDING },
    });

    const recentMetrics = await this.qualityRepository
      .createQueryBuilder('m')
      .orderBy('m.createdAt', 'DESC')
      .limit(50)
      .getMany();

    const avgRtt = recentMetrics.length
      ? Math.round(
          recentMetrics.reduce((a, b) => a + b.rtt, 0) / recentMetrics.length,
        )
      : 35;
    const avgPacketLoss = recentMetrics.length
      ? Number(
          (
            recentMetrics.reduce((a, b) => a + b.packetLoss, 0) /
            recentMetrics.length
          ).toFixed(2),
        )
      : 0.5;

    return {
      activeRoomsCount: activeSessionsCount,
      connectedParticipantsCount: Math.max(
        activeSessionsCount,
        totalParticipants,
      ),
      activeProvider: config.activeProvider,
      providerStatus: 'operational',
      averageRtt: avgRtt,
      averagePacketLoss: avgPacketLoss,
      recordingStatus: recordingJobs.length > 0 ? 'recording' : 'idle',
      activeRecordingsCount: recordingJobs.length,
      connectionFailures: 0,
      reconnectionCount: 0,
      activeSpeakersCount: activeSessions.reduce(
        (acc, s) => acc + (s.activeSpeakersList?.length || 0),
        0,
      ),
      activeSessions,
    };
  }
}
