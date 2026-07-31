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
    this.logger.log(
      `Validating Apple IAP receipt mock: ${receipt ? receipt.slice(0, 15) : 'N/A'}`,
    );
    if (receipt && receipt.includes('FAIL')) {
      return {
        isValid: false,
        transactionId: `apple_fail_${Date.now()}`,
        amount: packageDetails?.price || 0,
        currency: packageDetails?.currency || 'USD',
        coins: 0,
        bonusCoins: 0,
        errorMessage: 'Invalid Apple IAP receipt data',
      };
    }

    const txId = `apple_tx_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    return {
      isValid: true,
      transactionId: txId,
      amount: packageDetails?.price || 0,
      currency: packageDetails?.currency || 'USD',
      coins: packageDetails?.coinAmount || 0,
      bonusCoins: packageDetails?.bonusCoins || 0,
      rawDetails: {
        environment: 'Sandbox',
        originalTransactionId: txId,
        productId: 'com.voicecloud.coins',
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
      `Processing Apple IAP refund mock for tx: ${transactionId}, amount: ${amount}`,
    );
    return {
      success: true,
      refundTransactionId: `apple_ref_${Date.now()}`,
    };
  }
}
