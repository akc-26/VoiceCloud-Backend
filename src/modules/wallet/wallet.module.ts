import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletBalance } from './entities/wallet-balance.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { CoinPackage } from './entities/coin-package.entity';
import { PaymentProvider } from './entities/payment-provider.entity';
import { Purchase } from './entities/purchase.entity';
import { Refund } from './entities/refund.entity';
import { CreatorSettlement } from './entities/creator-settlement.entity';
import { User } from '../users/entities/user.entity';

import { WalletService } from './wallet.service';
import { WalletMutationService } from './wallet-mutation.service';
import { WalletController } from './wallet.controller';
import { AdminWalletController } from './admin-wallet.controller';

import { GooglePlayProvider } from './providers/google-play.provider';
import { AppleIapProvider } from './providers/apple-iap.provider';
import { StripeProvider } from './providers/stripe.provider';
import { RazorpayProvider } from './providers/razorpay.provider';
import { PaypalProvider } from './providers/paypal.provider';
import { PaymentGatewayFactory } from './providers/payment-gateway.factory';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WalletBalance,
      WalletTransaction,
      CoinPackage,
      PaymentProvider,
      Purchase,
      Refund,
      CreatorSettlement,
      User,
    ]),
  ],
  controllers: [WalletController, AdminWalletController],
  providers: [
    WalletService,
    WalletMutationService,
    GooglePlayProvider,
    AppleIapProvider,
    StripeProvider,
    RazorpayProvider,
    PaypalProvider,
    PaymentGatewayFactory,
  ],
  exports: [WalletService, WalletMutationService, TypeOrmModule],
})
export class WalletModule {}
