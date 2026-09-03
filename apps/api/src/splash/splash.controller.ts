import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/admin.guard';
import { splashMesajSemasi, splashOlcumSemasi } from './splash.dto';
import { SplashService } from './splash.service';

@ApiTags('splash')
@Controller('splash')
export class SplashController {
  constructor(private readonly splash: SplashService) {}

  /**
   * Cihazın indirdiği katalog — brief §7.1.
   *
   * Kimlik doğrulaması YOK: açılış ekranı giriş yapılmadan önce de
   * çiziliyor, katalog gizli bir veri değil.
   */
  @Get('catalog')
  katalog() {
    return this.splash.katalog();
  }

  /**
   * Gösterim ölçümü — brief §7.3.
   *
   * Kimlik doğrulaması YOK ve İSTENMİYOR: gövde kişiye ait hiçbir alan
   * taşımıyor, sunucu da kim gönderdiğini kaydetmiyor.
   */
  @Post('impression')
  @HttpCode(204)
  async olcum(@Body() gövde: unknown): Promise<void> {
    const g = splashOlcumSemasi.parse(gövde);
    await this.splash.olcumYaz({ ...g, gun: new Date() });
  }
}

/** Panel uçları — brief §7.2. Hepsi AdminGuard arkasında. */
@ApiTags('admin')
@Controller('admin/splash')
@UseGuards(AdminGuard)
export class SplashAdminController {
  constructor(private readonly splash: SplashService) {}

  @Get()
  liste() {
    return this.splash.liste();
  }

  @Get('report')
  rapor(@Query('days') days?: string) {
    const n = Number(days);
    return this.splash.rapor(Number.isFinite(n) && n > 0 ? Math.min(365, Math.floor(n)) : 30);
  }

  @Post('seed')
  aktar() {
    return this.splash.yerelPaketiAktar();
  }

  @Post(':code')
  kaydet(@Param('code') code: string, @Body() gövde: unknown) {
    return this.splash.kaydet(code, splashMesajSemasi.parse(gövde));
  }

  @Post(':code/active')
  durum(@Param('code') code: string, @Body() gövde: { active?: unknown }) {
    return this.splash.pasifeAl(code, gövde.active === true);
  }
}
