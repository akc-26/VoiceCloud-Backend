import { Injectable, Logger, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from '../../../modules/rooms/entities/room.entity';
import { SocketErrorCode } from '../constants/socket-error-codes.enum';
import { RoomLifecycleStatus } from '../../../modules/rooms/enums/room-lifecycle-status.enum';
import { ScheduledRoom } from '../../../modules/rooms/entities/scheduled-room.entity';
import { RoomTicket } from '../../../modules/rooms/entities/room-ticket.entity';
import { User } from '../../../modules/users/entities/user.entity';
import { CreatorSubscription } from '../../../modules/users/entities/creator-subscription.entity';
import { ClubMember } from '../../../modules/clubs/entities/club-member.entity';
import { AdminSettingsService } from '../../../modules/admin/admin-settings.service';
import {
  SubscriptionStatus,
  TicketStatus,
  VerificationStatus,
  VisibilityType,
} from '../../enums';
import {
  RedisStateService,
  RedisQueueUser,
  RedisStageSpeaker,
  RedisRoomParticipant,
  RedisPendingInvitation,
} from '../../../redis/redis-state.service';

export interface StageSpeaker {
  userId: string;
  username?: string;
  isMuted: boolean;
  role: 'host' | 'moderator' | 'speaker';
  joinedStageAt: Date;
}

export interface QueueUser {
  userId: string;
  username?: string;
  joinedAt: Date;
}

export interface RoomParticipant {
  userId: string;
  username?: string;
  socketId: string;
  joinedAt: Date;
  lastSeenAt: Date;
}

export interface PendingInvitation {
  targetUserId: string;
  invitedBy: string;
  createdAt: Date;
}

export interface RoomState {
  roomId: string;
  hostId: string;
  title?: string;
  description?: string;
  category?: string;
  isClosed: boolean;
  moderators: Set<string>;
  bannedUsers: Set<string>;
  audienceInvitations: Set<string>;
  participants: Map<string, RoomParticipant>;
  queue: QueueUser[];
  speakers: Map<string, StageSpeaker>;
  pendingInvitations: Map<string, PendingInvitation>;
  typingUsers: Map<string, number>;
}

@Injectable()
export class RealtimeRoomStateService {
  private readonly logger = new Logger(RealtimeRoomStateService.name);
  private readonly roomStates = new Map<string, RoomState>();

  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @Optional()
    private readonly redisStateService?: RedisStateService,
    @Optional()
    @InjectRepository(ScheduledRoom)
    private readonly scheduledRoomRepository?: Repository<ScheduledRoom>,
    @Optional()
    @InjectRepository(RoomTicket)
    private readonly roomTicketRepository?: Repository<RoomTicket>,
    @Optional()
    @InjectRepository(User)
    private readonly userRepository?: Repository<User>,
    @Optional()
    @InjectRepository(CreatorSubscription)
    private readonly subscriptionRepository?: Repository<CreatorSubscription>,
    @Optional() private readonly moduleRef?: ModuleRef,
    @Optional()
    @InjectRepository(ClubMember)
    private readonly clubMemberRepository?: Repository<ClubMember>,
  ) {}

  /**
   * Retrieves or initializes room state. Loads hostId and topics from DB if present,
   * synchronizing with Redis distributed state.
   */
  async getOrCreateRoomState(
    roomId: string,
    defaultHostId?: string,
  ): Promise<RoomState> {
    let hostId = defaultHostId || '11111111-1111-1111-1111-111111111111';
    let title = 'Voice Room';
    let description = '';
    let category = 'General';
    let isClosed = false;

    // Check Redis meta if available
    if (this.redisStateService) {
      const redisMeta = await this.redisStateService.getRoomMeta(roomId);
      if (redisMeta) {
        hostId = redisMeta.hostId || hostId;
        title = redisMeta.title || title;
        description = redisMeta.description || description;
        category = redisMeta.category || category;
        isClosed = redisMeta.isClosed;
      } else {
        // Load from DB
        try {
          const roomEntity = await this.roomRepository.findOne({
            where: { id: roomId },
          });
          if (roomEntity) {
            hostId = roomEntity.hostId || hostId;
            title = roomEntity.title || title;
            description = roomEntity.description || description;
            category = roomEntity.category || category;
          }
        } catch (err) {
          this.logger.debug(
            `Could not load room entity for ${roomId} from DB: ${err}`,
          );
        }

        await this.redisStateService.setRoomMeta(roomId, {
          roomId,
          hostId,
          title,
          description,
          category,
          isClosed,
        });
      }
    } else {
      const state = this.roomStates.get(roomId);
      if (state) return state;

      try {
        const roomEntity = await this.roomRepository.findOne({
          where: { id: roomId },
        });
        if (roomEntity) {
          hostId = roomEntity.hostId || hostId;
          title = roomEntity.title || title;
          description = roomEntity.description || description;
          category = roomEntity.category || category;
        }
      } catch (err) {
        this.logger.debug(
          `Could not load room entity for ${roomId} from DB: ${err}`,
        );
      }
    }

    // Build RoomState object for in-memory / local compatibility
    let state = this.roomStates.get(roomId);
    if (!state) {
      state = {
        roomId,
        hostId,
        title,
        description,
        category,
        isClosed,
        moderators: new Set<string>([hostId]),
        bannedUsers: new Set<string>(),
        audienceInvitations: new Set<string>(),
        participants: new Map<string, RoomParticipant>(),
        queue: [],
        speakers: new Map<string, StageSpeaker>(),
        pendingInvitations: new Map<string, PendingInvitation>(),
        typingUsers: new Map<string, number>(),
      };
      this.roomStates.set(roomId, state);
    } else {
      state.hostId = hostId;
      state.title = title;
      state.description = description;
      state.category = category;
      state.isClosed = isClosed;
    }

    // Synchronize speakers with Redis
    if (this.redisStateService) {
      const redisSpeakers = await this.redisStateService.getSpeakers(roomId);
      if (redisSpeakers.length === 0) {
        const hostSpeaker: RedisStageSpeaker = {
          userId: hostId,
          isMuted: false,
          role: 'host',
          joinedStageAt: new Date().toISOString(),
        };
        await this.redisStateService.setSpeaker(roomId, hostSpeaker);
        state.speakers.set(hostId, {
          userId: hostId,
          isMuted: false,
          role: 'host',
          joinedStageAt: new Date(),
        });
      } else {
        state.speakers.clear();
        for (const sp of redisSpeakers) {
          state.speakers.set(sp.userId, {
            userId: sp.userId,
            username: sp.username,
            isMuted: sp.isMuted,
            role: sp.role,
            joinedStageAt: new Date(sp.joinedStageAt),
          });
        }
      }

      // Synchronize queue
      const redisQueue = await this.redisStateService.getQueue(roomId);
      state.queue = redisQueue.map((q) => ({
        userId: q.userId,
        username: q.username,
        joinedAt: new Date(q.joinedAt),
      }));

      // Synchronize participants
      const redisParticipants =
        await this.redisStateService.getRoomParticipantsStrict(roomId);
      state.participants.clear();
      for (const p of redisParticipants) {
        state.participants.set(p.userId, {
          userId: p.userId,
          username: p.username,
          socketId: p.socketId,
          joinedAt: new Date(p.joinedAt),
          lastSeenAt: new Date(p.lastSeenAt),
        });
      }
    } else {
      if (state.speakers.size === 0) {
        state.speakers.set(hostId, {
          userId: hostId,
          isMuted: false,
          role: 'host',
          joinedStageAt: new Date(),
        });
      }
    }

    return state;
  }

  async assertRoomJoinable(
    roomId: string,
    userId?: string,
  ): Promise<Room> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw {
        code: SocketErrorCode.ROOM_NOT_FOUND,
        message: 'Room not found',
      };
    }

    if (
      room.status !== RoomLifecycleStatus.LIVE &&
      room.status !== RoomLifecycleStatus.PAUSED
    ) {
      throw {
        code: SocketErrorCode.INVALID_ROOM_STATE,
        message: `Room is not joinable while it is ${room.status}`,
      };
    }

    const state = await this.getOrCreateRoomState(roomId, room.hostId);
    const isBanned = userId
      ? this.redisStateService
        ? await this.redisStateService.isRoomBanned(roomId, userId)
        : state.bannedUsers.has(userId)
      : false;
    if (isBanned) {
      throw {
        code: SocketErrorCode.ROOM_BANNED,
        message: 'User is banned from this room',
      };
    }
    if (state.isClosed) {
      throw {
        code: SocketErrorCode.ROOM_CLOSED,
        message: 'Room is closed',
      };
    }

    if (userId) {
      await this.assertAudienceAccess(room, state, userId);
    }

    return room;
  }

  async inviteAudienceParticipant(
    roomId: string,
    requesterId: string,
    targetUserId: string,
  ): Promise<{ targetUserId: string }> {
    const state = await this.getOrCreateRoomState(roomId);
    if (!this.canManageStage(state, requesterId)) {
      throw {
        code: SocketErrorCode.NOT_MODERATOR,
        message: 'Only the host or a moderator can invite participants',
      };
    }
    if (targetUserId === state.hostId) {
      return { targetUserId };
    }
    state.audienceInvitations.add(targetUserId);
    await this.redisStateService?.inviteAudienceUser(roomId, targetUserId);
    return { targetUserId };
  }

  async revokeAudienceInvitation(
    roomId: string,
    requesterId: string,
    targetUserId: string,
  ): Promise<{ targetUserId: string }> {
    const state = await this.getOrCreateRoomState(roomId);
    if (!this.canManageStage(state, requesterId)) {
      throw {
        code: SocketErrorCode.NOT_MODERATOR,
        message: 'Only the host or a moderator can revoke invitations',
      };
    }
    state.audienceInvitations.delete(targetUserId);
    await this.redisStateService?.revokeAudienceInvitation(
      roomId,
      targetUserId,
    );
    return { targetUserId };
  }

  private async assertAudienceAccess(
    room: Room,
    state: RoomState,
    userId: string,
  ): Promise<void> {
    if (room.hostId === userId) return;

    const alreadyPresent = this.redisStateService
      ? (await this.redisStateService.getRoomParticipantsStrict(room.id)).some(
          (participant) => participant.userId === userId,
        )
      : state.participants.has(userId);

    const isInvited = this.redisStateService
      ? await this.redisStateService.isAudienceInvited(room.id, userId)
      : state.audienceInvitations.has(userId);
    const scheduledRoom = await this.getLinkedScheduledRoom(room);
    const isClubOnly =
      scheduledRoom?.visibility === VisibilityType.CLUB_ONLY &&
      !!scheduledRoom.clubId;
    const isClubMember = isClubOnly
      ? await this.isClubMember(scheduledRoom.clubId, userId)
      : false;

    if (!alreadyPresent && room.isLocked && !isInvited) {
      throw {
        code: SocketErrorCode.ROOM_LOCKED,
        message: 'Room is locked',
      };
    }
    if (isClubOnly && !isClubMember) {
      throw {
        code: SocketErrorCode.CLUB_MEMBERSHIP_REQUIRED,
        message: 'Active club membership is required to join this room',
      };
    }
    if (
      !alreadyPresent &&
      room.isInviteOnly &&
      !isInvited &&
      !isClubMember
    ) {
      throw {
        code: SocketErrorCode.INVITATION_REQUIRED,
        message: 'An invitation is required to join this room',
      };
    }

    if (room.isTicketRequired || room.isPremium) {
      const hasTicket = await this.hasValidTicket(room, userId);
      if (!hasTicket) {
        throw {
          code: SocketErrorCode.TICKET_REQUIRED,
          message: 'A valid room ticket is required',
        };
      }
    }

    if (room.isSubscriberOnly) {
      const hasSubscription = await this.hasActiveSubscription(
        userId,
        room.hostId,
      );
      if (!hasSubscription) {
        throw {
          code: SocketErrorCode.SUBSCRIPTION_REQUIRED,
          message: 'An active Host subscription is required',
        };
      }
    }

    if (room.isVerifiedOnly) {
      const isVerified = await this.isVerifiedUser(userId);
      if (!isVerified) {
        throw {
          code: SocketErrorCode.VERIFICATION_REQUIRED,
          message: 'A verified account is required',
        };
      }
    }

    if (!alreadyPresent) {
      const capacity = await this.resolveRoomCapacity(room);
      const participantCount = this.redisStateService
        ? await this.redisStateService.getParticipantCountStrict(room.id)
        : state.participants.size;
      if (participantCount >= capacity) {
        throw {
          code: SocketErrorCode.ROOM_FULL,
          message: 'Room capacity has been reached',
        };
      }
    }
  }

  private async hasValidTicket(room: Room, userId: string): Promise<boolean> {
    if (!this.roomTicketRepository) return false;
    const directTicket = await this.roomTicketRepository.findOne({
      where: {
        roomId: room.id,
        userId,
        isValid: true,
        status: TicketStatus.ACTIVE,
      },
    });
    if (directTicket) return true;
    if (!room.scheduledRoomId) return false;

    const scheduledTicket = await this.roomTicketRepository.findOne({
      where: {
        scheduledRoomId: room.scheduledRoomId,
        userId,
        isValid: true,
        status: TicketStatus.ACTIVE,
      },
    });
    return !!scheduledTicket;
  }

  private async hasActiveSubscription(
    subscriberId: string,
    creatorId: string,
  ): Promise<boolean> {
    if (!this.subscriptionRepository) return false;
    const subscription = await this.subscriptionRepository.findOne({
      where: {
        subscriberId,
        creatorId,
        status: SubscriptionStatus.ACTIVE,
      },
      order: { startedAt: 'DESC' },
    });
    if (!subscription) return false;
    return !subscription.expiresAt || subscription.expiresAt > new Date();
  }

  private async isVerifiedUser(userId: string): Promise<boolean> {
    if (!this.userRepository) return false;
    const user = await this.userRepository.findOne({ where: { id: userId } });
    return !!(
      user &&
      (user.isVerified || user.verificationStatus === VerificationStatus.VERIFIED)
    );
  }

  private async getLinkedScheduledRoom(
    room: Room,
  ): Promise<ScheduledRoom | null> {
    if (!room.scheduledRoomId || !this.scheduledRoomRepository) return null;
    return this.scheduledRoomRepository.findOne({
      where: { id: room.scheduledRoomId },
    });
  }

  private async isClubMember(clubId: string, userId: string): Promise<boolean> {
    if (!this.clubMemberRepository) return false;
    const membership = await this.clubMemberRepository.findOne({
      where: { clubId, userId },
    });
    return !!membership;
  }

  private async resolveRoomCapacity(room: Room): Promise<number> {
    const scheduled = await this.getLinkedScheduledRoom(room);
    if (scheduled?.maxParticipants) return scheduled.maxParticipants;

    try {
      const settingsService = this.moduleRef?.get(AdminSettingsService, {
        strict: false,
      });
      const settings = await settingsService?.getOperationalSettings();
      if (settings?.maxRoomCapacity) return settings.maxRoomCapacity;
    } catch (error) {
      this.logger.warn(
        `Could not resolve configured room capacity: ${String(error)}`,
      );
    }
    return 500;
  }

  async openRoom(room: Room): Promise<void> {
    const state = await this.getOrCreateRoomState(room.id, room.hostId);
    state.hostId = room.hostId;
    state.title = room.title;
    state.description = room.description;
    state.category = room.category;
    state.isClosed = false;

    await this.redisStateService?.setRoomMeta(room.id, {
      roomId: room.id,
      hostId: room.hostId,
      title: room.title,
      description: room.description || '',
      category: room.category,
      isClosed: false,
    });
  }

  async setRoomPaused(room: Room): Promise<void> {
    await this.openRoom(room);
  }

  async closeRoom(roomId: string): Promise<void> {
    const state = this.roomStates.get(roomId);
    if (state) state.isClosed = true;

    if (this.redisStateService) {
      const meta = await this.redisStateService.getRoomMeta(roomId);
      if (meta) {
        await this.redisStateService.setRoomMeta(roomId, {
          ...meta,
          isClosed: true,
        });
      }
    }

    await this.cleanupRoomState(roomId);
  }

  async cleanupRoomState(roomId: string): Promise<void> {
    this.roomStates.delete(roomId);
    await this.redisStateService?.cleanupRoomState(roomId);
  }

  async isParticipantOrHost(roomId: string, userId: string): Promise<boolean> {
    const state = await this.getOrCreateRoomState(roomId);
    if (state.hostId === userId) return true;
    if (this.redisStateService) {
      const participants =
        await this.redisStateService.getRoomParticipantsStrict(roomId);
      return participants.some((participant) => participant.userId === userId);
    }
    return state.participants.has(userId);
  }

  async assertParticipantOrHost(roomId: string, userId: string): Promise<void> {
    if (!(await this.isParticipantOrHost(roomId, userId))) {
      throw {
        code: SocketErrorCode.NOT_IN_ROOM,
        message: 'Join the room before performing this action',
      };
    }
  }

  isOwner(state: RoomState, userId: string): boolean {
    return state.hostId === userId;
  }

  isModerator(state: RoomState, userId: string): boolean {
    return state.hostId === userId || state.moderators.has(userId);
  }

  canManageStage(state: RoomState, userId: string): boolean {
    return this.isModerator(state, userId);
  }

  // --- Speaker Queue Operations ---

  async joinQueue(roomId: string, userId: string, username?: string) {
    const state = await this.getOrCreateRoomState(roomId);
    if (state.isClosed) {
      throw { code: SocketErrorCode.ROOM_CLOSED, message: 'Room is closed' };
    }

    let isSpeakerOnStage = false;
    if (this.redisStateService) {
      isSpeakerOnStage = await this.redisStateService.isSpeaker(roomId, userId);
    } else {
      isSpeakerOnStage = state.speakers.has(userId);
    }

    if (isSpeakerOnStage) {
      throw {
        code: SocketErrorCode.ALREADY_ON_STAGE,
        message: 'User is already on stage',
      };
    }

    if (this.redisStateService) {
      try {
        const queueUser: RedisQueueUser = {
          userId,
          username,
          joinedAt: new Date().toISOString(),
        };
        const res = await this.redisStateService.enqueueUser(roomId, queueUser);

        // Sync local queue
        state.queue = res.queue.map((q) => ({
          userId: q.userId,
          username: q.username,
          joinedAt: new Date(q.joinedAt),
        }));

        return { queue: state.queue, position: res.position };
      } catch (err: any) {
        if (err.message === 'ALREADY_IN_QUEUE') {
          throw {
            code: SocketErrorCode.ALREADY_IN_QUEUE,
            message: 'User is already in queue',
          };
        }
        throw err;
      }
    } else {
      if (state.queue.some((q) => q.userId === userId)) {
        throw {
          code: SocketErrorCode.ALREADY_IN_QUEUE,
          message: 'User is already in queue',
        };
      }
      const queueUser: QueueUser = { userId, username, joinedAt: new Date() };
      state.queue.push(queueUser);
      const position = state.queue.findIndex((q) => q.userId === userId) + 1;
      return { queue: state.queue, position };
    }
  }

  async leaveQueue(roomId: string, userId: string) {
    const state = await this.getOrCreateRoomState(roomId);

    if (this.redisStateService) {
      try {
        const res = await this.redisStateService.dequeueUser(roomId, userId);
        state.queue = res.queue.map((q) => ({
          userId: q.userId,
          username: q.username,
          joinedAt: new Date(q.joinedAt),
        }));
        return { queue: state.queue };
      } catch (err: any) {
        if (err.message === 'NOT_IN_QUEUE') {
          throw {
            code: SocketErrorCode.NOT_IN_QUEUE,
            message: 'User is not in queue',
          };
        }
        throw err;
      }
    } else {
      const existingIndex = state.queue.findIndex((q) => q.userId === userId);
      if (existingIndex === -1) {
        throw {
          code: SocketErrorCode.NOT_IN_QUEUE,
          message: 'User is not in queue',
        };
      }
      state.queue.splice(existingIndex, 1);
      return { queue: state.queue };
    }
  }

  async getQueue(roomId: string) {
    const state = await this.getOrCreateRoomState(roomId);
    if (this.redisStateService) {
      const redisQueue = await this.redisStateService.getQueue(roomId);
      state.queue = redisQueue.map((q) => ({
        userId: q.userId,
        username: q.username,
        joinedAt: new Date(q.joinedAt),
      }));
    }
    return { queue: state.queue, count: state.queue.length };
  }

  async reorderQueue(
    roomId: string,
    requesterId: string,
    orderedUserIds: string[],
  ) {
    const state = await this.getOrCreateRoomState(roomId);
    if (!this.canManageStage(state, requesterId)) {
      throw {
        code: SocketErrorCode.NOT_MODERATOR,
        message: 'Only host or moderator can reorder queue',
      };
    }

    if (this.redisStateService) {
      const res = await this.redisStateService.reorderQueue(
        roomId,
        orderedUserIds,
      );
      state.queue = res.queue.map((q) => ({
        userId: q.userId,
        username: q.username,
        joinedAt: new Date(q.joinedAt),
      }));
    } else {
      const newQueue: QueueUser[] = [];
      for (const uId of orderedUserIds) {
        const found = state.queue.find((q) => q.userId === uId);
        if (found) newQueue.push(found);
      }
      for (const item of state.queue) {
        if (!newQueue.some((q) => q.userId === item.userId)) {
          newQueue.push(item);
        }
      }
      state.queue = newQueue;
    }

    return { queue: state.queue };
  }

  // --- Stage Management Operations ---

  async inviteSpeaker(
    roomId: string,
    requesterId: string,
    targetUserId: string,
  ) {
    const state = await this.getOrCreateRoomState(roomId);
    if (!this.canManageStage(state, requesterId)) {
      throw {
        code: SocketErrorCode.NOT_MODERATOR,
        message: 'Only host or moderator can invite speakers',
      };
    }

    const invitation: PendingInvitation = {
      targetUserId,
      invitedBy: requesterId,
      createdAt: new Date(),
    };
    state.pendingInvitations.set(targetUserId, invitation);

    if (this.redisStateService) {
      await this.redisStateService.addInvitation(roomId, {
        targetUserId,
        invitedBy: requesterId,
        createdAt: invitation.createdAt.toISOString(),
      });
    }

    return { targetUserId, invitedBy: requesterId };
  }

  async acceptInvitation(roomId: string, userId: string) {
    const state = await this.getOrCreateRoomState(roomId);

    let invitation = state.pendingInvitations.get(userId);
    if (!invitation && this.redisStateService) {
      const redisInv = await this.redisStateService.getInvitation(
        roomId,
        userId,
      );
      if (redisInv) {
        invitation = {
          targetUserId: redisInv.targetUserId,
          invitedBy: redisInv.invitedBy,
          createdAt: new Date(redisInv.createdAt),
        };
      }
    }

    if (!invitation) {
      throw {
        code: SocketErrorCode.NO_INVITATION_FOUND,
        message: 'No pending speaker invitation found',
      };
    }

    state.pendingInvitations.delete(userId);
    if (this.redisStateService) {
      await this.redisStateService.removeInvitation(roomId, userId);
      await this.redisStateService.dequeueUser(roomId, userId).catch(() => {});
    }

    state.queue = state.queue.filter((q) => q.userId !== userId);

    const speakerRole = this.isOwner(state, userId)
      ? 'host'
      : this.isModerator(state, userId)
        ? 'moderator'
        : 'speaker';

    const stageSpeaker: StageSpeaker = {
      userId,
      isMuted: false,
      role: speakerRole,
      joinedStageAt: new Date(),
    };

    state.speakers.set(userId, stageSpeaker);

    if (this.redisStateService) {
      await this.redisStateService.setSpeaker(roomId, {
        userId,
        isMuted: false,
        role: speakerRole,
        joinedStageAt: stageSpeaker.joinedStageAt.toISOString(),
      });
    }

    await this.persistCurrentRoomCounts(roomId, state);
    return {
      speaker: stageSpeaker,
      speakers: Array.from(state.speakers.values()),
    };
  }

  async rejectInvitation(roomId: string, userId: string) {
    const state = await this.getOrCreateRoomState(roomId);

    let hasInvitation = state.pendingInvitations.has(userId);
    if (!hasInvitation && this.redisStateService) {
      const redisInv = await this.redisStateService.getInvitation(
        roomId,
        userId,
      );
      hasInvitation = !!redisInv;
    }

    if (!hasInvitation) {
      throw {
        code: SocketErrorCode.NO_INVITATION_FOUND,
        message: 'No pending speaker invitation found',
      };
    }

    state.pendingInvitations.delete(userId);
    if (this.redisStateService) {
      await this.redisStateService.removeInvitation(roomId, userId);
    }

    return { success: true };
  }

  async promoteListener(
    roomId: string,
    requesterId: string,
    targetUserId: string,
  ) {
    const state = await this.getOrCreateRoomState(roomId);
    if (!this.canManageStage(state, requesterId)) {
      throw {
        code: SocketErrorCode.NOT_MODERATOR,
        message: 'Only host or moderator can promote listeners',
      };
    }

    state.queue = state.queue.filter((q) => q.userId !== targetUserId);
    state.pendingInvitations.delete(targetUserId);

    if (this.redisStateService) {
      await this.redisStateService
        .dequeueUser(roomId, targetUserId)
        .catch(() => {});
      await this.redisStateService.removeInvitation(roomId, targetUserId);
    }

    const role = this.isOwner(state, targetUserId)
      ? 'host'
      : this.isModerator(state, targetUserId)
        ? 'moderator'
        : 'speaker';

    const stageSpeaker: StageSpeaker = {
      userId: targetUserId,
      isMuted: false,
      role,
      joinedStageAt: new Date(),
    };

    state.speakers.set(targetUserId, stageSpeaker);

    if (this.redisStateService) {
      await this.redisStateService.setSpeaker(roomId, {
        userId: targetUserId,
        isMuted: false,
        role,
        joinedStageAt: stageSpeaker.joinedStageAt.toISOString(),
      });
    }

    await this.persistCurrentRoomCounts(roomId, state);
    return {
      speaker: stageSpeaker,
      speakers: Array.from(state.speakers.values()),
    };
  }

  async demoteSpeaker(
    roomId: string,
    requesterId: string,
    targetUserId: string,
  ) {
    const state = await this.getOrCreateRoomState(roomId);
    if (!this.canManageStage(state, requesterId)) {
      throw {
        code: SocketErrorCode.NOT_MODERATOR,
        message: 'Only host or moderator can demote speakers',
      };
    }
    if (targetUserId === state.hostId) {
      throw {
        code: SocketErrorCode.NOT_ROOM_OWNER,
        message: 'The room host cannot be removed from their own stage',
      };
    }

    let isOnStage = state.speakers.has(targetUserId);
    if (!isOnStage && this.redisStateService) {
      isOnStage = await this.redisStateService.isSpeaker(roomId, targetUserId);
    }

    if (!isOnStage) {
      throw {
        code: SocketErrorCode.USER_NOT_ON_STAGE,
        message: 'Target user is not on stage',
      };
    }

    state.speakers.delete(targetUserId);
    if (this.redisStateService) {
      await this.redisStateService.removeSpeaker(roomId, targetUserId);
    }

    await this.persistCurrentRoomCounts(roomId, state);
    return { targetUserId, speakers: Array.from(state.speakers.values()) };
  }

  async removeSpeaker(
    roomId: string,
    requesterId: string,
    targetUserId: string,
  ) {
    return this.demoteSpeaker(roomId, requesterId, targetUserId);
  }

  async setMuteSpeaker(
    roomId: string,
    requesterId: string,
    targetUserId: string | undefined,
    isMuted: boolean,
  ) {
    const state = await this.getOrCreateRoomState(roomId);
    const target = targetUserId || requesterId;

    if (target !== requesterId && !this.canManageStage(state, requesterId)) {
      throw {
        code: SocketErrorCode.NOT_MODERATOR,
        message: 'Only host or moderator can mute/unmute other speakers',
      };
    }
    if (target === state.hostId && requesterId !== state.hostId) {
      throw {
        code: SocketErrorCode.NOT_ROOM_OWNER,
        message: 'Only the room host can change their own mute state',
      };
    }

    let speaker = state.speakers.get(target);
    if (!speaker && this.redisStateService) {
      const redisSpeakers = await this.redisStateService.getSpeakers(roomId);
      const found = redisSpeakers.find((sp) => sp.userId === target);
      if (found) {
        speaker = {
          userId: found.userId,
          username: found.username,
          isMuted: found.isMuted,
          role: found.role,
          joinedStageAt: new Date(found.joinedStageAt),
        };
      }
    }

    if (!speaker) {
      throw {
        code: SocketErrorCode.USER_NOT_ON_STAGE,
        message: 'Target user is not on stage',
      };
    }

    speaker.isMuted = isMuted;
    state.speakers.set(target, speaker);

    if (this.redisStateService) {
      await this.redisStateService.setSpeaker(roomId, {
        userId: target,
        username: speaker.username,
        isMuted,
        role: speaker.role,
        joinedStageAt: speaker.joinedStageAt.toISOString(),
      });
    }

    return {
      targetUserId: target,
      isMuted,
      speakers: Array.from(state.speakers.values()),
    };
  }

  // --- Room-level Audience Moderation ---

  async kickParticipant(
    roomId: string,
    requesterId: string,
    targetUserId: string,
  ) {
    const state = await this.getOrCreateRoomState(roomId);
    if (!this.isModerator(state, requesterId)) {
      throw {
        code: SocketErrorCode.NOT_MODERATOR,
        message: 'Only host or moderator can remove participants',
      };
    }
    if (targetUserId === state.hostId) {
      throw {
        code: SocketErrorCode.NOT_ROOM_OWNER,
        message: 'The room host cannot be removed from their own room',
      };
    }

    state.queue = state.queue.filter((item) => item.userId !== targetUserId);
    state.pendingInvitations.delete(targetUserId);
    state.speakers.delete(targetUserId);

    if (this.redisStateService) {
      await this.redisStateService
        .dequeueUser(roomId, targetUserId)
        .catch(() => undefined);
      await this.redisStateService.removeInvitation(roomId, targetUserId);
      await this.redisStateService.removeSpeaker(roomId, targetUserId);
    }

    const result = await this.removeParticipant(roomId, targetUserId);
    return {
      targetUserId,
      participantCount: result.participantCount,
      speakers: Array.from(state.speakers.values()),
    };
  }

  async banParticipant(
    roomId: string,
    requesterId: string,
    targetUserId: string,
  ) {
    const state = await this.getOrCreateRoomState(roomId);
    if (!this.isModerator(state, requesterId)) {
      throw {
        code: SocketErrorCode.NOT_MODERATOR,
        message: 'Only host or moderator can ban participants',
      };
    }
    if (targetUserId === state.hostId) {
      throw {
        code: SocketErrorCode.NOT_ROOM_OWNER,
        message: 'The room host cannot be banned from their own room',
      };
    }

    state.bannedUsers.add(targetUserId);
    await this.redisStateService?.banUserFromRoom(roomId, targetUserId);
    const result = await this.kickParticipant(
      roomId,
      requesterId,
      targetUserId,
    );
    return { ...result, banned: true };
  }

  async unbanParticipant(
    roomId: string,
    requesterId: string,
    targetUserId: string,
  ) {
    const state = await this.getOrCreateRoomState(roomId);
    if (!this.isModerator(state, requesterId)) {
      throw {
        code: SocketErrorCode.NOT_MODERATOR,
        message: 'Only host or moderator can unban participants',
      };
    }

    state.bannedUsers.delete(targetUserId);
    await this.redisStateService?.unbanUserFromRoom(roomId, targetUserId);
    return { targetUserId, banned: false };
  }

  // --- Room Topic Updates ---

  async updateTopic(
    roomId: string,
    requesterId: string,
    title?: string,
    description?: string,
    category?: string,
  ) {
    const state = await this.getOrCreateRoomState(roomId);
    if (!this.isModerator(state, requesterId)) {
      throw {
        code: SocketErrorCode.NOT_ROOM_OWNER,
        message: 'Only room host or moderator can update topic',
      };
    }

    if (title !== undefined) state.title = title;
    if (description !== undefined) state.description = description;
    if (category !== undefined) state.category = category;

    if (this.redisStateService) {
      await this.redisStateService.setRoomMeta(roomId, {
        roomId,
        hostId: state.hostId,
        title: state.title,
        description: state.description,
        category: state.category,
        isClosed: state.isClosed,
      });
    }

    // Persist to DB if Room entity exists
    try {
      const roomEntity = await this.roomRepository.findOne({
        where: { id: roomId },
      });
      if (roomEntity) {
        if (title !== undefined) roomEntity.title = title;
        if (description !== undefined) roomEntity.description = description;
        if (category !== undefined) roomEntity.category = category;
        await this.roomRepository.save(roomEntity);
      }
    } catch (err) {
      this.logger.debug(
        `Could not update Room entity in DB for ${roomId}: ${err}`,
      );
    }

    return {
      roomId,
      title: state.title,
      description: state.description,
      category: state.category,
      updatedAt: new Date().toISOString(),
    };
  }

  // --- Presence & Participant Operations ---

  async addParticipant(
    roomId: string,
    userId: string,
    socketId: string,
    username?: string,
  ) {
    const state = await this.getOrCreateRoomState(roomId);
    const participant: RoomParticipant = {
      userId,
      username,
      socketId,
      joinedAt: new Date(),
      lastSeenAt: new Date(),
    };
    state.participants.set(userId, participant);

    let count = state.participants.size;
    if (this.redisStateService) {
      await this.redisStateService.setUserPresence(
        userId,
        socketId,
        roomId,
        username,
      );
      count = await this.redisStateService.addRoomParticipantStrict(roomId, {
        userId,
        username,
        socketId,
        joinedAt: participant.joinedAt.toISOString(),
        lastSeenAt: participant.lastSeenAt.toISOString(),
      });
    }

    await this.persistRoomCounts(roomId, state, count);
    return { participantCount: count, participant };
  }

  async removeParticipant(
    roomId: string,
    userId: string,
    socketId = '',
  ) {
    const state = this.roomStates.get(roomId);
    const inMemoryParticipant = state?.participants.get(userId);
    const redisParticipant = this.redisStateService
      ? await this.redisStateService.getRoomParticipantStrict(roomId, userId)
      : null;
    const existingSocketId =
      redisParticipant?.socketId ?? inMemoryParticipant?.socketId;
    const shouldRemove =
      !socketId || !existingSocketId || existingSocketId === socketId;

    if (state && shouldRemove) {
      state.participants.delete(userId);
      state.typingUsers.delete(userId);
    }

    let count = state?.participants.size ?? 0;
    if (this.redisStateService) {
      await this.redisStateService.removeUserPresence(userId, socketId, roomId);
      if (shouldRemove) {
        count = await this.redisStateService.removeRoomParticipantStrict(
          roomId,
          userId,
        );
      } else {
        count = await this.redisStateService.getParticipantCountStrict(roomId);
      }
    }

    if (state) {
      await this.persistRoomCounts(roomId, state, count);
    }
    return { participantCount: count };
  }

  async reconnectParticipant(roomId: string, userId: string, socketId: string) {
    const state = await this.getOrCreateRoomState(roomId);
    const now = new Date();
    const existing = state.participants.get(userId);
    const participant: RoomParticipant = existing
      ? {
          ...existing,
          socketId,
          lastSeenAt: now,
        }
      : {
          userId,
          socketId,
          joinedAt: now,
          lastSeenAt: now,
        };
    state.participants.set(userId, participant);

    let count = state.participants.size;
    if (this.redisStateService) {
      await this.redisStateService.setUserPresence(userId, socketId, roomId);
      count = await this.redisStateService.addRoomParticipantStrict(roomId, {
        userId,
        username: participant.username,
        socketId,
        joinedAt: participant.joinedAt.toISOString(),
        lastSeenAt: participant.lastSeenAt.toISOString(),
      });
    }

    await this.persistRoomCounts(roomId, state, count);
    return { participantCount: count };
  }

  async setTypingStatus(roomId: string, userId: string, isTyping: boolean) {
    const state = await this.getOrCreateRoomState(roomId);
    if (isTyping) {
      state.typingUsers.set(userId, Date.now());
    } else {
      state.typingUsers.delete(userId);
    }

    if (this.redisStateService) {
      await this.redisStateService.setTyping(roomId, userId, isTyping);
    }

    return { isTyping };
  }

  private async persistCurrentRoomCounts(
    roomId: string,
    state: RoomState,
  ): Promise<void> {
    const participantCount = this.redisStateService
      ? await this.redisStateService.getParticipantCount(roomId)
      : state.participants.size;
    await this.persistRoomCounts(roomId, state, participantCount);
  }

  private async persistRoomCounts(
    roomId: string,
    state: RoomState,
    participantCount: number,
  ): Promise<void> {
    try {
      const room = await this.roomRepository.findOne({ where: { id: roomId } });
      if (!room) return;

      const speakerCount = this.redisStateService
        ? (await this.redisStateService.getSpeakers(roomId)).length
        : state.speakers.size;

      room.speakerCount = speakerCount;
      room.listenerCount = Math.max(participantCount - speakerCount, 0);
      await this.roomRepository.save(room);
    } catch (error) {
      this.logger.warn(
        `Could not persist participant counts for room ${roomId}: ${error}`,
      );
    }
  }

  async getParticipantCount(roomId: string) {
    const state = await this.getOrCreateRoomState(roomId);
    if (this.redisStateService) {
      return await this.redisStateService.getParticipantCount(roomId);
    }
    return state.participants.size;
  }
}
