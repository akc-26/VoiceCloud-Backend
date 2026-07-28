import {
  Controller,
  Post,
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

@ApiTags('Chat Attachments')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

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
}
