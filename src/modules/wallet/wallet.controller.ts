import {
  Controller,
  Get,
  Post,
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
  ApiQuery,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { PurchasePreviewDto } from './dto/purchase-preview.dto';
import { ConversionPreviewDto } from './dto/conversion-preview.dto';
import { WalletTransferDto } from './dto/wallet-transfer.dto';
import { PurchaseCoinsDto } from './dto/purchase-coins.dto';
import { ValidatePurchaseDto } from './dto/validate-purchase.dto';
import { ConvertDiamondsDto } from './dto/convert-diamonds.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get current user wallet balances and totals' })
  @ApiResponse({
    status: 200,
    description: 'Wallet balance retrieved successfully',
  })
  async getBalance(@CurrentUser('userId') userId: string) {
    return this.walletService.getWalletBalance(userId);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Get wallet summary overview, latest transaction and stats',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet summary retrieved successfully',
  })
  async getSummary(@CurrentUser('userId') userId: string) {
    return this.walletService.getWalletSummary(userId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get paginated user wallet transaction history' })
  @ApiResponse({
    status: 200,
    description: 'Transaction history retrieved successfully',
  })
  async getTransactions(
    @CurrentUser('userId') userId: string,
    @Query() query: TransactionQueryDto,
  ) {
    return this.walletService.getTransactionHistory(userId, query);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Alias: Get paginated user wallet transaction history',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction history retrieved successfully',
  })
  async getHistory(
    @CurrentUser('userId') userId: string,
    @Query() query: TransactionQueryDto,
  ) {
    return this.walletService.getTransactionHistory(userId, query);
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Get single wallet transaction details by ID' })
  @ApiParam({ name: 'id', description: 'Transaction UUID' })
  @ApiResponse({
    status: 200,
    description: 'Transaction details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransactionById(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.walletService.getTransactionById(userId, id);
  }

  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Transfer coins/diamonds to another user with audit logging',
  })
  @ApiResponse({ status: 200, description: 'Transfer completed successfully' })
  async transferFunds(
    @CurrentUser('userId') userId: string,
    @Body() dto: WalletTransferDto,
  ) {
    return this.walletService.transferFunds(userId, dto);
  }

  @Public()
  @Get('packages')
  @ApiOperation({ summary: 'Get active coin packages for purchase' })
  @ApiQuery({
    name: 'country',
    required: false,
    description: 'Country code for regional pricing',
  })
  @ApiResponse({
    status: 200,
    description: 'Active coin packages retrieved successfully',
  })
  async getPackages(@Query('country') country?: string) {
    return this.walletService.getCoinPackages(country);
  }

  @Post('purchase-preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate purchase preview for a coin package without charge',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase preview generated successfully',
  })
  async getPurchasePreview(@Body() dto: PurchasePreviewDto) {
    return this.walletService.getPurchasePreview(dto);
  }

  @Post('purchase/initiate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Initiate coin purchase order session with replay protection',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase session initiated successfully',
  })
  async initiatePurchase(
    @CurrentUser('userId') userId: string,
    @Body() dto: PurchaseCoinsDto,
  ) {
    return this.walletService.initiatePurchase(userId, dto);
  }

  @Post('purchase/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Validate payment receipt via provider abstraction and grant coins',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase validated and coins granted',
  })
  async validatePurchase(
    @CurrentUser('userId') userId: string,
    @Body() dto: ValidatePurchaseDto,
  ) {
    return this.walletService.validatePurchase(userId, dto);
  }

  @Get('purchases/history')
  @ApiOperation({ summary: 'Get coin purchase history for user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Purchase history retrieved' })
  async getPurchaseHistory(
    @CurrentUser('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.walletService.getPurchaseHistory(
      userId,
      Number(page),
      Number(limit),
    );
  }

  @Post('conversion-preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate diamond to coin conversion preview' })
  @ApiResponse({ status: 200, description: 'Conversion preview generated' })
  async getConversionPreview(@Body() dto: ConversionPreviewDto) {
    return this.walletService.getConversionPreview(dto);
  }

  @Post('convert-diamonds')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert diamonds into coins' })
  @ApiResponse({
    status: 200,
    description: 'Diamonds converted to coins successfully',
  })
  async convertDiamonds(
    @CurrentUser('userId') userId: string,
    @Body() dto: ConvertDiamondsDto,
  ) {
    return this.walletService.convertDiamonds(userId, dto);
  }

  @Get('creator/earnings')
  @ApiOperation({
    summary: 'Get creator earnings breakdown and pending settlements',
  })
  @ApiResponse({ status: 200, description: 'Creator earnings retrieved' })
  async getCreatorEarnings(@CurrentUser('userId') userId: string) {
    return this.walletService.getCreatorEarnings(userId);
  }

  @Get('creator/settlement-history')
  @ApiOperation({ summary: 'Get creator settlement payout history' })
  @ApiResponse({ status: 200, description: 'Settlement history retrieved' })
  async getSettlementHistory(@CurrentUser('userId') userId: string) {
    return this.walletService.getSettlementHistory(userId);
  }
}
