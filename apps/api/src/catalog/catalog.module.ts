import { Module } from '@nestjs/common';
import { CutoutModule } from '../cutout/cutout.module';
import { CatalogController } from './catalog.controller';
import { CategorySyncService } from './category-sync.service';
import { TaksonomiService } from './taksonomi.service';
import { CatalogService } from './catalog.service';

@Module({
  imports: [CutoutModule],
  controllers: [CatalogController],
  providers: [CatalogService, TaksonomiService, CategorySyncService],
})
export class CatalogModule {}
