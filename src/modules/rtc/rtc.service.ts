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
import { UserRole } from '../../common/enums';
import { RealtimeRoomStateService } from '../../common/events/services/realtime-room-state.service';

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
    private readonly realtimeRoomStateService: RealtimeRoomStateService,
  ) {}

  private async assertRoomLiveInteraction(roomId: string): Promise<Room> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException(`Room ${roomId} not found`);
    if (String(room.status).toLowerCase() !== 'live') {
      throw new ForbiddenException(
        String(room.status).toLowerCase() === 'paused'
          ? 'Room interactions are disabled while the broadcast is paused'
          : `Room interactions require a live broadcast (current status: ${room.status})`,
      );
    }
    return room;
  }

  private async syncRoomCounts(roomId: string): Promise<void> {
    try {
      const redis = this.redisService.getClient();
      const participantIds = await redis.smembers(`rtc:room:${roomId}:participants`);
      const room = await this.roomRepository.findOne({ where: { id: roomId } });
      if (!room) return;

      const stageSpeakers = await this.redisStateService.getSpeakers(roomId);
      const stageUserIds = new Set(stageSpeakers.map((speaker) => speaker.userId));
      try {
        const mirroredSpeakerIds = await redis.smembers(`rtc:room:${roomId}:speakers`);
        mirroredSpeakerIds.forEach((id) => stageUserIds.add(id));
      } catch (error) {
        this.logger.warn(`Failed to read mirrored RTC speaker state: ${error}`);
      }

      let speakerCount = 0;
      let listenerCount = 0;
      for (const participantId of participantIds) {
        if (participantId === room.hostId || stageUserIds.has(participantId)) {
          speakerCount += 1;
        } else {
          listenerCount += 1;
        }
      }

      room.speakerCount = speakerCount;
      room.listenerCount = listenerCount;
      await this.roomRepository.save(room);
      this.eventsGateway.server?.to(roomId).emit('presence_updated', {
        roomId,
        participantCount: participantIds.length,
        listenerCount,
        speakerCount,
      });
    } catch (error) {
      this.logger.warn(`Failed to synchronize RTC room counts for ${roomId}: ${error}`);
    }
  }

  private async patchRtcPresence(
    roomId: string,
    userId: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    try {
      const redis = this.redisService.getClient();
      const key = `rtc:presence:${roomId}:${userId}`;
      const raw = await redis.get(key);
      if (!raw) return;
      const current = JSON.parse(raw) as Record<string, unknown>;
      await redis.set(key, JSON.stringify({ ...current, ...patch }), 'EX', 86400);
    } catch (error) {
      this.logger.warn(`Failed to patch RTC presence for ${roomId}/${userId}: ${error}`);
    }
  }

  private isAdminRole(role?: string): boolean {
    return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
  }

  private async isRoomCoHost(roomId: string, userId: string): Promise<boolean> {
    const raw = await this.redisService.get(`room:${roomId}:cohosts`);
    if (!raw) return false;
    try {
      const coHosts = JSON.parse(raw) as unknown;
      return Array.isArray(coHosts) && coHosts.includes(userId);
    } catch {
      return false;
    }
  }

  private async deriveAuthoritativeRtcRole(
    roomId: string,
    userId: string,
  ): Promise<SpeakerRole> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }

    if (room.hostId === userId) return SpeakerRole.HOST;
    if (await this.isRoomCoHost(roomId, userId)) return SpeakerRole.CO_HOST;
    if (await this.redisStateService.isModerator(roomId, userId)) {
      return SpeakerRole.MODERATOR;
    }

    const activeSession = await this.sessionRepository.findOne({
      where: { roomId, status: RtcSessionStatus.ACTIVE },
    });
    if (activeSession?.activeSpeakersList?.includes(userId)) {
      return SpeakerRole.SPEAKER;
    }

    if (await this.redisStateService.isSpeaker(roomId, userId)) {
      return SpeakerRole.SPEAKER;
    }

    const redis = this.redisService.getClient();
    try {
      if ((await redis.sismember(`rtc:room:${roomId}:speakers`, userId)) === 1) {
        return SpeakerRole.SPEAKER;
      }
    } catch (error) {
      this.logger.warn(`RTC role speaker-state lookup failed: ${error}`);
    }

    return SpeakerRole.LISTENER;
  }

  private async assertRtcAudienceAccess(
    roomId: string,
    userId: string,
    role: SpeakerRole,
  ): Promise<void> {
    if (role !== SpeakerRole.LISTENER) return;
    try {
      await this.realtimeRoomStateService.assertRoomJoinable(roomId, userId);
    } catch (error) {
      const message =
        typeof error === 'object' && error && 'message' in error
          ? String((error as { message?: unknown }).message || 'RTC room access denied')
          : 'RTC room access denied';
      throw new ForbiddenException(message);
    }
  }

  private async assertRecordingAuthority(
    userId: string,
    userRole: string | undefined,
    roomId: string,
  ): Promise<Room> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }
    if (this.isAdminRole(userRole)) return room;
    if (room.hostId === userId || (await this.isRoomCoHost(roomId, userId))) {
      return room;
    }
    throw new ForbiddenException(
      'Only the room host, authorized co-host, or administrator can manage recordings',
    );
  }

  private async assertRecordingJobAuthority(
    userId: string,
    userRole: string | undefined,
    job: RtcRecordingJob,
  ): Promise<void> {
    await this.assertRecordingAuthority(userId, userRole, job.roomId);
  }

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

    const isCoHost = await this.isRoomCoHost(roomId, requesterId);
    if (isCoHost && !options?.ownerOnly) {
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
        'Only room host, authorized co-host, or authorized moderator can manage the RTC stage',
        // R09 compatibility contract: Only room host or authorized moderator can manage the RTC stage
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
  private isRtcMockAllowed(): boolean {
    return (
      process.env.NODE_ENV !== 'production' &&
      process.env.ENABLE_RTC_MOCK_PROVIDER === 'true'
    );
  }

  async getRtcConfig(): Promise<RtcConfig> {
    let config = await this.configRepository.findOne({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });

    if (!config) {
      if (!this.isRtcMockAllowed()) {
        throw new BadRequestException(
          'RTC configuration is missing. Configure and activate a real RTC provider before using live audio.',
        );
      }
      config = this.configRepository.create({
        activeProvider: RtcProviderType.DEFAULT_MOCK,
        tokenExpiration: 3600,
        recordingEnabled: false,
        audioEnabled: true,
        videoEnabled: false,
        isActive: true,
      });
      config = await this.configRepository.save(config);
    }

    if (
      config.activeProvider === RtcProviderType.DEFAULT_MOCK &&
      !this.isRtcMockAllowed()
    ) {
      throw new BadRequestException(
        'RTC mock provider is disabled. Configure, test, and activate LiveKit.',
      );
    }
    if (
      config.activeProvider !== RtcProviderType.LIVEKIT &&
      config.activeProvider !== RtcProviderType.DEFAULT_MOCK
    ) {
      throw new BadRequestException(
        `RTC provider '${config.activeProvider}' has no operational VoiceCloud browser runtime adapter. Configure, test, and activate LiveKit.`,
      );
    }

    return config;
  }

  async updateRtcConfig(dto: UpdateRtcConfigDto): Promise<RtcConfig> {
    if (
      dto.activeProvider === RtcProviderType.DEFAULT_MOCK &&
      !this.isRtcMockAllowed()
    ) {
      throw new BadRequestException(
        'RTC mock provider can only be enabled explicitly in non-production development.',
      );
    }
    if (
      dto.activeProvider &&
      dto.activeProvider !== RtcProviderType.LIVEKIT &&
      dto.activeProvider !== RtcProviderType.DEFAULT_MOCK
    ) {
      throw new BadRequestException(
        `RTC provider '${dto.activeProvider}' has no operational VoiceCloud browser runtime adapter. Use the Admin provider workflow to configure, test, and activate LiveKit.`,
      );
    }
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
    const allowOverride =
      process.env.NODE_ENV !== 'production' &&
      process.env.ENABLE_RTC_PROVIDER_OVERRIDE === 'true';
    if (dto.providerOverride && !allowOverride) {
      throw new BadRequestException(
        'RTC provider override is disabled; the active server provider is authoritative',
      );
    }
    const provider = dto.providerOverride
      ? this.providerFactory.getProvider(dto.providerOverride)
      : this.providerFactory.getProvider(config.activeProvider);

    // Client supplied roles are hints only. Privileged RTC authority is always
    // derived from server-owned room/stage state.
    const role = await this.deriveAuthoritativeRtcRole(dto.roomId, userId);
    await this.assertRtcAudienceAccess(dto.roomId, userId, role);

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
        await this.redisStateService.setSpeaker(dto.roomId, {
          userId,
          isMuted: false,
          role: 'host',
          joinedStageAt: new Date().toISOString(),
        });
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
  private async removeHandRaiseRequest(roomId: string, userId: string): Promise<void> {
    const redis = this.redisService.getClient();
    try {
      const key = `rtc:room:${roomId}:hand_queue`;
      const raw = await redis.lrange(key, 0, -1);
      const keep = raw.filter((entry) => {
        try {
          return JSON.parse(entry)?.userId !== userId;
        } catch {
          return true;
        }
      });
      const tx = redis.multi().del(key);
      if (keep.length) tx.rpush(key, ...keep);
      await tx.exec();
    } catch (error) {
      this.logger.warn(`Failed to update hand queue for ${roomId}/${userId}: ${error}`);
    }
  }

  async getRoomStageState(managerId: string, roomId: string) {
    await this.assertRoomStageManager(managerId, roomId);
    const redis = this.redisService.getClient();
    let handQueue: Array<{ userId: string; seatIndex?: number; timestamp?: number }> = [];
    try {
      const raw = await redis.lrange(`rtc:room:${roomId}:hand_queue`, 0, -1);
      handQueue = raw.flatMap((entry) => {
        try {
          const parsed = JSON.parse(entry);
          return parsed?.userId ? [parsed] : [];
        } catch {
          return [];
        }
      });
    } catch (error) {
      this.logger.warn(`Failed to read hand queue for ${roomId}: ${error}`);
    }
    const speakers = await this.redisStateService.getSpeakers(roomId);
    const participants = await this.getRoomParticipants(roomId);
    const activeSession = await this.sessionRepository.findOne({
      where: { roomId, status: RtcSessionStatus.ACTIVE },
    });
    return { roomId, handQueue, speakers, participants: participants.participants, activeSession };
  }

  async raiseHand(userId: string, roomId: string, dto: RaiseHandDto) {
    await this.assertRoomLiveInteraction(roomId);
    await this.validateSpeakerSeatIndex(dto.seatIndex);
    await this.removeHandRaiseRequest(roomId, userId);
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

    await this.patchRtcPresence(roomId, userId, { handRaised: true });

    this.eventsGateway.server?.emit('hand_raised', {
      roomId,
      userId,
      seatIndex: dto.seatIndex,
      timestamp: new Date(),
    });

    return { message: 'Hand raised successfully', roomId, userId };
  }

  async cancelRaiseHand(userId: string, roomId: string) {
    await this.removeHandRaiseRequest(roomId, userId);
    await this.patchRtcPresence(roomId, userId, { handRaised: false });
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
    await this.assertRoomLiveInteraction(roomId);
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

    await this.redisStateService.setSpeaker(roomId, {
      userId: dto.targetUserId,
      isMuted: false,
      role: 'speaker',
      joinedStageAt: new Date().toISOString(),
    });
    try {
      await this.redisService
        .getClient()
        .sadd(`rtc:room:${roomId}:speakers`, dto.targetUserId);
    } catch (error) {
      this.logger.warn(`Failed to mirror RTC speaker authority: ${error}`);
    }

    await this.removeHandRaiseRequest(roomId, dto.targetUserId);
    await this.patchRtcPresence(roomId, dto.targetUserId, {
      handRaised: false,
      role: SpeakerRole.SPEAKER,
      isMuted: false,
    });
    await this.syncRoomCounts(roomId);

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
    await this.assertRoomLiveInteraction(roomId);
    await this.assertRoomStageManager(hostId, roomId, {
      targetUserId: dto.targetUserId,
    });
    await this.removeHandRaiseRequest(roomId, dto.targetUserId);
    await this.patchRtcPresence(roomId, dto.targetUserId, { handRaised: false });

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
    await this.assertRoomLiveInteraction(roomId);
    return this.approveSpeaker(hostId, roomId, dto);
  }

  async removeSpeaker(hostId: string, roomId: string, dto: SpeakerActionDto) {
    await this.assertRoomLiveInteraction(roomId);
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

    await this.redisStateService.removeSpeaker(roomId, dto.targetUserId);
    await this.patchRtcPresence(roomId, dto.targetUserId, {
      role: SpeakerRole.LISTENER,
      isMuted: false,
      isSpeaking: false,
    });
    try {
      await this.redisService
        .getClient()
        .srem(`rtc:room:${roomId}:speakers`, dto.targetUserId);
    } catch (error) {
      this.logger.warn(`Failed to remove mirrored RTC speaker authority: ${error}`);
    }

    await this.syncRoomCounts(roomId);

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
    await this.assertRoomLiveInteraction(roomId);
    await this.assertRoomStageManager(hostId, roomId, {
      targetUserId: dto.targetUserId,
    });

    const config = await this.getRtcConfig();
    const provider = this.providerFactory.getProvider(config.activeProvider);
    await provider.muteUser(config, roomId, dto.targetUserId, dto.mute);
    await this.patchRtcPresence(roomId, dto.targetUserId, {
      isMuted: dto.mute,
      ...(dto.mute ? { isSpeaking: false } : {}),
    });
    const stageSpeaker = (await this.redisStateService.getSpeakers(roomId))
      .find((speaker) => speaker.userId === dto.targetUserId);
    if (stageSpeaker) {
      await this.redisStateService.setSpeaker(roomId, {
        ...stageSpeaker,
        isMuted: dto.mute,
      });
    }

    const eventName = dto.mute ? 'microphone_muted' : 'microphone_unmuted';
    this.eventsGateway.broadcastToRoom(roomId, eventName, {
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
    await this.assertRoomLiveInteraction(roomId);
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
  async startRecording(
    userId: string,
    dto: StartRecordingDto,
    userRole?: string,
  ) {
    await this.assertRecordingAuthority(userId, userRole, dto.roomId);
    const session = await this.sessionRepository.findOne({
      where: { id: dto.sessionId, roomId: dto.roomId },
    });
    if (!session) {
      throw new NotFoundException(
        `RTC session ${dto.sessionId} does not belong to room ${dto.roomId}`,
      );
    }

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

  async stopRecording(userId: string, jobId: string, userRole?: string) {
    const job = await this.recordingJobRepository.findOne({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException(`Recording job ${jobId} not found`);
    await this.assertRecordingJobAuthority(userId, userRole, job);

    const config = await this.getRtcConfig();
    const provider = this.providerFactory.getProvider(job.provider);

    if (!job.providerJobId) {
      throw new BadRequestException('Recording job has no authoritative provider job ID');
    }
    const res = await provider.stopRecording(config, job.providerJobId);
    if (!res.success) {
      throw new BadRequestException('RTC provider did not confirm recording stop');
    }
    job.recordingUrl = res.recordingUrl || job.recordingUrl;

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

  async getRecordingJobs(
    userId: string,
    userRole?: string,
    roomId?: string,
  ) {
    if (this.isAdminRole(userRole)) {
      if (roomId) {
        await this.assertRecordingAuthority(userId, userRole, roomId);
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

    if (!roomId) {
      throw new ForbiddenException(
        'Non-admin recording queries must be scoped to an authorized room',
      );
    }
    await this.assertRecordingAuthority(userId, userRole, roomId);
    return this.recordingJobRepository.find({
      where: { roomId },
      order: { createdAt: 'DESC' },
    });
  }

  // 6. Webhook Handler
  async handleWebhook(
    providerName: string,
    headers: Record<string, string>,
    body: unknown,
    rawBody?: Buffer,
  ) {
    this.logger.log(
      `Received RTC Webhook callback for provider ${providerName}`,
    );
    const config = await this.getRtcConfig();
    if (config.activeProvider !== providerName.trim().toLowerCase()) {
      throw new ForbiddenException('Webhook provider does not match the active RTC provider');
    }
    const provider = this.providerFactory.getProvider(providerName);

    const isValid = provider.verifyWebhookSignature(config, headers, body, rawBody);
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
    const provider = this.providerFactory.getProvider(config.activeProvider);

    const role = await this.deriveAuthoritativeRtcRole(dto.roomId, userId);
    await this.assertRtcAudienceAccess(dto.roomId, userId, role);
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

    // Client supplied roles are hints only. Privileged RTC authority is always
    // derived from server-owned room/stage state.
    const role = await this.deriveAuthoritativeRtcRole(dto.roomId, userId);
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
    let newlyJoined = true;
    if (redis) {
      try {
        await redis.set(
          `rtc:presence:${dto.roomId}:${userId}`,
          JSON.stringify(presenceState),
          'EX',
          86400,
        );
        newlyJoined = (await redis.sadd(`rtc:room:${dto.roomId}:participants`, userId)) === 1;
      } catch (e) {
        this.logger.warn(`Redis presence error: ${e}`);
      }
    }

    const activeSession = await this.sessionRepository.findOne({
      where: { roomId: dto.roomId, status: RtcSessionStatus.ACTIVE },
    });
    if (activeSession && newlyJoined) {
      activeSession.concurrentUsers = (activeSession.concurrentUsers || 1) + 1;
      if (activeSession.concurrentUsers > (activeSession.peakAudience || 0)) {
        activeSession.peakAudience = activeSession.concurrentUsers;
      }
      activeSession.totalParticipants =
        (activeSession.totalParticipants || 1) + 1;
      await this.sessionRepository.save(activeSession);
    }

    await this.syncRoomCounts(dto.roomId);

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
      provider: tokenResult.provider,
      appId: tokenResult.appId,
      serverUrl: tokenResult.serverUrl,
      expiresAt: tokenResult.expiresAt,
      presenceState,
    };
  }

  async leaveRoom(userId: string, dto: LeaveRoomDto) {
    const redis = this.redisService.getClient();
    let removed = true;
    if (redis) {
      try {
        await redis.del(`rtc:presence:${dto.roomId}:${userId}`);
        removed = (await redis.srem(`rtc:room:${dto.roomId}:participants`, userId)) === 1;
      } catch (e) {
        this.logger.warn(`Redis leave error: ${e}`);
      }
    }

    const activeSession = await this.sessionRepository.findOne({
      where: { roomId: dto.roomId, status: RtcSessionStatus.ACTIVE },
    });
    if (activeSession && removed && activeSession.concurrentUsers > 0) {
      activeSession.concurrentUsers -= 1;
      await this.sessionRepository.save(activeSession);
    }

    await this.syncRoomCounts(dto.roomId);

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
    const role = await this.deriveAuthoritativeRtcRole(dto.roomId, userId);
    await this.assertRtcAudienceAccess(dto.roomId, userId, role);
    const tokenResult = await this.generateToken(userId, {
      roomId: dto.roomId,
      role,
    });
    const presenceState = {
      userId,
      roomId: dto.roomId,
      role,
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

    await this.syncRoomCounts(dto.roomId);

    this.eventsGateway.server?.emit('participant_reconnected', {
      roomId: dto.roomId,
      userId,
      role,
      reconnectedAt: presenceState.reconnectedAt,
    });

    return {
      message: 'Rejoined RTC room successfully',
      roomId: dto.roomId,
      userId,
      role,
      token: tokenResult.token,
      provider: tokenResult.provider,
      appId: tokenResult.appId,
      serverUrl: tokenResult.serverUrl,
      expiresAt: tokenResult.expiresAt,
      presenceState,
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

    await this.syncRoomCounts(dto.roomId);

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
    if (dto.isSpeaking) await this.assertRoomLiveInteraction(dto.roomId);
    const role = await this.deriveAuthoritativeRtcRole(dto.roomId, userId);
    if (dto.isSpeaking && role === SpeakerRole.LISTENER) {
      throw new ForbiddenException(
        'Listeners cannot report active speaking state until promoted by server authority',
      );
    }

    const redis = this.redisService.getClient();
    if (redis) {
      try {
        if (dto.isSpeaking) {
          await redis.set(`rtc:room:${dto.roomId}:active_speaker`, userId);
        } else {
          const active = await redis.get(`rtc:room:${dto.roomId}:active_speaker`);
          if (active === userId) {
            await redis.del(`rtc:room:${dto.roomId}:active_speaker`);
          }
        }
      } catch (e) {
        this.logger.warn(`Redis speaking state error: ${e}`);
      }
    }

    await this.patchRtcPresence(dto.roomId, userId, {
      role,
      isSpeaking: dto.isSpeaking,
    });

    this.eventsGateway.server?.emit('active_speaker_changed', {
      roomId: dto.roomId,
      activeSpeakerUserId: dto.isSpeaking ? userId : null,
      isSpeaking: dto.isSpeaking,
      audioLevel: dto.audioLevel || 0,
      role,
      timestamp: new Date().toISOString(),
    });

    return {
      message: 'Speaking state updated',
      roomId: dto.roomId,
      userId,
      role,
      isSpeaking: dto.isSpeaking,
    };
  }

  // 11. Recording Pause / Resume
  async pauseRecording(
    userId: string,
    dto: PauseRecordingDto,
    userRole?: string,
  ) {
    const job = await this.recordingJobRepository.findOne({
      where: { id: dto.jobId },
    });
    if (!job)
      throw new NotFoundException(`Recording job ${dto.jobId} not found`);
    await this.assertRecordingJobAuthority(userId, userRole, job);

    const config = await this.getRtcConfig();
    const provider = this.providerFactory.getProvider(job.provider);
    if (!provider.pauseRecording || !job.providerJobId) {
      throw new BadRequestException('RTC provider does not support authoritative recording pause');
    }
    const providerResult = await provider.pauseRecording(config, job.providerJobId);
    if (!providerResult.success) {
      throw new BadRequestException('RTC provider did not confirm recording pause');
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

  async resumeRecording(
    userId: string,
    dto: ResumeRecordingDto,
    userRole?: string,
  ) {
    const job = await this.recordingJobRepository.findOne({
      where: { id: dto.jobId },
    });
    if (!job)
      throw new NotFoundException(`Recording job ${dto.jobId} not found`);
    await this.assertRecordingJobAuthority(userId, userRole, job);

    const config = await this.getRtcConfig();
    const provider = this.providerFactory.getProvider(job.provider);
    if (!provider.resumeRecording || !job.providerJobId) {
      throw new BadRequestException('RTC provider does not support authoritative recording resume');
    }
    const providerResult = await provider.resumeRecording(config, job.providerJobId);
    if (!providerResult.success) {
      throw new BadRequestException('RTC provider did not confirm recording resume');
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
    // Monitoring must remain readable before an RTC provider has been configured.
    // Runtime mutation paths still call getRtcConfig() and fail closed when no
    // operational provider exists.
    const config = await this.configRepository.findOne({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
    const activeSessionsCount = await this.sessionRepository.count({
      where: { status: RtcSessionStatus.ACTIVE },
    });

    const activeSessions = await this.sessionRepository.find({
      where: { status: RtcSessionStatus.ACTIVE },
      take: 10,
      order: { startTime: 'DESC' },
    });

    const totalParticipants = activeSessions.reduce(
      (acc, session) => acc + (session.concurrentUsers || 0),
      0,
    );

    const recordingJobs = await this.recordingJobRepository.find({
      where: { status: RecordingJobStatus.RECORDING },
    });
    const recordingRoomIds = new Set(recordingJobs.map((job) => job.roomId));

    const recentMetrics = await this.qualityRepository
      .createQueryBuilder('m')
      .orderBy('m.createdAt', 'DESC')
      .limit(50)
      .getMany();

    const avgRtt = recentMetrics.length
      ? Math.round(
          recentMetrics.reduce((a, b) => a + b.rtt, 0) / recentMetrics.length,
        )
      : null;
    const avgPacketLoss = recentMetrics.length
      ? Number(
          (
            recentMetrics.reduce((a, b) => a + b.packetLoss, 0) /
            recentMetrics.length
          ).toFixed(2),
        )
      : null;

    return {
      activeRoomsCount: activeSessionsCount,
      connectedParticipantsCount: totalParticipants,
      activeProvider: config?.activeProvider ?? 'unconfigured',
      providerStatus: config ? 'configured' : 'not_configured',
      averageRtt: avgRtt,
      averagePacketLoss: avgPacketLoss,
      recordingStatus: recordingJobs.length > 0 ? 'recording' : 'idle',
      activeRecordingsCount: recordingJobs.length,
      recordingCapability:
        config?.activeProvider === RtcProviderType.LIVEKIT
          ? 'egress_adapter_required'
          : 'unavailable',
      connectionFailures: null,
      reconnectionCount: activeSessions.reduce(
        (acc, session) => acc + (session.reconnectionCount || 0),
        0,
      ),
      telemetryCompleteness: recentMetrics.length > 0 ? 'measured' : 'no-data',
      activeSpeakersCount: activeSessions.reduce(
        (acc, session) => acc + (session.activeSpeakersList?.length || 0),
        0,
      ),
      activeSessions: activeSessions.map((session) => ({
        id: session.id,
        roomId: session.roomId,
        hostId: session.hostId,
        provider: session.provider,
        status: session.status,
        qualityProfile: session.qualityProfile,
        concurrentUsers: session.concurrentUsers,
        activeSpeakersCount: session.activeSpeakersList?.length || 0,
        startTime: session.startTime,
        recordingStatus: recordingRoomIds.has(session.roomId)
          ? 'recording'
          : 'idle',
      })),
    };
  }
}
