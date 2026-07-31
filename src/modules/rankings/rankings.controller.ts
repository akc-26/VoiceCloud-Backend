import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RankingsService } from './rankings.service';
import { RecommendationsService } from './recommendations.service';
import {
  LeaderboardQueryDto,
  LeaderboardCategory,
  LeaderboardTimeframe,
} from './dto/leaderboard-query.dto';
import { TrendingQueryDto } from './dto/trending-query.dto';
import { RecommendationQueryDto } from './dto/recommendation-query.dto';
import { RankingSnapshotQueryDto } from './dto/ranking-snapshot-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Leaderboards, Rankings & Trending')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RankingsController {
  constructor(
    private readonly rankingsService: RankingsService,
    private readonly recommendationsService: RecommendationsService,
  ) {}

  // 1. GLOBAL USER RANKINGS
  @Get(['leaderboards', 'rankings/leaderboard'])
  @Public()
  @ApiOperation({ summary: 'Get default global user leaderboard' })
  @ApiResponse({
    status: 200,
    description: 'Default user leaderboard retrieved.',
  })
  async getGlobalLeaderboard(@Query() dto: LeaderboardQueryDto) {
    return this.rankingsService.getLeaderboard(LeaderboardCategory.USERS, dto);
  }

  @Get(['leaderboards/users', 'rankings/leaderboard/users'])
  @Public()
  @ApiOperation({
    summary:
      'Get Global User Leaderboard by coins, diamonds, gifts, followers, voice time, active time',
  })
  @ApiResponse({ status: 200, description: 'User leaderboard.' })
  async getUserLeaderboard(@Query() dto: LeaderboardQueryDto) {
    return this.rankingsService.getLeaderboard(LeaderboardCategory.USERS, dto);
  }

  // 2. HOST RANKINGS
  @Get(['leaderboards/hosts', 'rankings/leaderboard/hosts'])
  @Public()
  @ApiOperation({
    summary:
      'Get Host Leaderboard by audience, peak, gifts, diamonds, room hours, engagement, retention, level, xp',
  })
  @ApiResponse({ status: 200, description: 'Host leaderboard.' })
  async getHostLeaderboard(@Query() dto: LeaderboardQueryDto) {
    return this.rankingsService.getLeaderboard(LeaderboardCategory.HOSTS, dto);
  }

  // 4. CLUB RANKINGS
  @Get(['leaderboards/clubs', 'rankings/leaderboard/clubs'])
  @Public()
  @ApiOperation({
    summary:
      'Get Club Leaderboard by active members, weekly activity, gifts, diamonds, voice hours, events',
  })
  @ApiResponse({ status: 200, description: 'Club leaderboard.' })
  async getClubLeaderboard(@Query() dto: LeaderboardQueryDto) {
    return this.rankingsService.getLeaderboard(LeaderboardCategory.CLUBS, dto);
  }

  // 5. ROOM RANKINGS
  @Get(['leaderboards/rooms', 'rankings/leaderboard/rooms'])
  @Public()
  @ApiOperation({
    summary:
      'Get Room Leaderboard by listeners, peak users, speaking time, total gifts, session duration',
  })
  @ApiResponse({ status: 200, description: 'Room leaderboard.' })
  async getRoomLeaderboard(@Query() dto: LeaderboardQueryDto) {
    return this.rankingsService.getLeaderboard(LeaderboardCategory.ROOMS, dto);
  }

  // 6. VIP RANKINGS
  @Get(['leaderboards/vip', 'rankings/leaderboard/vip'])
  @Public()
  @ApiOperation({
    summary: 'Get VIP Leaderboard by level, XP, spending, gifts, activity',
  })
  @ApiResponse({ status: 200, description: 'VIP leaderboard.' })
  async getVipLeaderboard(@Query() dto: LeaderboardQueryDto) {
    return this.rankingsService.getLeaderboard(LeaderboardCategory.VIP, dto);
  }

  // 7. CREATOR RANKINGS
  @Get(['leaderboards/creators', 'rankings/leaderboard/creators'])
  @Public()
  @ApiOperation({
    summary:
      'Get Creator Leaderboard by creator revenue, followers, growth, engagement, popularity',
  })
  @ApiResponse({ status: 200, description: 'Creator leaderboard.' })
  async getCreatorLeaderboard(@Query() dto: LeaderboardQueryDto) {
    return this.rankingsService.getLeaderboard(
      LeaderboardCategory.CREATORS,
      dto,
    );
  }

  // 8. GIFT SENDERS & RECEIVERS
  @Get(['leaderboards/gift-senders', 'rankings/leaderboard/gift-senders'])
  @Public()
  @ApiOperation({ summary: 'Get Top Gift Senders Leaderboard' })
  @ApiResponse({ status: 200, description: 'Gift senders leaderboard.' })
  async getGiftSendersLeaderboard(@Query() dto: LeaderboardQueryDto) {
    return this.rankingsService.getLeaderboard(
      LeaderboardCategory.GIFT_SENDERS,
      dto,
    );
  }

  @Get(['leaderboards/gift-receivers', 'rankings/leaderboard/gift-receivers'])
  @Public()
  @ApiOperation({ summary: 'Get Top Gift Receivers Leaderboard' })
  @ApiResponse({ status: 200, description: 'Gift receivers leaderboard.' })
  async getGiftReceiversLeaderboard(@Query() dto: LeaderboardQueryDto) {
    return this.rankingsService.getLeaderboard(
      LeaderboardCategory.GIFT_RECEIVERS,
      dto,
    );
  }

  // 9. HISTORICAL SNAPSHOTS & COMPARISON
  @Get(['leaderboards/snapshots', 'rankings/admin/snapshots'])
  @Public()
  @ApiOperation({ summary: 'Get historical ranking snapshots' })
  @ApiResponse({ status: 200, description: 'Historical snapshots list.' })
  async getHistoricalSnapshots(@Query() dto: RankingSnapshotQueryDto) {
    return this.rankingsService.getSnapshots(dto);
  }

  @Get([
    'leaderboards/comparison',
    'rankings/history/comparison/:category/:entityId',
  ])
  @Public()
  @ApiOperation({
    summary: 'Compare entity rank & score against historical snapshot',
  })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'currentId', required: false })
  @ApiQuery({ name: 'timeframe', required: false, default: 'daily' })
  @ApiResponse({ status: 200, description: 'Historical comparison deltas.' })
  async getHistoricalComparison(
    @Query('category') queryCategory?: string,
    @Param('category') paramCategory?: string,
    @Param('entityId') entityId?: string,
    @Query('currentId') queryCurrentId?: string,
    @Query('timeframe') timeframe = 'daily',
  ) {
    const category = paramCategory || queryCategory || 'users';
    const currentId = entityId || queryCurrentId || 'user-1';
    return this.rankingsService.getHistoricalComparison(
      category,
      currentId,
      timeframe,
    );
  }

  // PARAMETRIC ROUTES
  @Get(['leaderboards/:category', 'rankings/leaderboard/:category'])
  @Public()
  @ApiOperation({
    summary: 'Get Leaderboard by category',
  })
  @ApiParam({
    name: 'category',
    description:
      'Category (users, hosts, agencies, clubs, rooms, vip, creators, gift-senders, gift-receivers)',
  })
  @ApiResponse({
    status: 200,
    description: 'Categorized leaderboard retrieved.',
  })
  async getCategoryLeaderboard(
    @Param('category') category: string,
    @Query() dto: LeaderboardQueryDto,
  ) {
    return this.rankingsService.getLeaderboard(category, dto);
  }

  @Get([
    'leaderboards/:category/:timeframe',
    'rankings/leaderboard/:category/:timeframe',
  ])
  @Public()
  @ApiOperation({
    summary: 'Get Parametric Leaderboard by category and timeframe',
  })
  @ApiParam({
    name: 'category',
    description:
      'Category (users, hosts, agencies, clubs, rooms, vip, creators, gift-senders, gift-receivers)',
  })
  @ApiParam({
    name: 'timeframe',
    description: 'Timeframe (global, daily, weekly, monthly, all_time)',
  })
  @ApiResponse({
    status: 200,
    description: 'Categorized leaderboard retrieved.',
  })
  async getParametricLeaderboard(
    @Param('category') category: string,
    @Param('timeframe') timeframe: LeaderboardTimeframe,
    @Query() dto: LeaderboardQueryDto,
  ) {
    return this.rankingsService.getLeaderboard(category, {
      ...dto,
      timeframe,
    });
  }

  // 10. TRENDING RANKINGS
  @Get(['trending', 'rankings/trending'])
  @Public()
  @ApiOperation({
    summary:
      'Get overall trending summary (users, hosts, agencies, clubs, rooms)',
  })
  @ApiResponse({ status: 200, description: 'Trending summary.' })
  async getTrendingSummary(@Query() dto: TrendingQueryDto) {
    return this.rankingsService.getTrendingSummary(dto);
  }

  @Get(['trending/users', 'rankings/trending/users'])
  @Public()
  @ApiOperation({ summary: 'Get fastest rising trending users' })
  @ApiResponse({ status: 200, description: 'Trending users list.' })
  async getTrendingUsers(@Query() dto: TrendingQueryDto) {
    return this.rankingsService.getTrendingUsers(dto);
  }

  @Get(['trending/hosts', 'rankings/trending/hosts'])
  @Public()
  @ApiOperation({ summary: 'Get trending hosts' })
  @ApiResponse({ status: 200, description: 'Trending hosts list.' })
  async getTrendingHosts(@Query() dto: TrendingQueryDto) {
    return this.rankingsService.getTrendingHosts(dto);
  }

  @Get(['trending/clubs', 'rankings/trending/clubs'])
  @Public()
  @ApiOperation({ summary: 'Get trending clubs' })
  @ApiResponse({ status: 200, description: 'Trending clubs list.' })
  async getTrendingClubs(@Query() dto: TrendingQueryDto) {
    return this.rankingsService.getTrendingClubs(dto);
  }

  @Get(['trending/rooms', 'rankings/trending/rooms'])
  @Public()
  @ApiOperation({ summary: 'Get trending rooms' })
  @ApiResponse({ status: 200, description: 'Trending rooms list.' })
  async getTrendingRooms(@Query() dto: TrendingQueryDto) {
    return this.rankingsService.getTrendingRooms(dto);
  }

  @Get(['trending/keywords', 'rankings/trending/keywords'])
  @Public()
  @ApiOperation({ summary: 'Get trending search keywords' })
  @ApiResponse({ status: 200, description: 'Trending keywords list.' })
  async getTrendingKeywords(@Query() dto: TrendingQueryDto) {
    return [
      { keyword: 'music party', count: 1250 },
      { keyword: 'live concert', count: 980 },
      { keyword: 'gaming arena', count: 850 },
      { keyword: 'vip lounge', count: 720 },
      { keyword: 'singing battle', count: 640 },
    ].slice(0, dto.limit || 10);
  }

  // 11. ADMIN CACHE & SNAPSHOT OPERATIONS
  @Post([
    'admin/rankings/refresh-cache',
    'rankings/admin/cache/refresh',
    'rankings/admin/cache-refresh',
  ])
  @Public()
  @ApiOperation({ summary: 'Refresh all ranking Redis caches' })
  @ApiResponse({ status: 200, description: 'Ranking cache refreshed.' })
  async refreshCache() {
    return this.rankingsService.refreshRankingCache();
  }

  @Get([
    'admin/rankings/cache-status',
    'rankings/admin/cache/status',
    'rankings/admin/cache-status',
  ])
  @Public()
  @ApiOperation({ summary: 'Get Redis cache status for rankings' })
  @ApiResponse({ status: 200, description: 'Cache status info.' })
  async getCacheStatus() {
    return this.rankingsService.getCacheStatus();
  }

  @Post([
    'admin/rankings/snapshots',
    'rankings/admin/snapshot',
    'rankings/admin/snapshots',
  ])
  @Public()
  @ApiOperation({ summary: 'Trigger historical ranking snapshot creation' })
  @ApiResponse({ status: 201, description: 'Snapshot created.' })
  async createSnapshot(
    @Body()
    body: {
      category: string;
      timeframe: string;
      periodIdentifier: string;
      country?: string;
    },
  ) {
    return this.rankingsService.createSnapshot(
      body.category || 'users',
      body.timeframe || 'daily',
      body.periodIdentifier || new Date().toISOString().split('T')[0],
      body.country || 'GLOBAL',
    );
  }

  // RECOMMENDATIONS
  @Get('recommendations')
  @ApiOperation({ summary: 'Get overall recommendations overview' })
  @ApiResponse({ status: 200, description: 'Recommendations summary.' })
  async getRecommendationsOverview(
    @CurrentUser('userId') userId: string,
    @Query() dto: RecommendationQueryDto,
  ) {
    const rooms = await this.recommendationsService.recommendRooms(userId, dto);
    const users = await this.recommendationsService.recommendUsers(userId, dto);
    const hosts = await this.recommendationsService.recommendHosts(userId, dto);
    return {
      userId,
      rooms: rooms.items,
      users: users.items,
      hosts: hosts.items,
    };
  }

  @Get('recommendations/rooms')
  @ApiOperation({
    summary: 'Get rule-based recommended voice rooms for the user',
  })
  @ApiResponse({ status: 200, description: 'Recommended rooms list.' })
  async getRecommendedRooms(
    @CurrentUser('userId') userId: string,
    @Query() dto: RecommendationQueryDto,
  ) {
    return this.recommendationsService.recommendRooms(userId, dto);
  }

  @Get('recommendations/users')
  @ApiOperation({
    summary: 'Get rule-based recommended users to connect with',
  })
  @ApiResponse({ status: 200, description: 'Recommended users list.' })
  async getRecommendedUsers(
    @CurrentUser('userId') userId: string,
    @Query() dto: RecommendationQueryDto,
  ) {
    return this.recommendationsService.recommendUsers(userId, dto);
  }

  @Get('recommendations/hosts')
  @ApiOperation({ summary: 'Get rule-based recommended verified hosts' })
  @ApiResponse({ status: 200, description: 'Recommended hosts list.' })
  async getRecommendedHosts(
    @CurrentUser('userId') userId: string,
    @Query() dto: RecommendationQueryDto,
  ) {
    return this.recommendationsService.recommendHosts(userId, dto);
  }
}
