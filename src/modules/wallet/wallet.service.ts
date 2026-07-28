import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletBalance } from './entities/wallet-balance.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { CoinPackage } from './entities/coin-package.entity';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { PurchasePreviewDto } from './dto/purchase-preview.dto';
import { ConversionPreviewDto } from './dto/conversion-preview.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(WalletBalance)
    private readonly walletBalanceRepository: Repository<WalletBalance>,
    @InjectRepository(WalletTransaction)
    private readonly walletTransactionRepository: Repository<WalletTransaction>,
    @InjectRepository(CoinPackage)
    private readonly coinPackageRepository: Repository<CoinPackage>,
  ) {}

  /**
   * Helper to ensure user has a WalletBalance record.
   * Auto-creates a zero-balance record if one does not exist.
   */
  async getOrCreateWalletBalance(userId: string): Promise<WalletBalance> {
    let wallet = await this.walletBalanceRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      wallet = this.walletBalanceRepository.create({
        userId,
        coinBalance: 0,
        diamondBalance: 0,
        totalCoinsPurchased: 0,
        totalCoinsSpent: 0,
        totalDiamondsEarned: 0,
        totalDiamondsWithdrawn: 0,
      });
      wallet = await this.walletBalanceRepository.save(wallet);
    }

    return wallet;
  }

  /**
   * GET /wallet/balance
   * Returns current balances and lifetime totals.
   */
  async getWalletBalance(userId: string) {
    const wallet = await this.getOrCreateWalletBalance(userId);

    return {
      coinBalance: wallet.coinBalance,
      diamondBalance: wallet.diamondBalance,
      totalCoinsPurchased: wallet.totalCoinsPurchased,
      totalCoinsSpent: wallet.totalCoinsSpent,
      totalDiamondsEarned: wallet.totalDiamondsEarned,
      totalDiamondsWithdrawn: wallet.totalDiamondsWithdrawn,
      updatedAt: wallet.updatedAt,
    };
  }

  /**
   * GET /wallet/summary
   * Returns wallet overview, latest transaction, active package count, and statistics.
   */
  async getWalletSummary(userId: string) {
    const wallet = await this.getOrCreateWalletBalance(userId);

    const latestTransaction = await this.walletTransactionRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const activePackageCount = await this.coinPackageRepository.count({
      where: { isActive: true },
    });

    const totalTransactionsCount = await this.walletTransactionRepository.count(
      {
        where: { userId },
      },
    );

    return {
      wallet: {
        coinBalance: wallet.coinBalance,
        diamondBalance: wallet.diamondBalance,
        totalCoinsPurchased: wallet.totalCoinsPurchased,
        totalCoinsSpent: wallet.totalCoinsSpent,
        totalDiamondsEarned: wallet.totalDiamondsEarned,
        totalDiamondsWithdrawn: wallet.totalDiamondsWithdrawn,
      },
      latestTransaction: latestTransaction || null,
      activePackageCount,
      statistics: {
        totalTransactionsCount,
        netCoinBalance: wallet.coinBalance,
        netDiamondBalance: wallet.diamondBalance,
      },
    };
  }

  /**
   * GET /wallet/transactions
   * Retrieves paginated transaction history with filtering and sorting.
   */
  async getTransactionHistory(userId: string, query: TransactionQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.walletTransactionRepository.createQueryBuilder('tx');
    qb.where('tx.userId = :userId', { userId });

    if (query.transactionType) {
      qb.andWhere('tx.transactionType = :transactionType', {
        transactionType: query.transactionType,
      });
    }

    if (query.currency) {
      qb.andWhere('tx.currency = :currency', {
        currency: query.currency,
      });
    }

    const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy('tx.createdAt', sortOrder);

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * GET /wallet/transactions/:id
   * Retrieves complete transaction details.
   */
  async getTransactionById(
    userId: string,
    id: string,
  ): Promise<WalletTransaction> {
    const transaction = await this.walletTransactionRepository.findOne({
      where: { id, userId },
    });

    if (!transaction) {
      throw new NotFoundException(
        `Transaction with ID '${id}' was not found for this user`,
      );
    }

    return transaction;
  }

  /**
   * GET /wallet/packages
   * Returns active coin packages ordered by displayOrder.
   */
  async getCoinPackages(): Promise<CoinPackage[]> {
    return this.coinPackageRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * POST /wallet/purchase-preview
   * Generates a preview of a coin package purchase without payment execution.
   */
  async getPurchasePreview(dto: PurchasePreviewDto) {
    const pkg = await this.coinPackageRepository.findOne({
      where: { id: dto.packageId },
    });

    if (!pkg) {
      throw new NotFoundException(
        `Coin package with ID '${dto.packageId}' not found`,
      );
    }

    if (!pkg.isActive) {
      throw new BadRequestException('Coin package is not currently active');
    }

    const baseCoins = pkg.coinAmount;
    const bonusCoins = pkg.bonusCoins;
    const totalCoins = baseCoins + bonusCoins;

    return {
      packageId: pkg.id,
      packageName: pkg.packageName,
      coins: baseCoins,
      bonusCoins,
      totalCoins,
      price: pkg.price,
      currency: pkg.currency,
      badgeText: pkg.badgeText || null,
      isPopular: pkg.isPopular,
      note: 'Purchase preview generated. No payment was processed and no balance was modified.',
    };
  }

  /**
   * POST /wallet/conversion-preview
   * Generates a preview of diamond to coin conversion without modifying wallet.
   */
  async getConversionPreview(dto: ConversionPreviewDto) {
    const conversionRate = 10; // 1 Diamond = 10 Coins
    const estimatedCoins = dto.diamondAmount * conversionRate;

    return {
      diamondAmount: dto.diamondAmount,
      conversionRate,
      conversionRatioDescription: '1 Diamond = 10 Coins',
      estimatedCoins,
      note: 'Conversion preview generated. No wallet modification was performed.',
    };
  }
}
