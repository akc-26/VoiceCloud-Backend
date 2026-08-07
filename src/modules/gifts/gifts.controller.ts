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
import { GiftingEngineService } from './gifting-engine.service';
import { GiftAnalyticsService } from './gift-analytics.service';
import { CreateDynamicGiftDto } from './dto/create-dynamic-gift.dto';
import { CreateGiftCategoryDto } from './dto/create-category.dto';
import { ReorderCatalogDto } from './dto/reorder-catalog.dto';
import {
  SendGiftDto,
  SendComboDto,
  SendMultiGiftPhase22Dto,
} from './dto/send-gift-phase22.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('Phase 22 Gift System & Catalog Management')
@Controller('gifts')
export class GiftsController {
  constructor(
    private readonly giftsService: GiftsService,
    private readonly giftingEngineService: GiftingEngineService,
    private readonly giftAnalyticsService: GiftAnalyticsService,
  ) {}

  // ================= CATALOG ENDPOINTS =================
  @Get('catalog')
  @ApiOperation({
    summary:
      'List available gift catalog with regional, category, and seasonal filters',
  })
  @ApiQuery({
    name: 'countryCode',
    required: false,
    description: 'User country code (e.g. US, IN)',
  })
  @ApiQuery({
    name: 'seasonTag',
    required: false,
    description: 'Season tag (e.g. summer_2026)',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category name',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by gift type (static, animated, svga, etc.)',
  })
  @ApiResponse({ status: 200, description: 'List of available catalog gifts' })
  async getCatalog(
    @Query('countryCode') countryCode?: string,
    @Query('seasonTag') seasonTag?: string,
    @Query('category') category?: string,
    @Query('type') type?: string,
  ) {
    return this.giftsService.getCatalog(countryCode, seasonTag, {
      category,
      type,
    });
  }

