import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { QueryAnnouncementDto } from './dto/query-announcement.dto';
import { AnnouncementTarget } from './entities/announcement.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Announcements')
@Controller('announcements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  @ApiOperation({ summary: 'Get active platform announcements for user' })
  @ApiQuery({
    name: 'targetAudience',
    enum: AnnouncementTarget,
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Active announcements retrieved.' })
  async getActiveAnnouncements(
    @Query('targetAudience') targetAudience?: AnnouncementTarget,
    @Query() query?: QueryAnnouncementDto,
  ) {
    return this.announcementsService.getActiveAnnouncements(
      targetAudience,
      query,
    );
  }

  @Get('admin')
  @ApiOperation({
    summary: 'Admin: List all announcements including inactive/expired',
  })
  @ApiResponse({ status: 200, description: 'All announcements retrieved.' })
  async getAllAnnouncementsAdmin(@Query() query: QueryAnnouncementDto) {
    return this.announcementsService.getAllAnnouncementsAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get announcement by ID' })
  @ApiParam({ name: 'id', description: 'Announcement ID' })
  @ApiResponse({ status: 200, description: 'Announcement detail retrieved.' })
  async getAnnouncementById(@Param('id') id: string) {
    return this.announcementsService.getAnnouncementById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Admin: Create a new platform announcement' })
  @ApiResponse({
    status: 201,
    description: 'Announcement created successfully.',
  })
  async createAnnouncement(
    @CurrentUser('userId') createdById: string,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.announcementsService.createAnnouncement(createdById, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Admin: Update an existing announcement' })
  @ApiParam({ name: 'id', description: 'Announcement ID' })
  @ApiResponse({ status: 200, description: 'Announcement updated.' })
  async updateAnnouncement(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.announcementsService.updateAnnouncement(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Admin: Delete an announcement' })
  @ApiParam({ name: 'id', description: 'Announcement ID' })
  @ApiResponse({ status: 200, description: 'Announcement deleted.' })
  async deleteAnnouncement(@Param('id') id: string) {
    return this.announcementsService.deleteAnnouncement(id);
  }

  @Post(':id/banner')
  @ApiOperation({ summary: 'Admin: Upload announcement banner image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Announcement banner uploaded successfully.',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadBanner(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.announcementsService.uploadBanner(id, file, userId);
  }

  @Post(':id/thumbnail')
  @ApiOperation({ summary: 'Admin: Upload announcement thumbnail image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Announcement thumbnail uploaded successfully.',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadThumbnail(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.announcementsService.uploadThumbnail(id, file, userId);
  }

  @Post(':id/attachment')
  @ApiOperation({ summary: 'Admin: Upload announcement attachment file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Announcement attachment uploaded successfully.',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.announcementsService.uploadAttachment(id, file, userId);
  }
}
