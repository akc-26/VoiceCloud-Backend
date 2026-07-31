import { Injectable, Logger } from '@nestjs/common';
import { PaymentProviderType } from '../../../common/enums';
import {
  IPaymentGatewayProvider,
  ValidateReceiptResult,
  RefundGatewayResult,
} from './payment-gateway.interface';

@Injectable()
export class GooglePlayProvider implements IPaymentGatewayProvider {
  private readonly logger = new Logger(GooglePlayProvider.name);
  readonly providerType = PaymentProviderType.GOOGLE_PLAY;

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
      `Validating Google Play receipt mock: ${receipt ? receipt.slice(0, 15) : 'N/A'}`,
    );
    if (receipt && receipt.includes('FAIL')) {
      return {
        isValid: false,
        transactionId: `gp_fail_${Date.now()}`,
        amount: packageDetails?.price || 0,
        currency: packageDetails?.currency || 'USD',
        coins: 0,
        bonusCoins: 0,
        errorMessage: 'Invalid Google Play receipt token',
      };
    }

    const txId = `gp_tx_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    return {
      isValid: true,
      transactionId: txId,
      amount: packageDetails?.price || 0,
      currency: packageDetails?.currency || 'USD',
      coins: packageDetails?.coinAmount || 0,
      bonusCoins: packageDetails?.bonusCoins || 0,
      rawDetails: {
        purchaseToken: receipt,
        purchaseState: 0,
        consumptionState: 1,
        orderId: txId,
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
      `Processing Google Play refund mock for tx: ${transactionId}, amount: ${amount}`,
    );
    return {
      success: true,
      refundTransactionId: `gp_ref_${Date.now()}`,
    };
  }
}
