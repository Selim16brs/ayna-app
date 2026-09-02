import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { PAZARLAMA, SABLONLAR, type SablonAdi } from './sablonlar';

/**
 * SIKLIK POLİTİKASI.
 *
 * Kurucu: "kullanıcıyı çok bunaltmamak lazım. her teklif geldiğinde mail
 * atmak sorun olabilir."
 *
 * Bunaltmanın bedeli tek bir postanın okunmaması değil: insanlar spam
 * işaretliyor, gönderim itibarı düşüyor ve sonra ÖNEMLİ posta da ("iaden
 * hazır") kutuya düşmüyor. Yani bunaltmak en çok işe yarayan postayı
 * öldürüyor. Politika bu yüzden koda gömülü, iyi niyete bırakılmadı.
 */

const kod = (ad: string) =>
  readFileSync(join(__dirname, ad), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

test('sıklık sınırı GÖNDERİM YOLUNDA — çağırana bırakılmamış', () => {
  /*
   * Politika mailer'da, tek geçitte. Zamanlayıcıya ya da çağıran modüle
   * bırakılsaydı biri unutur ve sınır sessizce delinirdi.
   */
  const m = kod('mailer.service.ts');
  assert.match(m, /private async sinirVar\(/, 'sınır kontrolü yok');
  assert.match(m, /const engel = await this\.sinirVar\(/, 'gönderim yolu sınırı çağırmıyor');
});

test('GÜNLÜK TAVAN ve PAZARLAMA ARALIĞI tanımlı', () => {
  const m = kod('mailer.service.ts');
  assert.match(m, /GUNLUK_TAVAN = \d+/, 'günlük tavan yok');
  assert.match(m, /PAZARLAMA_ARALIK_GUN = \d+/, 'pazarlama aralığı yok');
  // Tavan makul olmalı: 10 postayı "sınır" saymak sınır değildir.
  const tavan = Number(/GUNLUK_TAVAN = (\d+)/.exec(m)![1]);
  assert.ok(tavan >= 1 && tavan <= 5, `günlük tavan aşırı: ${tavan}`);
  const aralik = Number(/PAZARLAMA_ARALIK_GUN = (\d+)/.exec(m)![1]);
  assert.ok(aralik >= 3, `pazarlama aralığı çok kısa: ${aralik} gün`);
});

test('KRİTİK postalar tavana takılmıyor', () => {
  /*
   * Tavan "bilgi" postalarını kısmak için. Kullanıcının parasına ya da o an
   * bekleyen işine dair olanı susturmak zarar verir: "iaden hazır" postası
   * günlük tavana takılıp gitmezse kullanıcı parasını alamaz.
   */
  const m = kod('mailer.service.ts');
  assert.match(m, /KRITIK: ReadonlySet<string>/, 'kritik listesi yok');
  for (const ad of ['depozito_iadesi', 'depozito_bekliyor', 'randevu_onaylandi']) {
    assert.ok(m.includes(`'${ad}'`), `${ad} kritik listesinde değil`);
  }
  assert.match(
    m,
    /if \(MailerService\.KRITIK\.has\(sablon\)\) return null;/,
    'kritikler muaf değil',
  );
});

test('KRİTİK liste PAZARLAMA ile kesişmiyor', () => {
  /*
   * Bir posta hem "pazarlamadır, seyrek gitsin" hem "kritiktir, tavana
   * takılmasın" olamaz. Kesişme olsaydı pazarlama aralığı sessizce
   * delinirdi: kritik olduğu için tavanı geçer, pazarlama olduğu için de
   * haftada birden fazla gidemez sanılırdı.
   *
   * Liste KAYNAKTAN okunuyor, elle kopyalanmıyor: kopya, asıl liste
   * değişince sessizce eskir.
   */
  const m = kod('mailer.service.ts');
  const blok = /KRITIK: ReadonlySet<string> = new Set\(\[([\s\S]*?)\]\)/.exec(m);
  assert.ok(blok, 'kritik listesi okunamadı');
  const kritik = new Set([...blok[1]!.matchAll(/'(\w+)'/g)].map((x) => x[1]!));
  assert.ok(kritik.size >= 3, `kritik listesi beklenenden küçük: ${[...kritik].join(', ')}`);
  for (const p of PAZARLAMA) {
    assert.ok(!kritik.has(p), `${p} hem pazarlama hem kritik`);
  }
});

test('OLAY BAŞINA gidenler olay kimliği veriyor', () => {
  /*
   * Tekilleştirme `(userId, dedupeKey)` üzerinden. Olay kimliği verilmezse
   * anahtar düz şablon adı olur ve posta ÖMÜR BOYU bir kez gider —
   * ikinci randevunun onayı ve hatırlatması hiç gitmez.
   */
  const z = kod('mail.scheduler.ts');
  for (const sablon of ['randevu_hatirlatma', 'degerlendirme', 'depozito_iadesi']) {
    const i = z.indexOf(`'${sablon}'`);
    assert.ok(i > 0, `${sablon} zamanlayıcıda yok`);
    const blok = z.slice(i, i + 320);
    assert.match(blok, /r\.id/, `${sablon}: olay kimliği verilmiyor — ikincisi hiç gitmez`);
  }
});

test('ÖMÜR BOYU bir kez gidenler olay kimliği VERMİYOR', () => {
  // Karşılama ve geri kazanım kullanıcı başına birer kez. Olay kimliği
  // verilseydi her koşuda yeniden giderlerdi.
  const z = kod('mail.scheduler.ts');
  for (const sablon of ['ilk_randevu', 'geri_kazanim']) {
    const i = z.indexOf(`'${sablon}'`);
    assert.ok(i > 0, `${sablon} zamanlayıcıda yok`);
    const satir = z.slice(i, z.indexOf('\n', i));
    assert.doesNotMatch(satir, /,\s*\w+\.id/, `${sablon}: olay kimliği verilmiş — tekrar eder`);
  }
});

test('TEKLİF postası özet — her teklifte gitmiyor', () => {
  /*
   * Kurucunun asıl uyarısı buydu. Posta talep BAŞINA bir kez gidiyor ve
   * metin bunu kullanıcıya AÇIKÇA söylüyor: sonrakiler için ayrıca posta
   * yok. Söylemeseydik kullanıcı "ikinci teklif geldi mi" diye kutusuna
   * bakardı; söyleyince uygulamaya bakıyor.
   */
  const s = readFileSync(join(__dirname, 'sablonlar.ts'), 'utf8');
  const i = s.indexOf('const teklifGeldi');
  assert.ok(i > 0, 'teklif şablonu yok');
  const blok = s.slice(i, s.indexOf('/* ═══', i + 10));
  assert.match(blok, /not:/, 'sonraki teklifler için posta gitmediği söylenmiyor');
  for (const parca of [
    'ayrıca posta göndermiyoruz',
    'бөлек хат жібермейміз',
    'отдельно не пишем',
  ]) {
    assert.ok(blok.includes(parca), `üç dilde de söylenmiyor: "${parca}"`);
  }
});

test('her şablon ya pazarlama ya kritik ya da düz işlemsel — sınıflandırılmamış yok', () => {
  // Sınıfsız bir şablon sessizce tavana takılır ya da takılmaz; hangisi
  // olduğu belirsiz kalır.
  const adlar = Object.keys(SABLONLAR) as SablonAdi[];
  assert.ok(adlar.length >= 12, 'şablon sayısı beklenenden az');
  for (const ad of adlar) {
    assert.equal(typeof ad, 'string');
  }
});
