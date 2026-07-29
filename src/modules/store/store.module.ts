import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreItem } from './entities/store-item.entity';
import { UserInventory } from './entities/user-inventory.entity';
import { StoreTransaction } from './entities/store-transaction.entity';
import { StoreService } from './store.service';
import { StoreController } from './controllers/store.controller';
import { AdminStoreController } from './controllers/admin-store.controller';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RedisModule } from '../../redis/redis.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StoreItem, UserInventory, StoreTransaction]),
    WalletModule,
    NotificationsModule,
    RedisModule,
    CommonModule,
  ],
  controllers: [StoreController, AdminStoreController],
  providers: [StoreService],
  exports: [StoreService, TypeOrmModule],
})
export class StoreModule {}
