/**
 * AKSAN SETLERİ — kontrast ve kapsam bekçisi.
 *
 * Kurucu sekiz renk onayladı. Her set açık VE koyu temada ayrı ayrı geçmek
 * zorunda: birinde okunup diğerinde kaybolan bir renk seti işe yaramaz.
 *
 * Buradaki asıl risk şu: yeni bir set eklerken ya da mevcut birini
 * "biraz açayım" diye elle oynarken beyaz yazının okunmaz hâle gelmesi.
 * Bu dosya onu yakalar.
 *
 * Ayrıca bir KAPSAM testi var: varsayılan setin bugünkü paletle BİREBİR
 * aynı olduğunu doğruluyor. Kurucunun şartı buydu — "mevcut tasarımı hiç
 * bozmadan". Gül setinde tek bir tonu değiştiren, testi kırar.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  AKSANLAR,
  AKSAN_ANAHTARLARI,
  VARSAYILAN_AKSAN,
  aksanCoz,
  type AksanAnahtari,
} from './theme.aksan';
import { darkColors, lightColors, paletUret } from './theme.palette';
import { gradyanUret, lightGradients } from './theme.gradients';

const ESIK = 4.5;

const kanal = (hex: string): [number, number, number] => {
  const t = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(t.slice(i, i + 2), 16)) as [number, number, number];
};

const parlaklik = (hex: string): number => {
  const [r, g, b] = kanal(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const kontrast = (a: string, b: string): number => {
  const x = parlaklik(a);
  const y = parlaklik(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const yuvarla = (n: number) => Math.round(n * 100) / 100;

// ── 1. Her set, her tema: aksan ailesinin tüm kritik çiftleri ────────────

for (const anahtar of AKSAN_ANAHTARLARI) {
  for (const tema of ['light', 'dark'] as const) {
    test(`aksan "${anahtar}" · ${tema} tema · tüm çiftler ${ESIK}:1 üstünde`, () => {
      const c = paletUret(tema, anahtar);
      const g = gradyanUret(tema, anahtar);

      // Beyaz yazı taşıyan dolu yüzeyler açık temada; koyu temada aksan
      // AÇILIP koyu yazı taşıyor. `onAccent` bu farkı zaten tutuyor.
      const ciftler: [string, string, string][] = [
        // ── metin, HER zemin üstünde ──
        ['başlık / sayfa zemini', c.ink, c.bg],
        ['başlık / kart', c.ink, c.surface],
        ['başlık / çökertilmiş bölüm', c.ink, c.bgSunken],
        ['başlık / panel', c.ink, c.surfaceMuted],
        ['başlık / sis yüzeyi', c.ink, c.heroSoft],
        ['ara metin / kart', c.inkSoft, c.surface],
        ['ara metin / sayfa zemini', c.inkSoft, c.bg],
        ['ikincil metin / kart', c.muted, c.surface],
        ['ikincil metin / sayfa zemini', c.muted, c.bg],
        ['ikincil metin / çökertilmiş', c.muted, c.bgSunken],
        ['ikincil metin / panel', c.muted, c.surfaceMuted],
        // ── aksan, HER zemin üstünde ──
        ['aksan üstündeki yazı', c.accent, c.onAccent],
        ['aksan / sayfa zemini', c.accent, c.bg],
        ['aksan / kart', c.accent, c.surface],
        ['aksan / çökertilmiş bölüm', c.accent, c.bgSunken],
        ['aksan / panel', c.accent, c.surfaceMuted],
        ['aksan / yumuşak hap', c.accent, c.accentSoft],
        ['aksan / sis yüzeyi', c.accent, c.heroSoft],
        // ── dolu koyu yüzeyler ──
        ['beyaz / derin yüzey', c.onColor, c.plum],
        ['ters yüzey yazısı', c.onInverse, c.inverse],
        // ── gradyanlar ──
        ['gradyan açık ucu', g.gold[0], c.onAccent],
        ['gradyan koyu ucu', g.gold[1], c.onAccent],
        ['derin gradyan açık ucu', c.onColor, g.plum[0]],
        ['derin gradyan koyu ucu', c.onColor, g.plum[1]],
        ['acil gradyan açık ucu', c.onColor, g.rose[0]],
        ['acil gradyan koyu ucu', c.onColor, g.rose[1]],
      ];

      for (const [ad, x, y] of ciftler) {
        const olcum = kontrast(x, y);
        assert.ok(
          olcum >= ESIK,
          `${anahtar}/${tema} — ${ad}: ${x} ↔ ${y} = ${yuvarla(olcum)}:1 (eşik ${ESIK})`,
        );
      }
    });
  }
}

// ── 1b. DERİNLİK SIRASI her sette korunuyor ────────────────────────────
//
// Renk değişiyor ama hiyerarşi değişmiyor: kart sayfa zemininden AÇIK
// (yükseltilmiş), çökertilmiş bölüm zeminden KOYU. Bir set bu sırayı bozarsa
// kartlar "gömülmüş" görünür — yerleşim aynı kalsa bile ekran yanlış okunur.

const parlak = (hex: string) => {
  const [r, g, b] = kanal(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

for (const tema of ['light', 'dark'] as const) {
  test(`${tema} tema · her sette derinlik sırası korunuyor`, () => {
    for (const anahtar of AKSAN_ANAHTARLARI) {
      const c = paletUret(tema, anahtar);
      if (tema === 'light') {
        assert.ok(
          parlak(c.surface) > parlak(c.bg),
          `${anahtar}: kart (${c.surface}) sayfa zemininden (${c.bg}) açık olmalı`,
        );
        assert.ok(
          parlak(c.bgSunken) < parlak(c.bg),
          `${anahtar}: çökertilmiş bölüm (${c.bgSunken}) zeminden (${c.bg}) koyu olmalı`,
        );
      } else {
        assert.ok(
          parlak(c.surface) > parlak(c.bg),
          `${anahtar}: koyu temada da kart zeminden yükseltilmiş olmalı`,
        );
      }
      // Kart zeminden AYRIŞMALI ama fark abartılı olmamalı.
      const fark = kontrast(c.surface, c.bg);
      assert.ok(fark >= 1.04, `${anahtar}/${tema}: kart zeminden ayrışmıyor (${yuvarla(fark)})`);
      assert.ok(fark <= 1.6, `${anahtar}/${tema}: kart zeminden fazla kopuk (${yuvarla(fark)})`);
    }
  });
}

// ── 1c. ZEMİN gerçekten DEĞİŞİYOR ──────────────────────────────────────
//
// Asıl şikâyet buydu: "değişen tek şey butonlar, zemin hiç değişmemiş."
// Setlerin sayfa zeminleri birbirinden GÖZLE AYIRT EDİLEBİLİR olmalı.
// CIE76 ΔE: 2 = zar zor, 3 = fark edilir, 5+ = bariz.

const labDeger = (hex: string): [number, number, number] => {
  const [r, g, b] = kanal(hex).map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  let x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  let y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  let z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const fn = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  [x, y, z] = [fn(x), fn(y), fn(z)];
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};

const deltaE = (a: string, b: string) => {
  const p = labDeger(a);
  const q = labDeger(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};

/**
 * Renk çemberindeki açı. Doygunluk düşükse ton kararsızdır; zemin ve aksan
 * yeterince doygun olduğu için burada güvenilir.
 */
