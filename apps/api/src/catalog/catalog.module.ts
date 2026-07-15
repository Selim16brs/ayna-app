import { Module } from '@nestjs/common';
import { CutoutModule } from '../cutout/cutout.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  imports: [CutoutModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
