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
export class StripeProvider implements IPaymentGatewayProvider {
  private readonly logger = new Logger(StripeProvider.name);
  readonly providerType = PaymentProviderType.STRIPE;

  constructor(private readonly dynamicConfigService: DynamicConfigService) {}

  private async getConfig(): Promise<Record<string, any> | null> {
    const provider = await this.dynamicConfigService.getProviderConfig(
      ProviderCategory.PAYMENT,
      'stripe',
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
    const secretKey = config?.secretKey || config?.apiKey;
    if (!receipt || !secretKey) {
      return this.invalidResult(
        receipt,
        packageDetails,
        'Stripe verification is unavailable because credentials or payment intent ID are missing',
      );
    }

    try {
      const response = await axios.get(
        `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(receipt)}`,
        {
          headers: { Authorization: `Bearer ${secretKey}` },
          timeout: 8000,
        },
      );
      const intent = response.data as Record<string, any>;
      const amount = Number(intent.amount_received ?? intent.amount ?? 0) / 100;
      const currency = String(intent.currency || '').toUpperCase();
      const expectedCurrency = String(packageDetails?.currency || currency).toUpperCase();
      const amountMatches = packageDetails
        ? Math.abs(amount - Number(packageDetails.price)) < 0.005
        : true;
      const valid =
        intent.status === 'succeeded' &&
        amountMatches &&
        (!expectedCurrency || currency === expectedCurrency);

      return {
        isValid: valid,
        transactionId: String(intent.id || receipt),
        amount,
        currency: currency || expectedCurrency || 'USD',
        coins: valid ? packageDetails?.coinAmount || 0 : 0,
        bonusCoins: valid ? packageDetails?.bonusCoins || 0 : 0,
        rawDetails: {
          paymentIntentId: intent.id,
          status: intent.status,
          amountReceived: amount,
          currency,
        },
        errorMessage: valid
          ? undefined
          : 'Stripe payment intent is not succeeded or does not match the requested package',
      };
    } catch (error) {
      this.logger.warn(`Stripe receipt verification failed: ${(error as Error).message}`);
      return this.invalidResult(
        receipt,
        packageDetails,
        'Stripe payment verification failed',
      );
    }
  }

  async verifySignature(data: string, signature: string): Promise<boolean> {
    const config = await this.getConfig();
    const webhookSecret = config?.webhookSecret;
    if (!webhookSecret || !data || !signature) return false;

    const timestamp = signature
      .split(',')
      .find((part) => part.startsWith('t='))
      ?.slice(2);
    const supplied = signature
      .split(',')
      .filter((part) => part.startsWith('v1='))
      .map((part) => part.slice(3));
    if (!timestamp || !supplied?.length) return false;

    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(`${timestamp}.${data}`)
      .digest('hex');
    return supplied.some((candidate) => {
      if (candidate.length !== expected.length) return false;
      return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
    });
  }

  async processRefund(
    transactionId: string,
    amount: number,
  ): Promise<RefundGatewayResult> {
    const config = await this.getConfig();
    const secretKey = config?.secretKey || config?.apiKey;
    if (!transactionId || !secretKey || !(amount > 0)) {
      return {
        success: false,
        refundTransactionId: '',
        errorMessage: 'Stripe refund credentials or refund parameters are invalid',
      };
    }

    try {
      const body = new URLSearchParams();
      body.set('payment_intent', transactionId);
      body.set('amount', String(Math.round(amount * 100)));
      const response = await axios.post('https://api.stripe.com/v1/refunds', body.toString(), {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 8000,
      });
      const refund = response.data as Record<string, any>;
      const success = refund.status === 'succeeded' || refund.status === 'pending';
      return {
        success,
        refundTransactionId: success ? String(refund.id || '') : '',
        errorMessage: success ? undefined : `Stripe refund status: ${refund.status || 'unknown'}`,
      };
    } catch (error) {
      this.logger.warn(`Stripe refund failed: ${(error as Error).message}`);
      return {
        success: false,
        refundTransactionId: '',
        errorMessage: 'Stripe refund request failed',
      };
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
      currency: packageDetails?.currency || 'USD',
      coins: 0,
      bonusCoins: 0,
      errorMessage,
    };
  }
}
