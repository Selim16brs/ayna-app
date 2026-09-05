import type { MessageKey } from '@ayna/i18n';
import { ApiError } from './api';

/**
 * SUNUCU HATASINI KULLANICININ DİLİNDE YAZAR.
 *
 * Sunucunun `message` alanı TÜRKÇE ("İade edilecek depozito yok"). Ekranlar
 * bunu olduğu gibi gösteriyordu: Kazak ya da Rus kullanıcı reddedilme
 * sebebini hiç anlamıyor, aynı şeyi tekrar deniyordu.
 *
 * Hata KODU biliniyorsa karşılığı kendi sözlüğümüzden yazılıyor. Bilinmeyen
 * kodda sunucunun cümlesi yedek kalıyor: anlaşılmayan bir sebep, hiç sebep
 * yazmamaktan iyidir — ve yeni bir kod eklendiğinde ekran boş kalmıyor.
 */
export function sunucuHatasi(err: unknown, t: (k: MessageKey) => string): string {
  if (!(err instanceof ApiError)) return t('common.error');
  const anahtar = `err.${err.code ?? ''}` as MessageKey;
  const cevrilmis = t(anahtar);
  // `t` bilinmeyen anahtarda anahtarın kendisini döndürüyor: o hâlde
  // çevirimiz yok demektir.
  if (cevrilmis && cevrilmis !== anahtar) return cevrilmis;
  return err.message || t('common.error');
}
