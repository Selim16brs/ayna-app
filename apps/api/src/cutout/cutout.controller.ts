import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CutoutService } from './cutout.service';

// Kaynak: public URL VEYA yerel fotonun base64'ü (en az biri zorunlu)
const cutoutSchema = z
  .object({
    imageUrl: z.string().url().optional(),
    imageB64: z.string().min(1).max(12_000_000).optional(),
  })
  .refine((d) => !!d.imageUrl || !!d.imageB64, { message: 'imageUrl veya imageB64 gerekli' });

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
  process(@Body(new ZodValidationPipe(cutoutSchema)) body: { imageUrl?: string; imageB64?: string }) {
    return this.cutout.cutout({ imageUrl: body.imageUrl, imageB64: body.imageB64 });
  }
}
