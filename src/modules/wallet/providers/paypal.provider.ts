import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PaymentProviderType } from '../../../common/enums';
import { DynamicConfigService } from '../../config/dynamic-config.service';
import { ProviderCategory } from '../../admin/entities/provider-config.entity';
import {
  IPaymentGatewayProvider,
  ValidateReceiptResult,
  RefundGatewayResult,
} from './payment-gateway.interface';

@Injectable()
export class PaypalProvider implements IPaymentGatewayProvider {
  private readonly logger = new Logger(PaypalProvider.name);
  readonly providerType = PaymentProviderType.PAYPAL;

  constructor(private readonly dynamicConfigService: DynamicConfigService) {}

  private async getProviderConfig() {
    return this.dynamicConfigService.getProviderConfig(
      ProviderCategory.PAYMENT,
      'paypal',
    );
  }

  private async getAccessToken(config: Record<string, any>, isSandbox: boolean) {
    const clientId = config.clientId || config.client_id;
    const clientSecret = config.clientSecret || config.client_secret;
    if (!clientId || !clientSecret) return null;
    const baseUrl = config.baseUrl || (isSandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com');
    const response = await axios.post(`${baseUrl}/v1/oauth2/token`, 'grant_type=client_credentials', {
      auth: { username: clientId, password: clientSecret },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 8000,
    });
    return { token: response.data?.access_token as string, baseUrl };
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
    const provider = await this.getProviderConfig();
    if (!provider || !receipt) {
      return this.invalidResult(receipt, packageDetails, 'PayPal verification configuration or capture ID is missing');
    }

    try {
      const auth = await this.getAccessToken(provider.config || {}, provider.isSandbox);
      if (!auth?.token) {
        return this.invalidResult(receipt, packageDetails, 'PayPal client credentials are missing');
      }
      const response = await axios.get(
        `${auth.baseUrl}/v2/payments/captures/${encodeURIComponent(receipt)}`,
        { headers: { Authorization: `Bearer ${auth.token}` }, timeout: 8000 },
      );
      const capture = response.data as Record<string, any>;
      const amount = Number(capture.amount?.value || 0);
      const currency = String(capture.amount?.currency_code || '').toUpperCase();
      const expectedCurrency = String(packageDetails?.currency || currency).toUpperCase();
      const amountMatches = packageDetails
        ? Math.abs(amount - Number(packageDetails.price)) < 0.005
        : true;
      const valid = capture.status === 'COMPLETED' && amountMatches && (!expectedCurrency || currency === expectedCurrency);
      return {
        isValid: valid,
        transactionId: String(capture.id || receipt),
        amount,
        currency: currency || expectedCurrency || 'USD',
        coins: valid ? packageDetails?.coinAmount || 0 : 0,
        bonusCoins: valid ? packageDetails?.bonusCoins || 0 : 0,
        rawDetails: { captureId: capture.id, status: capture.status, amount, currency },
        errorMessage: valid ? undefined : 'PayPal capture is not completed or does not match the requested package',
      };
    } catch (error) {
      this.logger.warn(`PayPal receipt verification failed: ${(error as Error).message}`);
      return this.invalidResult(receipt, packageDetails, 'PayPal payment verification failed');
    }
  }

  async verifySignature(_data: string, _signature: string): Promise<boolean> {
    // PayPal webhook verification requires transmission ID/time/cert URL/auth algorithm
    // in addition to the signature. The existing interface does not provide those fields,
    // so fail closed instead of reporting an unverifiable signature as valid.
    return false;
  }

  async processRefund(
    transactionId: string,
    amount: number,
  ): Promise<RefundGatewayResult> {
    const provider = await this.getProviderConfig();
    if (!provider || !transactionId || !(amount > 0)) {
      return { success: false, refundTransactionId: '', errorMessage: 'PayPal refund configuration or parameters are invalid' };
    }

    try {
      const auth = await this.getAccessToken(provider.config || {}, provider.isSandbox);
      if (!auth?.token) {
        return { success: false, refundTransactionId: '', errorMessage: 'PayPal client credentials are missing' };
      }
      const currency = provider.config?.currency || 'USD';
      const response = await axios.post(
        `${auth.baseUrl}/v2/payments/captures/${encodeURIComponent(transactionId)}/refund`,
        { amount: { value: amount.toFixed(2), currency_code: currency } },
        { headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' }, timeout: 8000 },
      );
      const refund = response.data as Record<string, any>;
      const success = refund.status === 'COMPLETED' || refund.status === 'PENDING';
      return {
        success,
        refundTransactionId: success ? String(refund.id || '') : '',
        errorMessage: success ? undefined : `PayPal refund status: ${refund.status || 'unknown'}`,
      };
    } catch (error) {
      this.logger.warn(`PayPal refund failed: ${(error as Error).message}`);
      return { success: false, refundTransactionId: '', errorMessage: 'PayPal refund request failed' };
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
