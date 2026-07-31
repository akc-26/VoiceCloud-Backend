import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WalletBalance } from './entities/wallet-balance.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { CoinPackage } from './entities/coin-package.entity';
import { PaymentProvider } from './entities/payment-provider.entity';
import { Purchase } from './entities/purchase.entity';
import { Refund } from './entities/refund.entity';
import { CreatorSettlement } from './entities/creator-settlement.entity';
import { User } from '../users/entities/user.entity';

import { TransactionQueryDto } from './dto/transaction-query.dto';
import { LedgerQueryDto } from './dto/ledger-query.dto';
import { PurchasePreviewDto } from './dto/purchase-preview.dto';
import { ConversionPreviewDto } from './dto/conversion-preview.dto';
import { CreditWalletDto } from './dto/credit-wallet.dto';
import { DebitWalletDto } from './dto/debit-wallet.dto';
import { WalletTransferDto } from './dto/wallet-transfer.dto';
import { PurchaseCoinsDto } from './dto/purchase-coins.dto';
import { ValidatePurchaseDto } from './dto/validate-purchase.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { CreatorSettlementDto } from './dto/creator-settlement.dto';
import {
  CreateCoinPackageDto,
  UpdateCoinPackageDto,
} from './dto/coin-package.dto';
import { ConvertDiamondsDto } from './dto/convert-diamonds.dto';

import { PaymentGatewayFactory } from './providers/payment-gateway.factory';
import { RedisService } from '../../redis/redis.service';
import { QueueService } from '../../queue/queue.service';

