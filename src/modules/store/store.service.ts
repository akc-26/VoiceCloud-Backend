import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { StoreItem, StoreCategory } from './entities/store-item.entity';
import {
  UserInventory,
  InventoryObtainedVia,
} from './entities/user-inventory.entity';
import {
  StoreTransaction,
  StoreTransactionType,
  StoreCurrency,
} from './entities/store-transaction.entity';
import { CreateStoreItemDto } from './dto/create-store-item.dto';
import { UpdateStoreItemDto } from './dto/update-store-item.dto';
import { PurchaseStoreItemDto } from './dto/purchase-item.dto';
import { GiftStoreItemDto } from './dto/gift-item.dto';
import {
  QueryStoreCatalogDto,
  QueryUserInventoryDto,
} from './dto/query-store.dto';
import { GrantInventoryItemDto } from './dto/grant-inventory-item.dto';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RedisService } from '../../redis/redis.service';
import { EventsGateway } from '../../common/events/events.gateway';
import { REDIS_KEYS } from '../../redis/redis-keys.constant';
import { WalletBalanceType } from '../../common/enums';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class StoreService {
  private readonly logger = new Logger(StoreService.name);

  constructor(
    @InjectRepository(StoreItem)
    private readonly storeItemRepo: Repository<StoreItem>,
    @InjectRepository(UserInventory)
    private readonly userInventoryRepo: Repository<UserInventory>,
    @InjectRepository(StoreTransaction)
    private readonly transactionRepo: Repository<StoreTransaction>,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
    private readonly redisService: RedisService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * List store catalog with filters and caching
   */
  async getCatalog(query: QueryStoreCatalogDto) {
    const {
      category,
      rarity,
      search,
      isVipExclusive,
      page = 1,
      limit = 20,
    } = query;
    const skip = (page - 1) * limit;

    const qb = this.storeItemRepo.createQueryBuilder('item');
    qb.where('item.isActive = :isActive', { isActive: true });

    if (category) {
      qb.andWhere('item.category = :category', { category });
    }
    if (rarity) {
      qb.andWhere('item.rarity = :rarity', { rarity });
    }
    if (search) {
      qb.andWhere('LOWER(item.name) LIKE LOWER(:search)', {
        search: `%${search}%`,
      });
    }
    if (isVipExclusive !== undefined) {
      qb.andWhere('item.isVipExclusive = :isVipExclusive', { isVipExclusive });
    }

    qb.orderBy('item.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getItemById(id: string): Promise<StoreItem> {
    const item = await this.storeItemRepo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Store item with ID ${id} not found`);
    }
    return item;
  }

  /**
   * Admin: Create new store item
   */
  async createStoreItem(dto: CreateStoreItemDto): Promise<StoreItem> {
    const item = this.storeItemRepo.create({
      ...dto,
      durations: dto.durations || [
        { days: 7, coinPrice: Math.round(dto.priceCoins * 0.3) },
        { days: 30, coinPrice: dto.priceCoins },
        { days: -1, coinPrice: dto.priceCoins * 3 },
      ],
    });
    const saved = await this.storeItemRepo.save(item);
    this.logger.log(`Created store item ID ${saved.id} (${saved.name})`);
    return saved;
  }

  /**
   * Admin: Update store item
   */
  async updateStoreItem(
    id: string,
    dto: UpdateStoreItemDto,
  ): Promise<StoreItem> {
    const item = await this.getItemById(id);
    Object.assign(item, dto);
    const updated = await this.storeItemRepo.save(item);
    this.logger.log(`Updated store item ID ${id}`);
    return updated;
  }

  /**
   * Admin: Toggle active or delete item
   */
  async deleteStoreItem(id: string): Promise<{ success: boolean; id: string }> {
    const item = await this.getItemById(id);
    item.isActive = false;
    await this.storeItemRepo.save(item);
    this.logger.log(`Deactivated store item ID ${id}`);
    return { success: true, id };
  }

  /**
   * Purchase store item for self
   */
  async purchaseItem(userId: string, dto: PurchaseStoreItemDto) {
    const item = await this.getItemById(dto.itemId);
    if (!item.isActive) {
      throw new BadRequestException('Store item is currently inactive');
    }
    if (item.isLimitedEdition && item.stockQuantity <= 0) {
      throw new BadRequestException('Store item is out of stock');
    }

    const durationDays = dto.durationDays ?? 30;
    const currency = dto.currency || StoreCurrency.COINS;

    // Calculate price based on duration
    let price = item.priceCoins;
    if (currency === StoreCurrency.DIAMONDS) {
      price = item.priceDiamonds;
    }

    if (item.durations && item.durations.length > 0) {
      const match = item.durations.find((d) => d.days === durationDays);
      if (match) {
        price =
          currency === StoreCurrency.DIAMONDS && match.diamondPrice
            ? match.diamondPrice
            : match.coinPrice;
      }
    }

    // Debit user wallet
    if (price > 0) {
      await this.walletService.debitWallet({
        userId,
        amount: price,
        balanceType:
          currency === StoreCurrency.DIAMONDS
            ? WalletBalanceType.DIAMOND
            : WalletBalanceType.COIN,
        remarks: `Purchase store item: ${item.name} (${durationDays === -1 ? 'Permanent' : durationDays + ' days'})`,
      });
    }

    // Deduct stock if limited
    if (item.isLimitedEdition) {
      item.stockQuantity -= 1;
      await this.storeItemRepo.save(item);
    }

    // Calculate expiration
    let expiresAt: Date | null = null;
    if (durationDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);
    }

    // Grant or extend inventory item
    let inventory = await this.userInventoryRepo.findOne({
      where: { userId, itemId: item.id },
    });

    if (inventory) {
      // Extend expiration if already owned
      if (durationDays === -1) {
        inventory.expiresAt = null;
      } else if (inventory.expiresAt && inventory.expiresAt > new Date()) {
        const newExp = new Date(inventory.expiresAt);
        newExp.setDate(newExp.getDate() + durationDays);
        inventory.expiresAt = newExp;
      } else {
        inventory.expiresAt = expiresAt;
      }
      await this.userInventoryRepo.save(inventory);
    } else {
      inventory = this.userInventoryRepo.create({
        userId,
        itemId: item.id,
        obtainedVia: InventoryObtainedVia.PURCHASE,
        isEquipped: false,
        expiresAt,
      });
      inventory = await this.userInventoryRepo.save(inventory);
    }

    // Record transaction
    const transaction = this.transactionRepo.create({
      userId,
      itemId: item.id,
      transactionType: StoreTransactionType.PURCHASE,
      currency,
      amount: price,
      durationDays,
      expiresAt,
    });
    await this.transactionRepo.save(transaction);

    // Broadcast WebSocket event
    this.eventsGateway.broadcastStoreItemPurchased({
      userId,
      itemId: item.id,
      itemName: item.name,
      category: item.category,
      expiresAt,
    });

    return {
      message: 'Item purchased successfully',
      inventory,
      transaction,
    };
  }

  /**
   * Purchase and gift store item to another user
   */
  async giftItem(senderId: string, dto: GiftStoreItemDto) {
    if (senderId === dto.recipientId) {
      throw new BadRequestException(
        'Cannot gift store item to yourself. Use purchase instead.',
      );
    }

    const item = await this.getItemById(dto.itemId);
    if (!item.isActive) {
      throw new BadRequestException('Store item is currently inactive');
    }

    const durationDays = dto.durationDays ?? 30;
    const currency = dto.currency || StoreCurrency.COINS;

    let price =
      currency === StoreCurrency.DIAMONDS
        ? item.priceDiamonds
        : item.priceCoins;
    if (item.durations && item.durations.length > 0) {
      const match = item.durations.find((d) => d.days === durationDays);
      if (match) {
        price =
          currency === StoreCurrency.DIAMONDS && match.diamondPrice
            ? match.diamondPrice
            : match.coinPrice;
      }
    }

    // Debit sender wallet
    if (price > 0) {
      await this.walletService.debitWallet({
        userId: senderId,
        amount: price,
        balanceType:
          currency === StoreCurrency.DIAMONDS
            ? WalletBalanceType.DIAMOND
            : WalletBalanceType.COIN,
        remarks: `Gift store item: ${item.name} to user ${dto.recipientId}`,
      });
    }

    // Calculate expiration
    let expiresAt: Date | null = null;
    if (durationDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);
    }

    // Grant or extend inventory item for recipient
    let inventory = await this.userInventoryRepo.findOne({
      where: { userId: dto.recipientId, itemId: item.id },
    });

    if (inventory) {
      if (durationDays === -1) {
        inventory.expiresAt = null;
      } else if (inventory.expiresAt && inventory.expiresAt > new Date()) {
        const newExp = new Date(inventory.expiresAt);
        newExp.setDate(newExp.getDate() + durationDays);
        inventory.expiresAt = newExp;
      } else {
        inventory.expiresAt = expiresAt;
      }
      await this.userInventoryRepo.save(inventory);
    } else {
      inventory = this.userInventoryRepo.create({
        userId: dto.recipientId,
        itemId: item.id,
        obtainedVia: InventoryObtainedVia.GIFT,
        isEquipped: false,
        expiresAt,
      });
      inventory = await this.userInventoryRepo.save(inventory);
    }

    // Record transaction
    const transaction = this.transactionRepo.create({
      userId: senderId,
      recipientId: dto.recipientId,
      itemId: item.id,
      transactionType: StoreTransactionType.GIFT,
      currency,
      amount: price,
      durationDays,
      expiresAt,
    });
    await this.transactionRepo.save(transaction);

    // Send in-app notification to recipient
    await this.notificationsService.createNotification({
      userId: dto.recipientId,
      senderId,
      type: NotificationType.SYSTEM,
      title: 'You received a Gifted Item! 🎁',
      message: `Someone sent you '${item.name}' for ${durationDays === -1 ? 'permanent' : durationDays + ' days'}! Check your inventory to equip it.`,
      data: { itemId: item.id, senderId, giftMessage: dto.giftMessage },
    });

    // Broadcast Realtime event
    this.eventsGateway.broadcastStoreItemGifted({
      senderId,
      recipientId: dto.recipientId,
      itemId: item.id,
      itemName: item.name,
      category: item.category,
      giftMessage: dto.giftMessage,
    });

    return {
      message: 'Store item gifted successfully',
      inventory,
      transaction,
    };
  }

  /**
   * Equip an item from inventory
   */
  async equipItem(userId: string, inventoryId: string) {
    const inventory = await this.userInventoryRepo.findOne({
      where: { id: inventoryId, userId },
      relations: { item: true },
    });

    if (!inventory) {
      throw new NotFoundException(
        'Inventory item not found or does not belong to user',
      );
    }

    if (inventory.expiresAt && inventory.expiresAt < new Date()) {
      throw new BadRequestException('Cannot equip an expired item');
    }

    const itemCategory = inventory.item.category;

    // Unequip all other items in the same category for this user
    const userCategoryItems = await this.userInventoryRepo.find({
      where: { userId, isEquipped: true },
      relations: { item: true },
    });

    for (const item of userCategoryItems) {
      if (item.item.category === itemCategory) {
        item.isEquipped = false;
        await this.userInventoryRepo.save(item);
      }
    }

    // Equip target item
    inventory.isEquipped = true;
    const saved = await this.userInventoryRepo.save(inventory);

    // Update equipped state cache in Redis
    await this.updateUserEquippedCache(userId);

    // Broadcast Realtime Event
    this.eventsGateway.broadcastStoreItemEquipped({
      userId,
      inventoryId: saved.id,
      itemId: saved.itemId,
      category: itemCategory,
      assetUrl: saved.item.assetUrl,
    });

    return {
      message: `Equipped ${saved.item.name} successfully`,
      inventory: saved,
    };
  }

  /**
   * Unequip an item from inventory
   */
  async unequipItem(userId: string, inventoryId: string) {
    const inventory = await this.userInventoryRepo.findOne({
      where: { id: inventoryId, userId },
      relations: { item: true },
    });

    if (!inventory) {
      throw new NotFoundException(
        'Inventory item not found or does not belong to user',
      );
    }

    inventory.isEquipped = false;
    const saved = await this.userInventoryRepo.save(inventory);

    // Refresh Redis cache
    await this.updateUserEquippedCache(userId);

    return {
      message: `Unequipped ${saved.item.name} successfully`,
      inventory: saved,
    };
  }

  /**
   * List user's inventory
   */
  async getUserInventory(userId: string, query: QueryUserInventoryDto) {
    const { category, equippedOnly, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const qb = this.userInventoryRepo.createQueryBuilder('inv');
    qb.innerJoinAndSelect('inv.item', 'item');
    qb.where('inv.userId = :userId', { userId });

    if (equippedOnly) {
      qb.andWhere('inv.isEquipped = :equipped', { equipped: true });
    }
    if (category) {
      qb.andWhere('item.category = :category', { category });
    }

    qb.orderBy('inv.isEquipped', 'DESC').addOrderBy('inv.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [inventory, total] = await qb.getManyAndCount();

    // Check expiration status
    const now = new Date();
    const activeInventory = inventory.map((inv) => {
      const isExpired = inv.expiresAt ? inv.expiresAt < now : false;
      return {
        ...inv,
        isExpired,
      };
    });

    return {
      inventory: activeInventory,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get user's currently equipped items
   */
  async getUserEquippedItems(userId: string) {
    const equipped = await this.userInventoryRepo.find({
      where: { userId, isEquipped: true },
      relations: { item: true },
    });

    const equippedByCategory: Record<string, any> = {};
    for (const inv of equipped) {
      if (!inv.expiresAt || inv.expiresAt > new Date()) {
        equippedByCategory[inv.item.category] = {
          inventoryId: inv.id,
          itemId: inv.item.id,
          name: inv.item.name,
          category: inv.item.category,
          assetUrl: inv.item.assetUrl,
          iconUrl: inv.item.iconUrl,
          expiresAt: inv.expiresAt,
        };
      }
    }

    return equippedByCategory;
  }

  /**
   * Admin: Grant inventory item manually to user
   */
  async grantInventoryItem(dto: GrantInventoryItemDto) {
    const item = await this.getItemById(dto.itemId);
    const durationDays = dto.durationDays ?? 30;

    let expiresAt: Date | null = null;
    if (durationDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);
    }

    let inventory = await this.userInventoryRepo.findOne({
      where: { userId: dto.userId, itemId: item.id },
    });

    if (inventory) {
      inventory.expiresAt = expiresAt;
      await this.userInventoryRepo.save(inventory);
    } else {
      inventory = this.userInventoryRepo.create({
        userId: dto.userId,
        itemId: item.id,
        obtainedVia: InventoryObtainedVia.ADMIN_GRANT,
        isEquipped: false,
        expiresAt,
      });
      inventory = await this.userInventoryRepo.save(inventory);
    }

    // Record transaction
    const transaction = this.transactionRepo.create({
      userId: dto.userId,
      itemId: item.id,
      transactionType: StoreTransactionType.ADMIN_GRANT,
      currency: StoreCurrency.FREE,
      amount: 0,
      durationDays,
      expiresAt,
    });
    await this.transactionRepo.save(transaction);

    // Send Notification
    await this.notificationsService.createNotification({
      userId: dto.userId,
      type: NotificationType.SYSTEM,
      title: 'Admin Gift Received! 🌟',
      message: `You were granted '${item.name}' for ${durationDays === -1 ? 'permanent' : durationDays + ' days'}! Reason: ${dto.reason || 'Platform Reward'}.`,
      data: { itemId: item.id, reason: dto.reason },
    });

    return {
      message: 'Item granted to user successfully',
      inventory,
      transaction,
    };
  }

  /**
   * Background Worker: Expire temporary inventory items
   */
  async expireItemsProcessor() {
    const now = new Date();
    const expiredEquippedItems = await this.userInventoryRepo.find({
      where: {
        isEquipped: true,
        expiresAt: LessThanOrEqual(now),
      },
      relations: { item: true },
    });

    let unequippedCount = 0;
    for (const item of expiredEquippedItems) {
      item.isEquipped = false;
      await this.userInventoryRepo.save(item);
      await this.updateUserEquippedCache(item.userId);
      unequippedCount++;

      await this.notificationsService.createNotification({
        userId: item.userId,
        type: NotificationType.SYSTEM,
        title: 'Decor Item Expired ⏳',
        message: `Your equipped item '${item.item?.name}' has expired and was automatically unequipped. Visit the store to renew!`,
      });
    }

    this.logger.log(`Expired and unequipped ${unequippedCount} store items`);
    return { unequippedCount };
  }

  /**
   * Analytics: Store sales and revenue report
   */
  async getStoreAnalytics() {
    const totalTransactions = await this.transactionRepo.count();
    const totalItems = await this.storeItemRepo.count();

    const transactions = await this.transactionRepo.find({
      relations: { item: true },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    let totalCoinsSpent = 0;
    let totalDiamondsSpent = 0;

    for (const tx of transactions) {
      if (tx.currency === StoreCurrency.COINS) {
        totalCoinsSpent += tx.amount;
      } else if (tx.currency === StoreCurrency.DIAMONDS) {
        totalDiamondsSpent += tx.amount;
      }
    }

    return {
      totalItems,
      totalTransactions,
      totalCoinsSpent,
      totalDiamondsSpent,
      recentTransactions: transactions,
    };
  }

  /**
   * Helper: Cache user equipped items in Redis
   */
  private async updateUserEquippedCache(userId: string) {
    try {
      const equippedMap = await this.getUserEquippedItems(userId);
      const cacheKey = REDIS_KEYS.USER_EQUIPPED(userId);
      await this.redisService.set(cacheKey, JSON.stringify(equippedMap), 86400); // 24 hours
    } catch (err) {
      this.logger.warn(
        `Failed to update Redis user equipped cache for user ${userId}: ${(err as Error).message}`,
      );
    }
  }
}
