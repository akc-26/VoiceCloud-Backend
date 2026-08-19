import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { PaymentProviderType } from '../../../common/enums';
import { DynamicConfigService } from '../../config/dynamic-config.service';
import { ProviderCategory } from '../../admin/entities/provider-config.entity';
import {
  IPaymentGatewayProvider,
  ValidateReceiptResult,
  RefundGatewayResult,
} from './payment-gateway.interface';

@Injectable()
export class RazorpayProvider implements IPaymentGatewayProvider {
  private readonly logger = new Logger(RazorpayProvider.name);
  readonly providerType = PaymentProviderType.RAZORPAY;

  constructor(private readonly dynamicConfigService: DynamicConfigService) {}

  private async getConfig(): Promise<Record<string, any> | null> {
    const provider = await this.dynamicConfigService.getProviderConfig(
      ProviderCategory.PAYMENT,
      'razorpay',
    );
    return provider?.config || null;
  }

  async validateReceipt(
    receipt: string,
    packageDetails?: {
      price: number;
      coinAmount: number;
      bonusCoins: number;
      currency?: string;
    },
  ): Promise<ValidateReceiptResult> {
    const config = await this.getConfig();
    const keyId = config?.keyId || config?.key_id;
    const keySecret = config?.keySecret || config?.key_secret;
    if (!receipt || !keyId || !keySecret) {
      return this.invalidResult(receipt, packageDetails, 'Razorpay verification credentials or payment ID are missing');
    }

    try {
      const response = await axios.get(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(receipt)}`,
        {
          auth: { username: keyId, password: keySecret },
          timeout: 8000,
        },
      );
      const payment = response.data as Record<string, any>;
      const amount = Number(payment.amount || 0) / 100;
      const currency = String(payment.currency || '').toUpperCase();
      const expectedCurrency = String(packageDetails?.currency || currency).toUpperCase();
      const amountMatches = packageDetails
        ? Math.abs(amount - Number(packageDetails.price)) < 0.005
        : true;
      const valid =
        payment.status === 'captured' &&
        amountMatches &&
        (!expectedCurrency || currency === expectedCurrency);

      return {
        isValid: valid,
        transactionId: String(payment.id || receipt),
        amount,
        currency: currency || expectedCurrency || 'INR',
        coins: valid ? packageDetails?.coinAmount || 0 : 0,
        bonusCoins: valid ? packageDetails?.bonusCoins || 0 : 0,
        rawDetails: {
          paymentId: payment.id,
          orderId: payment.order_id,
          status: payment.status,
          amount,
          currency,
        },
        errorMessage: valid
          ? undefined
          : 'Razorpay payment is not captured or does not match the requested package',
      };
    } catch (error) {
      this.logger.warn(`Razorpay receipt verification failed: ${(error as Error).message}`);
      return this.invalidResult(receipt, packageDetails, 'Razorpay payment verification failed');
    }
  }

  async verifySignature(data: string, signature: string): Promise<boolean> {
    const config = await this.getConfig();
    const keySecret = config?.keySecret || config?.key_secret;
    if (!data || !signature || !keySecret) return false;
    const expected = crypto.createHmac('sha256', keySecret).update(data).digest('hex');
    if (signature.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  async processRefund(
    transactionId: string,
    amount: number,
  ): Promise<RefundGatewayResult> {
    const config = await this.getConfig();
    const keyId = config?.keyId || config?.key_id;
    const keySecret = config?.keySecret || config?.key_secret;
    if (!transactionId || !keyId || !keySecret || !(amount > 0)) {
      return {
        success: false,
        refundTransactionId: '',
        errorMessage: 'Razorpay refund credentials or refund parameters are invalid',
      };
    }

    try {
      const response = await axios.post(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(transactionId)}/refund`,
        { amount: Math.round(amount * 100) },
        {
          auth: { username: keyId, password: keySecret },
          timeout: 8000,
        },
      );
      const refund = response.data as Record<string, any>;
      const success = refund.status === 'processed' || refund.status === 'pending';
      return {
        success,
        refundTransactionId: success ? String(refund.id || '') : '',
        errorMessage: success ? undefined : `Razorpay refund status: ${refund.status || 'unknown'}`,
      };
    } catch (error) {
      this.logger.warn(`Razorpay refund failed: ${(error as Error).message}`);
      return { success: false, refundTransactionId: '', errorMessage: 'Razorpay refund request failed' };
    }
  }

  private invalidResult(
    receipt: string,
    packageDetails: { price: number; coinAmount: number; bonusCoins: number; currency?: string } | undefined,
    errorMessage: string,
  ): ValidateReceiptResult {
    return {
      isValid: false,
      transactionId: receipt || '',
      amount: packageDetails?.price || 0,
      currency: packageDetails?.currency || 'INR',
      coins: 0,
      bonusCoins: 0,
      errorMessage,
    };
  }
}
