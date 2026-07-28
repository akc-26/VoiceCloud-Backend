import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockedUser } from './entities/blocked-user.entity';
import { Report } from './entities/report.entity';
import { ModerationAction } from './entities/moderation-action.entity';
import { ModerationNote } from './entities/moderation-note.entity';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';
import { ReportsController } from './reports.controller';
import { BlocksController } from './blocks.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BlockedUser,
      Report,
      ModerationAction,
      ModerationNote,
    ]),
  ],
  controllers: [ModerationController, ReportsController, BlocksController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
