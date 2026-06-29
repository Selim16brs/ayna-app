import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type CreateQuoteRequestInput, createQuoteRequestSchema } from './catalog.dto';
import { CatalogService } from './catalog.service';

@ApiTags('catalog')
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  categories() {
    return this.catalog.categories();
  }

  @Get('professionals')
  professionals() {
    return this.catalog.professionals();
  }

  @Get('quotes')
  quotes() {
    return this.catalog.quotes();
  }

  @Post('quote-requests')
  createQuoteRequest(
    @Body(new ZodValidationPipe(createQuoteRequestSchema)) body: CreateQuoteRequestInput,
  ) {
    return this.catalog.createQuoteRequest(body);
  }
}
