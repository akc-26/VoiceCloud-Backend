import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { User } from '../users/entities/user.entity';
import { Room } from '../rooms/entities/room.entity';
import { HostProfile } from '../hosts/entities/host-profile.entity';
import { Gift } from '../gifts/entities/gift.entity';
import { Announcement } from '../announcements/entities/announcement.entity';
import { SearchHistory } from './entities/search-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Room,
      HostProfile,
      Gift,
      Announcement,
      SearchHistory,
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
