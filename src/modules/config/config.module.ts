import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from '../admin/admin.module';
import { RemoteConfigService } from './remote-config.service';
import { RemoteConfigController } from './remote-config.controller';
import { DynamicConfigService } from './dynamic-config.service';
import { ProviderConfig } from '../admin/entities/provider-config.entity';
import { RedisModule } from '../../redis/redis.module';
import { EventsModule } from '../../common/events/events.module';
import { CommonModule } from '../../common/common.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([ProviderConfig]),
    AdminModule,
    RedisModule,
    EventsModule,
    CommonModule,
  ],
  controllers: [RemoteConfigController],
  providers: [RemoteConfigService, DynamicConfigService],
  exports: [RemoteConfigService, DynamicConfigService],
})
export class AppConfigModule {}
