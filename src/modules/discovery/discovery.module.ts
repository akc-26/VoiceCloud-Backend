import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscoveryService } from './discovery.service';
import { DiscoveryController } from './discovery.controller';
import { User } from '../users/entities/user.entity';
import { Room } from '../rooms/entities/room.entity';
import { HostProfile } from '../hosts/entities/host-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Room, HostProfile])],
  controllers: [DiscoveryController],
  providers: [DiscoveryService],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
