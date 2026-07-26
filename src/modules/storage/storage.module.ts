import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaFile } from './entities/media-file.entity';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { LocalStorageDriver } from './drivers/local-storage.driver';

@Module({
  imports: [TypeOrmModule.forFeature([MediaFile])],
  controllers: [StorageController],
  providers: [StorageService, LocalStorageDriver],
  exports: [StorageService, LocalStorageDriver, TypeOrmModule],
})
export class StorageModule {}
