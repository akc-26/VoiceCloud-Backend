import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Club } from './entities/club.entity';
import { ClubMember } from './entities/club-member.entity';
import { ClubsController } from './clubs.controller';
import { ClubsService } from './clubs.service';

@Module({
  imports: [TypeOrmModule.forFeature([Club, ClubMember])],
  controllers: [ClubsController],
  providers: [ClubsService],
  exports: [ClubsService, TypeOrmModule],
})
export class ClubsModule {}
