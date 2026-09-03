import { altHizmetBul } from './katalog.js';

/**
 * UZMANIN HİZMET LİSTESİNDEN KATALOG KİMLİKLERİNİ ÇIKARIR.
 *
 * `Professional.servicesJson` uzmanın gerçek hizmet menüsü. Alanın adı
 * yazan ve okuyan tarafta AYRIŞABİLİR ve ayrışırsa hiçbir şey hata
 * vermez: okuyan taraf boş küme görür ve sessizce "hiç arz yok" der.
 *
 * Tam olarak bu oldu. Uygulama satırları `{ id, name, price, durationMin }`
 * biçiminde yazıyordu; "Yakında" hesabı `serviceId` arıyordu. Sonuç: gerçek
 * uzmanlar varken bile BÜTÜN katalog "Yakında" görünecekti — hata yok, log
 * yok, yalnız yanlış ekran.
 *
 * Bu yüzden kimliğin nereden okunacağı ARTIK TEK YERDE. Yazan da okuyan da
 * buradan geçiyor; alan adı değişirse iki taraf birlikte değişir.
 *
 * İki ad da kabul ediliyor: `id` bugünkü biçim, `serviceId` ise brief §4.1
 * hedefi (uzman kendi adını yazıyor, `serviceId` bağlı olduğu alt hizmeti
 * gösteriyor). Geçiş sırasında ikisi bir arada bulunabilir.
 */

/** Tek bir satırdan katalog alt hizmet kimliği. Katalogda yoksa `undefined`. */
export function hizmetSatirininKimligi(satir: unknown): string | undefined {
  if (!satir || typeof satir !== 'object') return undefined;
  const r = satir as { id?: unknown; serviceId?: unknown };
  for (const aday of [r.serviceId, r.id]) {
    if (typeof aday !== 'string') continue;
    const ham = aday.trim();
    /*
     * KATALOGDA OLMAYAN kimlik arz saymıyor. Uzmanın serbest yazdığı ad ya
     * da eski bir kimlik (`hair-cut`) "arz" sayılsaydı, katalogda karşılığı
     * olmayan bir alt hizmet için rozet kalkardı — müşteri var olmayan bir
     * uzmana yönlendirilirdi.
     */
    if (ham && altHizmetBul(ham)) return ham;
  }
  return undefined;
}

/** Hizmet listesindeki TÜM geçerli katalog kimlikleri (tekilleştirilmiş). */
export function katalogHizmetKimlikleri(satirlar: unknown): string[] {
  if (!Array.isArray(satirlar)) return [];
  const out = new Set<string>();
  for (const s of satirlar) {
    const id = hizmetSatirininKimligi(s);
    if (id) out.add(id);
  }
  return [...out];
}
