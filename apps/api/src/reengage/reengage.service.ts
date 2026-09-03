import { Injectable } from '@nestjs/common';
import { CATEGORY_DEFAULTS, type CategoryId, categoryOfServiceId } from '@ayna/domain';
import { PrismaService } from '../prisma/prisma.service';

export const GUN_MS = 24 * 60 * 60 * 1000;

/**
 * Hizmet kimliğinin kategorisi: `nails.gel_polish` → `nails`.
 *
 * Çözüm KATALOGDAN geliyor. Eskiden ilk tireye kadarki parça alınıyordu;
 * katalog kimlikleri artık nokta ayraçlı (`nails.gel_polish`) ve
 * kategorilerin kendisinde alt çizgi var (`lashes_brows`) — tireye bakan
 * kod hiçbirini çözemezdi ve tüm yeniden-kazanım sessizce dururdu.
 */
export function kategoriKodu(service: string): CategoryId | null {
  const kod = categoryOfServiceId(service);
  return kod && kod in CATEGORY_DEFAULTS ? kod : null;
}

export interface ReengageAday {
  bookingId: string;
  customerUserId: string;
  customerName: string;
  proId: string;
  service: string;
  periodDays: number;
  /** Bakım dolumuna kalan gün: 1 = yarın, 0 = bugün, negatif = geçti. */
  kalanGun: number;
}

/**
 * GERİ ÇAĞIRMA ADAYLARI — bakım periyodu dolan gerçek müşteriler.
 *
 * Hem zamanlayıcı hem uzmanın ekranı buradan besleniyor. Ayrı ayrı
 * hesaplansaydı ekranda görünen liste ile gerçekte gönderilenler ayrışırdı:
 * uzman "şu 3 kişiye gidecek" görür, başka kişilere giderdi.
 *
 * Ekran eskiden SEED verisiyle çiziliyordu — uzman kendi müşterileri sanarak
 * uydurma isimlere (Zhanel S., Dana K.) bakıyordu.
 */
@Injectable()
export class ReengageService {
  constructor(private readonly prisma: PrismaService) {}

  /** Bir uzmanın (kullanıcı kimliğiyle) yaklaşan bakım adayları. */
  async adaylar(proUserId: string, ufukGun = 45): Promise<ReengageAday[]> {
    const sps = await this.prisma.specialist.findMany({
      where: { userId: proUserId },
      select: { proId: true },
    });
    const proIds = sps.map((x) => x.proId).filter((x): x is string => !!x);
    if (proIds.length === 0) return [];

    const simdi = Date.now();
    const bookings = await this.prisma.booking.findMany({
      where: {
        proId: { in: proIds },
        status: 'tamamlandi',
        startAt: { gte: new Date(simdi - 400 * GUN_MS), not: null },
        userId: { not: null },
      },
      select: { id: true, userId: true, proId: true, service: true, startAt: true },
      orderBy: { startAt: 'desc' },
      take: 2000,
    });
    if (bookings.length === 0) return [];

    const musteriler = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(bookings.map((b) => b.userId!))] } },
      select: { id: true, name: true },
    });
    const adById = new Map(musteriler.map((u) => [u.id, u.name]));

    // Aynı müşteri+hizmet için YALNIZ EN SON randevu sayılır: eski ziyaretler
    // de aday olsaydı kişi aynı hizmet için birden çok hatırlatma alırdı.
    const gorulen = new Set<string>();
    const out: ReengageAday[] = [];
    for (const b of bookings) {
      const anahtar = `${b.userId}#${b.service}`;
      if (gorulen.has(anahtar)) continue;
      gorulen.add(anahtar);
      const kat = kategoriKodu(b.service);
      if (!kat) continue;
      const periyot = CATEGORY_DEFAULTS[kat]?.maintenanceDays ?? 0;
      if (periyot <= 0) continue; // periyodik olmayan hizmet (gelin paketi, makyaj)
      const kalanGun = Math.round((b.startAt!.getTime() + periyot * GUN_MS - simdi) / GUN_MS);
      if (kalanGun > ufukGun) continue;
      out.push({
        bookingId: b.id,
        customerUserId: b.userId!,
        customerName: adById.get(b.userId!) ?? '',
        proId: b.proId!,
        service: b.service,
        periodDays: periyot,
        kalanGun,
      });
    }
    return out.sort((a, b) => a.kalanGun - b.kalanGun);
  }
}
