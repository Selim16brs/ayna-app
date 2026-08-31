import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * SAHTE VERİ GERÇEKMİŞ GİBİ GÖSTERİLMESİN.
 *
 * Bu oturumun en kötü iki bulgusu aynı sınıftandı:
 *   - Always ekranı `SEED_ALWAYS_BONDS` bekliyordu ama o hiçbir yere
 *     aktarılmıyordu; ekran her kullanıcıda boştu,
 *   - geri çağırma `SELLER_PAST_CLIENTS` üzerinde dönüyordu ve uzman uydurma
 *     isimleri (Zhanel S., Dana K.) KENDİ MÜŞTERİLERİ sanıyordu.
 *
 * Tohum verisi ya gerçekten kullanılır (ve o zaman kullanıcıya gerçekmiş gibi
 * görünmemeli) ya da durmamalı. 10 ölü tohum dışa aktarımı (406 satır, 10.7 KB)
 * OTA paketinde taşınıyordu.
 */

const kok = join(import.meta.dirname, '..');
const data = readFileSync(join(kok, 'src/data.ts'), 'utf8');

function tumKaynak(): string[] {
  const out: string[] = [];
  const gez = (dir: string) => {
    for (const ad of readdirSync(dir)) {
      const tam = join(dir, ad);
      if (statSync(tam).isDirectory()) gez(tam);
      else if (/\.tsx?$/.test(ad) && !tam.endsWith('data.ts')) out.push(tam);
    }
  };
  gez(join(kok, 'app'));
  gez(join(kok, 'src'));
  return out;
}

test('ölü tohum verisi birikmiyor', () => {
  const tohumlar = [...data.matchAll(/^export const (SEED_\w+|DEMO_\w+|MOCK_\w+)/gm)].map(
    (m) => m[1],
  );
  assert.ok(tohumlar.length > 0, 'tarama hiç tohum bulamadı — desen bozulmuş olabilir');

  const kaynak = tumKaynak()
    .map((f) => readFileSync(f, 'utf8'))
    // Yorumlar SAYILMAZ: bir tohumun adını gerekçe yazarken anmak onu
    // "kullanılıyor" yapmaz — SELLER_PAST_CLIENTS tam böyle hayatta kalmıştı.
    .map((s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''))
    .join('\n');

  const olu = tohumlar.filter((t) => !kaynak.includes(t));
  assert.deepEqual(
    olu,
    [],
    `Kullanılmayan tohum verisi (OTA paketini şişiriyor):\n  ${olu.join('\n  ')}\n` +
      'Ya gerçekten kullan ya da sil.',
  );
});

test('ikon-tek düğmelerin erişilebilir adı var', () => {
  // "Tüm günlere uygula" düğmesi yalnız bir kopyala ikonuydu: ne etiketi ne
  // erişilebilir adı vardı. Kullanıcı ne yaptığını tahmin etmek zorundaydı;
  // metni (`hours.apply_all`) yazılmış ama hiçbir yere bağlanmamıştı.
  const wh = readFileSync(join(kok, 'src/ui/WorkingHours.tsx'), 'utf8');
  // `[^>]*` KULLANMA: ok fonksiyonundaki `=>` içindeki `>` deseni erken
  // bitiriyor ve iddia kod doğruyken düşüyor.
  const m = /<Pressable[\s\S]*?applyAll\(idx\)[\s\S]*?\n\s*>/.exec(wh);
  assert.ok(m, 'tüm günlere uygula düğmesi bulunamadı');
  assert.match(m[0], /accessibilityLabel=\{t\('hours\.apply_all'\)\}/, 'düğmenin adı yok');
});
