import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaFile } from './entities/media-file.entity';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { LocalStorageDriver } from './drivers/local-storage.driver';
import { S3StorageDriver } from './drivers/s3-storage.driver';
import { StorageFactory } from './storage.factory';
import { AppConfigModule } from '../config/config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MediaFile]),
    forwardRef(() => AppConfigModule),
  ],
  controllers: [StorageController],
  providers: [
    StorageService,
    LocalStorageDriver,
    S3StorageDriver,
    StorageFactory,
  ],
  exports: [
    StorageService,
    LocalStorageDriver,
    S3StorageDriver,
    StorageFactory,
    TypeOrmModule,
  ],
})
export class StorageModule {}
