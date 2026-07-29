import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FriendsService } from './friends.service';
import {
  SendFriendRequestDto,
  UpdateFriendCategoryDto,
  NearbyUsersQueryDto,
} from './dto/friend.dto';

@ApiTags('Friends & Social Network')
@Controller('users/friends')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('request')
  @ApiOperation({ summary: 'Send friend request to another user' })
  @ApiResponse({ status: 201, description: 'Friend request sent successfully' })
  async sendFriendRequest(
    @CurrentUser('userId') senderId: string,
    @Body() dto: SendFriendRequestDto,
  ) {
    return this.friendsService.sendFriendRequest(senderId, dto);
  }

  @Post('request/:id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept incoming friend request' })
  @ApiParam({ name: 'id', description: 'Friend request ID' })
  @ApiResponse({ status: 200, description: 'Friend request accepted' })
  async acceptFriendRequest(
    @CurrentUser('userId') userId: string,
    @Param('id') requestId: string,
  ) {
    return this.friendsService.acceptFriendRequest(userId, requestId);
  }

  @Post('request/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject incoming friend request' })
  @ApiParam({ name: 'id', description: 'Friend request ID' })
  @ApiResponse({ status: 200, description: 'Friend request rejected' })
  async rejectFriendRequest(
    @CurrentUser('userId') userId: string,
    @Param('id') requestId: string,
  ) {
    return this.friendsService.rejectFriendRequest(userId, requestId);
  }

  @Delete('request/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel sent friend request' })
  @ApiParam({ name: 'id', description: 'Friend request ID' })
  @ApiResponse({ status: 200, description: 'Friend request cancelled' })
  async cancelFriendRequest(
    @CurrentUser('userId') userId: string,
    @Param('id') requestId: string,
  ) {
    return this.friendsService.cancelFriendRequest(userId, requestId);
  }

  @Get('requests/pending')
  @ApiOperation({
    summary: 'Get all pending incoming and outgoing friend requests',
  })
  @ApiResponse({ status: 200, description: 'Pending requests retrieved' })
  async getPendingRequests(@CurrentUser('userId') userId: string) {
    return this.friendsService.getPendingRequests(userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get current user’s friends list' })
  @ApiQuery({ name: 'category', required: false, example: 'friends' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Friends list retrieved' })
  async getFriendsList(
    @CurrentUser('userId') userId: string,
    @Query('category') category?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.friendsService.getFriendsList(userId, category, +page, +limit);
  }

  @Put(':friendId/category')
  @ApiOperation({ summary: 'Update friend category tag or custom alias' })
  @ApiParam({ name: 'friendId', description: 'Friend user ID' })
  @ApiResponse({ status: 200, description: 'Friend category/alias updated' })
  async updateFriendCategory(
    @CurrentUser('userId') userId: string,
    @Param('friendId') friendId: string,
    @Body() dto: UpdateFriendCategoryDto,
  ) {
    return this.friendsService.updateFriendCategory(userId, friendId, dto);
  }

  @Delete(':friendId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove user from friends list' })
  @ApiParam({ name: 'friendId', description: 'Friend user ID' })
  @ApiResponse({ status: 200, description: 'Friend removed' })
  async removeFriend(
    @CurrentUser('userId') userId: string,
    @Param('friendId') friendId: string,
  ) {
    return this.friendsService.removeFriend(userId, friendId);
  }

  @Get('mutual/:targetUserId')
  @ApiOperation({ summary: 'Get mutual friends with another user' })
  @ApiParam({ name: 'targetUserId', description: 'Target user ID' })
  @ApiResponse({ status: 200, description: 'Mutual friends list retrieved' })
  async getMutualFriends(
    @CurrentUser('userId') userId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.friendsService.getMutualFriends(userId, targetUserId);
  }

  @Get('suggested')
  @ApiOperation({ summary: 'Get smart friend recommendations' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Suggested friends retrieved' })
  async getSuggestedFriends(
    @CurrentUser('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.friendsService.getSuggestedFriends(userId, +page, +limit);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Discover nearby or location-matched users' })
  @ApiResponse({ status: 200, description: 'Nearby users list retrieved' })
  async getNearbyUsers(
    @CurrentUser('userId') userId: string,
    @Query() dto: NearbyUsersQueryDto,
  ) {
    return this.friendsService.getNearbyUsers(userId, dto);
  }
}
