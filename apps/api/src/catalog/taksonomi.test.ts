import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TaksonomiService } from './taksonomi.service';

/**
 * TAKSONOMİ UCU — "YAKINDA" ROZETİ VE SIRALAMA.
 *
 * Kaynak: `AYNA_HIZMET_KATALOGU_BRIEF.md` v1.0.
 *
 * §7.4: "alt hizmette aktif ve yayında en az 1 uzman yoksa rozet görünür;
 * müşteri o alt hizmette YİNE DE talep oluşturabilir — 'Dileğin nedir?'
 * akışı reverse marketplace mantığının kalbidir, arz yoksa bile talep
 * toplanır."
 *
 * §7.3: kategori sırası admin panelden değiştirilebilir.
 */

/**
 * Uygulamanın `servicesJson`a YAZDIĞI satır biçimi.
 *
 * `apps/mobile/src/store.ts` → `api.setMyServices` bu şekli gönderiyor:
 * kimlik `id` alanında. Testlerin bu şekli kullanması şart — okuyan
 * tarafın beklediği şekli kullansaydı, iki taraf ayrıştığında test yine
 * yeşil kalırdı. (Tam olarak bu oldu.)
 */
const YAZILAN = (id: string) => ({ id, name: 'Uzmanın kendi adı', price: 9000, durationMin: 60 });

function servis(over: { pro?: unknown[]; gizli?: unknown[]; sira?: unknown[] } = {}) {
  const prisma = {
    specialist: { findMany: () => Promise.resolve(over.gizli ?? []) },
    professional: { findMany: () => Promise.resolve(over.pro ?? []) },
    serviceCategory: { findMany: () => Promise.resolve(over.sira ?? []) },
  };
  return new TaksonomiService(prisma as never);
}

test('arz yokken TÜM alt hizmetler "Yakında"', async () => {
  const { kategoriler } = await servis().taksonomi();
  const hepsi = kategoriler.flatMap((k) => k.altHizmetler);
  assert.equal(hepsi.length, 64, 'katalog eksik geliyor');
  assert.ok(
    hepsi.every((a) => a.yakinda),
    'arz yokken rozet görünmüyor',
  );
});

test('uzmanı olan alt hizmette rozet YOK', async () => {
  /*
   * Satır UYGULAMANIN GERÇEKTEN YAZDIĞI biçimde: `{ id, name, price,
   * durationMin }`. Bu test önce `{ serviceId }` ile yazılmıştı — yani
   * okuyan tarafın varsayımını doğruluyordu, yazan tarafın gerçeğini
   * değil. Yeşil geçiyordu ve hata canlıya kadar gidecekti.
   */
  const svc = servis({
    pro: [{ id: 'p1', servicesJson: JSON.stringify([YAZILAN('hair.haircut')]) }],
  });
  const { kategoriler } = await svc.taksonomi();
  const sac = kategoriler.find((k) => k.id === 'hair')!;
  assert.equal(sac.altHizmetler.find((a) => a.id === 'hair.haircut')!.yakinda, false);
  // Kardeş hizmet etkilenmemeli.
  assert.equal(sac.altHizmetler.find((a) => a.id === 'hair.blowdry')!.yakinda, true);
});

test('YAYINDAN KALDIRILMIŞ uzman arz saymıyor', async () => {
  /*
   * Cezalı uzman müşteriye görünmüyor. Arz sayılsaydı müşteri "var" diye
   * görüp randevu alamayacağı bir hizmete tıklardı.
   */
  const svc = servis({
    pro: [{ id: 'p1', servicesJson: JSON.stringify([YAZILAN('nails.pedicure')]) }],
    gizli: [{ proId: 'p1' }],
  });
  const { kategoriler } = await svc.taksonomi();
  const t = kategoriler.find((k) => k.id === 'nails')!;
  assert.equal(t.altHizmetler.find((a) => a.id === 'nails.pedicure')!.yakinda, true);
});

test('bozuk hizmet kaydı KATALOGU DÜŞÜRMÜYOR', async () => {
  // Tek bir uzmanın bozuk JSON'u tüm vitrini karartmamalı.
  const svc = servis({
    pro: [
      { id: 'p1', servicesJson: '{bozuk' },
      { id: 'p2', servicesJson: JSON.stringify([{ serviceId: 'skin.peeling' }]) },
    ],
  });
  const { kategoriler } = await svc.taksonomi();
  assert.equal(kategoriler.length, 13);
  const c = kategoriler.find((k) => k.id === 'skin')!;
  assert.equal(c.altHizmetler.find((a) => a.id === 'skin.peeling')!.yakinda, false);
});

