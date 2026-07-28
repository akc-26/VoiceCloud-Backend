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
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { PurchasePreviewDto } from './dto/purchase-preview.dto';
import { ConversionPreviewDto } from './dto/conversion-preview.dto';
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

  @Public()
  @Get('packages')
  @ApiOperation({ summary: 'Get active coin packages for purchase' })
  @ApiResponse({
    status: 200,
    description: 'Active coin packages retrieved successfully',
  })
  async getPackages() {
    return this.walletService.getCoinPackages();
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
  @ApiResponse({ status: 404, description: 'Coin package not found' })
  async getPurchasePreview(@Body() dto: PurchasePreviewDto) {
    return this.walletService.getPurchasePreview(dto);
  }

  @Post('conversion-preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Generate diamond to coin conversion preview without wallet deduction',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversion preview generated successfully',
  })
  async getConversionPreview(@Body() dto: ConversionPreviewDto) {
    return this.walletService.getConversionPreview(dto);
  }
}
