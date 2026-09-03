import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * GERÇEK ALAN ADI.
 *
 * Kurucu: "bizim ayna.kz diye bir domainimiz yok. mail adresimiz
 * info@ayna.salon ve websitemiz www.ayna.salon."
 *
 * `admin@ayna.kz` OLMAYAN bir alan adıydı ve panelde gerçekmiş gibi
 * duruyordu. Giriş için sorun değildi (adres yalnız kimlik) ama şifre
 * sıfırlama ya da bildirim gerektiğinde hiçbir yere ulaşmayacaktı.
 *
 * `merhaba@ayna.salon` da öyle: alan adı doğru ama O KUTU YOK — giden
 * postanın yanıtı hiçbir yere düşmezdi.
 */

const kok = join(import.meta.dirname, '..', '..');

/** Yorumsuz kaynak: "bu adres kalmadı" testi gerekçe yorumlarına takılmasın. */
const yorumsuz = (k: string) =>
  k
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n');

function kaynaklar(dizin: string): string[] {
  return readdirSync(dizin, { withFileTypes: true }).flatMap((g) => {
    const yol = join(dizin, g.name);
    if (g.isDirectory()) return g.name === 'node_modules' ? [] : kaynaklar(yol);
    return /\.(ts|tsx)$/.test(g.name) && !g.name.endsWith('.test.ts') ? [yol] : [];
  });
}

test('kodda OLMAYAN alan adı kalmadı', () => {
  const suclular: string[] = [];
  for (const yol of [...kaynaklar(join(kok, 'src')), join(kok, 'prisma', 'seed.ts')]) {
    if (yorumsuz(readFileSync(yol, 'utf8')).includes('ayna.kz')) {
      suclular.push(yol.split('/apps/api/')[1]!);
    }
  }
  assert.deepEqual(suclular, [], `olmayan alan adı kullanılıyor: ${suclular.join(', ')}`);
});

test('yönetici kimliği gerçek alan adında', () => {
  const s = readFileSync(join(kok, 'src/admin/admin-bootstrap.service.ts'), 'utf8');
  assert.match(s, /const ADMIN_EMAIL = 'admin@ayna\.salon'/, 'yönetici adresi taşınmamış');
});

test("'admin' takma adı doğru hesaba çözülüyor", () => {
  // Kurucu panele `admin` yazarak giriyor; takma ad eski adrese çözülseydi
  // hesap bulunamaz ve giriş imkânsız hâle gelirdi.
  const s = readFileSync(join(kok, 'src/auth/auth.service.ts'), 'utf8');
  assert.match(s, /=== 'admin' \? 'admin@ayna\.salon'/, 'takma ad eski adrese gidiyor');
});

test('giden posta adresi GERÇEK kutudan', () => {
  const s = yorumsuz(readFileSync(join(kok, 'src/mail/mailer.service.ts'), 'utf8'));
  assert.match(s, /info@ayna\.salon/, 'gönderen adresi info@ değil');
  assert.equal(/merhaba@/.test(s), false, 'olmayan kutu hâlâ gönderen olarak kullanılıyor');
});

test('mevcut hesap dağıtımda TAŞINIYOR', () => {
  /*
   * Railway `db push` çalıştırıyor, `migrate deploy` DEĞİL. Kod artık
   * `admin@ayna.salon` arıyor; bu SQL çalışmasaydı hesabı bulamaz ve YENİ
   * bir yönetici oluşturmaya çalışırdı (phone_hash çakışması).
   */
  const sql = readFileSync(join(kok, 'prisma/pre-push/09-yonetici-alan-adi.sql'), 'utf8');
  assert.match(sql, /UPDATE "users"/, 'taşıma yok');
  assert.match(sql, /'admin@ayna\.kz'/, 'eski adres aranmıyor');
  assert.match(sql, /'admin@ayna\.salon'/, 'yeni adres yazılmıyor');
  /*
   * HER UPDATE korumalı olmalı. İlk yazımda test tek bir `NOT EXISTS`
   * arıyordu ve ikinci taşımanın koruması silinse bile geçiyordu — oysa
   * `email` tekil ve çakışma DAĞITIMI YARIDA BIRAKIR.
   */
  const guncelleme = (sql.match(/UPDATE "users"/g) ?? []).length;
  const koruma = (sql.match(/NOT EXISTS/g) ?? []).length;
  assert.equal(koruma, guncelleme, `${guncelleme} taşımanın ${koruma} tanesi korumalı`);
});
