import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
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
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AgenciesService } from './agencies.service';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';
import { InviteAgencyMemberDto } from './dto/invite-agency-member.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Agency Management')
@Controller('agencies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new agency' })
  @ApiResponse({ status: 201, description: 'Agency created successfully.' })
  async createAgency(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateAgencyDto,
  ) {
    return this.agenciesService.createAgency(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all active agencies' })
  @ApiResponse({ status: 200, description: 'Agencies list retrieved.' })
  async findAll() {
    return this.agenciesService.findAllAgencies();
  }

  @Get('rankings')
  @ApiOperation({ summary: 'Get agency top rankings by revenue and members' })
  @ApiResponse({ status: 200, description: 'Agency rankings retrieved.' })
  async getRankings() {
    return this.agenciesService.getRankings();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agency details by ID' })
  @ApiResponse({ status: 200, description: 'Agency details retrieved.' })
  async findOne(@Param('id') id: string) {
    return this.agenciesService.findAgencyById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update agency information' })
  @ApiResponse({ status: 200, description: 'Agency updated successfully.' })
  async updateAgency(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateAgencyDto,
  ) {
    return this.agenciesService.updateAgency(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete agency' })
  @ApiResponse({ status: 200, description: 'Agency deleted.' })
  async deleteAgency(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.agenciesService.deleteAgency(id, userId);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join an agency' })
  @ApiResponse({ status: 201, description: 'Joined agency successfully.' })
  async joinAgency(
    @Param('id') agencyId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.agenciesService.joinAgency(agencyId, userId);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave an agency' })
  @ApiResponse({ status: 200, description: 'Left agency successfully.' })
  async leaveAgency(
    @Param('id') agencyId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.agenciesService.leaveAgency(agencyId, userId);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Invite a member to agency' })
  @ApiResponse({ status: 201, description: 'Invitation sent.' })
  async inviteMember(
    @Param('id') agencyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: InviteAgencyMemberDto,
  ) {
    return this.agenciesService.inviteMember(agencyId, userId, dto);
  }

  @Post('invitations/:id/accept')
  @ApiOperation({ summary: 'Accept agency invitation' })
  @ApiResponse({ status: 200, description: 'Invitation accepted.' })
  async acceptInvitation(
    @Param('id') invitationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.agenciesService.acceptInvitation(invitationId, userId);
  }

  @Post('invitations/:id/reject')
  @ApiOperation({ summary: 'Reject agency invitation' })
  @ApiResponse({ status: 200, description: 'Invitation rejected.' })
  async rejectInvitation(
    @Param('id') invitationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.agenciesService.rejectInvitation(invitationId, userId);
  }

  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Get agency dashboard overview' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved.' })
  async getDashboard(@Param('id') agencyId: string) {
    return this.agenciesService.getDashboard(agencyId);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get agency revenue and member statistics' })
  @ApiResponse({ status: 200, description: 'Agency statistics retrieved.' })
  async getStatistics(@Param('id') agencyId: string) {
    return this.agenciesService.getStatistics(agencyId);
  }

  @Post(':id/logo')
  @ApiOperation({ summary: 'Upload agency logo image' })
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
    description: 'Agency logo uploaded successfully.',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAgencyLogo(
    @Param('id') agencyId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.agenciesService.uploadAgencyLogo(agencyId, file, userId);
  }

  @Post(':id/banner')
  @ApiOperation({ summary: 'Upload agency banner image' })
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
    description: 'Agency banner uploaded successfully.',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAgencyBanner(
    @Param('id') agencyId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.agenciesService.uploadAgencyBanner(agencyId, file, userId);
  }
}