test('varsayılan sıra brief §3 ile aynı', async () => {
  const { kategoriler } = await servis().taksonomi();
  assert.equal(kategoriler[0]!.id, 'hair');
  assert.equal(kategoriler[1]!.id, 'nails');
  assert.equal(kategoriler[12]!.id, 'other');
});

test('admin sırası katalog sırasını EZİYOR', async () => {
  // Brief §7.3 — sıralama panelden yönetilebilmeli.
  const svc = servis({ sira: [{ code: 'other', sortOrder: -1 }] });
  const { kategoriler } = await svc.taksonomi();
  assert.equal(kategoriler[0]!.id, 'other', 'admin sırası uygulanmıyor');
});

test('üç dilin HEPSİ gönderiliyor', async () => {
  // İstemci dili değiştirdiğinde yeniden istek atmasın.
  const { kategoriler } = await servis().taksonomi();
  const k = kategoriler[0]!;
  assert.deepEqual(Object.keys(k.ad).sort(), ['kk', 'ru', 'tr']);
  assert.deepEqual(Object.keys(k.altHizmetler[0]!.ad).sort(), ['kk', 'ru', 'tr']);
});

test('UYGULAMANIN YAZDIĞI biçim arz olarak SAYILIYOR — sözleşme testi', async () => {
  /*
   * Bu testin varlık sebebi gerçek bir hata: yazan taraf `id`, okuyan
   * taraf `serviceId` kullanıyordu. Hiçbir şey hata vermiyordu; yalnız
   * gerçek uzmanlar varken BÜTÜN katalog "Yakında" görünecekti.
   *
   * Kimlik okuma artık `@ayna/domain`de tek yerde. Bu test o sözleşmeyi
   * uçtan uca doğruluyor.
   */
  const svc = servis({
    pro: [
      {
        id: 'p1',
        servicesJson: JSON.stringify([YAZILAN('hair.haircut'), YAZILAN('nails.manicure')]),
      },
    ],
  });
  const { kategoriler } = await svc.taksonomi();
  const bul = (id: string) => kategoriler.flatMap((k) => k.altHizmetler).find((a) => a.id === id)!;
  assert.equal(bul('hair.haircut').yakinda, false, 'uygulamanın yazdığı kimlik arz sayılmıyor');
  assert.equal(bul('nails.manicure').yakinda, false);
  assert.equal(bul('hair.blowdry').yakinda, true, 'kardeş hizmet etkilenmiş');
});

test('İKİ alan adı da okunuyor — geçiş sırasında karışık kayıt olabilir', async () => {
  // `serviceId` brief §4.1 hedefi (uzman kendi adını yazar, `serviceId`
  // bağlı olduğu alt hizmeti gösterir). Geçişte ikisi bir arada bulunur.
  const svc = servis({
    pro: [
      {
        id: 'p1',
        servicesJson: JSON.stringify([
          { id: 'hair.haircut', name: 'x', price: 1, durationMin: 30 },
          { serviceId: 'skin.facial', name: 'Roza özel bakım', price: 1, durationMin: 30 },
        ]),
      },
    ],
  });
  const { kategoriler } = await svc.taksonomi();
  const bul = (id: string) => kategoriler.flatMap((k) => k.altHizmetler).find((a) => a.id === id)!;
  assert.equal(bul('hair.haircut').yakinda, false);
  assert.equal(bul('skin.facial').yakinda, false);
});

test('SERBEST ad ya da eski kimlik arz SAYILMIYOR', async () => {
  /*
   * Uzmanın kendi yazdığı ad ("Roza paketi") ya da eski taksonomi kimliği
   * ("hair-cut") katalogda yok. Arz sayılsaydı, karşılığı olmayan bir alt
   * hizmetten rozet kalkar, müşteri var olmayan uzmana yönlendirilirdi.
   */
  const svc = servis({
    pro: [
      {
        id: 'p1',
        servicesJson: JSON.stringify([
          { id: 'Roza paketi', name: 'Roza paketi', price: 1, durationMin: 30 },
          { id: 'hair-cut', name: 'eski', price: 1, durationMin: 30 },
        ]),
      },
    ],
  });
  const { kategoriler } = await svc.taksonomi();
  const hepsi = kategoriler.flatMap((k) => k.altHizmetler);
  assert.ok(
    hepsi.every((a) => a.yakinda),
    'katalogda olmayan kimlik arz sayıldı',
  );
});
