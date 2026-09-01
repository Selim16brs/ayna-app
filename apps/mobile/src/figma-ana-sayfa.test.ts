import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ANA SAYFA — Figma tasarımının BÖLÜM SIRASI ve ölçüleri.
 *
 * Kurucu "birebir" dedi. Bir bölüm kayarsa ya da düşerse ekran sessizce
 * eski düzene döner — testin yakaladığı şey bu.
 */
const d = readFileSync(join(import.meta.dirname, '..', 'app', '(tabs)', 'discover.tsx'), 'utf8');

test('bölümler Figma SIRASIYLA duruyor', () => {
  const sira = [
    "t('home.greeting')", // welcome-vip-area
    "t('home.search')", // search-container
    'HIZLI_EYLEMLER.map', // quick-action-strip
    "t('home.services')", // service-icons-strip
    "t('home.refund.title')", // deposit-refund-banner
    "t('home.pending')", // appointment-card-container
    "t('home.featured')", // curated-section
    "t('home.campaigns')", // firsatlar-section
    "t('home.trend')", // trends-section
    "t('home.nearby')", // salons-section
  ];
  let onceki = -1;
  for (const p of sira) {
    const i = d.indexOf(p);
    assert.ok(i > 0, `bölüm yok: ${p}`);
    assert.ok(i > onceki, `bölüm sırası bozuk: ${p}`);
    onceki = i;
  }
});

test('Figma ölçüleri YUVARLANMAMIŞ', () => {
  // Bu sayılar tasarımdan okundu; 4/8'e yuvarlamak tasarımı bozar.
  // Biçimden bağımsız: Prettier değerleri satırlara bölebiliyor.
  const stil = (ad: string): string => {
    const i = d.indexOf(`    ${ad}: {`);
    assert.ok(i > 0, `${ad} stili yok`);
    return d.slice(i, d.indexOf('\n    },', i));
  };
  for (const [ad, degerler] of [
    ['hizliKart', ['height: 140', 'borderRadius: 16']],
    ['vitrinKart', ['width: 260', 'height: 200', 'borderRadius: 20']],
    ['ikonKart', ['width: 64', 'height: 64', 'borderRadius: 16']],
    ['salonFoto', ['width: 64', 'height: 64', 'borderRadius: 12']],
    ['randevuKart', ['borderRadius: 24']],
    ['arama', ['borderRadius: 12', 'paddingHorizontal: 14']],
    ['iadeKart', ['borderRadius: 22', 'padding: 16']],
  ] as const) {
    const govde = stil(ad);
    for (const d2 of degerler) {
      assert.ok(govde.includes(d2), `${ad}: "${d2}" — ölçü tasarımdan sapmış`);
    }
  }
});

test('"Senin İçin Seçtiklerimiz" ÜCRETLİ vitrinden besleniyor', () => {
  // Kurucu: bu bölüm bizim "Öne çıkanlar" ücretli alanımız.
  const i = d.indexOf("t('home.featured')");
  const blok = d.slice(i, i + 700);
  assert.match(blok, /featured\.map/, 'vitrin kaynağı bağlı değil');
  assert.match(blok, /sponsored/, 'ücretli yerleşim sponsorlu etiketsiz');
});

test('ALT MENÜ bizimki kalıyor — Figma’nın sekme çubuğu kopyalanmadı', () => {
  // Kurucu: "sadece alt menü bizim şu anki hâliyle kalsın."
  assert.ok(!/bottom-tab-bar|tabs-row/.test(d), 'Figma sekme çubuğu ekrana girmiş');
  assert.match(d, /TAB_BAR_CLEARANCE/, 'yüzen alt menü için boşluk bırakılmamış');
});

test('YAZI TİPİ uygulamanın kendi ailesi', () => {
  // Figma Inter + DM Sans kullanıyor; kurucu Onest kalsın dedi.
  assert.ok(!/Inter|DM_?Sans/.test(d), 'Figma yazı tipi ekrana sızmış');
  assert.match(d, /font\.(semibold|regular|medium)/, 'tipografi token kullanmıyor');
});

