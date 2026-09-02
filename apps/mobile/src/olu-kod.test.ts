import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ÖLÜ KOD BEKÇİSİ.
 *
 * Temizlik bir kereye mahsus yapılırsa birikir: silinen bir ekranın metinleri,
 * kaldırılan bir özelliğin kancası, kullanılmayan bir font paketi geride kalır
 * ve kimse fark etmez. Bu testler o birikmeyi ilk gün yakalar.
 */

const KOK = join(import.meta.dirname, '..', '..', '..');
const kaynaklar = (): string[] =>
  execSync(
    "find apps packages -type f \\( -name '*.ts' -o -name '*.tsx' \\) | grep -v node_modules " +
      "| grep -v '/dist/' | grep -v 'ios/Pods' | grep -v '/android/' " +
      "| grep -v 'packages/i18n/src/messages'",
    { cwd: KOK, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  )
    .split('\n')
    .filter(Boolean);

test('kullanılmayan i18n anahtarı YOK', () => {
  const tr = readFileSync(join(KOK, 'packages/i18n/src/messages/tr.ts'), 'utf8');
  const anahtarlar = [...tr.matchAll(/^ {2}'([^']+)':/gm)].map((m) => m[1]!);
  const metin = kaynaklar()
    .map((f) => readFileSync(join(KOK, f), 'utf8'))
    .join('\n');

  // Şablonla kurulan anahtarlar (`t(`wd.${n}`)`) statik aranamaz — öneki korunur.
  const onekler = new Set(
    [
      ...[...metin.matchAll(/t\(`([a-zA-Z0-9_.]*)\$\{/g)].map((m) => m[1]!),
      ...[...metin.matchAll(/`([a-zA-Z0-9_.]*)\$\{[^`]*`\s*as\s+(?:MessageKey|'[^']+')/g)].map(
        (m) => m[1]!,
      ),
    ].filter((o) => o && (o.includes('.') || o.endsWith('_'))),
  );

  const olu = anahtarlar.filter(
    (a) =>
      !metin.includes(`'${a}'`) &&
      !metin.includes(`"${a}"`) &&
      !metin.includes(`\`${a}\``) &&
      ![...onekler].some((o) => a.startsWith(o)),
  );
  assert.deepEqual(
    olu,
    [],
    `${olu.length} anahtar hiçbir yerde kullanılmıyor. Kullanılmayacaksa üç dilden de sil.`,
  );
});

test('kullanılmayan font paketi YOK', () => {
  // Uygulama Onest (yerel .ttf) + Caveat kullanıyor. Bir dönem altı Google font
  // ailesi daha bağımlılıkta duruyordu: hiç yüklenmiyor, sadece pakete ağırlık
  // katıyorlardı.
  const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  const fontlar = Object.keys(pkg.dependencies ?? {}).filter((d) =>
    d.startsWith('@expo-google-fonts/'),
  );
  const duzen = readFileSync(join(import.meta.dirname, '..', 'app', '_layout.tsx'), 'utf8');
  const kullanilmayan = fontlar.filter((f) => !duzen.includes(f));
  assert.deepEqual(kullanilmayan, [], 'yüklenmeyen font paketi bağımlılıkta duruyor');
});

test('PALETTE ölü token yok', () => {
  /*
   * Ölü token bir sonraki kişiyi yanıltır: `tone="onPastel"` yazan biri,
   * artık hiçbir yüzeyle eşleşmeyen bir renk alır.
   *
   * DİKKAT — bu taramayı iki kez yanlış yaptım, ikisini de not ediyorum:
   *   · Yalnız `colors.X` aramak yetmiyor: `lightColors.X` diye de
   *     erişiliyor (PlanBadge kehribarı böyle kullanıyor ve "ölü"
   *     sanılmıştı).
   *   · `Text` bileşeni tonu DİNAMİK okuyor (`colors[tone]`), yani bir
   *     token yalnız `tone="X"` olarak da kullanılıyor olabilir.
   * Bu yüzden arama her iki biçimi de kapsıyor.
   */
  const kaynak = readFileSync(join(__dirname, 'theme.palette.ts'), 'utf8');
  const bas = kaynak.indexOf('export const lightColors');
  const son = kaynak.indexOf('export const darkColors');
  const tokenlar = [...kaynak.slice(bas, son).matchAll(/^ {2}(\w+):/gm)].map((m) => m[1]!);

  const dosyalar: string[] = [];
  const gez = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const t = join(d, e.name);
      if (e.isDirectory()) gez(t);
      else if (
        /\.tsx?$/.test(e.name) &&
        !e.name.includes('.test.') &&
        !t.endsWith('theme.palette.ts')
      )
        dosyalar.push(t);
    }
  };
  gez(join(__dirname, '..', 'app'));
  gez(__dirname);
  const hepsi = dosyalar.map((f) => readFileSync(f, 'utf8')).join('\n');

  const olu = tokenlar.filter(
    (t) =>
      !new RegExp(`\\bcolors\\.${t}\\b`).test(hepsi) &&
      !new RegExp(`\\b(?:light|dark)Colors\\.${t}\\b`).test(hepsi) &&
      !new RegExp(`tone="${t}"`).test(hepsi) &&
      !new RegExp(`'${t}'`).test(hepsi),
  );
  assert.deepEqual(olu, [], `kullanılmayan palet token'ı: ${olu.join(', ')}`);
});
