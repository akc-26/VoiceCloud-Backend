import { Injectable, Logger } from '@nestjs/common';
import { PaymentProviderType } from '../../../common/enums';
import {
  IPaymentGatewayProvider,
  ValidateReceiptResult,
  RefundGatewayResult,
} from './payment-gateway.interface';

@Injectable()
export class RazorpayProvider implements IPaymentGatewayProvider {
  private readonly logger = new Logger(RazorpayProvider.name);
  readonly providerType = PaymentProviderType.RAZORPAY;

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
      `Validating Razorpay payment ID mock: ${receipt ? receipt.slice(0, 15) : 'N/A'}`,
    );
    if (receipt && receipt.includes('FAIL')) {
      return {
        isValid: false,
        transactionId: `rzp_fail_${Date.now()}`,
        amount: packageDetails?.price || 0,
        currency: packageDetails?.currency || 'INR',
        coins: 0,
        bonusCoins: 0,
        errorMessage: 'Razorpay payment signature verification failed',
      };
    }

    const txId = `pay_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    return {
      isValid: true,
      transactionId: txId,
      amount: packageDetails?.price || 0,
      currency: packageDetails?.currency || 'INR',
      coins: packageDetails?.coinAmount || 0,
      bonusCoins: packageDetails?.bonusCoins || 0,
      rawDetails: {
        paymentId: receipt,
        orderId: `order_${Date.now()}`,
        status: 'captured',
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
      `Processing Razorpay refund mock for tx: ${transactionId}, amount: ${amount}`,
    );
    return {
      success: true,
      refundTransactionId: `rfnd_${Date.now()}`,
    };
  }
}
