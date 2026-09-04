import { ANONIM_YAZAR_ETIKETI, BEN_YAZAR_ETIKETI } from '@ayna/domain';
import type { MessageKey } from '@ayna/i18n';

/**
 * YORUM YAZARI — "Doğrulanmış üye" ve "Sen" TÜRKÇE SABİTTİ.
 *
 * Anonim yorumun yazarı olarak veritabanına "Doğrulanmış üye", kullanıcının
 * kendi yorumuna "Sen" yazılıyor ve ekrana OLDUĞU GİBİ basılıyordu: Kazak ya
 * da Rus müşteri yorumların altında Türkçe okuyordu.
 *
 * Kayıtlı değer Türkçe KALIYOR — geçmiş satırlar veritabanında öyle duruyor,
 * değiştirmek onları kimliksiz bırakırdı. Değişen yalnız ÇİZİM: etiket
 * tanınıyorsa kullanıcının dilinde yazılıyor, gerçek bir isimse dokunulmuyor.
 */
export function yorumYazariYazisi(yazar: string, t: (k: MessageKey) => string): string {
  const ad = (yazar ?? '').trim();
  if (!ad || ad === ANONIM_YAZAR_ETIKETI) return t('review.author.anon');
  if (ad === BEN_YAZAR_ETIKETI) return t('review.author.me');
  return ad;
}
