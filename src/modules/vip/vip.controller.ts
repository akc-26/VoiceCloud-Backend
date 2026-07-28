import {
  Controller,
  Get,
  Post,
  Put,
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
} from '@nestjs/swagger';
import { VipService } from './vip.service';
import { CreateVipPlanDto } from './dto/create-vip-plan.dto';
import { UpdateVipPlanDto } from './dto/update-vip-plan.dto';
import { PurchaseVipDto } from './dto/purchase-vip.dto';
import { RenewVipDto } from './dto/renew-vip.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('VIP Membership')
@Controller('vip')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VipController {
  constructor(private readonly vipService: VipService) {}

  @Get('plans')
  @ApiOperation({ summary: 'List available active VIP plans' })
  @ApiResponse({
    status: 200,
    description: 'VIP plans retrieved successfully.',
  })
  async getPlans() {
    return this.vipService.findAllPlans(false);
  }

  @Get('membership')
  @ApiOperation({ summary: 'Get current user VIP membership status' })
  @ApiResponse({ status: 200, description: 'Current membership retrieved.' })
  async getCurrentMembership(@CurrentUser('userId') userId: string) {
    return this.vipService.getCurrentMembership(userId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user VIP purchase and renewal history' })
  @ApiResponse({ status: 200, description: 'VIP purchase history retrieved.' })
  async getHistory(@CurrentUser('userId') userId: string) {
    return this.vipService.getMembershipHistory(userId);
  }

  @Post('purchase')
  @ApiOperation({ summary: 'Purchase a VIP plan' })
  @ApiResponse({ status: 201, description: 'VIP plan purchased successfully.' })
  async purchaseVip(
    @CurrentUser('userId') userId: string,
    @Body() dto: PurchaseVipDto,
  ) {
    return this.vipService.purchaseVip(userId, dto);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel current VIP subscription auto-renewal' })
  @ApiResponse({ status: 200, description: 'VIP plan cancelled successfully.' })
  async cancelVip(@CurrentUser('userId') userId: string) {
    return this.vipService.cancelVip(userId);
  }

  @Post('renew')
  @ApiOperation({ summary: 'Renew existing VIP membership' })
  @ApiResponse({ status: 200, description: 'VIP plan renewed successfully.' })
  async renewVip(
    @CurrentUser('userId') userId: string,
    @Body() dto: RenewVipDto,
  ) {
    return this.vipService.renewVip(userId, dto);
  }

  // Admin Endpoints
  @Post('admin/plans')
  @ApiOperation({ summary: 'Admin: Create a new VIP plan' })
  @ApiResponse({ status: 201, description: 'VIP plan created.' })
  async createPlan(@Body() dto: CreateVipPlanDto) {
    return this.vipService.createPlan(dto);
  }

  @Get('admin/plans')
  @ApiOperation({ summary: 'Admin: List all VIP plans including inactive' })
  @ApiResponse({ status: 200, description: 'All VIP plans retrieved.' })
  async getAllPlansAdmin() {
    return this.vipService.findAllPlans(true);
  }

  @Put('admin/plans/:id')
  @ApiOperation({ summary: 'Admin: Update an existing VIP plan' })
  @ApiResponse({ status: 200, description: 'VIP plan updated.' })
  async updatePlan(@Param('id') id: string, @Body() dto: UpdateVipPlanDto) {
    return this.vipService.updatePlan(id, dto);
  }

  @Delete('admin/plans/:id')
  @ApiOperation({ summary: 'Admin: Delete a VIP plan' })
  @ApiResponse({ status: 200, description: 'VIP plan deleted.' })
  async deletePlan(@Param('id') id: string) {
    return this.vipService.deletePlan(id);
  }
}
