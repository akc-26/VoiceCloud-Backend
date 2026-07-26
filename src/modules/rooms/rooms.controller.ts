import {
  Controller,
  Post,
  Param,
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
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Room Media Management')
@Controller('rooms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post(':id/cover')
  @ApiOperation({ summary: 'Upload or update room cover image' })
  @ApiConsumes('multipart/form-data')
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
    description: 'Room cover uploaded successfully.',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadRoomCover(
    @Param('id') roomId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.roomsService.uploadRoomCover(roomId, file, userId);
  }

  @Post(':id/thumbnail')
  @ApiOperation({ summary: 'Upload or update room thumbnail image' })
  @ApiConsumes('multipart/form-data')
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
    description: 'Room thumbnail uploaded successfully.',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadRoomThumbnail(
    @Param('id') roomId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.roomsService.uploadRoomThumbnail(roomId, file, userId);
  }

  @Post(':id/background')
  @ApiOperation({ summary: 'Upload or update room background image' })
  @ApiConsumes('multipart/form-data')
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
    description: 'Room background uploaded successfully.',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadRoomBackground(
    @Param('id') roomId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.roomsService.uploadRoomBackground(roomId, file, userId);
  }
}
