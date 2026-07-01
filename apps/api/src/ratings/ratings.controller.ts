import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminGuard } from '../common/admin.guard';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  type ReplyInput,
  replySchema,
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

  // Doğrulanmış yorum: giriş zorunlu; sunucu randevu sahipliğini ve tamamlanmışlığını denetler
  @Post()
  @UseGuards(JwtAuthGuard)
  submit(
    @Body(new ZodValidationPipe(submitRatingSchema)) body: SubmitRatingInput,
    @Req() req: AuthedRequest,
  ) {
    return this.ratings.submit(body, req.user!.id);
  }

  @Get('summary')
  summary(@Query('subjectId') subjectId: string) {
    return this.ratings.summary(subjectId);
  }

  // §6.D — uzman/işletme yorumu yanıtlar (giriş gerekli; yorum silinemez, yalnızca yanıt)
  @Post(':id/reply')
  @UseGuards(JwtAuthGuard)
  reply(@Param('id') id: string, @Body(new ZodValidationPipe(replySchema)) body: ReplyInput) {
    return this.ratings.reply(id, body.reply);
  }

  @Put('threshold')
  @UseGuards(AdminGuard)
  setThreshold(@Body(new ZodValidationPipe(thresholdSchema)) body: ThresholdInput) {
    return this.ratings.setThreshold(body.value);
  }
}
