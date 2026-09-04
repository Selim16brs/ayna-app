import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ADIM_TAMAM, eksikAlanlar, kimlikAdimi } from './kayit-adimi';
import { haritaKumeleri } from './harita-kumeleme';
import { limitiCoz } from './butce';

const yorumsuz = (k: string) =>
  k.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const oku = (...p: string[]) => yorumsuz(readFileSync(join(__dirname, '..', ...p), 'utf8'));

/**
 * KAYIT ADIMI · HARİTA KÜMELEME · BÜTÇE LİMİTİ.
 *
 * Üçü de kurucunun aynı turda bildirdiği istekler.
 */

// ── KAYIT: hata ADIM GEÇMEDEN gösteriliyor ──────────────────────────────

const kosul = (ok: boolean) => [{ ok, key: 'auth.f.phone' as const }];
const metin = { telefonDolu: 'TELEFON DOLU', epostaDolu: 'EPOSTA DOLU' };

test('EKSİK ALAN varsa adım geçilmiyor ve SEBEBİ dönüyor', async () => {
  /*
   * "İleri" eksik alan varken sessizce pasifti: kullanıcı basıyor, hiçbir
   * şey olmuyor, neyin eksik olduğu da yazmıyordu.
   */
  let soruldu = false;
  const r = await kimlikAdimi(
    kosul(false),
    () => {
      soruldu = true;
      return Promise.resolve({ phoneTaken: false, emailTaken: false });
    },
    metin,
  );
  assert.equal(r.gecebilir, false);
  assert.deepEqual(r.eksikler, ['auth.f.phone']);
  // Eksik alan varken sunucuya sormak boşuna istek olurdu.
  assert.equal(soruldu, false, 'eksik alan varken sunucuya soruldu');
});

test('KAYITLI NUMARA adımda yakalanıyor — en sonda değil', async () => {
  const r = await kimlikAdimi(
    kosul(true),
    () => Promise.resolve({ phoneTaken: true, emailTaken: false }),
    metin,
  );
  assert.equal(r.gecebilir, false);
  assert.equal(r.hata, 'TELEFON DOLU');
  assert.deepEqual(r.eksikler, [], 'çakışma "eksik alan" gibi gösteriliyor');
});

test('KAYITLI E-POSTA da yakalanıyor', async () => {
  const r = await kimlikAdimi(
    kosul(true),
    () => Promise.resolve({ phoneTaken: false, emailTaken: true }),
    metin,
  );
  assert.equal(r.hata, 'EPOSTA DOLU');
});

test('HER ŞEY DOĞRUYSA adım geçiliyor', async () => {
  const r = await kimlikAdimi(
    kosul(true),
    () => Promise.resolve({ phoneTaken: false, emailTaken: false }),
    metin,
  );
  assert.deepEqual(r, ADIM_TAMAM);
});

test('AĞ HATASI kullanıcıyı formda KİLİTLEMİYOR', async () => {
  /*
   * Kontrol edemediysek geçirmek zorundayız: çevrimdışı bir kullanıcı
   * aksi hâlde kaydı hiç tamamlayamazdı. Gerçek çakışma zaten kayıt
   * anında sunucuda YİNE denetleniyor — bu kontrol erken uyarı, tek kapı
   * değil.
   */
  const r = await kimlikAdimi(kosul(true), () => Promise.reject(new Error('ağ yok')), metin);
  assert.equal(r.gecebilir, true);
});

test('EKSİK ALANLAR sırayla dönüyor', () => {
  const e = eksikAlanlar([
    { ok: true, key: 'auth.f.phone' },
    { ok: false, key: 'auth.f.city' },
    { ok: false, key: 'auth.f.password' },
  ]);
  assert.deepEqual(e, ['auth.f.city', 'auth.f.password']);
});

