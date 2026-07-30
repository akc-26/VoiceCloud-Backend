import { Injectable, Logger } from '@nestjs/common';
import { PaymentProviderType } from '../../../common/enums';
import {
  IPaymentGatewayProvider,
  ValidateReceiptResult,
  RefundGatewayResult,
} from './payment-gateway.interface';

@Injectable()
export class StripeProvider implements IPaymentGatewayProvider {
  private readonly logger = new Logger(StripeProvider.name);
  readonly providerType = PaymentProviderType.STRIPE;

  async validateReceipt(
    receipt: string,
    packageDetails?: {
      price: number;
      coinAmount: number;
      bonusCoins: number;
      currency?: string;
    },
  ): Promise<ValidateReceiptResult> {
    this.logger.log(
      `Validating Stripe charge/intent mock: ${receipt ? receipt.slice(0, 15) : 'N/A'}`,
    );
    if (receipt && receipt.includes('FAIL')) {
      return {
        isValid: false,
        transactionId: `stripe_fail_${Date.now()}`,
        amount: packageDetails?.price || 0,
        currency: packageDetails?.currency || 'USD',
        coins: 0,
        bonusCoins: 0,
        errorMessage: 'Stripe payment intent failed or unpaid',
      };
    }

    const txId = `ch_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    return {
      isValid: true,
      transactionId: txId,
      amount: packageDetails?.price || 0,
      currency: packageDetails?.currency || 'USD',
      coins: packageDetails?.coinAmount || 0,
      bonusCoins: packageDetails?.bonusCoins || 0,
      rawDetails: {
        paymentIntentId: receipt,
        status: 'succeeded',
        chargeId: txId,
      },
    };
  }

  async verifySignature(data: string, signature: string): Promise<boolean> {
    if (signature && signature.includes('INVALID')) {
      return false;
    }
    return true;
  }

  async processRefund(
    transactionId: string,
    amount: number,
  ): Promise<RefundGatewayResult> {
    this.logger.log(
      `Processing Stripe refund mock for tx: ${transactionId}, amount: ${amount}`,
    );
    return {
      success: true,
      refundTransactionId: `re_${Date.now()}`,
    };
  }
}
