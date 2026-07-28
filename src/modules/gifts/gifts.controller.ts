import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
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
  ApiParam,
} from '@nestjs/swagger';
import { GiftsService } from './gifts.service';
import { CreateDynamicGiftDto } from './dto/create-dynamic-gift.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Gift Media & Dynamic Catalog Management')
@Controller('gifts')
export class GiftsController {
  constructor(private readonly giftsService: GiftsService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'Get filtered gift catalog for region, seasonal tag, and stock' })
  @ApiResponse({ status: 200, description: 'List of available gifts' })
  async getCatalog(
    @Query('countryCode') countryCode?: string,
    @Query('seasonTag') seasonTag?: string,
  ) {
    return this.giftsService.getCatalog(countryCode, seasonTag);
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new gift with regional, seasonal, scheduled, or limited stock rules (Admin)' })
  @ApiResponse({ status: 201, description: 'Gift created successfully' })
  async createDynamicGift(@Body() dto: CreateDynamicGiftDto) {
    return this.giftsService.createDynamicGift(dto);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update gift dynamic availability rules (Admin)' })
  @ApiParam({ name: 'id', description: 'Gift ID' })
  @ApiResponse({ status: 200, description: 'Gift updated successfully' })
  async updateDynamicGift(
    @Param('id') id: string,
    @Body() dto: Partial<CreateDynamicGiftDto>,
  ) {
    return this.giftsService.updateDynamicGift(id, dto);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete gift from catalog (Admin)' })
  @ApiParam({ name: 'id', description: 'Gift ID' })
  @ApiResponse({ status: 200, description: 'Gift deleted successfully' })
  async deleteGift(@Param('id') id: string) {
    return this.giftsService.deleteGift(id);
  }

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
