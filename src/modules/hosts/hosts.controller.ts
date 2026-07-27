import {
  Controller,
  Get,
  Post,
  Put,
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
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { HostsService } from './hosts.service';
import { ApplyHostDto } from './dto/apply-host.dto';
import { UpdateHostProfileDto } from './dto/update-host-profile.dto';
import { RejectHostDto } from './dto/reject-host.dto';
import { SearchHostsDto } from './dto/search-hosts.dto';
import { HostVerificationStatus } from './entities/host-profile.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Host Verification & Management')
@Controller('hosts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HostsController {
  constructor(private readonly hostsService: HostsService) {}

  @Post('apply')
  @ApiOperation({ summary: 'Apply for Host Verification' })
  @ApiResponse({
    status: 201,
    description: 'Application submitted successfully.',
  })
  async apply(
    @CurrentUser('userId') userId: string,
    @Body() dto: ApplyHostDto,
  ) {
    return this.hostsService.applyForVerification(userId, dto);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user host profile' })
  @ApiResponse({ status: 200, description: 'Host profile retrieved.' })
  async getMyProfile(@CurrentUser('userId') userId: string) {
    return this.hostsService.getHostProfile(userId);
  }

  @Get('profile/:userId')
  @ApiOperation({ summary: 'Get host profile by User ID' })
  @ApiResponse({ status: 200, description: 'Host profile retrieved.' })
  async getProfileByUserId(@Param('userId') targetUserId: string) {
    return this.hostsService.getHostProfile(targetUserId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update current host profile information' })
  @ApiResponse({ status: 200, description: 'Host profile updated.' })
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateHostProfileDto,
  ) {
    return this.hostsService.updateHostProfile(userId, dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search verified host profiles' })
  @ApiResponse({ status: 200, description: 'Matching hosts retrieved.' })
  async search(@Query() dto: SearchHostsDto) {
    return this.hostsService.searchHosts(dto);
  }

  // Admin Endpoints
  @Get('admin/applications')
  @ApiOperation({ summary: 'Admin: Get all host verification applications' })
  @ApiQuery({ name: 'status', enum: HostVerificationStatus, required: false })
  @ApiResponse({ status: 200, description: 'Applications list retrieved.' })
  async getApplications(@Query('status') status?: HostVerificationStatus) {
    return this.hostsService.getApplications(status);
  }

  @Post('admin/approve/:id')
  @ApiOperation({ summary: 'Admin: Approve host application' })
  @ApiResponse({ status: 200, description: 'Host application approved.' })
  async approveHost(@Param('id') id: string) {
    return this.hostsService.approveHost(id);
  }

  @Post('admin/reject/:id')
  @ApiOperation({ summary: 'Admin: Reject host application' })
  @ApiResponse({ status: 200, description: 'Host application rejected.' })
  async rejectHost(@Param('id') id: string, @Body() dto: RejectHostDto) {
    return this.hostsService.rejectHost(id, dto?.reason);
  }

  @Post('admin/suspend/:id')
  @ApiOperation({ summary: 'Admin: Suspend host status' })
  @ApiResponse({ status: 200, description: 'Host status suspended.' })
  async suspendHost(@Param('id') id: string) {
    return this.hostsService.suspendHost(id);
  }

  @Post('admin/reactivate/:id')
  @ApiOperation({ summary: 'Admin: Reactivate host status' })
  @ApiResponse({ status: 200, description: 'Host status reactivated.' })
  async reactivateHost(@Param('id') id: string) {
    return this.hostsService.reactivateHost(id);
  }

  @Post('verification/government-id')
  @ApiOperation({ summary: 'Upload government ID document for verification' })
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
    description: 'Government ID uploaded successfully.',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadGovernmentId(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.hostsService.uploadGovernmentId(userId, file);
  }

  @Post('verification/profile-photo')
  @ApiOperation({ summary: 'Upload verification profile selfie/photo' })
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
    description: 'Profile photo uploaded successfully.',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePhoto(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.hostsService.uploadProfilePhoto(userId, file);
  }

  @Post('verification/documents')
  @ApiOperation({ summary: 'Upload additional host verification documents' })
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
    description: 'Verification document uploaded successfully.',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadVerificationDocument(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.hostsService.uploadVerificationDocument(userId, file);
  }
}
