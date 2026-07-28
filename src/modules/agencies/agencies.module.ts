import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agency } from './entities/agency.entity';
import { AgencyMember } from './entities/agency-member.entity';
import { AgencyInvitation } from './entities/agency-invitation.entity';
import { AgenciesService } from './agencies.service';
import { AgenciesController } from './agencies.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agency, AgencyMember, AgencyInvitation]),
    StorageModule,
  ],
  controllers: [AgenciesController],
  providers: [AgenciesService],
  exports: [AgenciesService],
})
export class AgenciesModule {}
