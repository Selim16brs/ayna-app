import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lightColors } from './theme.palette';
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
    // welcome-vip-area. İşaret KAPSAYICI, metin değil: karşılama tek
    // satırdan iki satıra ("selam" üstte küçük, İSİM altta büyük)
    // geçince metin anahtarı değişti ve bu test kapsayıcı hâlâ yerinde
    // dururken düştü.
    'styles.karsilama', // welcome-vip-area
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
    // Kurucu SONRADAN kendi referans kartını verdi ("tam boyle olmalı"):
    // dikey, oran ~0.79. Eski Figma ölçüsü (260×200) yatıktı ve fotoğrafın
    // çoğunu kırpıyordu. Yeni referans eskisinin yerine geçiyor.
    ['vitrinKart', ['width: 260', 'height: 328', 'borderRadius: 20']],
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

test('uzman ekranı: bölüm sırası KURUCUNUN belirlediği gibi', () => {
  /*
   * SIRA FIGMA'DAN DEĞİL, KURUCUDAN.
   *
   * "daha çok müşteriye ulaş bölümü talepler ve takvimim bloğunun altında
   * olmalı" · "ayna vitrin bloğu yanıt ve kalite bloğunun altında olmalı".
   *
   * Figma sırası satış kartlarını (paket tanıtımı, vitrin) uzmanın günlük
   * işinin ÜSTÜNE koyuyordu. Yeni sıra önce yapılacak işi gösteriyor.
   */
  const sira = [
    "t('reports.live.title')", // canli-ozet-card
    "t('reports.action.requests')", // grid-row — talepler + takvim
    "t('seller.promo.title')", // promo-card — daha çok müşteriye ulaş
    "t('reports.quality.title')", // yanit-kalite-card
    'ads.live.title', // reklam-banner — AYNA vitrin
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

test('"Dileğini Anlat" İKİ YOLLU teklif ekranına gidiyor', () => {
  // Kurucunun "foto ve fiyat ile teklif alma" dediği şey İKİ ayrı akış:
  // `/quote/new` (fotoğrafla) ve `/demand/new` (fiyat/talep ile). Seçimi
  // kullanıcı yapar; hub `/quote`. Doğrudan `/quote/new`'e yönlendirmek
  // fiyat yolunu erişilemez kılıyordu — bu test onu geri getirmesin diye.
  const i = d.indexOf("'home.qa.wish'");
  assert.ok(i > 0, 'dilek kartı yok');
  const blok = d.slice(i - 400, i + 300);
  assert.match(blok, /yol: '\/quote'/, 'iki yollu ekrana yönlendirmiyor');
  assert.doesNotMatch(blok, /yol: '\/quote\/new'/, 'tek akışa kısa devre yapıyor');
});

test('hizmet ikonları FIGMA görselleri', () => {
  /*
   * Ionicons ile çizilmiş ikonlar kurucunun tasarladıkları değildi.
   * Eşleme `src/hizmet-ikon.ts`te, ÇİZİM ise artık `ui/HizmetIkonu`'nda —
   * altı ekran onu paylaşıyor. Burada ÖNEMLİ olan keşfetin kendi Image'ını
   * ya da Ionicons'ı geri getirmemesi.
   */
  assert.match(
    d,
    /<HizmetIkonu id=\{cat\.id\} tarz="kutu" \/>/,
    'ortak ikon bileşeni kullanılmıyor',
  );
  // Kategori-ikon eşleşmesinin TAMLIĞI `teklif-ekranlari-tasarim.test.ts`te
  // eşlemenin kendi kaynağına karşı kontrol ediliyor — burada kopyalamıyoruz.
});

test('hizmet ikon kutusu Figma ölçüsünü koruyor', () => {
  /*
   * `ikonKart` keşfetten `ui/HizmetIkonu`'na taşındı — altı ekran aynı
   * kutuyu paylaşsın diye. Ölçü denetimi de oraya taşındı; 64/16 hâlâ
   * tasarımdan gelen değer.
   */
  const b = readFileSync(join(__dirname, 'ui', 'HizmetIkonu.tsx'), 'utf8');
  for (const deger of [
    'kutu: 64',
    'width: OLCU.kutu',
    'height: OLCU.kutu',
    'borderRadius: radius.md',
  ]) {
    assert.ok(b.includes(deger), `ikon kutusu: "${deger}" — ölçü tasarımdan sapmış`);
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

test('YEREL görseller doğrudan veriliyor — uri sarmalı yok', () => {
  /*
   * Kurucu ekran görüntüsü gönderdi: üç hızlı eylem kartı gri degrade
   * görünüyordu, fotoğraflar yoktu.
   *
   * Sebep: `require(...)` bir MODÜL REFERANSI döndürüyor (RN'de sayı),
   * adres değil. `source={{ uri: e.gorsel }}` yazınca geçersiz bir adres
   * oluşuyor, resim hiç çizilmiyor ve geriye yalnız üstündeki koyu perde
   * kalıyor. Hata sessiz: kod derleniyor, test yeşil kalıyordu.
   *
   * Kural: yerel görsel `source={x}`, ağdan gelen `source={{ uri: x }}`.
   */
  const kaynak = d.replace(/\/\*[\s\S]*?\*\//g, '');
  const yerel = new Set([
    ...[...kaynak.matchAll(/(\w+):\s*require\(/g)].map((m) => m[1]!),
    ...[...kaynak.matchAll(/const (\w+) = require\(/g)].map((m) => m[1]!),
  ]);
  for (const ad of yerel) {
    assert.doesNotMatch(
      kaynak,
      new RegExp(`uri:\\s*[\\w.]*\\b${ad}\\b`),
      `yerel görsel '${ad}' uri sarmalına konmuş — resim çizilmez`,
    );
  }
  // Üç kart gerçekten görsel basıyor mu?
  assert.match(kaynak, /<Image source=\{e\.gorsel\}/, 'hızlı eylem kartları görseli basmıyor');
});

test('hızlı eylem kartlarının perdesi AÇIK, yazısı SABİT koyu', () => {
  /*
   * Kurucu üç fotoğrafı kendisi verdi ve üçü de açık tonlu (krem salon,
   * pudra tırnak masası, açık harita). Üstlerindeki perde siyahtı:
   * fotoğrafı çamurlaştırıyor ve "ekranlar çok koyu" derdine geri
   * dönüyordu.
   *
   * Yazı SABİT koyu olmalı, temadan gelmemeli: fotoğraflar iki temada da
   * aynı: `ink` yazsaydık koyu temada açık renge dönüp beyaz perdenin
   * üstünde kaybolurdu — `uzman/[id]` hero'sunda tam bu olmuştu.
   */
  const kod = d.replace(/\/\*[\s\S]*?\*\//g, '');
  const i = kod.indexOf('HIZLI_EYLEMLER.map');
  assert.ok(i > 0, 'hızlı eylem şeridi yok');
  const blok = kod.slice(i, kod.indexOf('</View>', i) + 200);
  assert.doesNotMatch(blok, /rgba\(0,0,0,0\.[5-9]/, 'kartların üstünde ağır siyah perde var');
  assert.match(blok, /rgba\(255,255,255,0\.9/, 'açık perde yok — yazı okunmaz');
  assert.match(kod, /color: lightColors\.ink/, 'kart yazısı sabit koyu değil');
});

test('FIRSAT kartı referanstaki DÖRT ögeyi de taşıyor', () => {
  /*
   * Kurucu referans kartı gönderip "sekıl olcu ve uzerındekı yazılar
   * olarak tam boyle olmalı" dedi. Referansta dört öge var:
   *   · SPONSORLU rozeti (beyaz hap, üst solda)
   *   · indirim rozeti ("%30 İndirim", kehribar hap)
   *   · başlık
   *   · alt yazı
   *
   * İndirim AYRI bir rozet; bizde `subtitle` yerine "-%30" yazılıyordu,
   * yani fırsatın kendi açıklaması ekrana HİÇ çıkmıyordu.
   */
  const kod = d.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(kod, /styles\.sponsorCip/, 'SPONSORLU rozeti yok');
  assert.match(kod, /styles\.indirimRozet/, 'indirim rozeti yok');
  assert.match(kod, /styles\.vitrinBaslik/, 'başlık yok');
  assert.match(kod, /styles\.vitrinAltYazi/, 'alt yazı yok');
  /*
   * İNDİRİM ALT YAZININ YERİNİ ALMAMALI.
   *
   * Bu kural artık PROMOSYON kartında yaşıyor: uzmanın kendi
   * kampanyaları Fırsatlar şeridinden çıkarıldı (o şerit ÖDENMİŞ
   * yerleşim için) ve ayrı bir bölüme taşındı. Kural taşındı, kaybolmadı.
   */
  const promo = readFileSync(join(import.meta.dirname, 'ui', 'PromosyonKarti.tsx'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
  assert.match(promo, /\{p\.aciklama\}/, 'kampanyanın açıklaması ekrana çıkmıyor');
  assert.match(promo, /%\{p\.indirimYuzde\}/, 'indirim ayrı rozet değil');
});

test('FIRSAT kartındaki yazılar okunuyor', () => {
  // Beyaz hapta erik, kehribar hapta beyaz, perdenin dibinde beyaz başlık.
  const oran = (a: string, b: string) => {
    const l = (h: string) => {
      const x = h.replace('#', '');
      const k = [0, 2, 4].map((i) => {
        const c = parseInt(x.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      }) as [number, number, number];
      return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
    };
    const [p, q] = [l(a), l(b)].sort((m, n) => n - m) as [number, number];
    return (p + 0.05) / (q + 0.05);
  };
  assert.ok(oran(lightColors.accent, '#FFFFFF') >= 4.5, 'SPONSORLU yazısı okunmuyor');
  assert.ok(oran('#FFFFFF', lightColors.gold) >= 4.5, 'indirim yazısı okunmuyor');
  // Rozet SABİT kehribar: kart bir fotoğraf, fotoğraf temayla değişmiyor.
  // Temanın kehribarını kullansaydık koyuda 1.70:1 olurdu.
  const kod2 = d.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(kod2, /backgroundColor: lightColors\.gold/, 'indirim rozeti temaya bağlı');
});

test('YEREL fotoğrafın ölçüsü AÇIK yazılmış', () => {
  /*
   * Kurucu ekran görüntüsü gönderdi: üç kart fotoğrafın yalnız sol üst
   * çeyreğini gösteriyordu.
   *
   * Sebep `require`a özgü: statik görsel kendi DOĞAL ölçüsünü biliyor
   * (440×660) ve `StyleSheet.absoluteFill` tek başına verilince o ölçüde,
   * sol üstten çiziliyor; kart da onu kırpıyor. `{ uri: ... }` ile gelen
   * ağ görsellerinde bu olmuyor — onların doğal ölçüsü yok, kutuya
   * oturuyorlar. Bu yüzden aynı satır başka ekranlarda sorun çıkarmadı.
   *
   * Teşhis tahmin değil: görselin sol üst 112×138 puanını kırpıp kurucunun
   * ekran görüntüsüyle karşılaştırdım, birebir aynıydı.
   *
   * Kural: `require` ile gelen görsele genişlik/yükseklik AÇIK verilmeli.
   */
  const kod = d.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(
    kod,
    /<Image source=\{e\.gorsel\} style=\{StyleSheet\.absoluteFill\}/,
    'yerel fotoğraf ölçüsüz — doğal boyutunda çizilir, kart kırpar',
  );
  assert.match(
    kod,
    /hizliFoto: \{[^}]*width: '100%'[^}]*height: '100%'/,
    'fotoğrafın ölçüsü açık değil',
  );
});

test('BÖLÜM BAŞLIĞI harf kaybetmiyor', () => {
  // "Hizmetler" → "Hizmetle" diye kırpılıyordu: satır `space-between`,
  // iki çocuk da esnemiyordu. Başlık daralır ve puntosu iner; sağdaki
  // "Tümünü Gör" daralmaz.
  const kod = d.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(kod, /bolumBaslik: \{ flexShrink: 1 \}/, 'başlık daralamıyor');
  assert.match(kod, /adjustsFontSizeToFit/, 'başlık sığmayınca küçülmüyor');
  assert.match(kod, /tumuKap: \{[^}]*flexShrink: 0/, '"Tümünü Gör" daralıyor — başlığı eziyor');
});

test('kart fotoğrafı TAM oturuyor — kartta iç boşluk yok', () => {
  /*
   * Kurucu: "kartlarda fotolar tam oturmamıs."
   *
   * Sebep benim önceki düzeltmemdi: fotoğrafa `width/height: '100%'`
   * verdim ama mutlak konumlu bir çocukta yüzde İÇ BOŞLUĞA göre
   * hesaplanıyor. Kartın 10px yan / 14px alt dolgusu kadar fotoğraf içeri
   * kaçtı, kenarlarda beyaz şerit kaldı.
   *
   * Yüzdeleri kaldırmak da olmaz — o zaman görsel kendi doğal boyutunda
   * çizilip hiç ölçeklenmiyor (ondan önceki hata). Doğrusu: dolgu KARTTAN
   * alınıp yazıya verilir.
   */
  const kod = d.replace(/\/\*[\s\S]*?\*\//g, '');
  const i = kod.indexOf('hizliKart: {');
  assert.ok(i > 0, 'kart stili yok');
  const kart = kod.slice(i, kod.indexOf('},', i));
  assert.doesNotMatch(kart, /padding/, 'kartta iç boşluk var — fotoğraf kenarlardan kaçar');
  assert.match(kod, /hizliYazi: \{[\s\S]{0,200}?padding/, 'boşluk yazıya taşınmamış');
});

test('BİLDİRİM ROZETİNDEKİ rakam ortalı', () => {
  // `alignItems/justifyContent: center` tek başına yetmiyor: satır kutusu
  // yazı tipinin ölçülerinden geliyor ve rakam yukarı kaçıyordu.
  const kod = d.replace(/\/\*[\s\S]*?\*\//g, '');
  const i = kod.indexOf('rozetYazi: {');
  assert.ok(i > 0, 'rozet yazı stili yok');
  const stil = kod.slice(i, kod.indexOf('},', i));
  assert.match(stil, /lineHeight: 16/, 'satır yüksekliği rozete eşitlenmemiş');
  assert.match(stil, /textAlign: 'center'/, 'yatay ortalama yok');
  assert.match(stil, /includeFontPadding: false/, 'Android ekstra boşluğu kapatılmamış');
});
