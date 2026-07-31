import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { FollowsService } from './follows.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { QuerySocialDto } from './dto/query-social.dto';

@ApiTags('Social Relationships & Following')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SocialController {
  constructor(private readonly followsService: FollowsService) {}

  @Post(':userId/follow')
  @ApiOperation({ summary: 'Follow a user' })
  @ApiParam({ name: 'userId', description: 'User ID to follow' })
  @ApiResponse({ status: 201, description: 'Followed successfully' })
  async followUser(
    @CurrentUser('userId') currentUserId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.followsService.followUser(currentUserId, targetUserId);
  }

  @Delete(':userId/follow')
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiParam({ name: 'userId', description: 'User ID to unfollow' })
  @ApiResponse({ status: 200, description: 'Unfollowed successfully' })
  async unfollowUser(
    @CurrentUser('userId') currentUserId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.followsService.unfollowUser(currentUserId, targetUserId);
  }

  @Get('followers')
  @ApiOperation({ summary: 'Get followers of current user' })
  @ApiResponse({ status: 200, description: 'List of followers' })
  async getCurrentUserFollowers(
    @CurrentUser('userId') currentUserId: string,
    @Query() query: QuerySocialDto,
  ) {
    return this.followsService.getFollowers(currentUserId, query);
  }

  @Get('following')
  @ApiOperation({ summary: 'Get users followed by current user' })
  @ApiResponse({ status: 200, description: 'List of followed users' })
  async getCurrentUserFollowing(
    @CurrentUser('userId') currentUserId: string,
    @Query() query: QuerySocialDto,
  ) {
    return this.followsService.getFollowing(currentUserId, query);
  }

  @Get(':userId/followers')
  @ApiOperation({ summary: 'Get followers of a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'List of followers' })
  async getFollowers(
    @Param('userId') userId: string,
    @Query() query: QuerySocialDto,
  ) {
    return this.followsService.getFollowers(userId, query);
  }

  @Get(':userId/following')
  @ApiOperation({ summary: 'Get users followed by a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'List of followed users' })
  async getFollowing(
    @Param('userId') userId: string,
    @Query() query: QuerySocialDto,
  ) {
    return this.followsService.getFollowing(userId, query);
  }

  @Get(':userId/mutual-followers')
  @ApiOperation({ summary: 'Get mutual followers for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'List of mutual followers' })
  async getMutualFollowers(
    @Param('userId') userId: string,
    @Query() query: QuerySocialDto,
  ) {
    return this.followsService.getMutualFollowers(userId, query);
  }

  @Get('follow/stats')
  @ApiOperation({ summary: 'Get follow statistics for current user' })
  @ApiResponse({ status: 200, description: 'Current user follow stats' })
  async getCurrentUserFollowStats(
    @CurrentUser('userId') currentUserId: string,
  ) {
    return this.followsService.getFollowStats(currentUserId);
  }

  @Get(':userId/follow-stats')
  @ApiOperation({ summary: 'Get follow statistics for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Follow statistics' })
  async getFollowStats(@Param('userId') userId: string) {
    return this.followsService.getFollowStats(userId);
  }
}
