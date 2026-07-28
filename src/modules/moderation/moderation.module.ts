import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockedUser } from './entities/blocked-user.entity';
import { Report } from './entities/report.entity';
import { ModerationAction } from './entities/moderation-action.entity';
import { ModerationNote } from './entities/moderation-note.entity';
import { ModerationService } from './moderation.service';
import { AutoModerationService } from './auto-moderation.service';
import { DeviceSecurityService } from './device-security.service';
import { ModerationController } from './moderation.controller';
import { ReportsController } from './reports.controller';
import { BlocksController } from './blocks.controller';
import { Phase18SecurityController } from './phase18-security.controller';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BlockedUser,
      Report,
      ModerationAction,
      ModerationNote,
    ]),
    RedisModule,
  ],
  controllers: [
    Phase18SecurityController,
    ModerationController,
    ReportsController,
    BlocksController,
  ],
  providers: [ModerationService, AutoModerationService, DeviceSecurityService],
  exports: [ModerationService, AutoModerationService, DeviceSecurityService],
})
export class ModerationModule {}
