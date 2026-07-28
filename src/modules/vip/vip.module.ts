import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VipPlan } from './entities/vip-plan.entity';
import { UserVip } from './entities/user-vip.entity';
import { VipPurchaseHistory } from './entities/vip-purchase-history.entity';
import { VipService } from './vip.service';
import { VipController } from './vip.controller';

@Module({
  imports: [TypeOrmModule.forFeature([VipPlan, UserVip, VipPurchaseHistory])],
  controllers: [VipController],
  providers: [VipService],
  exports: [VipService],
})
export class VipModule {}
