import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import {
  WalletBalanceType,
  WalletCurrency,
  WalletTransactionStatus,
  WalletTransactionType,
} from '../../common/enums';
import { Room } from '../rooms/entities/room.entity';
import { User } from '../users/entities/user.entity';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { WalletMutationService } from '../wallet/wallet-mutation.service';
import { Gift } from './entities/gift.entity';
import { GiftTransaction } from './entities/gift-transaction.entity';

export interface GiftSettlementRequest {
  senderId: string;
  giftId: string;
  receiverIds?: string[];
  context: string;
  roomId?: string;
  quantity: number;
  comboCount: number;
  multiplier: number;
  operationKey?: string;
}

export interface GiftSettlementResult {
  gift: Gift;
  operationGroupId: string;
  receiverIds: string[];
  transactions: GiftTransaction[];
  totalCoinsDeducted: number;
  remainingSenderCoins: number;
  diamondsPerReceiver: number;
  comboCount: number;
  multiplier: number;
  idempotent: boolean;
}

@Injectable()
export class GiftSettlementService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly walletMutationService: WalletMutationService,
  ) {}

  async settle(request: GiftSettlementRequest): Promise<GiftSettlementResult> {
    this.assertRequest(request);

    const operationGroupId =
      request.operationKey?.trim() || `gift:${randomUUID()}`;

    return this.dataSource.transaction(async (manager) => {
      await this.lockOperationKey(manager, operationGroupId);

      const giftRepository = manager.getRepository(Gift);
      const gift = await giftRepository.findOne({
        where: { id: request.giftId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!gift) {
        throw new NotFoundException(
          `Gift with ID '${request.giftId}' not found`,
        );
      }

      if (!gift.isActive || gift.isArchived) {
        throw new BadRequestException(
          `Gift '${gift.name}' is currently unavailable`,
        );
      }

      const receiverIds = await this.resolveReceiverIds(manager, request);
      const replay = await this.findReplay(
        manager,
        operationGroupId,
        request,
        receiverIds,
      );

      if (replay) {
        return this.buildReplayResult(manager, gift, replay);
      }

      const recipientCount = receiverIds.length;
      const totalUnits = request.quantity * recipientCount;
      const totalCoinsRequired = gift.coinPrice * totalUnits;

      if (
        gift.isLimitedEdition &&
        gift.remainingStock !== null &&
        gift.remainingStock < totalUnits
      ) {
        throw new BadRequestException(
          `Insufficient stock for '${gift.name}'. Requested: ${totalUnits}, Remaining: ${gift.remainingStock}`,
        );
      }

      const wallets = await this.lockWallets(manager, [
        request.senderId,
        ...receiverIds,
      ]);
      const senderWallet = wallets.get(request.senderId);

      if (!senderWallet) {
        throw new NotFoundException('Sender wallet could not be resolved');
      }

      const senderBalanceBefore = senderWallet.coinBalance;
      if (senderBalanceBefore < totalCoinsRequired) {
        throw new BadRequestException(
          `Insufficient coin balance. Required: ${totalCoinsRequired}, Available: ${senderBalanceBefore}`,
        );
      }

      const creatorEarningsPct = gift.creatorEarningsPercentage || 70;
      const totalDiamonds = Math.floor(
        totalCoinsRequired * (creatorEarningsPct / 100) * request.multiplier,
      );
      const diamondsPerReceiver = Math.floor(totalDiamonds / recipientCount);

      senderWallet.coinBalance -= totalCoinsRequired;
      senderWallet.totalCoinsSpent += totalCoinsRequired;

      const receiverBalanceSnapshots = new Map<
        string,
        { before: number; after: number }
      >();

      for (const receiverId of receiverIds) {
        const wallet = wallets.get(receiverId);
        if (!wallet) {
          throw new NotFoundException(
            `Receiver wallet '${receiverId}' could not be resolved`,
          );
        }

        const before = wallet.diamondBalance;
        wallet.diamondBalance += diamondsPerReceiver;
        wallet.totalDiamondsEarned += diamondsPerReceiver;
        receiverBalanceSnapshots.set(receiverId, {
          before,
          after: wallet.diamondBalance,
        });
      }

      const walletRepository = manager.getRepository(WalletBalance);
      await walletRepository.save([...wallets.values()]);

      const senderWalletTransaction = await this.writeWalletLedger(
        manager,
        senderWallet,
        {
          userId: request.senderId,
          transactionType: WalletTransactionType.GIFT_SENT,
          amount: totalCoinsRequired,
          currency: WalletCurrency.COIN,
          balanceType: WalletBalanceType.COIN,
          source: request.senderId,
          destination: receiverIds.join(','),
          referenceType: 'GIFT_SETTLEMENT',
          referenceId: gift.id,
          operationKey: `${operationGroupId}:sender-debit`,
          operationGroupId,
          balanceBefore: senderBalanceBefore,
          balanceAfter: senderWallet.coinBalance,
          remarks: `Sent ${gift.name} to ${recipientCount} recipient(s)`,
          metadata: {
            giftId: gift.id,
            roomId: request.roomId,
            quantity: request.quantity,
            recipientCount,
            comboCount: request.comboCount,
            multiplier: request.multiplier,
          },
        },
      );

      const giftTransactions: GiftTransaction[] = [];
      for (const receiverId of receiverIds) {
        const receiverWallet = wallets.get(receiverId);
        const snapshot = receiverBalanceSnapshots.get(receiverId);

        if (!receiverWallet || !snapshot) {
          throw new ConflictException(
            `Receiver settlement state '${receiverId}' is incomplete`,
          );
        }

        const receiverWalletTransaction = await this.writeWalletLedger(
          manager,
          receiverWallet,
          {
            userId: receiverId,
            transactionType: WalletTransactionType.GIFT_RECEIVED,
            amount: diamondsPerReceiver,
            currency: WalletCurrency.DIAMOND,
            balanceType: WalletBalanceType.DIAMOND,
            source: request.senderId,
            destination: receiverId,
            referenceType: 'GIFT_SETTLEMENT',
            referenceId: gift.id,
            operationKey: `${operationGroupId}:receiver:${receiverId}:credit`,
            operationGroupId,
            balanceBefore: snapshot.before,
            balanceAfter: snapshot.after,
            remarks: `Received ${gift.name} from ${request.senderId}`,
            metadata: {
              giftId: gift.id,
              roomId: request.roomId,
              quantity: request.quantity,
              comboCount: request.comboCount,
              multiplier: request.multiplier,
              totalCoins: gift.coinPrice * request.quantity,
            },
          },
        );

        const giftTransaction = manager.getRepository(GiftTransaction).create({
          senderId: request.senderId,
          receiverId,
          giftId: gift.id,
          giftName: gift.name,
          giftCategory: gift.category,
          context: request.context,
          roomId: request.roomId || null,
          quantity: request.quantity,
          totalCoins: gift.coinPrice * request.quantity,
          comboCount: request.comboCount,
          multiplier: request.multiplier,
          creatorEarnings: diamondsPerReceiver,
          operationKey: `${operationGroupId}:gift:${receiverId}`,
          operationGroupId,
          senderWalletTransactionId: senderWalletTransaction.id,
          receiverWalletTransactionId: receiverWalletTransaction.id,
          settledAt: new Date(),
        });

        giftTransactions.push(
          await manager.getRepository(GiftTransaction).save(giftTransaction),
        );
      }

      if (gift.isLimitedEdition && gift.remainingStock !== null) {
        gift.remainingStock -= totalUnits;
        await giftRepository.save(gift);
      }

      return {
        gift,
        operationGroupId,
        receiverIds,
        transactions: giftTransactions,
        totalCoinsDeducted: totalCoinsRequired,
        remainingSenderCoins: senderWallet.coinBalance,
        diamondsPerReceiver,
        comboCount: request.comboCount,
        multiplier: request.multiplier,
        idempotent: false,
      };
    });
  }

  private assertRequest(request: GiftSettlementRequest): void {
    if (!request.senderId?.trim()) {
      throw new BadRequestException('Sender ID is required');
    }
    if (!request.giftId?.trim()) {
      throw new BadRequestException('Gift ID is required');
    }
    if (!Number.isInteger(request.quantity) || request.quantity < 1) {
      throw new BadRequestException('Gift quantity must be a positive integer');
    }
    if (!Number.isFinite(request.multiplier) || request.multiplier <= 0) {
      throw new BadRequestException('Gift multiplier must be positive');
    }
  }

  private async lockOperationKey(
    manager: EntityManager,
    operationGroupId: string,
  ): Promise<void> {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      operationGroupId,
    ]);
  }

  private async resolveReceiverIds(
    manager: EntityManager,
    request: GiftSettlementRequest,
  ): Promise<string[]> {
    const receiverIds = [
      ...new Set(
        (request.receiverIds || [])
          .map((receiverId) => receiverId.trim())
          .filter(Boolean),
      ),
    ];

    if (receiverIds.length === 0) {
      if (!request.roomId) {
        throw new BadRequestException(
          'At least one receiver or a room ID is required',
        );
      }

      const room = await manager.getRepository(Room).findOne({
        where: { id: request.roomId },
      });
      if (!room) {
        throw new NotFoundException(
          `Room with ID '${request.roomId}' not found`,
        );
      }
      receiverIds.push(room.hostId);
    }

    if (receiverIds.includes(request.senderId)) {
      throw new BadRequestException('Users cannot send gifts to themselves');
    }

    return receiverIds;
  }

  private async lockWallets(
    manager: EntityManager,
    userIds: string[],
  ): Promise<Map<string, WalletBalance>> {
    const wallets = new Map<string, WalletBalance>();
    const walletRepository = manager.getRepository(WalletBalance);
    const userRepository = manager.getRepository(User);

    for (const userId of this.walletMutationService.getDeterministicLockOrder(
      userIds,
    )) {
      const user = await userRepository.findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) {
        throw new NotFoundException(`User '${userId}' not found`);
      }

      let wallet = await walletRepository.findOne({
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) {
        wallet = walletRepository.create({
          userId,
          coinBalance: 0,
          diamondBalance: 0,
          bonusBalance: 0,
          promotionalBalance: 0,
          frozenBalance: 0,
          withdrawableBalance: 0,
          totalCoinsPurchased: 0,
          totalCoinsSpent: 0,
          totalDiamondsEarned: 0,
          totalDiamondsWithdrawn: 0,
        });
        wallet = await walletRepository.save(wallet);
      }
      wallets.set(userId, wallet);
    }

    return wallets;
  }

  private async findReplay(
    manager: EntityManager,
    operationGroupId: string,
    request: GiftSettlementRequest,
    receiverIds: string[],
  ): Promise<GiftTransaction[] | null> {
    const transactions = await manager.getRepository(GiftTransaction).find({
      where: { operationGroupId },
      order: { createdAt: 'ASC' },
    });

    if (transactions.length === 0) {
      return null;
    }

    const expectedReceivers = [...receiverIds].sort();
    const actualReceivers = transactions
      .map((transaction) => transaction.receiverId)
      .sort();
    const matchesReceivers =
      expectedReceivers.length === actualReceivers.length &&
      expectedReceivers.every(
        (receiverId, index) => receiverId === actualReceivers[index],
      );
    const matchesRequest = transactions.every(
      (transaction) =>
        transaction.senderId === request.senderId &&
        transaction.giftId === request.giftId &&
        transaction.context === request.context &&
        (transaction.roomId || undefined) === request.roomId &&
        transaction.quantity === request.quantity,
    );

    if (!matchesReceivers || !matchesRequest) {
      throw new ConflictException(
        'Operation key is already bound to a different gift settlement',
      );
    }

    return transactions;
  }

  private async buildReplayResult(
    manager: EntityManager,
    gift: Gift,
    transactions: GiftTransaction[],
  ): Promise<GiftSettlementResult> {
    const first = transactions[0];
    const senderLedger = first.senderWalletTransactionId
      ? await manager.getRepository(WalletTransaction).findOne({
          where: { id: first.senderWalletTransactionId },
        })
      : null;

    if (!first.operationGroupId || !senderLedger) {
      throw new ConflictException(
        'Existing gift settlement is missing authoritative ledger evidence',
      );
    }

    return {
      gift,
      operationGroupId: first.operationGroupId,
      receiverIds: transactions.map((transaction) => transaction.receiverId),
      transactions,
      totalCoinsDeducted: Number(senderLedger.amount),
      remainingSenderCoins: Number(senderLedger.balanceAfter),
      diamondsPerReceiver: Number(first.creatorEarnings),
      comboCount: first.comboCount,
      multiplier: first.multiplier,
      idempotent: true,
    };
  }

  private async writeWalletLedger(
    manager: EntityManager,
    wallet: WalletBalance,
    params: {
      userId: string;
      transactionType: WalletTransactionType;
      amount: number;
      currency: WalletCurrency;
      balanceType: WalletBalanceType;
      source: string;
      destination: string;
      referenceType: string;
      referenceId: string;
      operationKey: string;
      operationGroupId: string;
      balanceBefore: number;
      balanceAfter: number;
      remarks: string;
      metadata: Record<string, unknown>;
    },
  ): Promise<WalletTransaction> {
    const repository = manager.getRepository(WalletTransaction);
    const transaction = repository.create({
      walletId: wallet.id,
      userId: params.userId,
      transactionType: params.transactionType,
      amount: params.amount,
      currency: params.currency,
      balanceType: params.balanceType,
      source: params.source,
      destination: params.destination,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      status: WalletTransactionStatus.COMPLETED,
      remarks: params.remarks,
      description: params.remarks,
      metadata: params.metadata,
      operationKey: params.operationKey,
      operationGroupId: params.operationGroupId,
      balanceBefore: params.balanceBefore,
      balanceAfter: params.balanceAfter,
    });

    return repository.save(transaction);
  }
}
