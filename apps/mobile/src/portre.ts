import { medyaAnahtari } from './media-cache';

/**
 * GÖSTERİLECEK PORTRE — saf karar, mağazadan bağımsız.
 *
 * Bu iki kural mağazanın içindeydi ve mağaza React Native'i çekiyor;
 * Node testinde içe aktarılamıyordu. Kararın kendisi saf: hangi görsel
 * gösterilecek ve o görselin arka planı kesilmiş mi.
 *
 * ── BAYAT KESİK ─────────────────────────────────────────────────────────
 *
 * Kullanıcı fotoğrafını değiştirdiğinde eski kesilmiş görsel bir süre
 * elde kalıyor. `cutoutFor` hangi fotoğraftan üretildiğini tutuyor;
 * eşleşmiyorsa kesik ATILIYOR — yoksa kullanıcı yeni fotoğraf seçtiğini
 * sanarken ekranda eskisini görürdü.
 */

export interface PortreDurumu {
  cutoutUri: string | null;
  cutoutFor: string | null;
  avatarUri: string | null;
}

/** Kesik güncel mi? İki karar da BUNU kullanıyor; ayrışamazlar. */
function kesikGuncel(s: PortreDurumu): boolean {
  return !!(s.cutoutUri && s.cutoutFor && s.cutoutFor === medyaAnahtari(s.avatarUri));
}

export const portreSec = (s: PortreDurumu): string | null =>
  kesikGuncel(s) ? s.cutoutUri : (s.avatarUri ?? null);

/**
 * Gösterilen portre ARKA PLANI KESİLMİŞ mi?
 *
 * Kurucu ana sayfadaki portrenin "arka planı kesilmiş şekilde, daire
 * içinde olmasın" demesiyle gerekli oldu. Kesilmiş portrenin zemini
 * saydam, çerçevesiz durabiliyor. HAM fotoğraf kendi arka planını
 * taşıyor; onu çerçevesiz ve kare göstermek kullanıcının odasını ana
 * sayfaya yapıştırmak olurdu — ham fotoğraf daire içinde kalıyor.
 */
export const portreKesilmisMi = (s: PortreDurumu): boolean => kesikGuncel(s);
