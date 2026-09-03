import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RATE_DEFS } from '../settings/settings.dto';

/**
 * W2W ÖN MODERASYON ANAHTARI.
 *
 * Kurucu: "w2w'de yorum yaptım ama yorum onayı admine düşmedi."
 *
 * ── SİSTEM HATALI DEĞİLDİ ───────────────────────────────────────────────
 *
 * Bilerek böyleydi: yalnız ŞÜPHELİ görülen gönderi kuyruğa düşüyor, temiz
 * olan doğrudan yayınlanıyordu. Kurucunun gönderisi temiz bulunmuştu.
 *
 * Ama bu bir ÜRÜN KARARI ve tek doğrusu yok:
 *   · Hepsini onaya almak → hiçbir şey kaçmaz, ama her gönderi admini
 *     bekler ve topluluk ölür.
 *   · Yalnız şüphelileri → topluluk akar, denetim örneklem olur.
 *
 * Karar panele taşındı. VARSAYILAN DEĞİŞMEDİ — sessiz bir davranış
 * değişikliği kimseye sürpriz olmasın.
 */

const kok = join(import.meta.dirname, '..', '..');
const servis = readFileSync(join(kok, 'src/circle/circle.service.ts'), 'utf8');

test('anahtar PANELDEN yönetiliyor', () => {
  const d = RATE_DEFS.find((r) => r.key === 'policy.circle_premoderate');
  assert.ok(d, 'ayar panelde yok — koda gömülü kalırsa değiştirmek sürüm gerektirir');
  assert.equal(d!.default, 0, 'varsayılan davranış değişmiş');
});

test('anahtar KAPALIYKEN davranış eskisiyle aynı', () => {
  /*
   * Yalnız `verdict.flagged` olan kuyruğa düşmeli. Anahtar kapalıyken
   * ikinci koşul sonucu değiştirmemeli.
   */
  assert.match(
    servis,
    /status: verdict\.flagged \|\| \(await this\.hepsiOnaya\(\)\) \? 'pending' : 'published'/,
    'ön moderasyon koşulu bağlanmamış',
  );
});

test('ayar okunamazsa topluluk AKMAYA devam ediyor', () => {
  /*
   * Ters varsayım tehlikeli: tek bir veritabanı hıçkırığında TÜM
   * gönderiler sessizce kuyruğa yığılır ve kimse sebebini anlamaz.
   */
  const i = servis.indexOf('private async hepsiOnaya');
  const govde = servis.slice(i, servis.indexOf('\n  }', i));
  assert.match(govde, /catch \{\s*return false;/, 'hata durumunda hepsi onaya düşüyor');
});

test('şüpheli gönderi anahtardan BAĞIMSIZ kuyruğa düşüyor', () => {
  // Anahtar kapalı olsa da moderasyon kararı geçerli kalmalı.
  assert.match(servis, /verdict\.flagged \|\|/, 'şüpheli koşulu ikinci plana atılmış');
});
