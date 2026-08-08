import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RtcController } from './rtc.controller';
import { RtcService } from './rtc.service';
import { RtcConfig } from './entities/rtc-config.entity';
import { RtcSession } from './entities/rtc-session.entity';
import { RtcSpeakerHistory } from './entities/rtc-speaker-history.entity';
import { RtcRecordingJob } from './entities/rtc-recording-job.entity';
import { RtcAnalytics } from './entities/rtc-analytics.entity';
import { Room } from '../rooms/entities/room.entity';
import { RtcProviderFactory } from './providers/rtc-provider.factory';
import { AgoraProvider } from './providers/agora.provider';
import { LiveKitProvider } from './providers/livekit.provider';
import { ZegoCloudProvider } from './providers/zegocloud.provider';
import { DefaultMockProvider } from './providers/default-mock.provider';
import { RedisModule } from '../../redis/redis.module';
import { EventsModule } from '../../common/events/events.module';
import { AppConfigModule } from '../config/config.module';
import { SystemSettingsModule } from '../admin/system-settings/system-settings.module';

import { RtcQualityMetric } from './entities/rtc-quality-metric.entity';
import { RtcQualityService } from './rtc-quality.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RtcConfig,
      RtcSession,
      RtcSpeakerHistory,
      RtcRecordingJob,
      RtcAnalytics,
      RtcQualityMetric,
      Room,
    ]),
    RedisModule,
    EventsModule,
    AppConfigModule,
    SystemSettingsModule,
  ],
  controllers: [RtcController],
  providers: [
    RtcService,
    RtcQualityService,
    RtcProviderFactory,
    AgoraProvider,
    LiveKitProvider,
    ZegoCloudProvider,
    DefaultMockProvider,
  ],
  exports: [RtcService, RtcQualityService, RtcProviderFactory],
})
export class RtcModule {}
