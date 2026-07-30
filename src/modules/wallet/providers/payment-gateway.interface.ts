import { PaymentProviderType } from '../../../common/enums';

export interface ValidateReceiptResult {
  isValid: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  coins: number;
  bonusCoins: number;
  rawDetails?: Record<string, unknown>;
  errorMessage?: string;
}

export interface RefundGatewayResult {
  success: boolean;
  refundTransactionId: string;
  errorMessage?: string;
}

export interface IPaymentGatewayProvider {
  providerType: PaymentProviderType;
  validateReceipt(
    receipt: string,
    packageDetails?: {
      price: number;
      coinAmount: number;
      bonusCoins: number;
      currency?: string;
    },
  ): Promise<ValidateReceiptResult>;
  verifySignature(data: string, signature: string): Promise<boolean>;
  processRefund(
    transactionId: string,
    amount: number,
  ): Promise<RefundGatewayResult>;
}
