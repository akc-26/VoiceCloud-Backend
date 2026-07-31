import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import {
  UpdateGroupDto,
  AddMembersDto,
  TransferOwnershipDto,
} from './dto/update-group.dto';
import { ReportMessageDto } from './dto/report-message.dto';
import { ChatQueryDto, PresenceDto, TypingDto } from './dto/chat-query.dto';
import { MemberRole } from './entities/conversation-member.entity';

@ApiTags('Chat & Messaging')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // --- Attachments ---
  @Post('attachments')
  @ApiOperation({
    summary: 'Upload a chat attachment (image, document, audio, etc.)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'type',
    enum: ['image', 'document', 'audio', 'attachment'],
    required: false,
    description: 'Type of chat attachment',
  })
  @ApiQuery({
    name: 'roomId',
    required: false,
    description: 'Target chat room ID if applicable',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Attachment uploaded successfully.',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @UploadedFile() file: Express.Multer.File,
    @Query('type')
    type: 'image' | 'document' | 'audio' | 'attachment' = 'attachment',
    @Query('roomId') roomId: string,
    @CurrentUser('userId') userId: string,
  ) {
    if (!file) throw new BadRequestException('Attachment file is required');
    return this.chatService.uploadAttachment(file, type, roomId, userId);
  }

  // --- Conversations ---
  @Post('conversations')
  @ApiOperation({ summary: 'Create direct, group, or room conversation' })
  async createConversation(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.createConversation(userId, dto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List user conversations with pagination' })
  async getUserConversations(
    @CurrentUser('userId') userId: string,
    @Query() query: ChatQueryDto,
  ) {
    return this.chatService.getUserConversations(
      userId,
      query.page,
      query.limit,
      query.search,
    );
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation details' })
  async getConversationById(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.chatService.getConversationById(id, userId);
  }

  @Patch('conversations/:id')
  @ApiOperation({ summary: 'Update group conversation details' })
  async updateGroupConversation(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.chatService.updateGroupConversation(id, userId, dto);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Soft delete/remove conversation for user' })
  async deleteConversation(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.chatService.deleteConversationForUser(id, userId);
  }

  @Post('conversations/:id/leave')
  @ApiOperation({ summary: 'Leave group conversation' })
  async leaveGroup(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.chatService.leaveGroupConversation(id, userId);
  }

  @Post('conversations/:id/transfer-ownership')
  @ApiOperation({ summary: 'Transfer group ownership' })
  async transferOwnership(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: TransferOwnershipDto,
  ) {
    return this.chatService.transferOwnership(id, userId, dto);
  }

  @Post('conversations/:id/members')
  @ApiOperation({ summary: 'Add members to group conversation' })
  async addMembers(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: AddMembersDto,
  ) {
    return this.chatService.addGroupMembers(id, userId, dto);
  }

  @Delete('conversations/:id/members/:targetUserId')
  @ApiOperation({ summary: 'Remove member from group conversation' })
  async removeMember(
    @Param('id') id: string,
    @Param('targetUserId') targetUserId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.chatService.removeGroupMember(id, userId, targetUserId);
  }

  @Patch('conversations/:id/members/:targetUserId/role')
  @ApiOperation({ summary: 'Promote or demote group member role' })
  async updateMemberRole(
    @Param('id') id: string,
    @Param('targetUserId') targetUserId: string,
    @CurrentUser('userId') userId: string,
    @Body('role') role: MemberRole,
  ) {
    return this.chatService.updateMemberRole(id, userId, targetUserId, role);
  }

  // --- Messages ---
  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send message in conversation' })
  async sendMessage(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(id, userId, dto);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get conversation message history' })
  async getMessages(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Query() query: ChatQueryDto,
  ) {
    return this.chatService.getMessages(id, userId, query);
  }

  @Patch('messages/:id')
  @ApiOperation({ summary: 'Edit message' })
  async editMessage(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body('content') content: string,
  ) {
    return this.chatService.editMessage(id, userId, content);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Soft delete message' })
  async deleteMessage(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.chatService.deleteMessage(id, userId);
  }

  @Post('messages/:id/reply')
  @ApiOperation({ summary: 'Reply to message' })
  async replyToMessage(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    const originalMsg = await this.chatService.getMessages(id, userId, {
      limit: 1,
    });
    return this.chatService.sendMessage(dto.replyToId || id, userId, {
      ...dto,
      replyToId: id,
    });
  }

  @Post('messages/:id/forward')
  @ApiOperation({ summary: 'Forward message to another conversation' })
  async forwardMessage(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body('targetConversationId') targetConversationId: string,
  ) {
    return this.chatService.forwardMessage(id, userId, targetConversationId);
  }

  @Post('messages/:id/reactions')
  @ApiOperation({ summary: 'Add emoji reaction to message' })
  async addReaction(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body('emoji') emoji: string,
  ) {
    return this.chatService.addReaction(id, userId, emoji);
  }

  @Delete('messages/:id/reactions/:emoji')
  @ApiOperation({ summary: 'Remove emoji reaction from message' })
  async removeReaction(
    @Param('id') id: string,
    @Param('emoji') emoji: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.chatService.removeReaction(id, userId, emoji);
  }

  @Post('conversations/:id/read')
  @ApiOperation({ summary: 'Send read receipt for conversation' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body('lastReadMessageId') lastReadMessageId?: string,
  ) {
    return this.chatService.markAsRead(id, userId, lastReadMessageId);
  }

  @Post('messages/:id/pin')
  @ApiOperation({ summary: 'Pin message' })
  async pinMessage(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.chatService.pinMessage(id, userId);
  }

  @Post('messages/:id/unpin')
  @ApiOperation({ summary: 'Unpin message' })
  async unpinMessage(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.chatService.unpinMessage(id, userId);
  }

  // --- Room Chat ---
  @Post('rooms/:roomId/announcement')
  @ApiOperation({ summary: 'Send voice room announcement' })
  async sendRoomAnnouncement(
    @Param('roomId') roomId: string,
    @CurrentUser('userId') userId: string,
    @Body('content') content: string,
  ) {
    return this.chatService.sendRoomAnnouncement(roomId, userId, content);
  }

  @Get('rooms/:roomId/pinned')
  @ApiOperation({ summary: 'Get pinned room messages' })
  async getPinnedRoomMessages(@Param('roomId') roomId: string) {
    return this.chatService.getPinnedRoomMessages(roomId);
  }

  // --- Presence & Typing ---
  @Post('presence')
  @ApiOperation({ summary: 'Update user online/offline presence' })
  async updatePresence(
    @CurrentUser('userId') userId: string,
    @Body() dto: PresenceDto,
  ) {
    return this.chatService.updatePresence(userId, dto.status);
  }

  @Get('presence/:userId')
  @ApiOperation({ summary: 'Get user presence and last seen status' })
  async getPresence(@Param('userId') userId: string) {
    return this.chatService.getPresence(userId);
  }

  @Post('conversations/:id/typing')
  @ApiOperation({ summary: 'Send typing/recording indicator' })
  async setTyping(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: TypingDto,
  ) {
    return this.chatService.setTypingStatus(
      id,
      userId,
      !!dto.isTyping,
      !!dto.isRecording,
    );
  }

  // --- Moderation ---
  @Post('messages/:id/report')
  @ApiOperation({ summary: 'Report message for moderation' })
  async reportMessage(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: ReportMessageDto,
  ) {
    return this.chatService.reportMessage(id, userId, dto);
  }

  @Post('messages/:id/report-spam')
  @ApiOperation({ summary: 'Report message as spam' })
  async reportSpam(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.chatService.reportMessage(id, userId, { reason: 'spam' });
  }
}
