import { WalletBalance } from './entities/wallet-balance.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { CoinPackage } from './entities/coin-package.entity';
import { User } from '../users/entities/user.entity';
import {
  WalletTransactionType,
  WalletCurrency,
  WalletTransactionStatus,
} from '../../common/enums';

describe('Phase 1B Wallet & Monetization Foundation Entities', () => {
  it('should instantiate WalletBalance entity correctly', () => {
    const wb = new WalletBalance();
    wb.id = '123e4567-e89b-12d3-a456-426614174100';
    wb.userId = '123e4567-e89b-12d3-a456-426614174002';
    wb.coinBalance = 500;
    wb.diamondBalance = 120;
    wb.totalCoinsPurchased = 1000;
    wb.totalCoinsSpent = 500;
    wb.totalDiamondsEarned = 150;
    wb.totalDiamondsWithdrawn = 30;

    expect(wb.coinBalance).toBe(500);
    expect(wb.diamondBalance).toBe(120);
    expect(wb.totalCoinsPurchased).toBe(1000);
    expect(wb.totalCoinsSpent).toBe(500);
    expect(wb.totalDiamondsEarned).toBe(150);
    expect(wb.totalDiamondsWithdrawn).toBe(30);
  });

  it('should enforce WalletBalance as single source of truth (no direct balances on User)', () => {
    const user = new User();
    user.id = '123e4567-e89b-12d3-a456-426614174002';
    user.username = 'test_user';

    const wb = new WalletBalance();
    wb.userId = user.id;
    wb.coinBalance = 250;
    wb.diamondBalance = 50;

    user.walletBalance = wb;

    expect(user.walletBalance.coinBalance).toBe(250);
    expect(user.walletBalance.diamondBalance).toBe(50);
    expect((user as Record<string, unknown>).coinBalance).toBeUndefined();
    expect((user as Record<string, unknown>).diamondBalance).toBeUndefined();
  });

  it('should instantiate WalletTransaction entity with enums correctly', () => {
    const tx = new WalletTransaction();
    tx.id = '123e4567-e89b-12d3-a456-426614174101';
    tx.walletId = '123e4567-e89b-12d3-a456-426614174100';
    tx.userId = '123e4567-e89b-12d3-a456-426614174002';
    tx.transactionType = WalletTransactionType.PURCHASE;
    tx.amount = 500;
    tx.currency = WalletCurrency.COIN;
    tx.referenceType = 'COIN_PACKAGE';
    tx.referenceId = 'pkg_123';
    tx.status = WalletTransactionStatus.COMPLETED;
    tx.description = 'Purchased 500 Coin Package';
    tx.metadata = { gateway: 'stripe', paymentId: 'pi_98765' };

    expect(tx.transactionType).toBe(WalletTransactionType.PURCHASE);
    expect(tx.currency).toBe(WalletCurrency.COIN);
    expect(tx.status).toBe(WalletTransactionStatus.COMPLETED);
    expect(tx.amount).toBe(500);
  });

  it('should instantiate CoinPackage entity correctly', () => {
    const cp = new CoinPackage();
    cp.id = '123e4567-e89b-12d3-a456-426614174102';
    cp.packageName = 'Starter Pack';
    cp.coinAmount = 500;
    cp.bonusCoins = 50;
    cp.price = 4.99;
    cp.currency = WalletCurrency.USD;
    cp.badgeText = 'POPULAR';
    cp.displayOrder = 1;
    cp.isPopular = true;
    cp.isActive = true;

    expect(cp.packageName).toBe('Starter Pack');
    expect(cp.coinAmount).toBe(500);
    expect(cp.bonusCoins).toBe(50);
    cp.price = 4.99;
    expect(cp.currency).toBe(WalletCurrency.USD);
    expect(cp.isPopular).toBe(true);
    expect(cp.isActive).toBe(true);
  });
});
