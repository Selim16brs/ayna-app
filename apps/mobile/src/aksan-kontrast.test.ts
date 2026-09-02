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
import { darkGradients, gradyanUret, lightGradients } from './theme.gradients';

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
        ['aksan üstündeki yazı', c.accent, c.onAccent],
        ['aksan / sayfa zemini', c.accent, c.bg],
        ['aksan / kart', c.accent, c.surface],
        ['aksan / yumuşak hap', c.accent, c.accentSoft],
        ['aksan / sis yüzeyi', c.accent, c.heroSoft],
        ['başlık / sis yüzeyi', c.ink, c.heroSoft],
        ['beyaz / derin yüzey', c.onColor, c.plum],
        ['gradyan açık ucu', g.gold[0], c.onAccent],
        ['gradyan koyu ucu', g.gold[1], c.onAccent],
        ['derin gradyan açık ucu', c.onColor, g.plum[0]],
        ['derin gradyan koyu ucu', c.onColor, g.plum[1]],
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

// ── 2. Varsayılan set BUGÜNKÜ paletin aynısı ────────────────────────────
//
// Kurucunun tek şartı: seçim yapılmazsa hiçbir şey değişmesin. Bu test onu
// token token doğruluyor; Gül setinde tek bir değeri kaydıran anında kırar.

test('varsayılan aksan bugünkü paletle birebir aynı (açık tema)', () => {
  assert.deepEqual(paletUret('light', VARSAYILAN_AKSAN), {
    ...lightColors,
    rose: lightColors.accent,
    roseSoft: lightColors.accentSoft,
  });
});

test('varsayılan aksan bugünkü paletle birebir aynı (koyu tema)', () => {
  assert.deepEqual(paletUret('dark', VARSAYILAN_AKSAN), {
    ...darkColors,
    rose: darkColors.accent,
    roseSoft: darkColors.accentSoft,
  });
});

test('varsayılan aksan bugünkü gradyanlarla birebir aynı', () => {
  assert.deepEqual(gradyanUret('light', VARSAYILAN_AKSAN), lightGradients);
  assert.deepEqual(gradyanUret('dark', VARSAYILAN_AKSAN), darkGradients);
});

// ── 3. Aksan DIŞINDAKİ hiçbir token kaymıyor ────────────────────────────
//
// Asıl korku buydu: renk seçimi ekranın geri kalanını da değiştirsin.
// Zemin, kart, metin, çizgi ve ANLAM renkleri (onay yeşili, iptal kırmızısı,
// bekleme kehribarı) hiçbir sette oynamamalı — yoksa "onaylandı" ile
// "iptal edildi" ayırt edilemez hâle gelir.

const AKSANLA_DEGISENLER = new Set([
  'accent',
  'accentSoft',
  'accentFg',
  'heroSoft',
  'plum',
  'rose',
  'roseSoft',
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
