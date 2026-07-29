import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegionalPricingConfig } from './entities/regional-pricing-config.entity';
import { RegionalPricingService } from './regional-pricing.service';
import { RegionalPricingController } from './regional-pricing.controller';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [TypeOrmModule.forFeature([RegionalPricingConfig]), RedisModule],
  controllers: [RegionalPricingController],
  providers: [RegionalPricingService],
  exports: [RegionalPricingService],
})
export class RegionalPricingModule {}
