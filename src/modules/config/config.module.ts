import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { RemoteConfigService } from './remote-config.service';
import { RemoteConfigController } from './remote-config.controller';

@Module({
  imports: [AdminModule],
  controllers: [RemoteConfigController],
  providers: [RemoteConfigService],
  exports: [RemoteConfigService],
})
export class AppConfigModule {}
