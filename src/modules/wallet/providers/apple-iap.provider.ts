import { Injectable, Logger } from '@nestjs/common';
import { PaymentProviderType } from '../../../common/enums';
import {
  IPaymentGatewayProvider,
  ValidateReceiptResult,
  RefundGatewayResult,
} from './payment-gateway.interface';

@Injectable()
export class AppleIapProvider implements IPaymentGatewayProvider {
  private readonly logger = new Logger(AppleIapProvider.name);
  readonly providerType = PaymentProviderType.APPLE_IAP;

  async validateReceipt(
    receipt: string,
    packageDetails?: {
      price: number;
      coinAmount: number;
      bonusCoins: number;
      currency?: string;
    },
  ): Promise<ValidateReceiptResult> {
    this.logger.warn('Apple IAP server verification adapter is not configured; rejecting purchase instead of using mock validation');
    return {
      isValid: false,
      transactionId: receipt || '',
      amount: packageDetails?.price || 0,
      currency: packageDetails?.currency || 'USD',
      coins: 0,
      bonusCoins: 0,
      errorMessage: 'Apple App Store server-side transaction verification is not configured',
    };
  }

  async verifySignature(_data: string, _signature: string): Promise<boolean> {
    return false;
  }

  async processRefund(
    _transactionId: string,
    _amount: number,
  ): Promise<RefundGatewayResult> {
    return {
      success: false,
      refundTransactionId: '',
      errorMessage: 'Apple App Store server-side refund integration is not configured',
    };
  }
}