/** UZMAN ANA EKRANI — Figma `ayna-expert-light` bölüm sırası ve ölçüleri. */
const u = readFileSync(join(import.meta.dirname, '..', 'app', 'seller', 'reports.tsx'), 'utf8');

test('uzman ekranı: bölümler Figma SIRASIYLA', () => {
  const sira = [
    "t('reports.live.title')", // canli-ozet-card
    "t('seller.promo.title')", // promo-card
    "t('reports.action.requests')", // grid-row
    'ads.live.title', // reklam-banner
    "t('reports.quality.title')", // yanit-kalite-card
    "t('reports.perf.title')", // performans-section
    "t('reports.visibility.title')", // neden-gorunuyorsun
  ];
  let onceki = -1;
  for (const p of sira) {
    const i = u.indexOf(p);
    assert.ok(i > 0, `bölüm yok: ${p}`);
    assert.ok(i > onceki, `bölüm sırası bozuk: ${p}`);
    onceki = i;
  }
});

test('uzman ekranı: Figma ölçüleri yuvarlanmamış', () => {
  const stil = (ad: string): string => {
    const i = u.indexOf(`    ${ad}: {`);
    assert.ok(i > 0, `${ad} stili yok`);
    return u.slice(i, u.indexOf('\n    },', i));
  };
  for (const [ad, degerler] of [
    ['ozetKart', ['borderRadius: 24', 'padding: 20', 'gap: 18']],
    ['ozetKutu', ['borderRadius: 16', 'padding: 12']],
    ['paketKart', ['borderRadius: 24', 'padding: 20', 'gap: 16']],
    ['ikiliKart', ['borderRadius: 20', 'padding: 16', 'gap: 10']],
    ['reklamKart', ['borderRadius: 24', 'padding: 16', 'gap: 12']],
    ['kaliteKart', ['borderRadius: 24', 'padding: 20', 'gap: 16']],
    ['gorunurKart', ['borderRadius: 20', 'padding: 16', 'gap: 16']],
  ] as const) {
    const govde = stil(ad);
    for (const d2 of degerler) {
      assert.ok(govde.includes(d2), `${ad}: "${d2}" — ölçü tasarımdan sapmış`);
    }
  }
});

test('uzman ekranı: Figma’da OLMAYAN ama gerekli üç blok duruyor', () => {
  // Tasarımı yapan hesap kısıtlı değildi, yeni değildi ve bekleyen talebi
  // yoktu. Üçü de gerçek durumlar; tasarımda görünmemeleri işlevin
  // silinebileceği anlamına gelmez.
  assert.match(u, /restricted \?/, 'hesap kısıtı uyarısı düştü');
  assert.match(u, /bookings\.length === 0 \?/, 'yeni uzman yönlendirmesi düştü');
  assert.match(u, /bekleyenTalepler\.length > 0 \?/, 'yanıt bekleyen talepler düştü');
});

test('uzman ekranı ROL SÜZGECİNDEN geçiyor', () => {
  // Uzman kendi MÜŞTERİ randevularını kalite ölçütlerinde görmemeli.
  assert.match(u, /uzmanRandevulari\(tumRandevular\)/, 'rol süzgeci yok');
  assert.match(u, /const bookings = uzmanRandevulariListe/, 'ölçütler süzgeçsiz');
});

/**
 * KURUCUNUN SAYDIĞI SAPMALAR.
 *
 * "Figma ile yaptığım tasarım birebir aynısı olsun demiştim ama sen işine
 * gelen yerleri almışsın." Haklıydı — dokuz yerde sapmıştım. Her biri burada
 * ayrı ayrı kilitleniyor.
 */