test('KAYIT EKRANLARI bu akışa BAĞLI', () => {
  for (const [yol, ad] of [
    ['app/auth/expert.tsx', 'uzman'],
    ['app/auth/business/new.tsx', 'salon'],
    ['app/auth/customer.tsx', 'müşteri'],
  ] as const) {
    const k = oku(yol);
    assert.match(k, /kimlikAdimi\(/, `${ad} kaydı kontrolü çağırmıyor`);
    assert.match(k, /api\.musaitlik\(/, `${ad} kaydı numarayı sormuyor`);
    assert.match(
      k,
      /<MissingFields keys=\{adimSonucu\.eksikler\} hata=\{adimSonucu\.hata\}/,
      `${ad}: sebep gösterilmiyor`,
    );
  }
});

test('İLERİ DÜĞMESİ eksik alan yüzünden KAPALI DEĞİL', () => {
  /*
   * Kapalı bir düğmeye basmak hiçbir şey yapmaz; kullanıcı sebebi
   * öğrenemez. Düğme yalnız İSTEK SÜRERKEN kapanıyor.
   */
  for (const yol of ['app/auth/expert.tsx', 'app/auth/business/new.tsx']) {
    const k = oku(yol);
    assert.match(k, /disabled=\{adimBekliyor\}/, `${yol}: ileri hâlâ eksik alanda kapalı`);
  }
  assert.match(oku('app/auth/customer.tsx'), /disabled=\{busy\}/, 'müşteri: kayıt düğmesi kapalı');
});

// ── HARİTA: aynı adres tek iğne ─────────────────────────────────────────

const s = (id: string, kind: string, lat: number, lng: number) => ({ id, kind, lat, lng });

test('HARİTA kümelemeyi GERÇEKTEN kullanıyor', () => {
  /*
   * Kümeleme modülünü test etmek yetmiyor: ekran onu çağırmayı bıraksa
   * modül testleri yine geçerdi. (Mutasyonla denedim, tam bu oldu.)
   */
  const k = oku('app/map.tsx');
  assert.match(k, /haritaKumeleri\(konumlu\)/, 'ekran kümelemeyi çağırmıyor');
  assert.match(k, /kumeler\.map\(\(k\) => \(/, 'iğneler kümeden çizilmiyor');
  assert.match(k, /seciliKume\.digerleri\.map/, 'aynı adrestekiler listelenmiyor');
});

test('AYNI ADRESTEKİLER tek küme, temsilci SALON', () => {
  const k = haritaKumeleri([
    s('u1', 'independent', 43.238, 76.889),
    s('salon', 'salon', 43.238, 76.889),
    s('u2', 'independent', 43.238, 76.889),
  ]);
  assert.equal(k.length, 1, 'aynı adres birden çok iğne çiziyor');
  assert.equal(k[0]!.bas.id, 'salon', 'iğneyi salon temsil etmiyor');
  assert.deepEqual(k[0]!.digerleri.map((x) => x.id).sort(), ['u1', 'u2']);
});

test('BİRKAÇ METRE kayık iğneler AYNI adres sayılıyor', () => {
  // Aynı binayı işaretleyen iki kişi birebir aynı noktayı bırakmıyor.
  const k = haritaKumeleri([
    s('a', 'salon', 43.238, 76.889),
    s('b', 'independent', 43.23803, 76.88897),
  ]);
  assert.equal(k.length, 1);
});

test('AYRI ADRESLER ayrı iğne', () => {
  const k = haritaKumeleri([s('a', 'salon', 43.238, 76.889), s('b', 'salon', 43.25, 76.9)]);
  assert.equal(k.length, 2);
});

test('SALON YOKSA ilk uzman temsil ediyor, diğerleri yine altında', () => {
  const k = haritaKumeleri([
    s('u1', 'independent', 43.238, 76.889),
    s('u2', 'independent', 43.238, 76.889),
  ]);
  assert.equal(k.length, 1);
  assert.equal(k[0]!.bas.id, 'u1');
  assert.deepEqual(
    k[0]!.digerleri.map((x) => x.id),
    ['u2'],
  );
});

test('KOORDİNATSIZ sağlayıcı kümeye GİRMİYOR', () => {
  const k = haritaKumeleri([
    { id: 'yok', kind: 'salon', lat: null, lng: null },
    s('var', 'salon', 43.238, 76.889),
  ]);
  assert.equal(k.length, 1);
  assert.equal(k[0]!.bas.id, 'var');
});

test('SALON KAYDINDA haritada iğne ZORUNLU', () => {
  /*
   * Kurucu: "salon kısmında harita ile iğne atma özelliği yok sanırım bu
   * yüzden de müşteri haritada göremiyor salon lokasyonunu." Özellik
   * vardı ama İSTEĞE BAĞLIYDI: iğnesiz kaydolan salonun koordinatı yok ve
   * harita onu hiç göstermiyor.
   */
  const k = oku('app/auth/business/new.tsx');
  /*
   * ÜÇ YERDE birden: adım geçidi, "eksik" listesi ve son gönderim
   * koşulu. Yalnız birini sınasaydım diğer ikisi sessizce gevşeyebilirdi
   * — ki adım geçidi tek başına yeterli değil: son adımda "Kaydet"
   * kendi koşuluna bakıyor.
   */
  const adim = k.slice(k.indexOf('const adimKosullari'), k.indexOf('const ileri ='));
  assert.match(adim, /coord !== null, key: 'biz\.field\.map'/, 'adım geçidinde iğne aranmıyor');

  /*
   * Dilim SIKI: `STEP_TITLES`e kadar almak, araya giren `adimKosullari`i
   * de içine alıyordu ve `stepOk`tan koşulu silen mutasyon YAKALANMIYORDU
   * — test komşu bloktaki eşleşmeyle geçiyordu.
   */
  const stepOkSon = k.indexOf('const [adimSonucu');
  // Sınır BULUNAMAZSA dilim dosyanın sonuna kadar uzar ve test komşu
  // bloktaki eşleşmeyle geçer — sessizce anlamsızlaşır. (Tam bu oldu:
  // `adimSonucu` destructuring olduğu için arama tutmuyordu.)
  assert.ok(stepOkSon > 0, 'stepOk dilim sınırı bulunamadı — test yanlış yeri okuyor');
  const stepOk = k.slice(k.indexOf('const stepOk = ['), stepOkSon);
  assert.match(stepOk, /coord !== null/, 'ileri düğmesi iğnesiz de aktif');

  const gecerli = k.slice(k.indexOf('const valid ='), k.indexOf('const touched'));
  assert.match(gecerli, /coord !== null/, 'son gönderim iğnesiz kabul ediyor');

  const eksik = k.slice(k.indexOf('const missing = missingLabels(['), k.indexOf('const stepOk'));
  assert.match(eksik, /biz\.field\.map/, 'eksik listesinde iğne yok');
});

// ── BÜTÇE: limit kullanıcının ───────────────────────────────────────────

test('LİMİT girdisi ayırıcıya toleranslı, geçersizi reddediyor', () => {
  assert.equal(limitiCoz('80000'), 80000);
  assert.equal(limitiCoz('80 000'), 80000, 'boşluklu yazım reddediliyor');
  assert.equal(limitiCoz('80.000 ₸'), 80000, 'ayırıcı ve simge reddediliyor');
  assert.equal(limitiCoz(''), null);
  assert.equal(limitiCoz('   '), null);
  assert.equal(limitiCoz('abc'), null);
  assert.equal(limitiCoz('0'), null, '0 limit olarak kabul edildi');
});

test('LİMİT YOKKEN çubuk ve "kalan" çizilmiyor', () => {
  /*
   * Olmayan bir sınıra göre yüzde göstermek, kaldırdığımız uydurma
   * limitin geri gelmesi olurdu.
   */
  const k = oku('app/profile/budget.tsx');
  assert.match(k, /\{limit !== null \? \(/, 'limit yokken de çubuk çiziliyor');
  assert.match(k, /budget\.no_limit/, 'limit yokken durum söylenmiyor');
  assert.doesNotMatch(k, /const LIMIT = \d+/, 'sabit limit geri gelmiş');
});

test('LİMİT DEĞİŞTİRİLEBİLİR ve KALDIRILABİLİR', () => {
  const k = oku('app/profile/budget.tsx');
  assert.match(k, /budget\.edit_limit/, 'değiştirme yolu yok');
  assert.match(k, /budget\.limit_clear/, 'kaldırma yolu yok');
  assert.match(k, /setLimit\(null\)/, 'kaldırma limiti sıfırlamıyor');
});

test('LİMİT AŞIMI ayrı gösteriliyor', () => {
  // "Kalan: -12.000 ₸" anlamsız bir cümle olurdu.
  const k = oku('app/profile/budget.tsx');
  assert.match(k, /budget\.over/, 'aşım durumu yok');
});
