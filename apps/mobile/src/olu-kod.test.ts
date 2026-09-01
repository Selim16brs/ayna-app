import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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
