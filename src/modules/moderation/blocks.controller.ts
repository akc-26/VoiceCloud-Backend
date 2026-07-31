import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ModerationService } from './moderation.service';
import { BlockUserDto } from './dto/block-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('User Blocking')
@Controller('blocks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BlocksController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post()
  @ApiOperation({ summary: 'Block a user' })
  @ApiResponse({ status: 201, description: 'User blocked successfully.' })
  async blockUser(
    @CurrentUser('userId') blockerId: string,
    @Body() dto: BlockUserDto,
  ) {
    return this.moderationService.blockUser(blockerId, dto);
  }

  @Post(':targetUserId')
  @ApiOperation({ summary: 'Block a user by target user ID in URL' })
  @ApiParam({ name: 'targetUserId', description: 'Target user ID to block' })
  @ApiResponse({ status: 201, description: 'User blocked successfully.' })
  async blockUserByParam(
    @CurrentUser('userId') blockerId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.moderationService.blockUser(blockerId, { targetUserId });
  }

  @Delete(':targetUserId')
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiParam({ name: 'targetUserId', description: 'Target user ID to unblock' })
  @ApiResponse({ status: 200, description: 'User unblocked successfully.' })
  async unblockUser(
    @CurrentUser('userId') blockerId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.moderationService.unblockUser(blockerId, targetUserId);
  }

  @Get()
  @ApiOperation({ summary: 'List all users blocked by current user' })
  @ApiResponse({ status: 200, description: 'List of blocked users retrieved.' })
  async listBlockedUsers(@CurrentUser('userId') blockerId: string) {
    return this.moderationService.listBlockedUsers(blockerId);
  }

  @Get('check/:targetUserId')
  @ApiOperation({
    summary: 'Check if block exists between current user and target user',
  })
  @ApiParam({ name: 'targetUserId', description: 'Target user ID to check' })
  @ApiResponse({ status: 200, description: 'Block status checked.' })
  async checkBlock(
    @CurrentUser('userId') userId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    const isBlocked = await this.moderationService.isBlocked(
      userId,
      targetUserId,
    );
    return { isBlocked };
  }
}
