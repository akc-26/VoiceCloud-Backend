import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Query,
  Body,
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
} from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { UploadMediaDto } from './dto/upload-media.dto';
import { QueryMediaDto } from './dto/query-media.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Storage & Media Infrastructure')
@Controller('storage')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a media file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'category'],
      properties: {
        file: { type: 'string', format: 'binary' },
        category: {
          type: 'string',
          example: 'avatar',
          description: 'Media category (avatar, room_cover, gift_icon, etc.)',
        },
        entityType: { type: 'string', example: 'room' },
        entityId: { type: 'string', example: 'room-uuid-123' },
        width: { type: 'number', example: 500 },
        height: { type: 'number', example: 500 },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Media file uploaded successfully.',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMediaDto,
    @CurrentUser('userId') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required for upload');
    }
    return this.storageService.uploadFile(file, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Query and list media files' })
  @ApiResponse({ status: 200, description: 'List of media files retrieved.' })
  async queryMedia(@Query() query: QueryMediaDto) {
    return this.storageService.queryMedia(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media file metadata by ID' })
  @ApiResponse({ status: 200, description: 'Media file metadata retrieved.' })
  async getMediaById(@Param('id') id: string) {
    return this.storageService.getMediaById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Replace an existing media file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'category'],
      properties: {
        file: { type: 'string', format: 'binary' },
        category: { type: 'string', example: 'avatar' },
        entityType: { type: 'string' },
        entityId: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Media file replaced successfully.',
  })
  @UseInterceptors(FileInterceptor('file'))
  async replaceFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMediaDto,
    @CurrentUser('userId') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required for replacement');
    }
    return this.storageService.replaceFile(id, file, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a media file by ID' })
  @ApiResponse({ status: 200, description: 'Media file deleted successfully.' })
  async deleteFile(@Param('id') id: string) {
    const success = await this.storageService.deleteFile(id);
    return { success, message: 'Media file deleted successfully' };
  }
}
