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
import { GiftsService } from './gifts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Gift Media Management')
@Controller('gifts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GiftsController {
  constructor(private readonly giftsService: GiftsService) {}

  @Post(':id/icon')
  @ApiOperation({ summary: 'Upload gift icon image' })
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
  @ApiResponse({ status: 201, description: 'Gift icon uploaded successfully.' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadGiftIcon(
    @Param('id') giftId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.giftsService.uploadGiftIcon(giftId, file, userId);
  }

  @Post(':id/animation')
  @ApiOperation({
    summary: 'Upload gift animation file (JSON, SVGA, GIF, MP4, WebM)',
  })
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
    description: 'Gift animation uploaded successfully.',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadGiftAnimation(
    @Param('id') giftId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.giftsService.uploadGiftAnimation(giftId, file, userId);
  }

  @Post(':id/preview')
  @ApiOperation({ summary: 'Upload gift preview image' })
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
    description: 'Gift preview uploaded successfully.',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadGiftPreview(
    @Param('id') giftId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.giftsService.uploadGiftPreview(giftId, file, userId);
  }
}