  @Get('search')
  @ApiOperation({ summary: 'Search gifts by name, category, rarity, or tag' })
  @ApiQuery({ name: 'query', required: true, description: 'Search keyword' })
  @ApiResponse({ status: 200, description: 'Matched gifts list' })
  async searchGifts(@Query('query') query: string) {
    return this.giftsService.searchGifts(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all active gift categories' })
  @ApiResponse({ status: 200, description: 'List of gift categories' })
  async getCategories() {
    return this.giftsService.getCategories();
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured and premium gifts' })
  @ApiResponse({ status: 200, description: 'List of featured gifts' })
  async getFeaturedGifts() {
    return this.giftsService.getFeaturedGifts();
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending gifts in real-time' })
  @ApiResponse({ status: 200, description: 'List of trending gifts' })
  async getTrendingGifts() {
    return this.giftsService.getTrendingGifts();
  }

  // ================= ADMINISTRATION ENDPOINTS =================
  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Create new gift item with metadata and availability rules (Admin)',
  })
  @ApiResponse({ status: 201, description: 'Gift item created successfully' })
  async createDynamicGift(@Body() dto: CreateDynamicGiftDto) {
    return this.giftsService.createDynamicGift(dto);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update gift rules, pricing, or metadata (Admin)' })
  @ApiParam({ name: 'id', description: 'Gift ID' })
  @ApiResponse({ status: 200, description: 'Gift updated successfully' })
  async updateDynamicGift(
    @Param('id') id: string,
    @Body() dto: Partial<CreateDynamicGiftDto>,
  ) {
    return this.giftsService.updateDynamicGift(id, dto);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete gift from catalog (Admin)' })
  @ApiParam({ name: 'id', description: 'Gift ID' })
  @ApiResponse({ status: 200, description: 'Gift deleted successfully' })
  async deleteGift(@Param('id') id: string) {
    return this.giftsService.deleteGift(id);
  }

  @Post('admin/:id/archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive gift item (Admin)' })
  @ApiParam({ name: 'id', description: 'Gift ID' })
  @ApiResponse({ status: 200, description: 'Gift archived successfully' })
  async archiveGift(@Param('id') id: string) {
    return this.giftsService.archiveGift(id);
  }

  @Post('admin/:id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore archived gift item (Admin)' })
  @ApiParam({ name: 'id', description: 'Gift ID' })
  @ApiResponse({ status: 200, description: 'Gift restored successfully' })
  async restoreGift(@Param('id') id: string) {
    return this.giftsService.restoreGift(id);
  }

  @Patch('admin/:id/enable')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable gift item (Admin)' })
  @ApiParam({ name: 'id', description: 'Gift ID' })
  @ApiResponse({ status: 200, description: 'Gift enabled' })
  async enableGift(@Param('id') id: string) {
    return this.giftsService.enableGift(id);
  }

  @Patch('admin/:id/disable')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable gift item (Admin)' })
  @ApiParam({ name: 'id', description: 'Gift ID' })
  @ApiResponse({ status: 200, description: 'Gift disabled' })
  async disableGift(@Param('id') id: string) {
    return this.giftsService.disableGift(id);
  }

  @Patch('admin/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder gift catalog items display order (Admin)' })
  @ApiResponse({ status: 200, description: 'Catalog reordered successfully' })
  async reorderCatalog(@Body() dto: ReorderCatalogDto) {
    return this.giftsService.reorderCatalog(dto);
  }

  @Post('admin/categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create gift category (Admin)' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  async createCategory(@Body() dto: CreateGiftCategoryDto) {
    return this.giftsService.createCategory(dto);
  }

  @Patch('admin/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update gift category (Admin)' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: Partial<CreateGiftCategoryDto>,
  ) {
    return this.giftsService.updateCategory(id, dto);
  }

  @Delete('admin/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete gift category (Admin)' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  async deleteCategory(@Param('id') id: string) {
    return this.giftsService.deleteCategory(id);
  }

  // ================= TRANSACTION & ENGINE ENDPOINTS =================
  @Post('send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send gift to single or multiple receivers in room/chat/event',
  })
  @ApiResponse({ status: 200, description: 'Gift sent successfully' })
  async sendGift(
    @CurrentUser('userId') senderId: string,
    @Body() dto: SendGiftDto,
  ) {
    return this.giftingEngineService.sendGift(senderId, dto);
  }

  @Post('send-combo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send rapid combo gift streak' })
  @ApiResponse({ status: 200, description: 'Combo gift sent successfully' })
  async sendCombo(
    @CurrentUser('userId') senderId: string,
    @Body() dto: SendComboDto,
  ) {
    return this.giftingEngineService.sendCombo(senderId, dto);
  }

  @Post('send-multi')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send multi-recipient gift blast' })
  @ApiResponse({ status: 200, description: 'Multi-gift sent successfully' })
  async sendMulti(
    @CurrentUser('userId') senderId: string,
    @Body() dto: SendMultiGiftPhase22Dto,
  ) {
    return this.giftingEngineService.sendMultiGift(senderId, dto);
  }

  @Get('queue/:roomId')
  @ApiOperation({ summary: 'Get active gift animation queue for room' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'List of queued animations' })
  async getQueue(@Param('roomId') roomId: string) {
    return this.giftingEngineService.getGiftQueue(roomId);
  }

  @Post('queue/cancel/:queueId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel queued gift animation before playback' })
  @ApiParam({ name: 'queueId', description: 'Queue Item ID' })
  @ApiResponse({ status: 200, description: 'Queued animation cancelled' })
  async cancelQueuedGift(
    @CurrentUser('userId') userId: string,
    @Param('queueId') queueId: string,
  ) {
    return this.giftingEngineService.cancelQueuedGift(userId, queueId);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user gifting transaction history' })
  @ApiQuery({ name: 'role', required: false, enum: ['sender', 'receiver'] })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'User gift history' })
  async getHistory(
    @CurrentUser('userId') userId: string,
    @Query('role') role?: 'sender' | 'receiver',
    @Query('limit') limit?: number,
  ) {
    return this.giftingEngineService.getGiftHistory(userId, { role, limit });
  }

  // ================= ANALYTICS ENDPOINTS =================
  @Get('analytics/top-gifts')
  @ApiOperation({ summary: 'Get top gifts by coin volume' })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
  })
  @ApiResponse({ status: 200, description: 'Top gifts list' })
  async getTopGifts(
    @Query('timeframe') timeframe?: 'hourly' | 'daily' | 'weekly' | 'monthly',
  ) {
    return this.giftAnalyticsService.getTopGifts(timeframe || 'daily');
  }

  @Get('analytics/top-senders')
  @ApiOperation({ summary: 'Get top gift senders leaderboard' })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
  })
  @ApiResponse({ status: 200, description: 'Top senders list' })
  async getTopSenders(
    @Query('timeframe') timeframe?: 'hourly' | 'daily' | 'weekly' | 'monthly',
  ) {
    return this.giftAnalyticsService.getTopSenders(timeframe || 'daily');
  }

  @Get('analytics/top-receivers')
  @ApiOperation({ summary: 'Get top gift receivers leaderboard' })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
  })
  @ApiResponse({ status: 200, description: 'Top receivers list' })
  async getTopReceivers(
    @Query('timeframe') timeframe?: 'hourly' | 'daily' | 'weekly' | 'monthly',
  ) {
    return this.giftAnalyticsService.getTopReceivers(timeframe || 'daily');
  }

  @Get('analytics/revenue')
  @ApiOperation({
    summary: 'Get gifting revenue, creator payouts, and agency share summary',
  })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
  })
  @ApiResponse({ status: 200, description: 'Revenue metrics summary' })
  async getGiftRevenue(
    @Query('timeframe') timeframe?: 'hourly' | 'daily' | 'weekly' | 'monthly',
  ) {
    return this.giftAnalyticsService.getGiftRevenue(timeframe || 'daily');
  }

  @Get('analytics/trends')
  @ApiOperation({ summary: 'Get time-series gifting trends' })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
  })
  @ApiResponse({ status: 200, description: 'Gifting trend metrics' })
  async getGiftTrends(
    @Query('timeframe') timeframe?: 'hourly' | 'daily' | 'weekly' | 'monthly',
  ) {
    return this.giftAnalyticsService.getGiftTrends(timeframe || 'daily');
  }

  // ================= MEDIA UPLOADS =================
  @Post(':id/icon')
  @ApiOperation({ summary: 'Upload gift icon image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, description: 'Gift icon uploaded successfully' })
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
    summary: 'Upload gift animation file (SVGA, Lottie, GIF, MP4, WebM)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Gift animation uploaded successfully',
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
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Gift preview uploaded successfully',
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
