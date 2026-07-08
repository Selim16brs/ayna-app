import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';

@ApiTags('catalog')
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  categories() {
    return this.catalog.categories();
  }

  @Get('campaigns')
  campaigns(@Query('locale') locale?: string) {
    return this.catalog.campaigns(locale);
  }

  @Get('ads')
  ads(@Query('locale') locale?: string) {
    return this.catalog.ads(locale);
  }

  @Get('professionals')
  professionals() {
    return this.catalog.professionals();
  }

  @Get('professionals/:id')
  professional(@Param('id') id: string) {
    return this.catalog.professional(id);
  }

  @Get('quotes')
  quotes() {
    return this.catalog.quotes();
  }

  // NOT: Eski girişsiz POST /quote-requests KALDIRILDI (Faz A) — gerçek akış
  // quotes/quotes.controller.ts'te (JWT'li, şehir hedeflemeli, push bildirimli).
}
