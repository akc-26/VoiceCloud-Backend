import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
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
} from '@nestjs/swagger';
import { RtcService } from './rtc.service';
import { RtcQualityService } from './rtc-quality.service';
import { ReportRtcMetricsDto } from './dto/report-rtc-metrics.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateRtcConfigDto } from './dto/update-rtc-config.dto';
import { GenerateTokenDto } from './dto/generate-token.dto';
import { StartSessionDto, StopSessionDto } from './dto/session-actions.dto';
import {
  RaiseHandDto,
  SpeakerActionDto,
  RtcMuteUserDto,
  LockSeatDto,
  AudioProfileDto,
} from './dto/speaking-controls.dto';
import {
  StartRecordingDto,
  QueryRtcSessionsDto,
} from './dto/recording-and-query.dto';
import {
  JoinRoomDto,
  LeaveRoomDto,
  RejoinRoomDto,
  ForceDisconnectDto,
  RefreshRtcTokenDto,
  SpeakingStateDto,
} from './dto/join-leave-room.dto';
import {
  PauseRecordingDto,
  ResumeRecordingDto,
} from './dto/recording-actions.dto';

@ApiTags('RTC Infrastructure & Real-Time Audio')
@Controller('rtc')
export class RtcController {
  constructor(
    private readonly rtcService: RtcService,
    private readonly rtcQualityService: RtcQualityService,
  ) {}

  // 1. RTC Configuration
  @Get('config')
  @ApiOperation({ summary: 'Get active RTC configuration settings' })
  @ApiResponse({ status: 200, description: 'Active RTC configuration' })
  async getRtcConfig() {
    return this.rtcService.getRtcConfig();
  }

