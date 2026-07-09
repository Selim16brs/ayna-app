import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';

// Global — her modül StorageService'i import etmeden enjekte edebilir.
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
