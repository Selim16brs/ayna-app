import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// §13 — remove.bg sağlayıcı SOYUTLAMASI: ileride tek noktadan değiştirilebilir.
// Anahtar admin panelden (§12.9 apikey.removebg) gelir; koda gömülmez.
@Injectable()
export class CutoutService {
  constructor(private readonly prisma: PrismaService) {}

  private async apiKey(): Promise<string | null> {
    const row = await this.prisma.setting.findUnique({ where: { key: 'apikey.removebg' } });
    return row?.strValue?.trim() || null;
  }

  async available(): Promise<boolean> {
    return !!(await this.apiKey());
  }

  // Görselin arka planını temizler (cut-out). Anahtar yoksa "şu an kullanılamıyor" (§12.9).
  async cutout(imageUrl: string): Promise<{ dataUrl: string }> {
    const key = await this.apiKey();
    if (!key) {
      throw new ServiceUnavailableException({
        code: 'CUTOUT_UNAVAILABLE',
        message: 'Cut-out şu an kullanılamıyor (remove.bg anahtarı tanımsız)',
      });
    }
    const form = new URLSearchParams({ image_url: imageUrl, size: 'auto' });
    const res = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': key, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    if (!res.ok) {
      throw new ServiceUnavailableException({
        code: 'CUTOUT_FAILED',
        message: `remove.bg hatası (${res.status})`,
      });
    }
    const buf = Buffer.from(await res.arrayBuffer());
    // Görsel depolama altyapısı yok → base64 data URL olarak dön (önizleme için yeterli).
    return { dataUrl: `data:image/png;base64,${buf.toString('base64')}` };
  }
}
