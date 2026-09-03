import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { CATEGORIES } from './data';
import { darkColors, lightColors } from './theme.palette';

/**
 * TEKLİF EKRANLARI — yeni tasarım dili.
 *
 * Kurucu: "o ıkısını de yenı tasarıma gecır" — `/quote/new` (fotoğrafla) ve
 * `/demand/new` (fiyat/talep ile).
 *
 * İki eski iz vardı:
 *   1) Kategoriler Ionicons vektörleriyle çiziliyordu; kurucunun Figma'da
 *      çizdiği ikonlar keşfette duruyorken.
 *   2) `/demand/new` kategorilere 5 RENKLİ bir rotasyon uyguluyordu
 *      (adaçayı/lavanta/altın/mavi) — renk kategoriye anlam katmıyordu,
 *      sırf sıradaki renk geliyordu. Yeni dil tek vurgu rengi kullanıyor.
 */

const oku = (p: string) => readFileSync(join(__dirname, '..', 'app', p), 'utf8');
/**
 * Yorumları atar. `//`'den öncesine bakmak ŞART: `https://` de iki eğik
 * çizgi içeriyor ve naif bir kesici URL'yi yorum sanıp yutuyor. Tam bu
 * yüzden "yabancı görsel" koruması geri konan bir Unsplash bağlantısını
 * sessizce kaçırdı — mutasyonla yakalandı.
 */
const yorumsuz = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const foto = yorumsuz(oku('quote/new.tsx'));
const fiyat = yorumsuz(oku('demand/new.tsx'));
const kesfet = yorumsuz(oku('(tabs)/discover.tsx'));

/**
 * İkon eşlemesi KAYNAK OLARAK okunuyor, içe aktarılmıyor.
 *
 * Modül `require('...png')` içeriyor; Metro bunu çözer, Node çözemez —
 * içe aktarmak testi söz dizimi hatasıyla düşürüyordu.
 */
