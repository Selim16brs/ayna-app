import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TaksonomiService } from './taksonomi.service';
import { CatalogService } from './catalog.service';

@ApiTags('catalog')
@Controller()
export class CatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly taksonomi: TaksonomiService,
  ) {}

  /**
   * TAM HİZMET TAKSONOMİSİ — brief §4'teki tüm ekranların kaynağı.
   *
   * Üç dilin hepsi birden dönüyor: istemci dili değiştirdiğinde yeniden
   * istek atmak zorunda kalmasın (katalog küçük, üç dil taşımak ucuz).
   *
   * Kimlik doğrulaması YOK: katalog herkese açık bir vitrindir; müşteri
   * giriş yapmadan da kategorilere bakabilmeli.
   */
  @Get('taxonomy')
  taxonomy() {
    return this.taksonomi.taksonomi();
  }

  @Get('categories')
  categories() {
    return this.catalog.categories();
  }

  /**
   * Uzmanların kendi promosyonları — "Fırsatlar"dan AYRI.
   *
   * Kimlik doğrulaması YOK: promosyonlar herkese açık bir vitrin.
   * Konum isteğe bağlı; verilmezse mesafe alanı boş döner ve istemci
   * mesafe yazmaz (uydurma km yok).
   */
  @Get('promotions')
  promotions(@Query('lat') lat?: string, @Query('lng') lng?: string) {
    const n = (v?: string) => {
      const x = Number(v);
      return Number.isFinite(x) ? x : undefined;
    };
    return this.catalog.promotions(n(lat), n(lng));
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

  // §4.6 — GERÇEK slot listesi (Faz 1): çalışma saati+izin+dolu randevular sunucuda hesaplanır
  @Get('professionals/:id/slots')
  professionalSlots(
    @Param('id') id: string,
    @Query('day') day?: string,
    @Query('durationMin') durationMin?: string,
  ) {
    return this.catalog.professionalSlots(id, Number(day) || Date.now(), Number(durationMin) || 60);
  }

  // §4.2 — randevu alma ekranı: uzmanın DOLU aralıkları (yalnız zaman; müşteri bilgisi ASLA dönmez).
  // Müşteri dolu saati seçemez → çifte iş/karşılıklı öneri turu ortadan kalkar.
  @Get('professionals/:id/busy')
  professionalBusy(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.catalog.professionalBusy(id, Number(from) || undefined, Number(to) || undefined);
  }

  @Get('quotes')
  quotes() {
    return this.catalog.quotes();
  }

  // NOT: Eski girişsiz POST /quote-requests KALDIRILDI (Faz A) — gerçek akış
  // quotes/quotes.controller.ts'te (JWT'li, şehir hedeflemeli, push bildirimli).
}
