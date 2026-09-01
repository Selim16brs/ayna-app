import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * SEÇİCİ KARARLILIĞI — açılışta çökmenin sebebi buydu.
 *
 * Zustand 5, React'in `useSyncExternalStore`'unu kullanıyor: seçici her
 * çağrıda YENİ bir referans döndürürse React bunu "durum yine değişti" sayar
 * ve sonsuz döngüye girer. `useStore((s) => s.bookings.filter(...))` tam bunu
 * yapıyordu ve uygulama AÇILIŞTA çöküyordu — ilk mount olan ekran oydu.
 *
 * Doğrusu: ham diziyi seç, süzgeci `useMemo` içinde uygula.
 */

const KOK = join(import.meta.dirname, '..');

/** app/ altındaki tüm ekranlar (bir seviye iç içe klasörler dahil). */
function ekranlar(): { yol: string; src: string }[] {
  const out: { yol: string; src: string }[] = [];
  const gez = (...p: string[]) => {
    for (const ad of readdirSync(join(KOK, ...p), { withFileTypes: true })) {
      if (ad.isDirectory()) gez(...p, ad.name);
      else if (ad.name.endsWith('.tsx'))
        out.push({
          yol: [...p, ad.name].join('/'),
          src: readFileSync(join(KOK, ...p, ad.name), 'utf8'),
        });
    }
  };
  gez('app');
  return out;
}

test('hiçbir seçici HER ÇAĞRIDA yeni dizi/nesne döndürmüyor', () => {
  for (const { yol, src } of ekranlar()) {
    const tek = src.replace(/\s+/g, ' ');
    // Her `useStore(...)` çağrısını gövdesiyle birlikte çıkar.
    for (const m of tek.matchAll(/useStore\(\s*\((?:s|st|state)\)\s*=>(.{0,220}?)\)[,;)]/g)) {
      // Yakalama sonraki koda taşmış olabilir: seçici gövdesinde `;` olmaz,
      // ilk noktalı virgülde kes.
      const govde = m[1]!.split(';')[0]!;
      const kapUretiyor = /\.(filter|map|sort|slice|concat|flatMap)\(/.test(govde);
      if (!kapUretiyor) continue;
      // Sonuç İLKEL değere indirgeniyorsa güvenli: her çağrıda aynı sayı/boolean.
      const ilkele = /\.(length|size)\b|\.reduce\(|\.some\(|\.every\(|\.includes\(/.test(govde);
      assert.ok(
        ilkele,
        `${yol}: seçici yeni dizi döndürüyor — Zustand 5'te sonsuz döngü, ` +
          `uygulama AÇILIŞTA çöker. Ham diziyi seçip useMemo ile süz.\n` +
          `  Bulunan: useStore((s) =>${govde.slice(0, 80)}`,
      );
    }
  }
});

test('rol süzgeçleri STORE SEÇİCİSİ değil, saf fonksiyon', () => {
  // İmza `State` alırsa `useStore(musteriRandevulari)` diye kullanılmaya
  // davet ediyor demektir — çökmenin ta kendisi.
  const store = readFileSync(join(KOK, 'src', 'store.ts'), 'utf8');
  for (const ad of ['musteriRandevulari', 'uzmanRandevulari']) {
    const m = new RegExp(`export const ${ad} = \\(([^)]*)\\)`).exec(store);
    assert.ok(m, `${ad} yok`);
    assert.ok(
      m[1]!.includes('Appointment[]'),
      `${ad} hâlâ State alıyor — seçici gibi kullanılabilir`,
    );
  }
});

test('işaretsiz randevu MÜŞTERİ sayılıyor', () => {
  // Yerelde henüz eşitlenmemiş yeni randevuyu KULLANICI oluşturmuştur.
  // `=== 'musteri'` yazılsaydı, yeni oluşturulan randevu hiçbir listede
  // görünmezdi — kullanıcı randevusunu kaybettiğini sanırdı.
  const store = readFileSync(join(KOK, 'src', 'store.ts'), 'utf8');
  assert.match(store, /musteriRandevulari[\s\S]{0,120}benimRolum !== 'uzman'/);
});
