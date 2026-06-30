import { Body, Controller, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminGuard } from '../common/admin.guard';
import {
  type SubmitRatingInput,
  submitRatingSchema,
  type ThresholdInput,
  thresholdSchema,
} from './ratings.dto';
import { RatingsService } from './ratings.service';

@ApiTags('ratings')
@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratings: RatingsService) {}

  @Post()
  submit(@Body(new ZodValidationPipe(submitRatingSchema)) body: SubmitRatingInput) {
    return this.ratings.submit(body);
  }

  @Get('summary')
  summary(@Query('subjectId') subjectId: string) {
    return this.ratings.summary(subjectId);
  }

  @Put('threshold')
  @UseGuards(AdminGuard)
  setThreshold(@Body(new ZodValidationPipe(thresholdSchema)) body: ThresholdInput) {
    return this.ratings.setThreshold(body.value);
  }
}