  @Patch('config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update active RTC configuration settings' })
  @ApiResponse({ status: 200, description: 'RTC configuration updated' })
  async updateRtcConfig(@Body() dto: UpdateRtcConfigDto) {
    return this.rtcService.updateRtcConfig(dto);
  }

  // 2. Token Generation
  @Post('token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate secure RTC token for channel joining' })
  @ApiResponse({ status: 201, description: 'RTC token generated successfully' })
  async generateToken(
    @CurrentUser('userId') userId: string,
    @Body() dto: GenerateTokenDto,
  ) {
    return this.rtcService.generateToken(userId, dto);
  }

  // 3. Voice Session Management
  @Post('sessions/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start a voice session for a room' })
  @ApiResponse({ status: 201, description: 'Voice session started' })
  async startVoiceSession(
    @CurrentUser('userId') userId: string,
    @Body() dto: StartSessionDto,
  ) {
    return this.rtcService.startVoiceSession(userId, dto);
  }

  @Post('sessions/stop')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stop an active voice session' })
  @ApiResponse({ status: 200, description: 'Voice session stopped' })
  async stopVoiceSession(
    @CurrentUser('userId') userId: string,
    @Body() dto: StopSessionDto,
  ) {
    return this.rtcService.stopVoiceSession(userId, dto.sessionId);
  }

  @Get('sessions/active')
  @ApiOperation({ summary: 'Get list of active voice sessions' })
  @ApiResponse({ status: 200, description: 'List of active voice sessions' })
  async getActiveSessions(@Query() query: QueryRtcSessionsDto) {
    return this.rtcService.getActiveSessions(query);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get voice session details and speaker history' })
  @ApiParam({ name: 'sessionId', description: 'Voice session ID' })
  @ApiResponse({ status: 200, description: 'Voice session details' })
  async getSessionDetails(@Param('sessionId') sessionId: string) {
    return this.rtcService.getSessionDetails(sessionId);
  }

  // 4. Speaking Controls
  @Post('rooms/:roomId/raise-hand')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Raise hand to request speaking stage seat' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Hand raised successfully' })
  async raiseHand(
    @CurrentUser('userId') userId: string,
    @Param('roomId') roomId: string,
    @Body() dto: RaiseHandDto,
  ) {
    return this.rtcService.raiseHand(userId, roomId, dto);
  }

  @Post('rooms/:roomId/cancel-raise-hand')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel hand raise request' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Hand raise cancelled' })
  async cancelRaiseHand(
    @CurrentUser('userId') userId: string,
    @Param('roomId') roomId: string,
  ) {
    return this.rtcService.cancelRaiseHand(userId, roomId);
  }

  @Post('rooms/:roomId/approve-speaker')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve user request to become speaker' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Speaker request approved' })
  async approveSpeaker(
    @CurrentUser('userId') hostId: string,
    @Param('roomId') roomId: string,
    @Body() dto: SpeakerActionDto,
  ) {
    return this.rtcService.approveSpeaker(hostId, roomId, dto);
  }

  @Post('rooms/:roomId/reject-speaker')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject user request to become speaker' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Speaker request rejected' })
  async rejectSpeaker(
    @CurrentUser('userId') hostId: string,
    @Param('roomId') roomId: string,
    @Body() dto: SpeakerActionDto,
  ) {
    return this.rtcService.rejectSpeaker(hostId, roomId, dto);
  }

  @Post('rooms/:roomId/invite-speaker')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invite user directly to speaking stage' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'User invited to stage' })
  async inviteSpeaker(
    @CurrentUser('userId') hostId: string,
    @Param('roomId') roomId: string,
    @Body() dto: SpeakerActionDto,
  ) {
    return this.rtcService.inviteSpeaker(hostId, roomId, dto);
  }

  @Post('rooms/:roomId/remove-speaker')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove speaker from stage back to audience' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Speaker removed from stage' })
  async removeSpeaker(
    @CurrentUser('userId') hostId: string,
    @Param('roomId') roomId: string,
    @Body() dto: SpeakerActionDto,
  ) {
    return this.rtcService.removeSpeaker(hostId, roomId, dto);
  }

  @Post('rooms/:roomId/mute-user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mute or unmute speaker microphone' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Microphone mute status updated' })
  async muteUser(
    @CurrentUser('userId') hostId: string,
    @Param('roomId') roomId: string,
    @Body() dto: RtcMuteUserDto,
  ) {
    return this.rtcService.muteUser(hostId, roomId, dto);
  }

  @Post('rooms/:roomId/lock-seat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lock or unlock stage seat' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Seat lock status updated' })
  async lockSeat(
    @CurrentUser('userId') hostId: string,
    @Param('roomId') roomId: string,
    @Body() dto: LockSeatDto,
  ) {
    return this.rtcService.lockSeat(hostId, roomId, dto);
  }

  @Patch('rooms/:roomId/audio-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update room audio quality profile' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Audio profile updated' })
  async updateAudioProfile(
    @CurrentUser('userId') hostId: string,
    @Param('roomId') roomId: string,
    @Body() dto: AudioProfileDto,
  ) {
    return this.rtcService.updateAudioProfile(hostId, roomId, dto);
  }

  // 5. Webhooks
  @Post('webhooks/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'RTC provider webhook callback endpoint' })
  @ApiParam({
    name: 'provider',
    description: 'Provider name (agora, livekit, zegocloud)',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhook(
    @Param('provider') provider: string,
    @Headers() headers: Record<string, string>,
    @Body() body: unknown,
  ) {
    return this.rtcService.handleWebhook(provider, headers, body);
  }

  // 6. Recording Infrastructure
  @Post('recordings/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start cloud recording job for voice session' })
  @ApiResponse({ status: 201, description: 'Recording job created' })
  async startRecording(
    @CurrentUser('userId') userId: string,
    @Body() dto: StartRecordingDto,
  ) {
    return this.rtcService.startRecording(userId, dto);
  }

  @Post('recordings/:jobId/stop')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stop recording job' })
  @ApiParam({ name: 'jobId', description: 'Recording Job ID' })
  @ApiResponse({ status: 200, description: 'Recording job stopped' })
  async stopRecording(
    @CurrentUser('userId') userId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.rtcService.stopRecording(userId, jobId);
  }

  @Get('recordings')
  @ApiOperation({ summary: 'List recording jobs' })
  @ApiResponse({ status: 200, description: 'List of recording jobs' })
  async getRecordingJobs(@Query('roomId') roomId?: string) {
    return this.rtcService.getRecordingJobs(roomId);
  }

  // 7. Analytics
  @Get('analytics/room/:roomId')
  @ApiOperation({ summary: 'Get RTC voice analytics for a room' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'RTC room analytics' })
  async getRoomAnalytics(@Param('roomId') roomId: string) {
    return this.rtcService.getRoomAnalytics(roomId);
  }

  // 8. WebRTC Quality Monitoring
  @Post('metrics/report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Report WebRTC connection metrics (bitrate, packet loss, jitter, RTT)',
  })
  @ApiResponse({ status: 201, description: 'WebRTC quality metric recorded' })
  async reportMetrics(
    @CurrentUser('userId') userId: string,
    @Body() dto: ReportRtcMetricsDto,
  ) {
    return this.rtcQualityService.reportMetrics(userId, dto);
  }

  @Get('rooms/:roomId/quality-metrics')
  @ApiOperation({
    summary:
      'Get aggregated room WebRTC quality metrics and adaptive recommendations',
  })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Room quality metrics summary' })
  async getRoomQualityMetrics(@Param('roomId') roomId: string) {
    return this.rtcQualityService.getRoomQualityMetrics(roomId);
  }

  @Get('rooms/:roomId/participants/:userId/quality')
  @ApiOperation({
    summary: 'Get network score and quality metric for a specific participant',
  })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Participant quality details' })
  async getParticipantQuality(
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
  ) {
    return this.rtcQualityService.getParticipantQuality(roomId, userId);
  }

  // 9. Token refresh & pipeline endpoints
  @Post('token/refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh active RTC token' })
  @ApiResponse({ status: 200, description: 'Refreshed RTC token' })
  async refreshToken(
    @CurrentUser('userId') userId: string,
    @Body() dto: RefreshRtcTokenDto,
  ) {
    return this.rtcService.refreshToken(userId, dto);
  }

  @Post('rooms/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join RTC room and acquire presence & token' })
  @ApiResponse({ status: 201, description: 'Joined room successfully' })
  async joinRoom(
    @CurrentUser('userId') userId: string,
    @Body() dto: JoinRoomDto,
  ) {
    return this.rtcService.joinRoom(userId, dto);
  }

  @Post('rooms/leave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Leave RTC room and clear presence' })
  @ApiResponse({ status: 200, description: 'Left room successfully' })
  async leaveRoom(
    @CurrentUser('userId') userId: string,
    @Body() dto: LeaveRoomDto,
  ) {
    return this.rtcService.leaveRoom(userId, dto);
  }

  @Post('rooms/rejoin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rejoin RTC room after network recovery' })
  @ApiResponse({ status: 200, description: 'Rejoined room successfully' })
  async rejoinRoom(
    @CurrentUser('userId') userId: string,
    @Body() dto: RejoinRoomDto,
  ) {
    return this.rtcService.rejoinRoom(userId, dto);
  }

  @Post('rooms/force-disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Force disconnect participant from RTC channel' })
  @ApiResponse({ status: 200, description: 'Participant force disconnected' })
  async forceDisconnectParticipant(
    @CurrentUser('userId') hostId: string,
    @Body() dto: ForceDisconnectDto,
  ) {
    return this.rtcService.forceDisconnectParticipant(hostId, dto);
  }

  @Get('rooms/:roomId/participants')
  @ApiOperation({
    summary: 'Get current RTC room active participants and presence state',
  })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiResponse({
    status: 200,
    description: 'List of participants and presence',
  })
  async getRoomParticipants(@Param('roomId') roomId: string) {
    return this.rtcService.getRoomParticipants(roomId);
  }

  @Post('speaking-state')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report voice activity / active speaking status' })
  @ApiResponse({ status: 200, description: 'Speaking status updated' })
  async reportSpeakingState(
    @CurrentUser('userId') userId: string,
    @Body() dto: SpeakingStateDto,
  ) {
    return this.rtcService.reportSpeakingState(userId, dto);
  }

  @Post('recordings/pause')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pause ongoing cloud recording' })
  @ApiResponse({ status: 200, description: 'Recording job paused' })
  async pauseRecording(
    @CurrentUser('userId') userId: string,
    @Body() dto: PauseRecordingDto,
  ) {
    return this.rtcService.pauseRecording(userId, dto);
  }

  @Post('recordings/resume')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resume paused cloud recording' })
  @ApiResponse({ status: 200, description: 'Recording job resumed' })
  async resumeRecording(
    @CurrentUser('userId') userId: string,
    @Body() dto: ResumeRecordingDto,
  ) {
    return this.rtcService.resumeRecording(userId, dto);
  }

  @Get('admin/monitoring')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get enterprise RTC live monitoring statistics' })
  @ApiResponse({ status: 200, description: 'RTC monitoring statistics' })
  async getAdminMonitoringStats() {
    return this.rtcService.getAdminMonitoringStats();
  }
}
