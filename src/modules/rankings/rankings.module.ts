import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RankingsService } from './rankings.service';
import { RecommendationsService } from './recommendations.service';
import { RankingsController } from './rankings.controller';
import { User } from '../users/entities/user.entity';
import { Room } from '../rooms/entities/room.entity';
import { HostProfile } from '../hosts/entities/host-profile.entity';
import { Agency } from '../agencies/entities/agency.entity';
import { GiftTransaction } from '../gifts/entities/gift-transaction.entity';
import { UserVip } from '../vip/entities/user-vip.entity';
import { AgencyMember } from '../agencies/entities/agency-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Room,
      HostProfile,
      Agency,
      GiftTransaction,
      UserVip,
      AgencyMember,
    ]),
  ],
  controllers: [RankingsController],
  providers: [RankingsService, RecommendationsService],
  exports: [RankingsService, RecommendationsService],
})
export class RankingsModule {}