const ton = (hex: string): number => {
  const [r, g, b] = kanal(hex).map((v) => v / 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  if (d === 0) return 0;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (Math.round(h * 60) + 360) % 360;
};

/** İki ton arasındaki en kısa açı (çember başa sarar: 350° ile 10° arası 20°). */
const tonFarki = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/*
 * ZEMİN, AKSANIYLA AYNI AİLEDEN OLMALI.
 *
 * Şikâyetin özü buydu: düğme mavi oluyor ama zemin pembe kalıyordu. Bu test
 * onu doğrudan yakalıyor — bir setin zemini kendi aksanının tonundan
 * kopamaz. (Yalnızca "setler birbirinden farklı olsun" demek yetmiyordu:
 * zümrütün zeminini pembeye çevirdiğimde test geçiyordu.)
 */
for (const tema of ['light', 'dark'] as const) {
  test(`${tema} tema · her setin zemini kendi aksanının ailesinden`, () => {
    for (const anahtar of AKSAN_ANAHTARLARI) {
      const c = paletUret(tema, anahtar);
      for (const alan of ['bg', 'bgSunken', 'surfaceMuted', 'line'] as const) {
        const fark = tonFarki(ton(c[alan]), ton(c.accent));
        assert.ok(
          fark <= 40,
          `${anahtar}/${tema}: "${alan}" (${c[alan]}, ton ${ton(c[alan])}°) ` +
            `aksanın (${c.accent}, ton ${ton(c.accent)}°) ailesinden değil — fark ${fark}°`,
        );
      }
    }
  });
}

test('setlerin sayfa zeminleri gözle ayırt edilebilir', () => {
  const zeminler = AKSAN_ANAHTARLARI.map((k) => [k, paletUret('light', k).bg] as const);
  // Her set, en az BİR başka setten bariz ayrılmalı; komşu tonlar
  // (gökyüzü ↔ lacivert) yakın olabilir ama palet geneli düz olamaz.
  for (const [ad, zemin] of zeminler) {
    const enUzak = Math.max(...zeminler.filter(([d]) => d !== ad).map(([, z]) => deltaE(zemin, z)));
    assert.ok(
      enUzak >= 5,
      `${ad} zemini (${zemin}) hiçbir setten ayrışmıyor (ΔE ${yuvarla(enUzak)})`,
    );
  }
});

// ── 2. Varsayılan setin EYLEM RENGİ bugünküyle aynı ────────────────────
//
// Kurucunun tek şartı: seçim yapılmazsa hiçbir şey değişmesin. Bu test onu
// token token doğruluyor; Gül setinde tek bir değeri kaydıran anında kırar.

/*
 * Not: bu test eskiden varsayılan setin TÜM paletle birebir aynı olmasını
 * şart koşuyordu. Kurucu "renk seçimleri çok sığ kalmış, zemin ve kartlar
 * hiç değişmemiş" deyince zemin katmanı da sete bağlandı ve varsayılanın
 * yüzeyleri de tonlandı. Korunması gereken şey artık PALETİN TAMAMI değil,
 * MARKA EYLEM RENGİ: düğmeler, aktif sekme ve bağlantılar bugünküyle aynı
 * kalmalı.
 */
test('varsayılan setin eylem rengi bugünküyle aynı', () => {
  const a = paletUret('light', VARSAYILAN_AKSAN);
  assert.equal(a.accent, lightColors.accent, 'açık tema eylem rengi kaymış');
  assert.equal(a.accentFg, lightColors.accentFg, 'açık tema eylem metni kaymış');
  assert.equal(a.onAccent, lightColors.onAccent, 'eylem üstü yazı kaymış');

  const k = paletUret('dark', VARSAYILAN_AKSAN);
  assert.equal(k.accent, darkColors.accent, 'koyu tema eylem rengi kaymış');
  assert.equal(k.accentFg, darkColors.accentFg, 'koyu tema eylem metni kaymış');

  assert.deepEqual(
    gradyanUret('light', VARSAYILAN_AKSAN).gold,
    lightGradients.gold,
    'birincil düğme gradyanı kaymış',
  );
});

// ── 3. Aksan DIŞINDAKİ hiçbir token kaymıyor ────────────────────────────
//
// Asıl korku buydu: renk seçimi ekranın geri kalanını da değiştirsin.
// Zemin, kart, metin, çizgi ve ANLAM renkleri (onay yeşili, iptal kırmızısı,
// bekleme kehribarı) hiçbir sette oynamamalı — yoksa "onaylandı" ile
// "iptal edildi" ayırt edilemez hâle gelir.

const AKSANLA_DEGISENLER = new Set([
  // aksan ailesi
  'accent',
  'accentSoft',
  'accentFg',
  'onAccent',
  'heroSoft',
  'plum',
  'rose',
  'roseSoft',
  // zemin katmanı — kurucunun "zemin hiç değişmemiş" şikâyeti üzerine eklendi
  'bg',
  'bgSunken',
  'surface',
  'surfaceMuted',
  'ink',
  'inkSoft',
  'muted',
  'line',
  'lineStrong',
  'inverse',
  'onInverse',
  'onInverseMuted',
  'fadeFrom',
  'fadeMid',
]);

for (const tema of ['light', 'dark'] as const) {
  test(`${tema} tema · aksan dışındaki token'lar hiçbir sette değişmiyor`, () => {
    const taban = paletUret(tema, VARSAYILAN_AKSAN);
    for (const anahtar of AKSAN_ANAHTARLARI) {
      const p = paletUret(tema, anahtar);
      for (const alan of Object.keys(taban) as (keyof typeof taban)[]) {
        if (AKSANLA_DEGISENLER.has(alan)) continue;
        assert.equal(
          p[alan],
          taban[alan],
          `"${anahtar}" seti "${alan}" token'ını değiştirmiş: ${taban[alan]} → ${p[alan]}`,
        );
      }
    }
  });
}

test('anlam renkleri (onay · iptal · bekleme) hiçbir sette kaymıyor', () => {
  for (const tema of ['light', 'dark'] as const) {
    const taban = tema === 'dark' ? darkColors : lightColors;
    for (const anahtar of AKSAN_ANAHTARLARI) {
      const p = paletUret(tema, anahtar);
      assert.equal(p.success, taban.success, `${anahtar}: onay yeşili kaymış`);
      assert.equal(p.danger, taban.danger, `${anahtar}: iptal kırmızısı kaymış`);
      assert.equal(p.gold, taban.gold, `${anahtar}: bekleme kehribarı kaymış`);
    }
  }
});

// ── 4. Setler birbirinden ayırt edilebilir ──────────────────────────────
//
// Sekiz yuvarlak yan yana duruyor. İkisi gözle ayırt edilemiyorsa seçenek
// değil, kalabalıktır.

test('setler birbirinden ayırt edilebilir', () => {
  const liste = AKSAN_ANAHTARLARI.map((k) => [k, AKSANLAR[k].light.accent] as const);
  for (let i = 0; i < liste.length; i++) {
    for (let j = i + 1; j < liste.length; j++) {
      const [ad1, r1] = liste[i]!;
      const [ad2, r2] = liste[j]!;
      assert.notEqual(r1, r2, `${ad1} ile ${ad2} aynı renk`);
      const [k1, m1, s1] = kanal(r1);
      const [k2, m2, s2] = kanal(r2);
      const uzaklik = Math.abs(k1 - k2) + Math.abs(m1 - m2) + Math.abs(s1 - s2);
      assert.ok(uzaklik >= 60, `${ad1} ↔ ${ad2} çok yakın (kanal farkı ${uzaklik})`);
    }
  }
});

// ── 5. Yuvarlak listesi eksiksiz ────────────────────────────────────────

test('her anahtarın seti, etiketi ve örnek rengi var', () => {
  for (const anahtar of AKSAN_ANAHTARLARI) {
    const set = AKSANLAR[anahtar];
    assert.ok(set, `${anahtar} için set yok`);
    assert.equal(set.etiket, `profile.accent.${anahtar}`, `${anahtar}: etiket anahtarı yanlış`);
    assert.equal(set.ornek, set.light.accent, `${anahtar}: örnek renk açık aksanla uyuşmuyor`);
  }
  assert.equal(
    Object.keys(AKSANLAR).length,
    AKSAN_ANAHTARLARI.length,
    'AKSANLAR ile AKSAN_ANAHTARLARI aynı sayıda değil',
  );
});

// ── 6. Bozuk kayıt varsayılana düşer ────────────────────────────────────
//
// Diskteki kayıt eski bir sürümden kalmış ya da bozulmuş olabilir.
// Uygulamanın çökmesi değil, gül renginde açılması doğru davranış.

test('bilinmeyen kayıt varsayılana düşer', () => {
  assert.equal(aksanCoz(null), VARSAYILAN_AKSAN);
  assert.equal(aksanCoz(undefined), VARSAYILAN_AKSAN);
  assert.equal(aksanCoz(''), VARSAYILAN_AKSAN);
  assert.equal(aksanCoz('mor'), VARSAYILAN_AKSAN);
  assert.equal(aksanCoz('GUL'), VARSAYILAN_AKSAN);
  for (const anahtar of AKSAN_ANAHTARLARI) {
    assert.equal(aksanCoz(anahtar), anahtar as AksanAnahtari);
  }
});
