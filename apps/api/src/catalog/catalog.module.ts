import { Module } from '@nestjs/common';
import { BasariModule } from '../basari/basari.module';
import { CutoutModule } from '../cutout/cutout.module';
import { CatalogController } from './catalog.controller';
import { CategorySyncService } from './category-sync.service';
import { TaksonomiService } from './taksonomi.service';
import { ReguleUyariService } from './regule-uyari.service';
import { CatalogService } from './catalog.service';

@Module({
  imports: [CutoutModule, BasariModule],
  controllers: [CatalogController],
  providers: [CatalogService, TaksonomiService, CategorySyncService, ReguleUyariService],
  // Uzman kaydı ve yönetici kuyruğu AYNI servisi kullanıyor: tarama
  // mantığının ikinci bir kopyası olmasın.
  exports: [ReguleUyariService],
})
export class CatalogModule {}
