import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
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
  ApiQuery,
} from '@nestjs/swagger';
import { BookmarksService } from './bookmarks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { QuerySocialDto } from './dto/query-social.dto';

@ApiTags('User Bookmarks')
@Controller('users/bookmarks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Post()
  @ApiOperation({ summary: 'Create or update a bookmark for the authenticated user' })
  @ApiResponse({ status: 201, description: 'Bookmark created/updated successfully' })
  async createBookmark(
    @CurrentUser('userId') currentUserId: string,
    @Body() dto: CreateBookmarkDto,
  ) {
    return this.bookmarksService.createBookmark(currentUserId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated bookmarks for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of user bookmarks' })
  async getUserBookmarks(
    @CurrentUser('userId') currentUserId: string,
    @Query() query: QuerySocialDto,
  ) {
    return this.bookmarksService.getUserBookmarks(currentUserId, query);
  }

  @Get('check')
  @ApiOperation({ summary: 'Check if a specific target item is bookmarked' })
  @ApiQuery({ name: 'targetType', description: 'Item target type' })
  @ApiQuery({ name: 'targetId', description: 'Item target ID' })
  @ApiResponse({ status: 200, description: 'Bookmark status' })
  async checkIsBookmarked(
    @CurrentUser('userId') currentUserId: string,
    @Query('targetType') targetType: string,
    @Query('targetId') targetId: string,
  ) {
    return this.bookmarksService.checkIsBookmarked(
      currentUserId,
      targetType,
      targetId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a bookmark by bookmark ID or target ID' })
  @ApiParam({ name: 'id', description: 'Bookmark ID or Target ID' })
  @ApiResponse({ status: 200, description: 'Bookmark removed successfully' })
  async removeBookmark(
    @CurrentUser('userId') currentUserId: string,
    @Param('id') bookmarkIdOrTargetId: string,
  ) {
    return this.bookmarksService.removeBookmark(currentUserId, bookmarkIdOrTargetId);
  }
}
