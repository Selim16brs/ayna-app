import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { MediaMigrationScheduler } from './media-migration.scheduler';

// Global — her modül StorageService'i import etmeden enjekte edebilir.
@Global()
@Module({
  providers: [StorageService, MediaMigrationScheduler],
  exports: [StorageService],
})
export class StorageModule {}
