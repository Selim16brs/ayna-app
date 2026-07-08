import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SetMarketInput } from './market.dto';

const MIN_SAMPLES = 3; // dinamik ortalama için yeterli örnek eşiği
const FLOOR_RATIO = 0.6; // %40 altı = ortalamanın %60'ı (Build Brief §1.3)

@Injectable()
export class MarketService {
  constructor(private readonly prisma: PrismaService) {}

  // Kategori × şehir ortalama fiyatı: gerçek tekliflerden dinamik, yoksa tohum temel fiyat.
  async average(category: string, city: string) {
    const quotes = await this.prisma.quote.findMany({ include: { professional: true } });
    const matching = quotes.filter(
      (q) =>
        q.professional != null &&
        q.professional.sector === category &&
        (!city || q.professional.district.startsWith(city)),
    );

    let average: number;
    let source: 'dynamic' | 'seed';
    const samples = matching.length;

    if (samples >= MIN_SAMPLES) {
      const sum = matching.reduce((acc, q) => acc + Number(q.price), 0);
      average = Math.round(sum / samples);
      source = 'dynamic';
    } else {
      const seed =
        (await this.prisma.marketPrice.findUnique({
          where: { category_city: { category, city } },
        })) ??
        (await this.prisma.marketPrice.findUnique({
          where: { category_city: { category, city: '' } },
        }));
      average = seed ? Math.round(Number(seed.basePrice)) : 10000;
      source = 'seed';
    }

    return {
      category,
      city,
      average,
      floor: Math.round(average * FLOOR_RATIO), // bu değerin altı uyarı üretir
      currency: 'KZT',
      source,
      samples,
    };
  }

  async set(input: SetMarketInput) {
    const city = input.city ?? '';
    const row = await this.prisma.marketPrice.upsert({
      where: { category_city: { category: input.category, city } },
      create: { category: input.category, city, basePrice: input.basePrice },
      update: { basePrice: input.basePrice },
    });
    return { category: row.category, city: row.city, basePrice: Number(row.basePrice) };
  }
}