const ikonKaynak = readFileSync(join(__dirname, 'hizmet-ikon.ts'), 'utf8');
const IKON_ANAHTARLARI = new Set(
  [...ikonKaynak.matchAll(/^\s{2}(\w+): require\(/gm)].map((m) => m[1]!),
);

function parlaklik(hex: string): number {
  const h = hex.replace('#', '');
  const k = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
}
function oran(a: string, b: string): number {
  const [x, y] = [parlaklik(a), parlaklik(b)].sort((m, n) => n - m) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

test('ikon eşlemesi TEK kaynakta — üç ekran da onu okuyor', () => {
  for (const [ad, k] of [
    ['keşfet', kesfet],
    ['fotoğraflı teklif', foto],
    ['fiyat/talep', fiyat],
  ] as const) {
    /*
     * Ekranlar artık eşlemeyi DOĞRUDAN okumuyor: çizim `ui/HizmetIkonu`'na
     * taşındı (bkz. hizmet-ikon-birligi.test.ts). Testin derdi aynı — üç
     * ekran da ortak kaynağı kullanmalı — yalnız kaynağın adı değişti.
     */
    assert.match(k, /<HizmetIkonu\b/, `${ad} ortak ikon bileşenini kullanmıyor`);
    assert.doesNotMatch(
      k,
      /const HIZMET_IKON: Record<string, number> = \{/,
      `${ad} kendi kopyasını tutuyor — biri güncellenip ötekiler geride kalır`,
    );
  }
});

test('kategorilerin HEPSİNİN ikonu var', () => {
  // Eksik ikon sessizce boş kutu demek; kategori listesi büyüdüğünde
  // eşlemeyi güncellemeyi unutmayalım diye.
  assert.ok(IKON_ANAHTARLARI.size >= 10, 'ikon eşlemesi okunamadı');
  for (const cat of CATEGORIES) {
    assert.ok(IKON_ANAHTARLARI.has(cat.id), `"${cat.id}" kategorisinin Figma ikonu yok`);
  }
});

test('GÖKKUŞAĞI kategori paleti gitti', () => {
  // 5 renkli rotasyon kategoriye anlam katmıyordu.
  assert.doesNotMatch(fiyat, /makeCatColors/, 'renk rotasyonu duruyor');
  assert.doesNotMatch(fiyat, /CAT_COLORS/, 'renk rotasyonu kullanılıyor');
  for (const t of ['sageSoft', 'lavenderSoft', 'blueSoft']) {
    assert.doesNotMatch(fiyat, new RegExp(t), `${t} kategori döşemesinde duruyor`);
  }
});

test('kategori döşemesi SEÇİLİ/SEÇİLMEMİŞ ayrımını ÇERÇEVEYLE yapıyor', () => {
  /*
   * Eskiden seçili döşemenin ZEMİNİ aksanla doluyordu ve Figma ikonu pembe
   * zeminin üstünde kalıyordu — ana sayfadaki hâlinden bambaşka görünüyordu.
   * Kurucu "bütün hepsi ana sayfadaki tarzda olmalı" deyince ayrım
   * çerçeveye taşındı: zemin her durumda yüzey, ikon her yerde aynı.
   */
  const b = readFileSync(join(__dirname, 'ui', 'HizmetIkonu.tsx'), 'utf8');
  assert.match(
    b,
    /kutuSecili: \{ borderWidth: 2, borderColor: colors\.accent \}/,
    'seçim çerçeveyle belirtilmiyor',
  );
  assert.match(b, /backgroundColor: colors\.surface/, 'kutu zemini yüzey değil');
});

test('kategori yazısı İKİ TEMADA da okunuyor', () => {
  for (const [ad, c] of [
    ['açık', lightColors],
    ['koyu', darkColors],
  ] as const) {
    // Seçili döşeme: erik zeminde ikon/yazı.
    const secili = oran(c.onAccent, c.accent);
    assert.ok(secili >= 4.5, `${ad}: seçili döşeme ${secili.toFixed(2)}:1`);
    // Seçilmemiş döşeme: yüzey zeminde çizgi kenarlık + altındaki etiket.
    const etiket = oran(c.inkSoft, c.bg);
    assert.ok(etiket >= 4.5, `${ad}: kategori etiketi ${etiket.toFixed(2)}:1`);
  }
});

test('fotoğraflı teklifin kategorisi ANA SAYFA kutusunda', () => {
  /*
   * ── BU TEST DEĞİŞTİ ──────────────────────────────────────────────────
   *
   * Eskiden "çip dolu gri leke olmasın" diye ölçüyordu. Ama kurucu çipin
   * kendisini reddetti: "hizmet ikonları ana sayfadaki gibi olacak
   * demiştim." Hap içinde 20'lik ikon çiziliyordu ve Figma çiziminin
   * ayrıntısı o boyutta dağılıp başka bir ikon gibi görünüyordu.
   *
   * Artık ölçülen şey çipin rengi değil, ORTAK KUTUNUN kullanılması.
   */
  assert.match(foto, /<HizmetIkonu id=\{cat\.id\} tarz="kutu"/, 'ana sayfa kutusu kullanılmıyor');
  assert.equal(/tarz="satir"/.test(foto), false, 'hâlâ küçük satır ikonu çiziliyor');
});

/**
 * SÜS AMAÇLI RENK — kaldırıldı.
 *
 * Yeni dil tek vurgu rengi kullanıyor; renk ancak BİR ŞEY anlatıyorsa
 * kalabilir (altın = puan, yeşil = onay/başarı, kırmızı = tehlike).
 * Aşağıdaki üç yerde renk hiçbir şey anlatmıyordu.
 */
test('süs amaçlı lavanta/mavi rozetler ERİK oldu', () => {
  // Biçime değil, RENGE bakıyoruz: Prettier satırı nasıl sararsa sarsın
  // lavanta/mavi bu üç dosyada hiç kalmamalı.
  const yerler = [
    ['seller/agenda.tsx', ['lavenderSoft', 'colors.lavender']],
    ['profile/passport.tsx', ['lavenderSoft', 'colors.lavender']],
    ['quote/results.tsx', ['blueSoft', 'colors.blue']],
  ] as const;
  for (const [dosya, oluler] of yerler) {
    const k = yorumsuz(oku(dosya));
    for (const olu of oluler) {
      assert.doesNotMatch(
        k,
        new RegExp(olu.replace('.', '\\.') + '\\b'),
        `${dosya}: ${olu} hâlâ duruyor`,
      );
    }
    assert.match(k, /colors\.accentSoft/, `${dosya}: erik rozet yok`);
  }
});

test('ANLAMLI renkler yerinde duruyor', () => {
  // Bu temizlik semantik rengi süpürmemeli: altın puanı, yeşil onayı,
  // mavi bilgiyi anlatmaya devam ediyor.
  const pasaport = yorumsuz(oku('profile/passport.tsx'));
  assert.match(pasaport, /colors\.goldSoft/, 'puan rozetinin altını gitmiş');
  assert.match(pasaport, /colors\.successSoft/, 'doğrulama rozetinin yeşili gitmiş');
});

/**
 * ÇİP DİLİ — seçilmemiş çip yüzey + ince çizgi.
 *
 * Eski dilde seçilmemiş çip dolu gri (`surfaceMuted`) idi. Seçili erik
 * çipin yanında ikinci bir "dolu" gibi okunuyor, hangisinin seçili olduğu
 * bir bakışta anlaşılmıyordu.
 */
test('seçilmemiş çipler DOLU GRİ değil — UYGULAMA GENELİ', () => {
  /*
   * Tek tek dosya saymak yerine bütün ekranlar taranıyor: çip/sekme/hap
   * adlı her stil, dolu gri (`surfaceMuted`) zeminle seçilmemiş hâli
   * anlatamaz. Seçili erik çipin yanında ikinci bir "dolu" gibi okunuyor.
   *
   * İki istisna KASITLI ve adları burada:
   *   · `slotChipOff` — devre dışı saat; gri tam da "basılamaz" demek.
   *   · `sablonChip`  — zaten çizgili (hairline), dolu leke değil.
   */
  const IZINLI = new Set(['slotChipOff', 'sablonChip']);
  const CIP = /chip|Chip|tab|Tab|sekme|Sekme|pill|Pill|toggle|Toggle/;
  const kok = join(__dirname, '..', 'app');
  const dosyalar: string[] = [];
  const gez = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const t = join(d, e.name);
      if (e.isDirectory()) gez(t);
      else if (e.name.endsWith('.tsx')) dosyalar.push(t);
    }
  };
  gez(kok);

  const suclular: string[] = [];
  for (const yol of dosyalar) {
    const k = readFileSync(yol, 'utf8');
    for (const m of k.matchAll(/^ {4}(\w+): \{\n([\s\S]*?)^ {4}\},$/gm)) {
      const ad = m[1]!;
      if (!CIP.test(ad) || IZINLI.has(ad)) continue;
      const govde = m[2]!.replace(/\/\/.*$/gm, '');
      if (govde.includes('colors.surfaceMuted')) {
        suclular.push(`${yol.split('/app/')[1]} → ${ad}`);
      }
    }
  }
  assert.deepEqual(suclular, [], `dolu gri çipler:\n  ${suclular.join('\n  ')}`);
});

test('aramadaki popüler kategoriler de FIGMA ikonu', () => {
  const k = yorumsuz(oku('search.tsx'));
  // Çizim ortak bileşene taşındı; Figma görselini o okuyor.
  assert.match(k, /<HizmetIkonu id=\{cat\.id\}/, 'popüler kategori çipi ortak ikonu kullanmıyor');
});

test('YABANCI görsel yok — ekranlarda unsplash bağlantısı kalmadı', () => {
  /*
   * İki ekranda görseli olmayan öğe için Unsplash'ten fotoğraf çekiliyordu.
   * İki ayrı sorun:
   *   · Tasarıma ait olmayan yabancı görsel.
   *   · YEDEĞİN KENDİSİ ağa bağlıydı — çevrimdışıyken yer tutucu da
   *     gelmiyor, kullanıcı kırık kutu görüyordu.
   * Yerini token'lı yerel yer tutucu aldı.
   */
  const kok = join(__dirname, '..', 'app');
  const suclular: string[] = [];
  const gez = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const t = join(d, e.name);
      if (e.isDirectory()) gez(t);
      else if (e.name.endsWith('.tsx') && /unsplash/i.test(yorumsuz(readFileSync(t, 'utf8')))) {
        // Yorumsuz okunuyor: kaldırılan şeyin adı, onu KALDIRAN yorumda
        // geçiyor. Yorumu okuyan bir kontrol düzeltilmiş dosyayı suçlar.
        suclular.push(t.split('/app/')[1]!);
      }
    }
  };
  gez(kok);
  assert.deepEqual(suclular, [], `yabancı görsel kullanan ekranlar: ${suclular.join(', ')}`);
});
