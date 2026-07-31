import { Injectable, Logger } from '@nestjs/common';
import { PaymentProviderType } from '../../../common/enums';
import {
  IPaymentGatewayProvider,
  ValidateReceiptResult,
  RefundGatewayResult,
} from './payment-gateway.interface';

@Injectable()
export class PaypalProvider implements IPaymentGatewayProvider {
  private readonly logger = new Logger(PaypalProvider.name);
  readonly providerType = PaymentProviderType.PAYPAL;

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
      `Validating PayPal capture ID mock: ${receipt ? receipt.slice(0, 15) : 'N/A'}`,
    );
    if (receipt && receipt.includes('FAIL')) {
      return {
        isValid: false,
        transactionId: `paypal_fail_${Date.now()}`,
        amount: packageDetails?.price || 0,
        currency: packageDetails?.currency || 'USD',
        coins: 0,
        bonusCoins: 0,
        errorMessage: 'PayPal capture status not COMPLETED',
      };
    }

    const txId = `pp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    return {
      isValid: true,
      transactionId: txId,
      amount: packageDetails?.price || 0,
      currency: packageDetails?.currency || 'USD',
      coins: packageDetails?.coinAmount || 0,
      bonusCoins: packageDetails?.bonusCoins || 0,
      rawDetails: {
        captureId: receipt,
        status: 'COMPLETED',
        payerId: 'PAYER123',
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
      `Processing PayPal refund mock for tx: ${transactionId}, amount: ${amount}`,
    );
    return {
      success: true,
      refundTransactionId: `pp_ref_${Date.now()}`,
    };
  }
}
