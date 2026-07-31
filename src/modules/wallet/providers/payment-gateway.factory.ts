import { Injectable, BadRequestException } from '@nestjs/common';
import { PaymentProviderType } from '../../../common/enums';
import { IPaymentGatewayProvider } from './payment-gateway.interface';
import { GooglePlayProvider } from './google-play.provider';
import { AppleIapProvider } from './apple-iap.provider';
import { StripeProvider } from './stripe.provider';
import { RazorpayProvider } from './razorpay.provider';
import { PaypalProvider } from './paypal.provider';

@Injectable()
export class PaymentGatewayFactory {
  private readonly providersMap = new Map<
    PaymentProviderType,
    IPaymentGatewayProvider
  >();

  constructor(
    private readonly googlePlayProvider: GooglePlayProvider,
    private readonly appleIapProvider: AppleIapProvider,
    private readonly stripeProvider: StripeProvider,
    private readonly razorpayProvider: RazorpayProvider,
    private readonly paypalProvider: PaypalProvider,
  ) {
    this.providersMap.set(
      PaymentProviderType.GOOGLE_PLAY,
      this.googlePlayProvider,
    );
    this.providersMap.set(PaymentProviderType.APPLE_IAP, this.appleIapProvider);
    this.providersMap.set(PaymentProviderType.STRIPE, this.stripeProvider);
    this.providersMap.set(PaymentProviderType.RAZORPAY, this.razorpayProvider);
    this.providersMap.set(PaymentProviderType.PAYPAL, this.paypalProvider);
  }

  getProvider(
    providerType: PaymentProviderType | string,
  ): IPaymentGatewayProvider {
    const type = providerType as PaymentProviderType;
    const provider = this.providersMap.get(type);

    if (!provider) {
      // Fallback to Google Play provider for unknown / MOCK or general testing
      return this.googlePlayProvider;
    }

    return provider;
  }
}
