import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Leaderboards, Trending & Recommendations')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RankingsController {
  constructor(
    private readonly rankingsService: RankingsService,
    private readonly recommendationsService: RecommendationsService,
  ) {}

  // LEADERBOARDS
  @Get('leaderboards')
  @Public()
  @ApiOperation({ summary: 'Get global user leaderboard' })
  @ApiResponse({ status: 200, description: 'Default leaderboard retrieved.' })
  async getGlobalLeaderboard(@Query() dto: LeaderboardQueryDto) {
    return this.rankingsService.getLeaderboard(LeaderboardCategory.USERS, dto);
  }

  @Get('leaderboards/users')
  @Public()
  @ApiOperation({ summary: 'Get User Leaderboard across timeframes' })
  @ApiResponse({ status: 200, description: 'User leaderboard.' })
  async getUserLeaderboard(@Query() dto: LeaderboardQueryDto) {
    return this.rankingsService.getLeaderboard(LeaderboardCategory.USERS, dto);
  }

  @Get('leaderboards/hosts')
  @Public()
  @ApiOperation({ summary: 'Get Host Leaderboard across timeframes' })
  @ApiResponse({ status: 200, description: 'Host leaderboard.' })
  async getHostLeaderboard(@Query() dto: LeaderboardQueryDto) {
    return this.rankingsService.getLeaderboard(LeaderboardCategory.HOSTS, dto);
  }

  @Get('leaderboards/agencies')
  @Public()
  @ApiOperation({ summary: 'Get Agency Leaderboard across timeframes' })
  @ApiResponse({ status: 200, description: 'Agency leaderboard.' })
  async getAgencyLeaderboard(@Query() dto: LeaderboardQueryDto) {
    return this.rankingsService.getLeaderboard(
      LeaderboardCategory.AGENCIES,
      dto,
    );
  }

  @Get('leaderboards/rooms')
  @Public()
  @ApiOperation({ summary: 'Get Room Leaderboard across timeframes' })
  @ApiResponse({ status: 200, description: 'Room leaderboard.' })
  async getRoomLeaderboard(@Query() dto: LeaderboardQueryDto) {
    return this.rankingsService.getLeaderboard(LeaderboardCategory.ROOMS, dto);
  }

  @Get('leaderboards/gift-senders')
  @Public()
  @ApiOperation({ summary: 'Get Top Gift Senders Leaderboard' })
  @ApiResponse({ status: 200, description: 'Gift senders leaderboard.' })
  async getGiftSendersLeaderboard(@Query() dto: LeaderboardQueryDto) {
    return this.rankingsService.getLeaderboard(
      LeaderboardCategory.GIFT_SENDERS,
      dto,
    );
  }

  @Get('leaderboards/gift-receivers')
  @Public()
  @ApiOperation({ summary: 'Get Top Gift Receivers Leaderboard' })
  @ApiResponse({ status: 200, description: 'Gift receivers leaderboard.' })
  async getGiftReceiversLeaderboard(@Query() dto: LeaderboardQueryDto) {
    return this.rankingsService.getLeaderboard(
      LeaderboardCategory.GIFT_RECEIVERS,
      dto,
    );
  }

  @Get('leaderboards/:category/:timeframe')
  @Public()
  @ApiOperation({
    summary: 'Get Parametric Leaderboard by category and timeframe',
  })
  @ApiParam({
    name: 'category',
    description:
      'Category (users, hosts, agencies, rooms, gift-senders, gift-receivers)',
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

  // TRENDING
  @Get('trending')
  @Public()
  @ApiOperation({
    summary:
      'Get overall trending summary (keywords, rooms, users, agencies, hosts)',
  })
  @ApiResponse({ status: 200, description: 'Trending summary.' })
  async getTrendingSummary(@Query() dto: TrendingQueryDto) {
    return this.rankingsService.getTrendingSummary(dto);
  }

  @Get('trending/keywords')
  @Public()
  @ApiOperation({ summary: 'Get trending search keywords' })
  @ApiResponse({ status: 200, description: 'Trending keywords list.' })
  async getTrendingKeywords(@Query() dto: TrendingQueryDto) {
    return this.rankingsService.getTrendingKeywords(dto);
  }

  @Get('trending/rooms')
  @Public()
  @ApiOperation({ summary: 'Get trending rooms' })
  @ApiResponse({ status: 200, description: 'Trending rooms list.' })
  async getTrendingRooms(@Query() dto: TrendingQueryDto) {
    return this.rankingsService.getTrendingRooms(dto);
  }

  @Get('trending/users')
  @Public()
  @ApiOperation({ summary: 'Get trending users' })
  @ApiResponse({ status: 200, description: 'Trending users list.' })
  async getTrendingUsers(@Query() dto: TrendingQueryDto) {
    return this.rankingsService.getTrendingUsers(dto);
  }

  @Get('trending/agencies')
  @Public()
  @ApiOperation({ summary: 'Get trending agencies' })
  @ApiResponse({ status: 200, description: 'Trending agencies list.' })
  async getTrendingAgencies(@Query() dto: TrendingQueryDto) {
    return this.rankingsService.getTrendingAgencies(dto);
  }

  @Get('trending/hosts')
  @Public()
  @ApiOperation({ summary: 'Get trending hosts' })
  @ApiResponse({ status: 200, description: 'Trending hosts list.' })
  async getTrendingHosts(@Query() dto: TrendingQueryDto) {
    return this.rankingsService.getTrendingHosts(dto);
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
  @ApiOperation({ summary: 'Get rule-based recommended users to connect with' })
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
