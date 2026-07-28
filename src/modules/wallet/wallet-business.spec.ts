import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { WalletBalance } from './entities/wallet-balance.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { CoinPackage } from './entities/coin-package.entity';
import { WalletTransactionType, WalletCurrency, WalletTransactionStatus } from '../../common/enums';

describe('Phase 2C Wallet Business APIs', () => {
  let service: WalletService;
  let controller: WalletController;

  const mockWalletBalanceRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockWalletTransactionRepository = {
    findOne: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockCoinPackageRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        WalletService,
        {
          provide: getRepositoryToken(WalletBalance),
          useValue: mockWalletBalanceRepository,
        },
        {
          provide: getRepositoryToken(WalletTransaction),
          useValue: mockWalletTransactionRepository,
        },
        {
          provide: getRepositoryToken(CoinPackage),
          useValue: mockCoinPackageRepository,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    controller = module.get<WalletController>(WalletController);
  });

  describe('WalletService - getOrCreateWalletBalance', () => {
    it('should return existing wallet balance if found', async () => {
      const mockBalance = { userId: 'user-123', coinBalance: 500, diamondBalance: 50 };
      mockWalletBalanceRepository.findOne.mockResolvedValue(mockBalance);

      const result = await service.getOrCreateWalletBalance('user-123');
      expect(result).toEqual(mockBalance);
      expect(mockWalletBalanceRepository.findOne).toHaveBeenCalledWith({ where: { userId: 'user-123' } });
    });

    it('should create and save a default zero-balance wallet if none exists', async () => {
      mockWalletBalanceRepository.findOne.mockResolvedValue(null);
      const createdWallet = { userId: 'user-456', coinBalance: 0, diamondBalance: 0 };
      mockWalletBalanceRepository.create.mockReturnValue(createdWallet);
      mockWalletBalanceRepository.save.mockResolvedValue(createdWallet);

      const result = await service.getOrCreateWalletBalance('user-456');
      expect(result).toEqual(createdWallet);
      expect(mockWalletBalanceRepository.create).toHaveBeenCalled();
      expect(mockWalletBalanceRepository.save).toHaveBeenCalled();
    });
  });

  describe('WalletService - getWalletBalance', () => {
    it('should return formatted balance metrics', async () => {
      const mockBalance = {
        userId: 'user-123',
        coinBalance: 1000,
        diamondBalance: 200,
        totalCoinsPurchased: 1500,
        totalCoinsSpent: 500,
        totalDiamondsEarned: 250,
        totalDiamondsWithdrawn: 50,
        updatedAt: new Date(),
      };
      mockWalletBalanceRepository.findOne.mockResolvedValue(mockBalance);

      const result = await service.getWalletBalance('user-123');
      expect(result.coinBalance).toBe(1000);
      expect(result.diamondBalance).toBe(200);
      expect(result.totalCoinsPurchased).toBe(1500);
      expect(result.totalCoinsSpent).toBe(500);
      expect(result.totalDiamondsEarned).toBe(250);
      expect(result.totalDiamondsWithdrawn).toBe(50);
    });
  });

  describe('WalletService - getWalletSummary', () => {
    it('should return wallet summary including latest transaction and statistics', async () => {
      const mockBalance = {
        userId: 'user-123',
        coinBalance: 300,
        diamondBalance: 30,
        totalCoinsPurchased: 300,
        totalCoinsSpent: 0,
        totalDiamondsEarned: 30,
        totalDiamondsWithdrawn: 0,
      };
      mockWalletBalanceRepository.findOne.mockResolvedValue(mockBalance);

      const mockTx = { id: 'tx-1', amount: 100, transactionType: WalletTransactionType.PURCHASE };
      mockWalletTransactionRepository.findOne.mockResolvedValue(mockTx);
      mockCoinPackageRepository.count.mockResolvedValue(5);
      mockWalletTransactionRepository.count.mockResolvedValue(12);

      const summary = await service.getWalletSummary('user-123');
      expect(summary.wallet.coinBalance).toBe(300);
      expect(summary.latestTransaction).toEqual(mockTx);
      expect(summary.activePackageCount).toBe(5);
      expect(summary.statistics.totalTransactionsCount).toBe(12);
    });
  });

  describe('WalletService - getTransactionHistory', () => {
    it('should return paginated transaction history', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [{ id: 'tx-1', amount: 100 }],
          1,
        ]),
      };
      mockWalletTransactionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getTransactionHistory('user-123', {
        page: 1,
        limit: 10,
        transactionType: WalletTransactionType.PURCHASE,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('WalletService - getTransactionById', () => {
    it('should return single transaction details if found', async () => {
      const mockTx = { id: 'tx-100', userId: 'user-123', amount: 250 };
      mockWalletTransactionRepository.findOne.mockResolvedValue(mockTx);

      const result = await service.getTransactionById('user-123', 'tx-100');
      expect(result).toEqual(mockTx);
    });

    it('should throw NotFoundException if transaction is not found', async () => {
      mockWalletTransactionRepository.findOne.mockResolvedValue(null);

      await expect(service.getTransactionById('user-123', 'tx-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('WalletService - getCoinPackages', () => {
    it('should return active packages ordered by displayOrder', async () => {
      const mockPackages = [
        { id: 'pkg-1', packageName: 'Starter Pack', displayOrder: 1, isActive: true },
        { id: 'pkg-2', packageName: 'Pro Pack', displayOrder: 2, isActive: true },
      ];
      mockCoinPackageRepository.find.mockResolvedValue(mockPackages);

      const packages = await service.getCoinPackages();
      expect(packages).toHaveLength(2);
      expect(mockCoinPackageRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { displayOrder: 'ASC' },
      });
    });
  });

  describe('WalletService - getPurchasePreview', () => {
    it('should generate purchase preview correctly without mutation', async () => {
      const mockPackage = {
        id: 'pkg-1',
        packageName: 'Mega Coins',
        coinAmount: 1000,
        bonusCoins: 200,
        price: 9.99,
        currency: WalletCurrency.USD,
        badgeText: 'BEST VALUE',
        isPopular: true,
        isActive: true,
      };
      mockCoinPackageRepository.findOne.mockResolvedValue(mockPackage);

      const preview = await service.getPurchasePreview({ packageId: 'pkg-1' });

      expect(preview.packageId).toBe('pkg-1');
      expect(preview.coins).toBe(1000);
      expect(preview.bonusCoins).toBe(200);
      expect(preview.totalCoins).toBe(1200);
      expect(preview.price).toBe(9.99);
      expect(preview.note).toContain('No payment was processed');
    });

    it('should throw NotFoundException if package does not exist', async () => {
      mockCoinPackageRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getPurchasePreview({ packageId: 'pkg-invalid' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if package is inactive', async () => {
      mockCoinPackageRepository.findOne.mockResolvedValue({
        id: 'pkg-inactive',
        isActive: false,
      });

      await expect(
        service.getPurchasePreview({ packageId: 'pkg-inactive' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('WalletService - getConversionPreview', () => {
    it('should calculate conversion preview accurately without mutation', async () => {
      const preview = await service.getConversionPreview({ diamondAmount: 150 });

      expect(preview.diamondAmount).toBe(150);
      expect(preview.conversionRate).toBe(10);
      expect(preview.estimatedCoins).toBe(1500);
      expect(preview.note).toContain('No wallet modification was performed');
    });
  });

  describe('WalletController Delegation', () => {
    it('should delegate getBalance to service', async () => {
      const spy = jest.spyOn(service, 'getWalletBalance').mockResolvedValue({ coinBalance: 100 } as any);
      const res = await controller.getBalance('user-1');
      expect(spy).toHaveBeenCalledWith('user-1');
      expect(res).toEqual({ coinBalance: 100 });
    });

    it('should delegate getSummary to service', async () => {
      const spy = jest.spyOn(service, 'getWalletSummary').mockResolvedValue({ activePackageCount: 3 } as any);
      const res = await controller.getSummary('user-1');
      expect(spy).toHaveBeenCalledWith('user-1');
      expect(res).toEqual({ activePackageCount: 3 });
    });

    it('should delegate getTransactions to service', async () => {
      const spy = jest.spyOn(service, 'getTransactionHistory').mockResolvedValue({ total: 0 } as any);
      const query = { page: 1, limit: 10 };
      const res = await controller.getTransactions('user-1', query);
      expect(spy).toHaveBeenCalledWith('user-1', query);
      expect(res).toEqual({ total: 0 });
    });

    it('should delegate getTransactionById to service', async () => {
      const spy = jest.spyOn(service, 'getTransactionById').mockResolvedValue({ id: 'tx-1' } as any);
      const res = await controller.getTransactionById('user-1', 'tx-1');
      expect(spy).toHaveBeenCalledWith('user-1', 'tx-1');
      expect(res).toEqual({ id: 'tx-1' });
    });

    it('should delegate getPackages to service', async () => {
      const spy = jest.spyOn(service, 'getCoinPackages').mockResolvedValue([]);
      const res = await controller.getPackages();
      expect(spy).toHaveBeenCalled();
      expect(res).toEqual([]);
    });

    it('should delegate getPurchasePreview to service', async () => {
      const dto = { packageId: 'pkg-1' };
      const spy = jest.spyOn(service, 'getPurchasePreview').mockResolvedValue({ totalCoins: 500 } as any);
      const res = await controller.getPurchasePreview(dto);
      expect(spy).toHaveBeenCalledWith(dto);
      expect(res).toEqual({ totalCoins: 500 });
    });

    it('should delegate getConversionPreview to service', async () => {
      const dto = { diamondAmount: 50 };
      const spy = jest.spyOn(service, 'getConversionPreview').mockResolvedValue({ estimatedCoins: 500 } as any);
      const res = await controller.getConversionPreview(dto);
      expect(spy).toHaveBeenCalledWith(dto);
      expect(res).toEqual({ estimatedCoins: 500 });
    });
  });
});
