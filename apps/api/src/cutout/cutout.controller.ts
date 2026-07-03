import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CutoutService } from './cutout.service';

const cutoutSchema = z.object({ imageUrl: z.string().url() });

// §5.1.1/§13 — remove.bg cut-out (girişli; premium/uzman foto işleme)
@ApiTags('cutout')
@Controller('cutout')
export class CutoutController {
  constructor(private readonly cutout: CutoutService) {}

  @Get('available')
  available() {
    return this.cutout.available().then((available) => ({ available }));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  process(@Body(new ZodValidationPipe(cutoutSchema)) body: { imageUrl: string }) {
    return this.cutout.cutout(body.imageUrl);
  }
}
