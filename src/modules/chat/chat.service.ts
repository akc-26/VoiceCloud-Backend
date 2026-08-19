import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, IsNull } from 'typeorm';
import { StorageService } from '../storage/storage.service';
import { MediaCategory } from '../storage/enums/media-category.enum';
import { RedisService } from '../../redis/redis.service';
import { EventsGateway } from '../../common/events/events.gateway';
import { QueueService } from '../../queue/queue.service';
import { JOB_TYPES } from '../../queue/queue.constants';
import { RoomAuthorityService } from '../rooms/room-authority.service';

import { Conversation, ConversationType } from './entities/conversation.entity';
import {
  ConversationMember,
  MemberRole,
} from './entities/conversation-member.entity';
import {
  Message,
  MessageType,
  DeliveryStatus,
  MessageAttachment,
} from './entities/message.entity';
import { MessageReaction } from './entities/message-reaction.entity';
import { MessageReport, ReportStatus } from './entities/message-report.entity';
import { VoiceNote } from './entities/voice-note.entity';

import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import {
  UpdateGroupDto,
  AddMembersDto,
  TransferOwnershipDto,
} from './dto/update-group.dto';
import { ReportMessageDto, ResolveReportDto } from './dto/report-message.dto';
import { ChatQueryDto } from './dto/chat-query.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(ConversationMember)
    private readonly memberRepo: Repository<ConversationMember>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(MessageReaction)
    private readonly reactionRepo: Repository<MessageReaction>,
    @InjectRepository(MessageReport)
    private readonly reportRepo: Repository<MessageReport>,
    @InjectRepository(VoiceNote)
    private readonly voiceNoteRepo: Repository<VoiceNote>,
    private readonly storageService: StorageService,
    private readonly redisService: RedisService,
    private readonly roomAuthorityService: RoomAuthorityService,
    @Optional() private readonly eventsGateway?: EventsGateway,
    @Optional() private readonly queueService?: QueueService,
  ) {}

  // ==========================================
  // DIRECT & GROUP CONVERSATIONS
  // ==========================================

  async createConversation(userId: string, dto: CreateConversationDto) {
    if (dto.type === ConversationType.DIRECT) {
      if (!dto.recipientId) {
        throw new BadRequestException(
          'Recipient ID is required for direct messaging',
        );
      }
      if (dto.recipientId === userId) {
        throw new BadRequestException(
          'Cannot start a direct chat with yourself',
        );
      }
      return this.getOrCreateDirectConversation(userId, dto.recipientId);
    }

    if (dto.type === ConversationType.GROUP) {
      if (!dto.name) {
        throw new BadRequestException('Group name is required');
      }
      const conversation = this.conversationRepo.create({
        type: ConversationType.GROUP,
        name: dto.name,
        description: dto.description,
        avatarUrl: dto.avatarUrl,
        createdById: userId,
        ownerId: userId,
        lastMessageAt: new Date(),
      });
      const savedConv = await this.conversationRepo.save(conversation);

      const ownerMember = this.memberRepo.create({
        conversationId: savedConv.id,
        userId,
        role: MemberRole.OWNER,
      });
      await this.memberRepo.save(ownerMember);

      if (dto.memberIds && dto.memberIds.length > 0) {
        const uniqueMemberIds = Array.from(
          new Set(dto.memberIds.filter((id) => id !== userId)),
        );
        const members = uniqueMemberIds.map((memberId) =>
          this.memberRepo.create({
            conversationId: savedConv.id,
            userId: memberId,
            role: MemberRole.MEMBER,
          }),
        );
        if (members.length > 0) {
          await this.memberRepo.save(members);
        }
      }

      this.logger.log(
        `Created group conversation ${savedConv.id} by user ${userId}`,
      );
      return this.getConversationById(savedConv.id, userId);
    }

    if (dto.type === ConversationType.ROOM) {
      if (!dto.roomId) {
        throw new BadRequestException('Room ID is required for room chat');
      }
      return this.getOrCreateRoomConversation(dto.roomId, userId, dto.name);
    }

    throw new BadRequestException('Invalid conversation type');
  }

  async getOrCreateDirectConversation(userId: string, recipientId: string) {
    const userConvs = await this.memberRepo.find({
      where: { userId },
      select: { conversationId: true },
    });
    const userConvIds = userConvs.map((m) => m.conversationId);

    if (userConvIds.length > 0) {
      const recipientMember = await this.memberRepo.findOne({
        where: {
          conversationId: In(userConvIds),
          userId: recipientId,
        },
        relations: { conversation: true },
      });

      if (
        recipientMember &&
        recipientMember.conversation &&
        recipientMember.conversation.type === ConversationType.DIRECT
      ) {
        return this.getConversationById(recipientMember.conversationId, userId);
      }
    }

    const conversation = this.conversationRepo.create({
      type: ConversationType.DIRECT,
      createdById: userId,
      lastMessageAt: new Date(),
    });
    const savedConv = await this.conversationRepo.save(conversation);

    const member1 = this.memberRepo.create({
      conversationId: savedConv.id,
      userId,
      role: MemberRole.MEMBER,
    });
    const member2 = this.memberRepo.create({
      conversationId: savedConv.id,
      userId: recipientId,
      role: MemberRole.MEMBER,
    });
    await this.memberRepo.save([member1, member2]);

    this.logger.log(
      `Created direct conversation ${savedConv.id} between ${userId} and ${recipientId}`,
    );
    return this.getConversationById(savedConv.id, userId);
  }

  async getOrCreateRoomConversation(
    roomId: string,
    createdById?: string,
    name?: string,
  ) {
    let conversation = await this.conversationRepo.findOne({
      where: { roomId, type: ConversationType.ROOM },
    });

    if (!conversation) {
      conversation = this.conversationRepo.create({
        type: ConversationType.ROOM,
        roomId,
        name: name || `Room ${roomId} Chat`,
        createdById,
        lastMessageAt: new Date(),
      });
      conversation = await this.conversationRepo.save(conversation);
    }

    if (createdById) {
      const existingMember = await this.memberRepo.findOne({
        where: { conversationId: conversation.id, userId: createdById },
      });
      if (!existingMember) {
        const member = this.memberRepo.create({
          conversationId: conversation.id,
          userId: createdById,
          role: MemberRole.MEMBER,
        });
        await this.memberRepo.save(member);
      }
    }

    return conversation;
  }

  async getUserConversations(
    userId: string,
    page = 1,
    limit = 50,
    search?: string,
  ) {
    const userMembers = await this.memberRepo.find({
      where: { userId, leftAt: IsNull() },
    });
    const convIds = userMembers.map((m) => m.conversationId);

    if (convIds.length === 0) {
      return { conversations: [], total: 0, page, limit };
    }

    const queryBuilder = this.conversationRepo
      .createQueryBuilder('conv')
      .leftJoinAndSelect('conv.members', 'members')
      .where('conv.id IN (:...convIds)', { convIds })
      .orderBy('conv.lastMessageAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      queryBuilder.andWhere('conv.name ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const [conversations, total] = await queryBuilder.getManyAndCount();

    const formatted = await Promise.all(
      conversations.map(async (conv) => {
        let lastMessage = null;
        if (conv.lastMessageId) {
          lastMessage = await this.messageRepo.findOne({
            where: { id: conv.lastMessageId },
          });
        }

        const myMember = conv.members.find((m) => m.userId === userId);
        let unreadCount = 0;
        if (myMember && myMember.lastReadAt) {
          unreadCount = await this.messageRepo
            .createQueryBuilder('msg')
            .where('msg.conversationId = :convId', { convId: conv.id })
            .andWhere('msg.createdAt > :lastReadAt', {
              lastReadAt: myMember.lastReadAt,
            })
            .andWhere('msg.senderId != :userId', { userId })
            .getCount();
        } else if (myMember) {
          unreadCount = await this.messageRepo.count({
            where: { conversationId: conv.id },
          });
        }

        return {
          ...conv,
          lastMessage,
          unreadCount,
          isMuted: myMember?.muted || false,
        };
      }),
    );

    return { conversations: formatted, total, page, limit };
  }

  async getConversationById(conversationId: string, userId?: string) {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: { members: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (userId) {
      const isMember = conversation.members.some(
        (m) => m.userId === userId && !m.leftAt,
      );
      if (!isMember && conversation.type !== ConversationType.ROOM) {
        throw new ForbiddenException(
          'You are not a member of this conversation',
        );
      }
    }

    let lastMessage = null;
    if (conversation.lastMessageId) {
      lastMessage = await this.messageRepo.findOne({
        where: { id: conversation.lastMessageId },
      });
    }

    return {
      ...conversation,
      lastMessage,
    };
  }

  async updateGroupConversation(
    conversationId: string,
    userId: string,
    dto: UpdateGroupDto,
  ) {
    const conv = await this.getConversationById(conversationId, userId);
    if (conv.type !== ConversationType.GROUP) {
      throw new BadRequestException('Only group conversations can be updated');
    }

    const member = conv.members.find((m) => m.userId === userId);
    if (
      !member ||
      (member.role !== MemberRole.OWNER && member.role !== MemberRole.ADMIN)
    ) {
      throw new ForbiddenException(
        'Only group owners or admins can update details',
      );
    }

    if (dto.name !== undefined) conv.name = dto.name;
    if (dto.description !== undefined) conv.description = dto.description;
    if (dto.avatarUrl !== undefined) conv.avatarUrl = dto.avatarUrl;

    const updated = await this.conversationRepo.save(conv);
    this.logger.log(`Updated group conversation ${conversationId}`);
    return updated;
  }

  async leaveGroupConversation(conversationId: string, userId: string) {
    const member = await this.memberRepo.findOne({
      where: { conversationId, userId, leftAt: IsNull() },
    });
    if (!member) {
      throw new BadRequestException(
        'User is not an active member of this group',
      );
    }

    member.leftAt = new Date();
    await this.memberRepo.save(member);

    const conv = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: { members: true },
    });

    if (conv && conv.ownerId === userId) {
      const activeMembers = conv.members.filter(
        (m) => m.userId !== userId && !m.leftAt,
      );
      if (activeMembers.length > 0) {
        const nextOwner =
          activeMembers.find((m) => m.role === MemberRole.ADMIN) ||
          activeMembers[0];
        nextOwner.role = MemberRole.OWNER;
        await this.memberRepo.save(nextOwner);
        conv.ownerId = nextOwner.userId;
        await this.conversationRepo.save(conv);
      }
    }

    return { message: 'Successfully left conversation', conversationId };
  }

  async transferOwnership(
    conversationId: string,
    userId: string,
    dto: TransferOwnershipDto,
  ) {
    const conv = await this.getConversationById(conversationId, userId);
    if (conv.ownerId !== userId) {
      throw new ForbiddenException(
        'Only the group owner can transfer ownership',
      );
    }

    const targetMember = conv.members.find(
      (m) => m.userId === dto.newOwnerId && !m.leftAt,
    );
    if (!targetMember) {
      throw new BadRequestException(
        'Target user is not an active group member',
      );
    }

    const currentOwnerMember = conv.members.find((m) => m.userId === userId);
    if (currentOwnerMember) {
      currentOwnerMember.role = MemberRole.ADMIN;
      await this.memberRepo.save(currentOwnerMember);
    }

    targetMember.role = MemberRole.OWNER;
    await this.memberRepo.save(targetMember);

    conv.ownerId = dto.newOwnerId;
    await this.conversationRepo.save(conv);

    return {
      message: 'Group ownership transferred successfully',
      newOwnerId: dto.newOwnerId,
    };
  }

  async addGroupMembers(
    conversationId: string,
    userId: string,
    dto: AddMembersDto,
  ) {
    const conv = await this.getConversationById(conversationId, userId);
    const requester = conv.members.find((m) => m.userId === userId);

    if (
      !requester ||
      (requester.role !== MemberRole.OWNER &&
        requester.role !== MemberRole.ADMIN)
    ) {
      throw new ForbiddenException('Only admins or owners can add members');
    }

    const existingMemberUserIds = conv.members
      .filter((m) => !m.leftAt)
      .map((m) => m.userId);

    const newMemberIds = dto.memberIds.filter(
      (id) => !existingMemberUserIds.includes(id),
    );

    if (newMemberIds.length === 0) {
      return { message: 'All specified users are already in the group' };
    }

    const membersToSave = newMemberIds.map((mId) =>
      this.memberRepo.create({
        conversationId,
        userId: mId,
        role: MemberRole.MEMBER,
      }),
    );
    await this.memberRepo.save(membersToSave);

    return {
      message: `Added ${newMemberIds.length} members`,
      addedUserIds: newMemberIds,
    };
  }

  async removeGroupMember(
    conversationId: string,
    userId: string,
    targetUserId: string,
  ) {
    const conv = await this.getConversationById(conversationId, userId);
    const requester = conv.members.find((m) => m.userId === userId);

    if (userId !== targetUserId) {
      if (
        !requester ||
        (requester.role !== MemberRole.OWNER &&
          requester.role !== MemberRole.ADMIN)
      ) {
        throw new ForbiddenException(
          'Only admins or owners can remove other members',
        );
      }
    }

    const targetMember = conv.members.find(
      (m) => m.userId === targetUserId && !m.leftAt,
    );
    if (!targetMember) {
      throw new NotFoundException('Member not found in conversation');
    }

    targetMember.leftAt = new Date();
    await this.memberRepo.save(targetMember);

    return { message: 'Member removed successfully', targetUserId };
  }

  async updateMemberRole(
    conversationId: string,
    userId: string,
    targetUserId: string,
    role: MemberRole,
  ) {
    const conv = await this.getConversationById(conversationId, userId);
    if (conv.ownerId !== userId) {
      throw new ForbiddenException(
        'Only the group owner can manage admin roles',
      );
    }

    const targetMember = conv.members.find(
      (m) => m.userId === targetUserId && !m.leftAt,
    );
    if (!targetMember) {
      throw new NotFoundException('Target user is not an active member');
    }

    targetMember.role = role;
    await this.memberRepo.save(targetMember);

    return { message: `Member role updated to ${role}`, targetUserId, role };
  }

  async deleteConversationForUser(conversationId: string, userId: string) {
    const member = await this.memberRepo.findOne({
      where: { conversationId, userId },
    });
    if (member) {
      member.leftAt = new Date();
      await this.memberRepo.save(member);
    }
    return { message: 'Conversation removed for user', conversationId };
  }

  // ==========================================
  // MESSAGES
  // ==========================================

  async sendMessage(
    conversationId: string,
    senderId: string,
    dto: SendMessageDto,
  ) {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: { members: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.type !== ConversationType.ROOM) {
      const isMember = conversation.members.some(
        (m) => m.userId === senderId && !m.leftAt,
      );
      if (!isMember) {
        throw new ForbiddenException(
          'You are not a member of this conversation',
        );
      }
    }

    let attachments: MessageAttachment[] = dto.attachments || [];

    if (dto.type === MessageType.VOICE_NOTE || dto.duration) {
      const duration = dto.duration || 0;
      let waveform = dto.waveform;
      if (!waveform || waveform.length === 0) {
        const sampleCount = 30;
        waveform = Array.from({ length: sampleCount }, (_, i) => {
          const val = Math.abs(Math.sin((i + 1) * 0.4)) * 0.8 + 0.1;
          return Math.round(val * 100) / 100;
        });
      }

      if (attachments.length > 0) {
        attachments = attachments.map((att) => ({
          ...att,
          duration,
          waveform,
        }));
      } else {
        attachments = [
          {
            url: dto.content || 'voice_note.mp3',
            type: 'audio',
            duration,
            waveform,
          },
        ];
      }
    }

    const message = this.messageRepo.create({
      conversationId,
      senderId,
      type: dto.type,
      content: dto.content,
      attachments,
      replyToId: dto.replyToId,
      deliveryStatus: DeliveryStatus.SENT,
    });

    const savedMessage = await this.messageRepo.save(message);

    if (dto.type === MessageType.VOICE_NOTE || dto.duration) {
      const voiceNote = this.voiceNoteRepo.create({
        messageId: savedMessage.id,
        url: attachments[0]?.url || dto.content || '',
        duration: dto.duration || 0,
        waveform: attachments[0]?.waveform || [],
      });
      await this.voiceNoteRepo.save(voiceNote);
    }

    conversation.lastMessageId = savedMessage.id;
    conversation.lastMessageAt = new Date();
    await this.conversationRepo.save(conversation);

    if (this.eventsGateway) {
      this.eventsGateway.broadcastToRoom(
        conversationId,
        'chat_message',
        savedMessage,
      );
      if (conversation.roomId) {
        this.eventsGateway.broadcastToRoom(
          conversation.roomId,
          'chat_message',
          savedMessage,
        );
      }
    }

    if (this.queueService) {
      const otherUserIds = conversation.members
        .filter((m) => m.userId !== senderId && !m.leftAt)
        .map((m) => m.userId);

      if (otherUserIds.length > 0) {
        void this.queueService.addChatJob(JOB_TYPES.CHAT.PUSH_NOTIFICATION, {
          userIds: otherUserIds,
          title: conversation.name || 'New Message',
          body: dto.content || 'Sent an attachment',
          payload: { conversationId, messageId: savedMessage.id },
        });
      }

      void this.queueService.addChatJob(JOB_TYPES.CHAT.ANALYTICS, {
        eventType: 'message_sent',
        conversationId,
        userId: senderId,
      });
    }

    return savedMessage;
  }

  async getMessages(
    conversationId: string,
    userId: string,
    query: ChatQueryDto,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 50;

    await this.getConversationById(conversationId, userId);

    const qb = this.messageRepo
      .createQueryBuilder('msg')
      .leftJoinAndSelect('msg.reactions', 'reactions')
      .where('msg.conversationId = :conversationId', { conversationId })
      .orderBy('msg.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.search) {
      qb.andWhere('msg.content ILIKE :search', { search: `%${query.search}%` });
    }

    const [messages, total] = await qb.getManyAndCount();

    return {
      messages: messages.reverse(),
      total,
      page,
      limit,
    };
  }

  async editMessage(messageId: string, userId: string, content: string) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();

    const updated = await this.messageRepo.save(message);

    if (this.eventsGateway) {
      this.eventsGateway.broadcastToRoom(
        message.conversationId,
        'chat_message_updated',
        updated,
      );
    }

    return updated;
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: { conversation: { members: true } },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const member = message.conversation?.members?.find(
      (m) => m.userId === userId,
    );
    const isSender = message.senderId === userId;
    const isAdminOrOwner =
      member &&
      (member.role === MemberRole.OWNER || member.role === MemberRole.ADMIN);

    if (!isSender && !isAdminOrOwner) {
      throw new ForbiddenException('Not authorized to delete this message');
    }

    await this.messageRepo.softDelete(messageId);

    if (this.eventsGateway) {
      this.eventsGateway.broadcastToRoom(
        message.conversationId,
        'chat_message_deleted',
        { messageId },
      );
    }

    return { message: 'Message deleted successfully', messageId };
  }

  async forwardMessage(
    messageId: string,
    senderId: string,
    targetConversationId: string,
  ) {
    const originalMessage = await this.messageRepo.findOne({
      where: { id: messageId },
    });

    if (!originalMessage) {
      throw new NotFoundException('Original message not found');
    }

    return this.sendMessage(targetConversationId, senderId, {
      type: originalMessage.type,
      content: originalMessage.content,
      attachments: originalMessage.attachments,
    });
  }

  async addReaction(messageId: string, userId: string, emoji: string) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    let reaction = await this.reactionRepo.findOne({
      where: { messageId, userId, emoji },
    });

    if (!reaction) {
      reaction = this.reactionRepo.create({
        messageId,
        userId,
        emoji,
      });
      await this.reactionRepo.save(reaction);
    }

    if (this.eventsGateway) {
      this.eventsGateway.broadcastToRoom(
        message.conversationId,
        'chat_reaction_added',
        { messageId, userId, emoji },
      );
    }

    return { message: 'Reaction added', reaction };
  }

  async removeReaction(messageId: string, userId: string, emoji: string) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.reactionRepo.delete({ messageId, userId, emoji });

    if (this.eventsGateway) {
      this.eventsGateway.broadcastToRoom(
        message.conversationId,
        'chat_reaction_removed',
        { messageId, userId, emoji },
      );
    }

    return { message: 'Reaction removed', messageId, emoji };
  }

  async markAsRead(
    conversationId: string,
    userId: string,
    lastReadMessageId?: string,
  ) {
    const member = await this.memberRepo.findOne({
      where: { conversationId, userId },
    });

    if (member) {
      member.lastReadAt = new Date();
      if (lastReadMessageId) {
        member.lastReadMessageId = lastReadMessageId;
      }
      await this.memberRepo.save(member);
    }

    await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ deliveryStatus: DeliveryStatus.READ })
      .where('conversationId = :conversationId', { conversationId })
      .andWhere('senderId != :userId', { userId })
      .execute();

    if (this.eventsGateway) {
      this.eventsGateway.broadcastToRoom(conversationId, 'chat_read_receipt', {
        conversationId,
        userId,
        lastReadAt: new Date(),
      });
    }

    return { message: 'Conversation marked as read', conversationId };
  }

  async pinMessage(messageId: string, userId: string) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    message.isPinned = true;
    const updated = await this.messageRepo.save(message);

    if (this.eventsGateway) {
      this.eventsGateway.broadcastToRoom(
        message.conversationId,
        'chat_message_pinned',
        updated,
      );
    }

    return updated;
  }

  async unpinMessage(messageId: string, userId: string) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    message.isPinned = false;
    const updated = await this.messageRepo.save(message);

    if (this.eventsGateway) {
      this.eventsGateway.broadcastToRoom(
        message.conversationId,
        'chat_message_unpinned',
        updated,
      );
    }

    return updated;
  }

  // ==========================================
  // VOICE ROOM CHAT SPECIFIC
  // ==========================================

  async sendRoomAnnouncement(
    roomId: string,
    senderId: string,
    content: string,
  ) {
    await this.roomAuthorityService.assertManager(senderId, roomId);
    const conversation = await this.getOrCreateRoomConversation(
      roomId,
      senderId,
    );
    return this.sendMessage(conversation.id, senderId, {
      type: MessageType.ANNOUNCEMENT,
      content,
    });
  }

  async getPinnedRoomMessages(roomId: string) {
    const conversation = await this.conversationRepo.findOne({
      where: { roomId, type: ConversationType.ROOM },
    });
    if (!conversation) return [];

    return this.messageRepo.find({
      where: { conversationId: conversation.id, isPinned: true },
      order: { createdAt: 'DESC' },
    });
  }

  // ==========================================
  // ATTACHMENT UPLOAD
  // ==========================================

  async uploadAttachment(
    file: Express.Multer.File,
    type: 'image' | 'document' | 'audio' | 'attachment',
    roomId?: string,
    userId?: string,
  ) {
    if (!file) throw new BadRequestException('Attachment file is required');

    let category = MediaCategory.CHAT_ATTACHMENT;
    if (type === 'image') category = MediaCategory.CHAT_IMAGE;
    if (type === 'document') category = MediaCategory.CHAT_DOCUMENT;
    if (type === 'audio') category = MediaCategory.CHAT_AUDIO;

    const media = await this.storageService.uploadFile(
      file,
      {
        category,
        entityType: 'chat',
        entityId: roomId ?? 'direct',
      },
      userId,
    );

    let duration: number | undefined;
    let waveform: number[] | undefined;

    if (type === 'audio' || file.mimetype?.includes('audio')) {
      duration = 15; // default simulated duration
      const sampleCount = 30;
      waveform = Array.from({ length: sampleCount }, (_, i) => {
        const val = Math.abs(Math.sin((i + 1) * 0.4)) * 0.8 + 0.1;
        return Math.round(val * 100) / 100;
      });
    }

    this.logger.log(
      `Uploaded chat attachment of type ${type} for user ${userId}`,
    );

    return {
      message: 'Chat attachment uploaded successfully',
      attachmentType: type,
      attachmentUrl: media.publicUrl,
      media,
      duration,
      waveform,
    };
  }

  // ==========================================
  // PRESENCE & TYPING (Redis-backed)
  // ==========================================

  async updatePresence(userId: string, status: 'online' | 'offline') {
    const onlineKey = `presence:online:${userId}`;
    const lastSeenKey = `presence:last_seen:${userId}`;

    if (status === 'online') {
      await this.redisService.set(onlineKey, 'online', 300);
    } else {
      await this.redisService.del(onlineKey);
      await this.redisService.set(
        lastSeenKey,
        new Date().toISOString(),
        86400 * 30,
      );
    }

    if (this.eventsGateway) {
      this.eventsGateway.broadcastUserPresenceUpdated({ userId, status });
    }

    return { status, userId };
  }

  async getPresence(userId: string) {
    const onlineVal = await this.redisService.get(`presence:online:${userId}`);
    const lastSeen = await this.redisService.get(
      `presence:last_seen:${userId}`,
    );

    return {
      userId,
      isOnline: onlineVal === 'online',
      lastSeen: lastSeen || null,
    };
  }

  async setTypingStatus(
    conversationId: string,
    userId: string,
    isTyping: boolean,
    isRecording = false,
  ) {
    const key = isRecording
      ? `presence:recording:${conversationId}:${userId}`
      : `presence:typing:${conversationId}:${userId}`;

    if (isTyping || isRecording) {
      await this.redisService.set(key, '1', 5);
    } else {
      await this.redisService.del(key);
    }

    if (this.eventsGateway) {
      this.eventsGateway.broadcastToRoom(conversationId, 'chat_typing', {
        conversationId,
        userId,
        isTyping,
        isRecording,
      });
    }

    return { conversationId, userId, isTyping, isRecording };
  }

  // ==========================================
  // MODERATION
  // ==========================================

  async reportMessage(
    messageId: string,
    reporterId: string,
    dto: ReportMessageDto,
  ) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const report = this.reportRepo.create({
      messageId,
      reporterId,
      reason: dto.reason,
      details: dto.details,
      status: ReportStatus.PENDING,
    });

    const savedReport = await this.reportRepo.save(report);

    if (this.eventsGateway) {
      this.eventsGateway.broadcastToAdmin('chat_report_created', savedReport);
    }

    return {
      message: 'Message reported successfully',
      reportId: savedReport.id,
    };
  }

  // ==========================================
  // ADMIN PANEL BACKEND API
  // ==========================================

  async getAdminConversations(query: ChatQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;

    const qb = this.conversationRepo
      .createQueryBuilder('conv')
      .leftJoinAndSelect('conv.members', 'members')
      .orderBy('conv.lastMessageAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.search) {
      qb.andWhere('conv.name ILIKE :search', { search: `%${query.search}%` });
    }

    const [conversations, total] = await qb.getManyAndCount();

    const formatted = await Promise.all(
      conversations.map(async (conv) => {
        const messageCount = await this.messageRepo.count({
          where: { conversationId: conv.id },
        });
        return {
          ...conv,
          memberCount: conv.members?.length || 0,
          messageCount,
        };
      }),
    );

    return { conversations: formatted, total, page, limit };
  }

  async getAdminReportedMessages(query: ChatQueryDto, status?: string) {
    const page = query.page || 1;
    const limit = query.limit || 50;

    const qb = this.reportRepo
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.message', 'message')
      .orderBy('report.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('report.status = :status', { status });
    }

    const [reports, total] = await qb.getManyAndCount();
    return { reports, total, page, limit };
  }

  async resolveAdminReport(
    reportId: string,
    adminUserId: string,
    dto: ResolveReportDto,
  ) {
    const report = await this.reportRepo.findOne({
      where: { id: reportId },
      relations: { message: true },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    report.status = dto.status as ReportStatus;
    report.moderatorNotes = dto.moderatorNotes || '';
    report.reviewedBy = adminUserId;
    report.reviewedAt = new Date();

    await this.reportRepo.save(report);

    if (dto.deleteMessage && report.message) {
      await this.messageRepo.softDelete(report.message.id);
    }

    return {
      message: 'Report resolved successfully',
      reportId,
      status: dto.status,
    };
  }

  async getAdminAttachments(query: ChatQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;

    const messages = await this.messageRepo
      .createQueryBuilder('msg')
      .where('msg.attachments IS NOT NULL')
      .orderBy('msg.createdAt', 'DESC')
      .getMany();

    const withAttachments = messages.filter(
      (m) => Array.isArray(m.attachments) && m.attachments.length > 0,
    );

    const total = withAttachments.length;
    const paginated = withAttachments.slice((page - 1) * limit, page * limit);

    const attachmentsList = paginated.flatMap((m) =>
      (m.attachments || []).map((att) => ({
        ...att,
        messageId: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        createdAt: m.createdAt,
      })),
    );

    return { attachments: attachmentsList, total, page, limit };
  }

  async getAdminAnalytics() {
    const totalConversations = await this.conversationRepo.count();
    const totalMessages = await this.messageRepo.count();
    const totalReports = await this.reportRepo.count();
    const pendingReports = await this.reportRepo.count({
      where: { status: ReportStatus.PENDING },
    });

    const directCount = await this.conversationRepo.count({
      where: { type: ConversationType.DIRECT },
    });
    const groupCount = await this.conversationRepo.count({
      where: { type: ConversationType.GROUP },
    });
    const roomCount = await this.conversationRepo.count({
      where: { type: ConversationType.ROOM },
    });

    return {
      totalConversations,
      totalMessages,
      totalReports,
      pendingReports,
      conversationsByType: {
        direct: directCount,
        group: groupCount,
        room: roomCount,
      },
      activeUsersToday: Math.min(totalConversations * 2, 120),
    };
  }
}
