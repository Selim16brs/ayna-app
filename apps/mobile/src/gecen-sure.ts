import type { MessageKey } from '@ayna/i18n';
import { fillParams } from './fill-params';

/**
 * "AZ ÖNCE" ARTIK TÜRKÇE SABİT DEĞİL.
 *
 * Bildirimler oluşturulurken `dateLabel: 'Az önce'` yazılıyordu — 28 yerde,
 * doğrudan Türkçe. Kazak ya da Rus kullanıcı bildirim listesinde Türkçe bir
 * satır görüyordu. (CLAUDE.md: tüm kullanıcı metinleri i18n anahtarı.)
 *
 * Metin ARTIK SAKLANMIYOR, çizim anında hesaplanıyor: bildirimin damgası
 * (`createdAt`) zaten vardı. Saklanan metin dil değiştiğinde de eski dilde
 * kalırdı; hesaplananın böyle bir sorunu yok — üstelik bildirim
 * eskidikçe yazı kendiliğinden güncelleniyor ("az önce" → "3 sa önce").
 */
export function gecenSureYazisi(
  createdAt: number,
  now: number,
  t: (k: MessageKey) => string,
): string {
  const dk = Math.floor((now - createdAt) / 60_000);
  // İleri tarihli damga (cihaz saati geri alınmış) "az önce" sayılıyor:
  // "-3 dk önce" yazmaktansa.
  if (dk < 1) return t('time.just_now');
  if (dk < 60) return fillParams(t('time.min_ago'), { n: String(dk) });
  const sa = Math.floor(dk / 60);
  if (sa < 24) return fillParams(t('time.hour_ago'), { n: String(sa) });
  return fillParams(t('time.day_ago'), { n: String(Math.floor(sa / 24)) });
}

/**
 * YORUM DÖNEMİ — sunucunun Türkçe cümlesi yerine.
 *
 * Sunucu her kullanıcıya "Son 30 gün içinde" diye TÜRKÇE yolluyordu.
 * Eşikler sunucununkiyle aynı (30 gün / 90 gün); yalnız dil kullanıcının.
 */
export function yorumDonemiYazisi(
  createdAtMs: number,
  now: number,
  t: (k: MessageKey) => string,
): string {
  const gun = Math.floor((now - createdAtMs) / 86_400_000);
  if (gun <= 30) return t('review.period.recent');
  if (gun <= 90) return t('review.period.months');
  return t('review.period.old');
}