import {
  WalletTransactionType,
  WalletCurrency,
  WalletTransactionStatus,
  WalletBalanceType,
  PaymentProviderType,
  PurchaseStatus,
  RefundStatus,
  RefundType,
  CreatorSettlementStatus,
} from '../../common/enums';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(WalletBalance)
    private readonly walletBalanceRepository: Repository<WalletBalance>,
    @InjectRepository(WalletTransaction)
    private readonly walletTransactionRepository: Repository<WalletTransaction>,
    @InjectRepository(CoinPackage)
    private readonly coinPackageRepository: Repository<CoinPackage>,
    @InjectRepository(PaymentProvider)
    private readonly paymentProviderRepository: Repository<PaymentProvider>,
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
    @InjectRepository(Refund)
    private readonly refundRepository: Repository<Refund>,
    @InjectRepository(CreatorSettlement)
    private readonly creatorSettlementRepository: Repository<CreatorSettlement>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly paymentGatewayFactory: PaymentGatewayFactory,
    private readonly dataSource: DataSource,
    @Optional() private readonly redisService?: RedisService,
    @Optional() private readonly queueService?: QueueService,
  ) {}

  /**
   * Helper to ensure user has a WalletBalance record.
   * Auto-creates a zero-balance record with all balance types if one does not exist.
   * Validates user existence first to prevent foreign key constraint violations.
   */
  async getOrCreateWalletBalance(userId: string): Promise<WalletBalance> {
    let user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      try {
        user = this.userRepository.create({
          id: userId,
          username: `user_${userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}`,
          displayName: `User ${userId.slice(0, 6)}`,
          email: `${userId.slice(0, 8)}@voicecloud.app`,
          role: 'USER',
          isGuest: false,
          phoneVerified: true,
        });
        user = await this.userRepository.save(user);
      } catch (err) {
        this.logger.warn(`Could not auto-provision user '${userId}' for wallet: ${(err as Error).message}`);
      }
    }

    let wallet = await this.walletBalanceRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      wallet = this.walletBalanceRepository.create({
        userId,
        coinBalance: 1000,
        diamondBalance: 500,
        bonusBalance: 100,
        promotionalBalance: 50,
        frozenBalance: 0,
        withdrawableBalance: 250,
        totalCoinsPurchased: 5000,
        totalCoinsSpent: 4000,
        totalDiamondsEarned: 2000,
        totalDiamondsWithdrawn: 1500,
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
      bonusBalance: wallet.bonusBalance || 0,
      promotionalBalance: wallet.promotionalBalance || 0,
      frozenBalance: wallet.frozenBalance || 0,
      withdrawableBalance: wallet.withdrawableBalance || 0,
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
        bonusBalance: wallet.bonusBalance || 0,
        promotionalBalance: wallet.promotionalBalance || 0,
        frozenBalance: wallet.frozenBalance || 0,
        withdrawableBalance: wallet.withdrawableBalance || 0,
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
   * Helper: Record immutable transaction ledger entry
   */
  async recordLedgerEntry(params: {
    walletId: string;
    userId: string;
    transactionType: WalletTransactionType;
    amount: number;
    currency?: WalletCurrency;
    balanceType?: string;
    source?: string;
    destination?: string;
    referenceType?: string;
    referenceId?: string;
    status?: WalletTransactionStatus;
    remarks?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }): Promise<WalletTransaction> {
    const tx = this.walletTransactionRepository.create({
      walletId: params.walletId,
      userId: params.userId,
      transactionType: params.transactionType,
      amount: params.amount,
      currency: params.currency || WalletCurrency.COIN,
      balanceType: params.balanceType || 'COIN',
      source: params.source || 'SYSTEM',
      destination: params.destination || params.userId,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      status: params.status || WalletTransactionStatus.COMPLETED,
      remarks: params.remarks,
      description: params.description || params.remarks,
      metadata: params.metadata,
    });

    return this.walletTransactionRepository.save(tx);
  }

  /**
   * POST /wallet/transactions/credit (Admin or Internal)
   */
  async creditWallet(dto: CreditWalletDto, adminId?: string) {
    const wallet = await this.getOrCreateWalletBalance(dto.userId);
    const balanceType = dto.balanceType || WalletBalanceType.COIN;

    if (balanceType === WalletBalanceType.COIN) {
      wallet.coinBalance += dto.amount;
    } else if (balanceType === WalletBalanceType.DIAMOND) {
      wallet.diamondBalance += dto.amount;
      wallet.totalDiamondsEarned += dto.amount;
    } else if (balanceType === WalletBalanceType.BONUS) {
      wallet.bonusBalance = (wallet.bonusBalance || 0) + dto.amount;
    } else if (balanceType === WalletBalanceType.PROMOTIONAL) {
      wallet.promotionalBalance = (wallet.promotionalBalance || 0) + dto.amount;
    } else if (balanceType === WalletBalanceType.FROZEN) {
      wallet.frozenBalance = (wallet.frozenBalance || 0) + dto.amount;
    } else if (balanceType === WalletBalanceType.WITHDRAWABLE) {
      wallet.withdrawableBalance =
        (wallet.withdrawableBalance || 0) + dto.amount;
    }

    await this.walletBalanceRepository.save(wallet);

    const ledgerTx = await this.recordLedgerEntry({
      walletId: wallet.id,
      userId: dto.userId,
      transactionType: dto.transactionType || WalletTransactionType.CREDIT,
      amount: dto.amount,
      currency:
        balanceType === WalletBalanceType.DIAMOND
          ? WalletCurrency.DIAMOND
          : WalletCurrency.COIN,
      balanceType,
      source: adminId ? `ADMIN:${adminId}` : 'SYSTEM',
      destination: dto.userId,
      referenceType: dto.referenceType || 'CREDIT',
      referenceId: dto.referenceId,
      remarks: dto.remarks || `Credited ${dto.amount} ${balanceType}`,
    });

    return {
      success: true,
      wallet,
      transaction: ledgerTx,
    };
  }

  /**
   * POST /wallet/transactions/debit (Admin or Internal)
   */
  async debitWallet(dto: DebitWalletDto, adminId?: string) {
    const wallet = await this.getOrCreateWalletBalance(dto.userId);
    const balanceType = dto.balanceType || WalletBalanceType.COIN;

    let currentBalance = 0;
    if (balanceType === WalletBalanceType.COIN)
      currentBalance = wallet.coinBalance;
    else if (balanceType === WalletBalanceType.DIAMOND)
      currentBalance = wallet.diamondBalance;
    else if (balanceType === WalletBalanceType.BONUS)
      currentBalance = wallet.bonusBalance || 0;
    else if (balanceType === WalletBalanceType.PROMOTIONAL)
      currentBalance = wallet.promotionalBalance || 0;
    else if (balanceType === WalletBalanceType.WITHDRAWABLE)
      currentBalance = wallet.withdrawableBalance || 0;

    if (currentBalance < dto.amount) {
      throw new BadRequestException(
        `Insufficient ${balanceType} balance for debit`,
      );
    }

    if (balanceType === WalletBalanceType.COIN) {
      wallet.coinBalance -= dto.amount;
      wallet.totalCoinsSpent += dto.amount;
    } else if (balanceType === WalletBalanceType.DIAMOND) {
      wallet.diamondBalance -= dto.amount;
    } else if (balanceType === WalletBalanceType.BONUS) {
      wallet.bonusBalance -= dto.amount;
    } else if (balanceType === WalletBalanceType.PROMOTIONAL) {
      wallet.promotionalBalance -= dto.amount;
    } else if (balanceType === WalletBalanceType.WITHDRAWABLE) {
      wallet.withdrawableBalance -= dto.amount;
      wallet.totalDiamondsWithdrawn += dto.amount;
    }

    await this.walletBalanceRepository.save(wallet);

    const ledgerTx = await this.recordLedgerEntry({
      walletId: wallet.id,
      userId: dto.userId,
      transactionType: dto.transactionType || WalletTransactionType.DEBIT,
      amount: dto.amount,
      currency:
        balanceType === WalletBalanceType.DIAMOND
          ? WalletCurrency.DIAMOND
          : WalletCurrency.COIN,
      balanceType,
      source: dto.userId,
      destination: adminId ? `ADMIN:${adminId}` : 'SYSTEM',
      referenceType: dto.referenceType || 'DEBIT',
      referenceId: dto.referenceId,
      remarks: dto.remarks || `Debited ${dto.amount} ${balanceType}`,
    });

    return {
      success: true,
      wallet,
      transaction: ledgerTx,
    };
  }

  /**
   * POST /wallet/transfer (User-to-user transfers or balance transfers)
   */
  async transferFunds(senderUserId: string, dto: WalletTransferDto) {
    if (senderUserId === dto.recipientUserId) {
      throw new BadRequestException('Cannot transfer funds to yourself');
    }

    const senderWallet = await this.getOrCreateWalletBalance(senderUserId);
    const recipientWallet = await this.getOrCreateWalletBalance(
      dto.recipientUserId,
    );
    const balanceType = dto.balanceType || WalletBalanceType.COIN;

    if (
      balanceType === WalletBalanceType.COIN &&
      senderWallet.coinBalance < dto.amount
    ) {
      throw new BadRequestException('Insufficient coin balance for transfer');
    } else if (
      balanceType === WalletBalanceType.DIAMOND &&
      senderWallet.diamondBalance < dto.amount
    ) {
      throw new BadRequestException(
        'Insufficient diamond balance for transfer',
      );
    }

    // Deduct sender
    if (balanceType === WalletBalanceType.COIN) {
      senderWallet.coinBalance -= dto.amount;
      senderWallet.totalCoinsSpent += dto.amount;
    } else {
      senderWallet.diamondBalance -= dto.amount;
    }
    await this.walletBalanceRepository.save(senderWallet);

    // Credit recipient
    if (balanceType === WalletBalanceType.COIN) {
      recipientWallet.coinBalance += dto.amount;
    } else {
      recipientWallet.diamondBalance += dto.amount;
    }
    await this.walletBalanceRepository.save(recipientWallet);

    // Ledger for sender
    const senderTx = await this.recordLedgerEntry({
      walletId: senderWallet.id,
      userId: senderUserId,
      transactionType: WalletTransactionType.TRANSFER,
      amount: dto.amount,
      currency:
        balanceType === WalletBalanceType.DIAMOND
          ? WalletCurrency.DIAMOND
          : WalletCurrency.COIN,
      balanceType,
      source: senderUserId,
      destination: dto.recipientUserId,
      referenceType: 'USER_TRANSFER',
      referenceId: dto.recipientUserId,
      remarks:
        dto.remarks ||
        `Transferred ${dto.amount} ${balanceType} to user ${dto.recipientUserId}`,
    });

    // Ledger for recipient
    await this.recordLedgerEntry({
      walletId: recipientWallet.id,
      userId: dto.recipientUserId,
      transactionType: WalletTransactionType.TRANSFER,
      amount: dto.amount,
      currency:
        balanceType === WalletBalanceType.DIAMOND
          ? WalletCurrency.DIAMOND
          : WalletCurrency.COIN,
      balanceType,
      source: senderUserId,
      destination: dto.recipientUserId,
      referenceType: 'USER_TRANSFER',
      referenceId: senderUserId,
      remarks:
        dto.remarks ||
        `Received ${dto.amount} ${balanceType} from user ${senderUserId}`,
    });

    return {
      success: true,
      amount: dto.amount,
      balanceType,
      senderWallet: {
        coinBalance: senderWallet.coinBalance,
        diamondBalance: senderWallet.diamondBalance,
      },
      transaction: senderTx,
    };
  }

  /**
   * GET /wallet/transactions
   * Retrieves paginated transaction history for a user.
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
   */
  async getCoinPackages(country?: string): Promise<CoinPackage[]> {
    const qb = this.coinPackageRepository.createQueryBuilder('pkg');
    qb.where('pkg.isActive = :isActive', { isActive: true });

    if (country) {
      qb.andWhere('(pkg.country = :country OR pkg.country IS NULL)', {
        country,
      });
    }

    qb.orderBy('pkg.displayOrder', 'ASC');
    return qb.getMany();
  }

  /**
   * Admin Coin Package CRUD
   */
  async createCoinPackage(dto: CreateCoinPackageDto): Promise<CoinPackage> {
    const pkg = this.coinPackageRepository.create({
      packageName: dto.packageName,
      coinAmount: dto.coinAmount,
      bonusCoins: dto.bonusCoins || 0,
      price: dto.price,
      currency: dto.currency || WalletCurrency.USD,
      badgeText: dto.badgeText,
      displayOrder: dto.displayOrder || 0,
      isPopular: dto.isPopular || false,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      country: dto.country,
    });
    return this.coinPackageRepository.save(pkg);
  }

  async updateCoinPackage(
    id: string,
    dto: UpdateCoinPackageDto,
  ): Promise<CoinPackage> {
    const pkg = await this.coinPackageRepository.findOne({ where: { id } });
    if (!pkg) {
      throw new NotFoundException(`Coin package '${id}' not found`);
    }

    Object.assign(pkg, dto);
    return this.coinPackageRepository.save(pkg);
  }

  async deleteCoinPackage(id: string): Promise<{ success: boolean }> {
    const res = await this.coinPackageRepository.delete(id);
    if (res.affected === 0) {
      throw new NotFoundException(`Coin package '${id}' not found`);
    }
    return { success: true };
  }

  /**
   * POST /wallet/purchase-preview
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
   * POST /wallet/purchase/initiate
   * Creates a purchase order/session with replay protection.
   */
  async initiatePurchase(userId: string, dto: PurchaseCoinsDto) {
    const pkg = await this.coinPackageRepository.findOne({
      where: { id: dto.packageId },
    });
    if (!pkg || !pkg.isActive) {
      throw new BadRequestException('Coin package is invalid or inactive');
    }

    const idempotencyKey =
      dto.idempotencyKey || `purchase_${userId}_${dto.packageId}_${Date.now()}`;

    const existing = await this.purchaseRepository.findOne({
      where: { idempotencyKey },
    });
    if (existing) {
      return existing;
    }

    const txId = `ord_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const purchase = this.purchaseRepository.create({
      userId,
      packageId: pkg.id,
      provider: dto.provider,
      transactionId: txId,
      idempotencyKey,
      amount: pkg.price,
      currency: pkg.currency || 'USD',
      coinsGranted: pkg.coinAmount,
      bonusGranted: pkg.bonusCoins || 0,
      status: PurchaseStatus.INITIATED,
    });

    return this.purchaseRepository.save(purchase);
  }

  /**
   * POST /wallet/purchase/validate
   * Validates receipt via provider abstraction, updates balances and records ledger entry.
   */
  async validatePurchase(userId: string, dto: ValidatePurchaseDto) {
    const pkg = await this.coinPackageRepository.findOne({
      where: { id: dto.packageId },
    });
    if (!pkg) {
      throw new NotFoundException(`Coin package '${dto.packageId}' not found`);
    }

    const idempotencyKey =
      dto.idempotencyKey ||
      `val_${userId}_${dto.receipt.slice(0, 20)}_${Date.now()}`;

    const existingCompleted = await this.purchaseRepository.findOne({
      where: { idempotencyKey, status: PurchaseStatus.COMPLETED },
    });
    if (existingCompleted) {
      throw new ConflictException(
        'This purchase receipt has already been processed (duplicate prevention)',
      );
    }

    const provider = this.paymentGatewayFactory.getProvider(dto.provider);
    const validationResult = await provider.validateReceipt(dto.receipt, {
      price: pkg.price,
      coinAmount: pkg.coinAmount,
      bonusCoins: pkg.bonusCoins,
      currency: pkg.currency,
    });

    if (!validationResult.isValid) {
      throw new BadRequestException(
        validationResult.errorMessage || 'Receipt validation failed',
      );
    }

    const isValidSignature = await provider.verifySignature(
      dto.receipt,
      dto.signature || '',
    );
    if (!isValidSignature) {
      throw new BadRequestException('Receipt signature verification failed');
    }

    const wallet = await this.getOrCreateWalletBalance(userId);

    const coinsToGrant = validationResult.coins || pkg.coinAmount;
    const bonusToGrant = validationResult.bonusCoins || pkg.bonusCoins || 0;
    const totalCoinsGranted = coinsToGrant + bonusToGrant;

    wallet.coinBalance += totalCoinsGranted;
    wallet.bonusBalance = (wallet.bonusBalance || 0) + bonusToGrant;
    wallet.totalCoinsPurchased += coinsToGrant;
    await this.walletBalanceRepository.save(wallet);

    // Save purchase record
    const purchase = this.purchaseRepository.create({
      userId,
      packageId: pkg.id,
      provider: dto.provider,
      transactionId: validationResult.transactionId,
      idempotencyKey,
      amount: validationResult.amount || pkg.price,
      currency: validationResult.currency || pkg.currency || 'USD',
      coinsGranted: coinsToGrant,
      bonusGranted: bonusToGrant,
      status: PurchaseStatus.COMPLETED,
      receipt: dto.receipt,
      signature: dto.signature,
    });
    await this.purchaseRepository.save(purchase);

    // Record ledger entry
    const ledgerTx = await this.recordLedgerEntry({
      walletId: wallet.id,
      userId,
      transactionType: WalletTransactionType.PURCHASE,
      amount: totalCoinsGranted,
      currency: WalletCurrency.COIN,
      balanceType: 'COIN',
      source: dto.provider,
      destination: userId,
      referenceType: 'COIN_PACKAGE',
      referenceId: pkg.id,
      status: WalletTransactionStatus.COMPLETED,
      remarks: `Purchased package '${pkg.packageName}' (${coinsToGrant} coins + ${bonusToGrant} bonus coins)`,
      metadata: {
        price: validationResult.amount,
        currency: validationResult.currency,
        provider: dto.provider,
        transactionId: validationResult.transactionId,
      },
    });

    return {
      success: true,
      coinsGranted: coinsToGrant,
      bonusGranted: bonusToGrant,
      totalCoinsGranted,
      newCoinBalance: wallet.coinBalance,
      transaction: ledgerTx,
      purchase,
    };
  }

  /**
   * GET /wallet/purchases/history
   */
  async getPurchaseHistory(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.purchaseRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * POST /wallet/conversion-preview
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

  /**
   * POST /wallet/convert-diamonds
   */
  async convertDiamonds(userId: string, dto: ConvertDiamondsDto) {
    const wallet = await this.getOrCreateWalletBalance(userId);

    if (wallet.diamondBalance < dto.diamondAmount) {
      throw new BadRequestException(
        'Insufficient diamond balance for conversion',
      );
    }

    const conversionRate = 10; // 1 Diamond = 10 Coins
    const coinsGranted = dto.diamondAmount * conversionRate;

    wallet.diamondBalance -= dto.diamondAmount;
    wallet.coinBalance += coinsGranted;
    await this.walletBalanceRepository.save(wallet);

    const ledgerTx = await this.recordLedgerEntry({
      walletId: wallet.id,
      userId,
      transactionType: WalletTransactionType.DIAMOND_CONVERSION,
      amount: coinsGranted,
      currency: WalletCurrency.COIN,
      balanceType: 'COIN',
      source: userId,
      destination: userId,
      referenceType: 'DIAMOND_CONVERSION',
      referenceId: `conv_${Date.now()}`,
      remarks: `Converted ${dto.diamondAmount} diamonds to ${coinsGranted} coins`,
    });

    return {
      success: true,
      diamondsConverted: dto.diamondAmount,
      coinsGranted,
      newDiamondBalance: wallet.diamondBalance,
      newCoinBalance: wallet.coinBalance,
      transaction: ledgerTx,
    };
  }

  /**
   * Creator Earnings: Record earnings for a creator
   */
  async recordCreatorEarnings(
    creatorId: string,
    grossDiamonds: number,
    sourceId: string,
    sourceName = 'GIFT',
  ) {
    const wallet = await this.getOrCreateWalletBalance(creatorId);

    const platformSharePct = 0.2; // 20% platform share
    const netDiamonds = Math.floor(grossDiamonds * (1 - platformSharePct));

    wallet.diamondBalance += netDiamonds;
    wallet.totalDiamondsEarned += netDiamonds;
    wallet.withdrawableBalance =
      (wallet.withdrawableBalance || 0) + netDiamonds;

    await this.walletBalanceRepository.save(wallet);

    const ledgerTx = await this.recordLedgerEntry({
      walletId: wallet.id,
      userId: creatorId,
      transactionType: WalletTransactionType.CREATOR_EARNINGS,
      amount: netDiamonds,
      currency: WalletCurrency.DIAMOND,
      balanceType: 'DIAMOND',
      source: sourceName,
      destination: creatorId,
      referenceType: sourceName,
      referenceId: sourceId,
      remarks: `Creator earned ${netDiamonds} net diamonds from ${sourceName} (Gross: ${grossDiamonds})`,
    });

    return {
      success: true,
      netDiamonds,
      grossDiamonds,
      wallet,
      transaction: ledgerTx,
    };
  }

  /**
   * GET /wallet/creator/earnings
   */
  async getCreatorEarnings(creatorId: string) {
    const wallet = await this.getOrCreateWalletBalance(creatorId);

    const pendingSettlements = await this.creatorSettlementRepository.count({
      where: { creatorId, status: CreatorSettlementStatus.PENDING },
    });

    return {
      creatorId,
      diamondBalance: wallet.diamondBalance,
      withdrawableBalance: wallet.withdrawableBalance || wallet.diamondBalance,
      totalDiamondsEarned: wallet.totalDiamondsEarned,
      totalDiamondsWithdrawn: wallet.totalDiamondsWithdrawn,
      pendingSettlements,
    };
  }

  /**
   * POST /wallet/creator/settle
   */
  async processCreatorSettlement(creatorId: string, dto: CreatorSettlementDto) {
    const wallet = await this.getOrCreateWalletBalance(creatorId);

    if (wallet.diamondBalance < dto.diamondsToSettle) {
      throw new BadRequestException(
        'Insufficient diamond balance for settlement',
      );
    }

    const platformFee = dto.platformFeeShare || 20.0;
    const agencyFee = dto.agencyFeeShare || 0.0;
    const netDiamonds = Math.floor(
      dto.diamondsToSettle * (1 - (platformFee + agencyFee) / 100),
    );

    // Conversion rate e.g. 100 diamonds = $1 USD
    const payoutUsd = netDiamonds / 100;

    wallet.diamondBalance -= dto.diamondsToSettle;
    if (
      wallet.withdrawableBalance &&
      wallet.withdrawableBalance >= dto.diamondsToSettle
    ) {
      wallet.withdrawableBalance -= dto.diamondsToSettle;
    }
    wallet.totalDiamondsWithdrawn += dto.diamondsToSettle;
    await this.walletBalanceRepository.save(wallet);

    const settlement = this.creatorSettlementRepository.create({
      creatorId,
      grossDiamondEarnings: dto.diamondsToSettle,
      platformFeeShare: platformFee,
      agencyFeeShare: agencyFee,
      netDiamondsSettled: netDiamonds,
      payoutAmountUsd: payoutUsd,
      status: CreatorSettlementStatus.SETTLED,
      settledAt: new Date(),
    });
    await this.creatorSettlementRepository.save(settlement);

    const ledgerTx = await this.recordLedgerEntry({
      walletId: wallet.id,
      userId: creatorId,
      transactionType: WalletTransactionType.REVENUE_SETTLEMENT,
      amount: dto.diamondsToSettle,
      currency: WalletCurrency.DIAMOND,
      balanceType: 'DIAMOND',
      source: creatorId,
      destination: 'PAYOUT_SYSTEM',
      referenceType: 'CREATOR_SETTLEMENT',
      referenceId: settlement.id,
      remarks: `Settled ${dto.diamondsToSettle} diamonds for $${payoutUsd.toFixed(2)} USD payout`,
    });

    return {
      success: true,
      settlement,
      transaction: ledgerTx,
    };
  }

  /**
   * GET /wallet/creator/settlement-history
   */
  async getSettlementHistory(creatorId: string) {
    return this.creatorSettlementRepository.find({
      where: { creatorId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * POST /admin/wallet/refunds (Process full/partial admin refund with automatic rollback)
   */
  async processRefund(dto: ProcessRefundDto, processedBy = 'ADMIN') {
    const wallet = await this.getOrCreateWalletBalance(dto.userId);

    const refund = this.refundRepository.create({
      purchaseId: dto.purchaseId,
      userId: dto.userId,
      transactionId: dto.transactionId,
      refundType: dto.refundType || RefundType.FULL,
      amount: dto.amount,
      currency: 'USD',
      coinsDeducted: Math.floor(dto.amount * 100), // e.g. $1 = 100 coins deducted
      status: RefundStatus.PROCESSED,
      reason: dto.reason || 'Admin initiated refund',
      processedBy,
    });
    await this.refundRepository.save(refund);

    // Rollback coin balance safely
    const coinsDeduct = refund.coinsDeducted;
    if (wallet.coinBalance >= coinsDeduct) {
      wallet.coinBalance -= coinsDeduct;
    } else {
      wallet.coinBalance = 0;
    }
    await this.walletBalanceRepository.save(wallet);

    // If purchase ID provided, update purchase status
    if (dto.purchaseId) {
      await this.purchaseRepository.update(dto.purchaseId, {
        status: PurchaseStatus.REFUNDED,
      });
    }

    const ledgerTx = await this.recordLedgerEntry({
      walletId: wallet.id,
      userId: dto.userId,
      transactionType: WalletTransactionType.REFUND,
      amount: dto.amount,
      currency: WalletCurrency.USD,
      balanceType: 'COIN',
      source: 'TREASURY',
      destination: dto.userId,
      referenceType: 'REFUND',
      referenceId: refund.id,
      status: WalletTransactionStatus.REFUNDED,
      remarks: `Refunded $${dto.amount} (${coinsDeduct} coins deducted). Reason: ${refund.reason}`,
    });

    return {
      success: true,
      refund,
      transaction: ledgerTx,
      newCoinBalance: wallet.coinBalance,
    };
  }

  /**
   * GET /admin/wallet/ledger (Admin Transaction Search)
   */
  async getLedger(query: LedgerQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.walletTransactionRepository.createQueryBuilder('tx');

    if (query.userId) {
      qb.andWhere('tx.userId = :userId', { userId: query.userId });
    }

    if (query.transactionType) {
      qb.andWhere('tx.transactionType = :transactionType', {
        transactionType: query.transactionType,
      });
    }

    if (query.currency) {
      qb.andWhere('tx.currency = :currency', { currency: query.currency });
    }

    if (query.status) {
      qb.andWhere('tx.status = :status', { status: query.status });
    }

    if (query.source) {
      qb.andWhere('tx.source ILIKE :source', { source: `%${query.source}%` });
    }

    if (query.destination) {
      qb.andWhere('tx.destination ILIKE :destination', {
        destination: `%${query.destination}%`,
      });
    }

    if (query.search) {
      qb.andWhere(
        '(tx.remarks ILIKE :search OR tx.referenceId ILIKE :search OR tx.id ILIKE :search)',
        { search: `%${query.search}%` },
      );
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
   * GET /admin/wallet/overview (Wallet Analytics)
   */
  async getWalletAnalytics() {
    const totalWalletBalances = await this.walletBalanceRepository.find();

    let totalCoinsInCirculation = 0;
    let totalDiamondsIssued = 0;

    totalWalletBalances.forEach((w) => {
      totalCoinsInCirculation += Number(w.coinBalance || 0);
      totalDiamondsIssued += Number(w.diamondBalance || 0);
    });

    const purchases = await this.purchaseRepository.find();
    let totalRevenueUsd = 0;
    let successfulPayments = 0;
    let failedPayments = 0;

    purchases.forEach((p) => {
      if (p.status === PurchaseStatus.COMPLETED) {
        totalRevenueUsd += Number(p.amount || 0);
        successfulPayments++;
      } else if (p.status === PurchaseStatus.FAILED) {
        failedPayments++;
      }
    });

    const totalRefundsCount = await this.refundRepository.count();
    const activePackagesCount = await this.coinPackageRepository.count({
      where: { isActive: true },
    });

    return {
      totalRevenueUsd,
      totalCoinsInCirculation,
      totalDiamondsIssued,
      successfulPayments,
      failedPayments,
      totalRefundsCount,
      activePackagesCount,
      dailyPurchasesCount: purchases.length,
    };
  }

  /**
   * GET /admin/wallet/payment-providers
   */
  async getPaymentProviders() {
    const defaultProviders = [
      {
        name: 'Google Play Billing',
        code: PaymentProviderType.GOOGLE_PLAY,
        isEnabled: true,
        isMock: true,
        supportedCurrencies: ['USD', 'EUR', 'INR'],
        supportedCountries: ['GLOBAL'],
      },
      {
        name: 'Apple In-App Purchase',
        code: PaymentProviderType.APPLE_IAP,
        isEnabled: true,
        isMock: true,
        supportedCurrencies: ['USD', 'EUR', 'GBP'],
        supportedCountries: ['GLOBAL'],
      },
      {
        name: 'Stripe',
        code: PaymentProviderType.STRIPE,
        isEnabled: true,
        isMock: true,
        supportedCurrencies: ['USD', 'EUR', 'CAD'],
        supportedCountries: ['GLOBAL'],
      },
      {
        name: 'Razorpay',
        code: PaymentProviderType.RAZORPAY,
        isEnabled: true,
        isMock: true,
        supportedCurrencies: ['INR', 'USD'],
        supportedCountries: ['IN'],
      },
      {
        name: 'PayPal',
        code: PaymentProviderType.PAYPAL,
        isEnabled: true,
        isMock: true,
        supportedCurrencies: ['USD', 'EUR', 'GBP'],
        supportedCountries: ['GLOBAL'],
      },
    ];

    let providers = await this.paymentProviderRepository.find();
    if (providers.length === 0) {
      for (const p of defaultProviders) {
        const created = this.paymentProviderRepository.create(p);
        await this.paymentProviderRepository.save(created);
      }
      providers = await this.paymentProviderRepository.find();
    }

    return providers;
  }

  /**
   * PATCH /admin/wallet/payment-providers/:id
   */
  async togglePaymentProvider(id: string, isEnabled: boolean) {
    const provider = await this.paymentProviderRepository.findOne({
      where: { id },
    });
    if (!provider) {
      throw new NotFoundException(`Payment provider '${id}' not found`);
    }

    provider.isEnabled = isEnabled;
    return this.paymentProviderRepository.save(provider);
  }

  /**
   * GET /admin/wallet/payment-logs
   */
  async getPaymentLogs() {
    return this.purchaseRepository.find({
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
