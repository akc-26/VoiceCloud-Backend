import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ClubsService } from './clubs.service';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { JoinClubDto } from './dto/join-club.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { QueryClubDto } from './dto/query-club.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Clubs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new club' })
  @ApiResponse({ status: 201, description: 'Club successfully created.' })
  @ApiResponse({ status: 409, description: 'Club handle already taken.' })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() createClubDto: CreateClubDto,
  ) {
    return this.clubsService.createClub(userId, createClubDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get paginated list of clubs' })
  @ApiResponse({ status: 200, description: 'Clubs retrieved successfully.' })
  async findAll(@Query() queryDto: QueryClubDto) {
    return this.clubsService.findAll(queryDto);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get club details by ID or handle' })
  @ApiResponse({ status: 200, description: 'Club retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Club not found.' })
  async findOne(@Param('id') id: string) {
    return this.clubsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update club details' })
  @ApiResponse({ status: 200, description: 'Club updated successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Owner or Admin access required.' })
  async update(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() updateClubDto: UpdateClubDto,
  ) {
    return this.clubsService.updateClub(id, userId, updateClubDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a club' })
  @ApiResponse({ status: 200, description: 'Club deleted successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Owner access required.' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.clubsService.deleteClub(id, userId);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a club' })
  @ApiResponse({ status: 201, description: 'Joined club successfully.' })
  @ApiResponse({ status: 409, description: 'Already a member of this club.' })
  async join(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() joinDto: JoinClubDto,
  ) {
    return this.clubsService.joinClub(id, userId, joinDto);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave a club' })
  @ApiResponse({ status: 200, description: 'Left club successfully.' })
  @ApiResponse({ status: 400, description: 'Club owner cannot leave without transferring or deleting.' })
  async leave(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.clubsService.leaveClub(id, userId);
  }

  @Get(':id/members')
  @Public()
  @ApiOperation({ summary: 'Get list of club members' })
  @ApiResponse({ status: 200, description: 'Members retrieved successfully.' })
  async getMembers(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.clubsService.getMembers(id, page, limit, search);
  }

  @Patch(':id/members/:userId')
  @ApiOperation({ summary: 'Update member role in a club' })
  @ApiResponse({ status: 200, description: 'Member role updated successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Owner or Admin required.' })
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('userId') callerUserId: string,
    @Body() updateRoleDto: UpdateMemberRoleDto,
  ) {
    return this.clubsService.updateMemberRole(id, targetUserId, callerUserId, updateRoleDto);
  }
}
