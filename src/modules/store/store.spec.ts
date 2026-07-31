import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StoreService } from './store.service';
import {
  StoreItem,
  StoreCategory,
  ItemRarity,
} from './entities/store-item.entity';
import {
  UserInventory,
  InventoryObtainedVia,
} from './entities/user-inventory.entity';
import {
  StoreTransaction,
  StoreCurrency,
} from './entities/store-transaction.entity';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RedisService } from '../../redis/redis.service';
import { EventsGateway } from '../../common/events/events.gateway';

describe('Phase 29 - StoreService & Personalization Mall', () => {
  let service: StoreService;
  let storeItemRepo: any;
  let userInventoryRepo: any;
  let transactionRepo: any;
  let walletService: any;
  let notificationsService: any;
  let redisService: any;
  let eventsGateway: any;

  const mockItem: StoreItem = {
    id: 'item-uuid-1',
    name: 'Phoenix Frame',
    description: 'Golden glowing avatar frame',
    category: StoreCategory.AVATAR_FRAME,
    rarity: ItemRarity.LEGENDARY,
    iconUrl: 'https://cdn.voicecloud.app/store/icons/phoenix.png',
    assetUrl: 'https://cdn.voicecloud.app/store/svga/phoenix.svga',
    priceCoins: 500,
    priceDiamonds: 50,
    isVipExclusive: false,
    minVipLevel: 0,
    isLimitedEdition: false,
    stockQuantity: 100,
    durations: [
      { days: 7, coinPrice: 200 },
      { days: 30, coinPrice: 500 },
      { days: -1, coinPrice: 1500 },
    ],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInventory: UserInventory = {
    id: 'inv-uuid-1',
    userId: 'user-1',
    itemId: 'item-uuid-1',
    item: mockItem,
    obtainedVia: InventoryObtainedVia.PURCHASE,
    isEquipped: false,
    expiresAt: new Date(Date.now() + 864000000), // 10 days in future
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    storeItemRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockItem], 1]),
      }),
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, id: 'item-uuid-new' })),
      save: jest.fn((item) => Promise.resolve(item)),
      count: jest.fn().mockResolvedValue(10),
    };

    userInventoryRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockInventory], 1]),
      }),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((dto) => ({ ...dto, id: 'inv-uuid-new' })),
      save: jest.fn((inv) => Promise.resolve(inv)),
    };

    transactionRepo = {
      create: jest.fn((dto) => ({ ...dto, id: 'tx-uuid-1' })),
      save: jest.fn((tx) => Promise.resolve(tx)),
      count: jest.fn().mockResolvedValue(25),
      find: jest.fn().mockResolvedValue([]),
    };

    walletService = {
      debitWallet: jest.fn().mockResolvedValue({ success: true }),
    };

    notificationsService = {
      createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    redisService = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
    };

    eventsGateway = {
      broadcastStoreItemPurchased: jest.fn(),
      broadcastStoreItemEquipped: jest.fn(),
      broadcastStoreItemGifted: jest.fn(),
      broadcastEntranceEffectTriggered: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreService,
        { provide: getRepositoryToken(StoreItem), useValue: storeItemRepo },
        {
          provide: getRepositoryToken(UserInventory),
          useValue: userInventoryRepo,
        },
        {
          provide: getRepositoryToken(StoreTransaction),
          useValue: transactionRepo,
        },
        { provide: WalletService, useValue: walletService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: RedisService, useValue: redisService },
        { provide: EventsGateway, useValue: eventsGateway },
      ],
    }).compile();

    service = module.get<StoreService>(StoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCatalog', () => {
    it('should return paginated store catalog items', async () => {
      const res = await service.getCatalog({ page: 1, limit: 10 });
      expect(res.items).toHaveLength(1);
      expect(res.total).toBe(1);
    });
  });

  describe('getItemById', () => {
    it('should return store item when found', async () => {
      storeItemRepo.findOne.mockResolvedValue(mockItem);
      const res = await service.getItemById('item-uuid-1');
      expect(res.name).toBe('Phoenix Frame');
    });

    it('should throw NotFoundException when item does not exist', async () => {
      storeItemRepo.findOne.mockResolvedValue(null);
      await expect(service.getItemById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('purchaseItem', () => {
    it('should debit wallet and grant inventory item on valid purchase', async () => {
      storeItemRepo.findOne.mockResolvedValue(mockItem);
      userInventoryRepo.findOne.mockResolvedValue(null);

      const res = await service.purchaseItem('user-1', {
        itemId: 'item-uuid-1',
        durationDays: 30,
        currency: StoreCurrency.COINS,
      });

      expect(walletService.debitWallet).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', amount: 500 }),
      );
      expect(userInventoryRepo.save).toHaveBeenCalled();
      expect(transactionRepo.save).toHaveBeenCalled();
      expect(eventsGateway.broadcastStoreItemPurchased).toHaveBeenCalled();
      expect(res.message).toContain('purchased successfully');
    });

    it('should throw error when purchasing inactive item', async () => {
      storeItemRepo.findOne.mockResolvedValue({ ...mockItem, isActive: false });
      await expect(
        service.purchaseItem('user-1', { itemId: 'item-uuid-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('giftItem', () => {
    it('should debit sender wallet and grant inventory item to recipient', async () => {
      storeItemRepo.findOne.mockResolvedValue(mockItem);
      userInventoryRepo.findOne.mockResolvedValue(null);

      const res = await service.giftItem('sender-1', {
        itemId: 'item-uuid-1',
        recipientId: 'recipient-2',
        durationDays: 30,
        currency: StoreCurrency.COINS,
        giftMessage: 'Enjoy your frame!',
      });

      expect(walletService.debitWallet).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'sender-1', amount: 500 }),
      );
      expect(notificationsService.createNotification).toHaveBeenCalled();
      expect(eventsGateway.broadcastStoreItemGifted).toHaveBeenCalled();
      expect(res.message).toContain('gifted successfully');
    });

    it('should throw error when gifting to self', async () => {
      await expect(
        service.giftItem('user-1', {
          itemId: 'item-uuid-1',
          recipientId: 'user-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('equipItem & unequipItem', () => {
    it('should unequip other items in same category and equip target item', async () => {
      userInventoryRepo.findOne.mockResolvedValue(mockInventory);
      userInventoryRepo.find.mockResolvedValue([]);

      const res = await service.equipItem('user-1', 'inv-uuid-1');

      expect(userInventoryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isEquipped: true }),
      );
      expect(eventsGateway.broadcastStoreItemEquipped).toHaveBeenCalled();
      expect(res.message).toContain('Equipped');
    });

    it('should unequip item when requested', async () => {
      userInventoryRepo.findOne.mockResolvedValue({
        ...mockInventory,
        isEquipped: true,
      });

      const res = await service.unequipItem('user-1', 'inv-uuid-1');

      expect(userInventoryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isEquipped: false }),
      );
      expect(res.message).toContain('Unequipped');
    });
  });

  describe('grantInventoryItem (Admin)', () => {
    it('should grant item to user without wallet deduction', async () => {
      storeItemRepo.findOne.mockResolvedValue(mockItem);
      userInventoryRepo.findOne.mockResolvedValue(null);

      const res = await service.grantInventoryItem({
        userId: 'user-admin-grant',
        itemId: 'item-uuid-1',
        durationDays: 30,
        reason: 'VIP Reward',
      });

      expect(walletService.debitWallet).not.toHaveBeenCalled();
      expect(notificationsService.createNotification).toHaveBeenCalled();
      expect(res.message).toContain('granted to user successfully');
    });
  });
});
