import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service';
import { DiscoveryQueryDto } from './dto/discovery-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('User, Room & Host Discovery')
@Controller('discovery')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  // USER DISCOVERY
  @Get('users/trending')
  @Public()
  @ApiOperation({ summary: 'Get trending users' })
  @ApiResponse({ status: 200, description: 'Trending users list.' })
  async getTrendingUsers(@Query() dto: DiscoveryQueryDto) {
    return this.discoveryService.getTrendingUsers(dto);
  }

  @Get('users/popular')
  @Public()
  @ApiOperation({ summary: 'Get popular users' })
  @ApiResponse({ status: 200, description: 'Popular users list.' })
  async getPopularUsers(@Query() dto: DiscoveryQueryDto) {
    return this.discoveryService.getPopularUsers(dto);
  }

  @Get('users/recently-active')
  @Public()
  @ApiOperation({ summary: 'Get recently active users' })
  @ApiResponse({ status: 200, description: 'Recently active users list.' })
  async getRecentlyActiveUsers(@Query() dto: DiscoveryQueryDto) {
    return this.discoveryService.getRecentlyActiveUsers(dto);
  }

  @Get('users/online')
  @Public()
  @ApiOperation({ summary: 'Get currently online users' })
  @ApiResponse({ status: 200, description: 'Online users list.' })
  async getOnlineUsers(@Query() dto: DiscoveryQueryDto) {
    return this.discoveryService.getOnlineUsers(dto);
  }

  @Get('users/suggested')
  @Public()
  @ApiOperation({ summary: 'Get suggested users for discovery' })
  @ApiResponse({ status: 200, description: 'Suggested users list.' })
  async getSuggestedUsers(@Query() dto: DiscoveryQueryDto) {
    return this.discoveryService.getSuggestedUsers(dto);
  }

  @Get('users/new')
  @Public()
  @ApiOperation({ summary: 'Get newly registered users' })
  @ApiResponse({ status: 200, description: 'New users list.' })
  async getNewUsers(@Query() dto: DiscoveryQueryDto) {
    return this.discoveryService.getNewUsers(dto);
  }

  // ROOM DISCOVERY
  @Get('rooms/trending')
  @Public()
  @ApiOperation({
    summary:
      'Get trending rooms with metrics (listeners, speakers, gift activity)',
  })
  @ApiResponse({ status: 200, description: 'Trending rooms list.' })
  async getTrendingRooms(@Query() dto: DiscoveryQueryDto) {
    return this.discoveryService.getTrendingRooms(dto);
  }

  @Get('rooms/popular')
  @Public()
  @ApiOperation({ summary: 'Get popular voice rooms' })
  @ApiResponse({ status: 200, description: 'Popular rooms list.' })
  async getPopularRooms(@Query() dto: DiscoveryQueryDto) {
    return this.discoveryService.getPopularRooms(dto);
  }

  @Get('rooms/live')
  @Public()
  @ApiOperation({ summary: 'Get live rooms with public/locked filters' })
  @ApiResponse({ status: 200, description: 'Live rooms list.' })
  async getLiveRooms(@Query() dto: DiscoveryQueryDto) {
    return this.discoveryService.getLiveRooms(dto);
  }

  @Get('rooms/recent')
  @Public()
  @ApiOperation({ summary: 'Get recently created rooms' })
  @ApiResponse({ status: 200, description: 'Recently created rooms list.' })
  async getRecentRooms(@Query() dto: DiscoveryQueryDto) {
    return this.discoveryService.getRecentRooms(dto);
  }

  // HOST DISCOVERY
  @Get('hosts/verified')
  @Public()
  @ApiOperation({ summary: 'Get verified hosts' })
  @ApiResponse({ status: 200, description: 'Verified hosts list.' })
  async getVerifiedHosts(@Query() dto: DiscoveryQueryDto) {
    return this.discoveryService.getVerifiedHosts(dto);
  }

  @Get('hosts/trending')
  @Public()
  @ApiOperation({ summary: 'Get trending hosts' })
  @ApiResponse({ status: 200, description: 'Trending hosts list.' })
  async getTrendingHosts(@Query() dto: DiscoveryQueryDto) {
    return this.discoveryService.getTrendingHosts(dto);
  }

  @Get('hosts/top')
  @Public()
  @ApiOperation({ summary: 'Get top hosts with ratings and followers metrics' })
  @ApiResponse({ status: 200, description: 'Top hosts list.' })
  async getTopHosts(@Query() dto: DiscoveryQueryDto) {
    return this.discoveryService.getTopHosts(dto);
  }

  @Get('hosts/recently-active')
  @Public()
  @ApiOperation({ summary: 'Get recently active hosts' })
  @ApiResponse({ status: 200, description: 'Recently active hosts list.' })
  async getRecentlyActiveHosts(@Query() dto: DiscoveryQueryDto) {
    return this.discoveryService.getRecentlyActiveHosts(dto);
  }
}