test('marka İŞARETİ kullanılıyor, metin değil', () => {
  assert.ok(!/>\s*AYNA\s*</.test(d), 'logo yerine "AYNA" yazısı duruyor');
  assert.match(d, /LOGO_SIYAH = require/, 'açık tema logosu yok');
  assert.match(d, /LOGO_BEYAZ = require/, 'koyu tema logosu yok');
  assert.match(d, /koyuTema \? LOGO_BEYAZ : LOGO_SIYAH/, 'logo temaya göre seçilmiyor');
});

test('"Dileğini Anlat" FOTOĞRAFLI TEKLİF akışına gidiyor', () => {
  // `/demand/new` kategori seçtiren farklı bir akış; kurucunun kastettiği
  // "foto ve fiyat ile teklif alma" ekranı `/quote/new`.
  const i = d.indexOf("'home.qa.wish'");
  assert.ok(i > 0, 'dilek kartı yok');
  const blok = d.slice(i - 200, i + 300);
  assert.match(blok, /yol: '\/quote\/new'/, 'yanlış akışa yönlendiriyor');
});

test('hizmet ikonları FIGMA görselleri', () => {
  // Ionicons ile çizilmiş ikonlar kurucunun tasarladıkları değildi.
  assert.match(d, /HIZMET_IKON: Record<string, number>/, 'ikon eşlemesi yok');
  for (const kat of [
    'hair',
    'nails',
    'lashes',
    'brows',
    'makeup',
    'skincare',
    'epilation',
    'spa',
    'pmu',
    'bridal',
  ]) {
    assert.match(
      d,
      new RegExp(`${kat}: require\\('\\.\\./\\.\\./assets/hizmet-ikon/`),
      `${kat} ikonu yok`,
    );
  }
});

test('hizmet etiketi KIRPILMIYOR', () => {
  // "Kalıcı Makyaj" ve "Gelin & Özel Gün" tek satıra sığmıyor; Figma da
  // iki satıra sarıyor.
  const i = d.indexOf('ikonYazi');
  assert.ok(i > 0, 'etiket stili yok');
  assert.match(
    d,
    /numberOfLines=\{2\}[\s\S]{0,80}styles\.ikonYazi/,
    'etiket tek satıra kırpılıyor',
  );
});

test('hızlı eylem kartları FIGMA fotoğrafları', () => {
  assert.ok(!/unsplash/.test(d), 'yabancı görsel duruyor');
  for (const ad of ['randevu-al', 'dilegini-anlat', 'haritada-kesfet']) {
    assert.match(d, new RegExp(`hizli-eylem/${ad}\\.png`), `${ad} görseli yok`);
  }
});

test('randevu kartı: saat ROZET, ilerleme DÖRT PARÇA', () => {
  assert.match(d, /zamanRozet\b/, 'saat düz yazı');
  assert.match(d, /ilerlemeParca\b/, 'ilerleme tek çubuk');
  assert.ok(!/ilerlemeDolu\b/.test(d), 'eski tek çubuk duruyor');
});

test('vitrin kartında ★ PUAN var', () => {
  assert.match(d, /vitrinPuanYazi/, 'puan rozeti yok');
  assert.match(d, /rating=\{pros\.find/, 'puan gerçek veriden gelmiyor');
});

test('trendler 2×2 IZGARA', () => {
  assert.match(d, /trendIzgara/, 'ızgara yok');
  assert.ok(!/trendSerit/.test(d), 'yatay kaydırma duruyor');
  assert.match(d, /flexWrap: 'wrap'/, 'satır kırılmıyor');
});

test('salon satırında MESAFE km olarak', () => {
  assert.match(d, /mesafe\(pro\)/, 'mesafe hesaplanmıyor');
  assert.match(d, /km · /, 'km yazmıyor');
});

test('"Tümünü Gör" chevron’lu', () => {
  const i = d.indexOf("t('common.see_all')");
  assert.ok(i > 0, 'tümünü gör yok');
  assert.match(d.slice(i, i + 200), /chevron-forward/, 'chevron yok');
});
