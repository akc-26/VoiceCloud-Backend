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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CreatorService } from './creator.service';
import { CreateCreatorPlanDto } from './dto/create-creator-plan.dto';
import { UpdateCreatorPlanDto } from './dto/update-creator-plan.dto';
import { SubscribeCreatorDto } from './dto/subscribe-creator.dto';
import { CreatePayoutRequestDto } from './dto/create-payout-request.dto';
import { CreatorQueryDto } from './dto/creator-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Creator Economy')
@Controller('creator')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CreatorController {
  constructor(private readonly creatorService: CreatorService) {}

  // Creator Dashboard
  @Get('dashboard')
  @ApiOperation({ summary: 'Get creator overview dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard stats retrieved successfully',
  })
  async getDashboard(@CurrentUser('userId') userId: string) {
    return this.creatorService.getCreatorDashboard(userId);
  }

  // Creator Plans Management
  @Post('plans')
  @ApiOperation({ summary: 'Create a new subscription plan' })
  @ApiResponse({
    status: 201,
    description: 'Creator plan created successfully',
  })
  async createPlan(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateCreatorPlanDto,
  ) {
    return this.creatorService.createPlan(userId, dto);
  }

  @Get('plans')
  @ApiOperation({
    summary: 'List subscription plans owned by authenticated creator',
  })
  @ApiResponse({
    status: 200,
    description: 'Creator plans retrieved successfully',
  })
  async getMyPlans(
    @CurrentUser('userId') userId: string,
    @Query() query: CreatorQueryDto,
  ) {
    return this.creatorService.getCreatorPlans(userId, query);
  }

  @Public()
  @Get('plans/:creatorId')
  @ApiOperation({
    summary: 'Get active public subscription plans for a creator',
  })
  @ApiParam({ name: 'creatorId', description: 'Creator user UUID' })
  @ApiResponse({
    status: 200,
    description: 'Public plans retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async getPublicPlans(@Param('creatorId') creatorId: string) {
    return this.creatorService.getPublicCreatorPlans(creatorId);
  }

  @Patch('plans/:id')
  @ApiOperation({ summary: 'Update an existing creator subscription plan' })
  @ApiParam({ name: 'id', description: 'Plan UUID' })
  @ApiResponse({ status: 200, description: 'Plan updated successfully' })
  @ApiResponse({ status: 403, description: 'Unauthorized to edit this plan' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async updatePlan(
    @CurrentUser('userId') userId: string,
    @Param('id') planId: string,
    @Body() dto: UpdateCreatorPlanDto,
  ) {
    return this.creatorService.updatePlan(userId, planId, dto);
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: 'Archive/Deactivate a creator subscription plan' })
  @ApiParam({ name: 'id', description: 'Plan UUID' })
  @ApiResponse({ status: 200, description: 'Plan archived successfully' })
  @ApiResponse({
    status: 403,
    description: 'Unauthorized to archive this plan',
  })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async deletePlan(
    @CurrentUser('userId') userId: string,
    @Param('id') planId: string,
  ) {
    return this.creatorService.deletePlan(userId, planId);
  }

  // Creator Subscriptions
  @Post('subscribe/:creatorId')
  @ApiOperation({
    summary: 'Subscribe to a creator plan (Records subscription intent)',
  })
  @ApiParam({ name: 'creatorId', description: 'Target creator UUID' })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid plan or self-subscription attempt',
  })
  @ApiResponse({
    status: 409,
    description: 'Already actively subscribed to plan',
  })
  async subscribe(
    @CurrentUser('userId') userId: string,
    @Param('creatorId') creatorId: string,
    @Body() dto: SubscribeCreatorDto,
  ) {
    return this.creatorService.subscribeToCreator(userId, creatorId, dto);
  }

  @Get('my-subscriptions')
  @ApiOperation({
    summary: 'Get active subscriptions of the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User subscriptions retrieved successfully',
  })
  async getMySubscriptions(
    @CurrentUser('userId') userId: string,
    @Query() query: CreatorQueryDto,
  ) {
    return this.creatorService.getUserSubscriptions(userId, query);
  }

  @Get('subscribers')
  @ApiOperation({
    summary: 'Get active subscribers for the authenticated creator',
  })
  @ApiResponse({
    status: 200,
    description: 'Creator subscribers retrieved successfully',
  })
  async getSubscribers(
    @CurrentUser('userId') userId: string,
    @Query() query: CreatorQueryDto,
  ) {
    return this.creatorService.getCreatorSubscribers(userId, query);
  }

  // Earnings Analytics
  @Get('earnings')
  @ApiOperation({
    summary: 'Get creator earnings and subscription metrics (read-only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Earnings metrics retrieved successfully',
  })
  async getEarnings(@CurrentUser('userId') userId: string) {
    return this.creatorService.getEarningsOverview(userId);
  }

  // Payout Requests
  @Post('payout-request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a new creator payout request' })
  @ApiResponse({
    status: 201,
    description: 'Payout request submitted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Insufficient balance or below threshold',
  })
  @ApiResponse({
    status: 409,
    description: 'Existing pending request in progress',
  })
  async submitPayoutRequest(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePayoutRequestDto,
  ) {
    return this.creatorService.submitPayoutRequest(userId, dto);
  }

  @Get('payout-requests')
  @ApiOperation({ summary: 'List payout requests for authenticated creator' })
  @ApiResponse({
    status: 200,
    description: 'Payout requests retrieved successfully',
  })
  async getPayoutRequests(
    @CurrentUser('userId') userId: string,
    @Query() query: CreatorQueryDto,
  ) {
    return this.creatorService.getCreatorPayoutRequests(userId, query);
  }

  @Get('payout-requests/:id')
  @ApiOperation({ summary: 'Get specific payout request details by ID' })
  @ApiParam({ name: 'id', description: 'Payout request UUID' })
  @ApiResponse({
    status: 200,
    description: 'Payout request details retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Unauthorized access to payout request',
  })
  @ApiResponse({ status: 404, description: 'Payout request not found' })
  async getPayoutRequestById(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.creatorService.getPayoutRequestById(userId, id);
  }
}
