import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchUsersQueryDto } from './dto/search-users-query.dto';
import { SearchRoomsQueryDto } from './dto/search-rooms-query.dto';
import { SearchHostsQueryDto } from './dto/search-hosts-query.dto';
import { SearchAgenciesQueryDto } from './dto/search-agencies-query.dto';
import { SearchGiftsQueryDto } from './dto/search-gifts-query.dto';
import { SearchAnnouncementsQueryDto } from './dto/search-announcements-query.dto';
import { CreateSearchHistoryDto } from './dto/create-search-history.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Search & History')
@Controller('search')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary:
      'Global Unified Search across Users, Rooms, Hosts, Agencies, Gifts, Announcements',
  })
  @ApiResponse({
    status: 200,
    description: 'Unified search results categorized by entity type.',
  })
  async globalSearch(@Query() dto: SearchQueryDto) {
    return this.searchService.globalSearch(dto);
  }

  @Get('users')
  @Public()
  @ApiOperation({
    summary: 'Search Users with filters, prefix, and pagination',
  })
  @ApiResponse({ status: 200, description: 'User search results.' })
  async searchUsers(@Query() dto: SearchUsersQueryDto) {
    return this.searchService.searchUsers(dto);
  }

  @Get('rooms')
  @Public()
  @ApiOperation({
    summary: 'Search Rooms with filters, prefix, and pagination',
  })
  @ApiResponse({ status: 200, description: 'Room search results.' })
  async searchRooms(@Query() dto: SearchRoomsQueryDto) {
    return this.searchService.searchRooms(dto);
  }

  @Get('hosts')
  @Public()
  @ApiOperation({ summary: 'Search Hosts with status filter and pagination' })
  @ApiResponse({ status: 200, description: 'Host search results.' })
  async searchHosts(@Query() dto: SearchHostsQueryDto) {
    return this.searchService.searchHosts(dto);
  }

  @Get('agencies')
  @Public()
  @ApiOperation({
    summary: 'Search Agencies with status filter and pagination',
  })
  @ApiResponse({ status: 200, description: 'Agency search results.' })
  async searchAgencies(@Query() dto: SearchAgenciesQueryDto) {
    return this.searchService.searchAgencies(dto);
  }

  @Get('gifts')
  @Public()
  @ApiOperation({
    summary: 'Search Gift catalog with price and category filters',
  })
  @ApiResponse({ status: 200, description: 'Gift search results.' })
  async searchGifts(@Query() dto: SearchGiftsQueryDto) {
    return this.searchService.searchGifts(dto);
  }

  @Get('announcements')
  @Public()
  @ApiOperation({ summary: 'Search Announcements by keyword and audience' })
  @ApiResponse({ status: 200, description: 'Announcement search results.' })
  async searchAnnouncements(@Query() dto: SearchAnnouncementsQueryDto) {
    return this.searchService.searchAnnouncements(dto);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get recent search history for the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'User search history list.' })
  async getSearchHistory(@CurrentUser('userId') userId: string) {
    return this.searchService.getSearchHistory(userId);
  }

  @Post('history')
  @ApiOperation({ summary: 'Record a new search query to user search history' })
  @ApiResponse({ status: 201, description: 'Search history recorded.' })
  async addSearchHistory(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateSearchHistoryDto,
  ) {
    return this.searchService.addSearchHistory(userId, dto);
  }

  @Delete('history')
  @ApiOperation({ summary: 'Clear search history for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Search history cleared.' })
  async clearSearchHistory(@CurrentUser('userId') userId: string) {
    return this.searchService.clearSearchHistory(userId);
  }

  @Get('suggestions')
  @Public()
  @ApiOperation({ summary: 'Get autocomplete search suggestions' })
  @ApiQuery({ name: 'q', required: false, description: 'Partial query' })
  @ApiResponse({ status: 200, description: 'Search suggestions.' })
  async getSuggestions(@Query('q') q: string) {
    return this.searchService.getSuggestions(q);
  }
}
