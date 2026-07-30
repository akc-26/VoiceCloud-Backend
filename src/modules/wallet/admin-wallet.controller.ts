import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Query,
  Param,
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
import { WalletService } from './wallet.service';
import { LedgerQueryDto } from './dto/ledger-query.dto';
import { CreditWalletDto } from './dto/credit-wallet.dto';
import { DebitWalletDto } from './dto/debit-wallet.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { CreatorSettlementDto } from './dto/creator-settlement.dto';
import {
  CreateCoinPackageDto,
  UpdateCoinPackageDto,
} from './dto/coin-package.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Admin Wallet')
@Controller('admin/wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminWalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('overview')
  @ApiOperation({
    summary:
      'Get overall wallet revenue, coin circulation and payment analytics',
  })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getOverview() {
    return this.walletService.getWalletAnalytics();
  }

  @Get('transactions')
  @ApiOperation({
    summary: 'Search and filter entire system transaction ledger',
  })
  @ApiResponse({ status: 200, description: 'Ledger retrieved successfully' })
  async getLedger(@Query() query: LedgerQueryDto) {
    return this.walletService.getLedger(query);
  }

  @Post('transactions/credit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin credit coins/diamonds to user wallet' })
  @ApiResponse({ status: 200, description: 'User credited successfully' })
  async creditWallet(
    @Body() dto: CreditWalletDto,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.walletService.creditWallet(dto, adminId);
  }

  @Post('transactions/debit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin debit coins/diamonds from user wallet' })
  @ApiResponse({ status: 200, description: 'User debited successfully' })
  async debitWallet(
    @Body() dto: DebitWalletDto,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.walletService.debitWallet(dto, adminId);
  }

  @Post('refunds')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Process admin refund with automatic balance rollback and reconciliation',
  })
  @ApiResponse({ status: 200, description: 'Refund processed successfully' })
  async processRefund(
    @Body() dto: ProcessRefundDto,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.walletService.processRefund(dto, adminId);
  }

  @Post('creator/settle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process creator revenue settlement' })
  @ApiResponse({ status: 200, description: 'Creator settlement processed' })
  async processCreatorSettlement(@Body() dto: CreatorSettlementDto) {
    return this.walletService.processCreatorSettlement(dto.creatorId, dto);
  }

  @Get('packages')
  @ApiOperation({ summary: 'Get all coin packages including inactive' })
  @ApiResponse({ status: 200, description: 'Coin packages retrieved' })
  async getPackages() {
    return this.walletService.getCoinPackages();
  }

  @Post('packages')
  @ApiOperation({ summary: 'Create new coin package' })
  @ApiResponse({ status: 201, description: 'Coin package created' })
  async createPackage(@Body() dto: CreateCoinPackageDto) {
    return this.walletService.createCoinPackage(dto);
  }

  @Put('packages/:id')
  @ApiOperation({ summary: 'Update existing coin package' })
  @ApiParam({ name: 'id', description: 'Coin Package UUID' })
  @ApiResponse({ status: 200, description: 'Coin package updated' })
  async updatePackage(
    @Param('id') id: string,
    @Body() dto: UpdateCoinPackageDto,
  ) {
    return this.walletService.updateCoinPackage(id, dto);
  }

  @Delete('packages/:id')
  @ApiOperation({ summary: 'Delete coin package' })
  @ApiParam({ name: 'id', description: 'Coin Package UUID' })
  @ApiResponse({ status: 200, description: 'Coin package deleted' })
  async deletePackage(@Param('id') id: string) {
    return this.walletService.deleteCoinPackage(id);
  }

  @Get('payment-providers')
  @ApiOperation({ summary: 'Get status of configured payment providers' })
  @ApiResponse({ status: 200, description: 'Payment providers retrieved' })
  async getPaymentProviders() {
    return this.walletService.getPaymentProviders();
  }

  @Patch('payment-providers/:id')
  @ApiOperation({ summary: 'Enable or disable a payment provider' })
  @ApiParam({ name: 'id', description: 'Provider UUID' })
  @ApiResponse({ status: 200, description: 'Payment provider updated' })
  async togglePaymentProvider(
    @Param('id') id: string,
    @Body('isEnabled') isEnabled: boolean,
  ) {
    return this.walletService.togglePaymentProvider(id, isEnabled);
  }

  @Get('payment-logs')
  @ApiOperation({ summary: 'Get payment validation and transaction logs' })
  @ApiResponse({ status: 200, description: 'Payment logs retrieved' })
  async getPaymentLogs() {
    return this.walletService.getPaymentLogs();
  }
}
