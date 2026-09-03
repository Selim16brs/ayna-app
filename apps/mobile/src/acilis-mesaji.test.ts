import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { BOS_DURUM } from '@ayna/domain';
import { acilisMesajiHazirla, type AcilisGirdisi } from './acilis-mesaji-kapisi';
import { mesajPuntosu, okumaSuresi } from './acilis-olcu';

/**
 * AÇILIŞ MESAJI — uygulama tarafı (`AYNA_ACILIS_MESAJLARI_BRIEF.md` v2.0).
 *
 * Seçim kurallarının testi `@ayna/domain`de; burada UYGULAMANIN o
 * kurallara doğru bağlamı verip vermediği sınanıyor.
 */

const randevu = (id: string, status: string, startMs: number) => ({ id, status, startMs }) as never;

const girdi = (over: Partial<AcilisGirdisi> = {}): AcilisGirdisi => ({
  rol: 'user',
  dil: 'tr',
  randevular: [],
  puan: 0,
  dahaOnceAcildi: true,
  durum: BOS_DURUM,
  simdi: new Date(2026, 9, 13, 14, 0, 0),
  ...over,
});

test('UZMAN ve SALON oturumunda ekran HİÇ kurulmuyor', () => {
  /*
   * Brief §1.1: "Yalnızca MÜŞTERİ rolünde gösterilir. Uzman ve salon
   * rollerinde bu özellik YOKTUR." Gizlemek değil — hiç seçilmiyor.
   */
  assert.equal(acilisMesajiHazirla(girdi({ rol: 'professional' })), null);
  assert.equal(acilisMesajiHazirla(girdi({ rol: 'salon' })), null);
  assert.ok(acilisMesajiHazirla(girdi({ rol: 'user' })), 'müşteriye de gösterilmiyor');
});

test('İLK AÇILIŞ hoş geldin mesajını getiriyor', () => {
  assert.equal(acilisMesajiHazirla(girdi({ dahaOnceAcildi: false }))?.id, 'bh_01');
});

test('KESİNLEŞMEMİŞ randevu "randevun var" demiyor', () => {
  /*
   * `onay_bekliyor` ya da `depozito_bekliyor` durumundaki randevu için
   * "bugün randevu günü!" demek, henüz kesinleşmemiş bir şeyi kesinmiş
   * gibi sunmak olurdu: uzman onaylamayabilir, depozito süresi dolabilir.
   * Kullanıcı sabah o mesajla uyanıp randevusunun olmadığını öğrenirdi.
   */
  const bugun = new Date(2026, 9, 13, 14, 0, 0).getTime();
  for (const durum of ['onay_bekliyor', 'depozito_bekliyor', 'taslak', 'iptal_musteri']) {
    const r = acilisMesajiHazirla(girdi({ randevular: [randevu('r1', durum, bugun)] }));
    assert.notEqual(r?.id, 'bh_04', `${durum} randevusu için "randevu günü" mesajı çıktı`);
  }
  const kesin = acilisMesajiHazirla(girdi({ randevular: [randevu('r1', 'kesinlesti', bugun)] }));
  assert.equal(kesin?.id, 'bh_04', 'kesinleşmiş randevuda hatırlatma yok');
});

test('YARINKİ randevu ayrı mesaj getiriyor', () => {
  const yarin = new Date(2026, 9, 14, 10, 0, 0).getTime();
  const r = acilisMesajiHazirla(girdi({ randevular: [randevu('r9', 'kesinlesti', yarin)] }));
  assert.equal(r?.id, 'bh_03');
});

test('DOĞUM TARİHİ yoksa doğum günü mesajı HİÇ seçilmiyor', () => {
  // Uydurma tarih yok: hesapta yoksa mesaj da yok.
  let durum = BOS_DURUM;
  for (let i = 0; i < 60; i++) {
    const r = acilisMesajiHazirla(girdi({ dogumTarihiMs: null, durum }))!;
    assert.notEqual(r.id, 'pn_02');
    durum = r.durum;
  }
});

test('SÜRE brief formülüne uyuyor — sınırlarıyla', () => {
  // §6.1: 1,2 sn taban + 40 ms/karakter; alt 1,8 sn, üst 3,5 sn.
  assert.equal(okumaSuresi('kısa'), 1800, 'alt sınır uygulanmıyor');
  assert.equal(okumaSuresi('x'.repeat(200)), 3500, 'üst sınır uygulanmıyor');
  assert.equal(okumaSuresi('x'.repeat(14)), 1800, 'taban altı süre yükseltilmiyor');
  assert.equal(okumaSuresi('x'.repeat(30)), 1200 + 30 * 40, 'orta uzunlukta formül bozuk');
  assert.equal(okumaSuresi('x'.repeat(57)), 3480, 'üst sınıra yakın süre yanlış');
});

test('UZUN mesaj KÜÇÜLÜYOR ama okunur bir alt sınırda duruyor', () => {
  /*
   * §5.2: en uzun mesajlar (genelde KK) kırpılmadan sığmalı; mesaj bazında
   * otomatik küçültme kabul, alt sınır belirlenmeli.
   *
   * Pacifico dolgun bir yazı — kurucunun seçimi. Uzun Kazakça cümleler
   * büyük puntoda taşıyor.
   */
  assert.equal(mesajPuntosu('Bugün senin günün!'), 34);
  const uzunKK = 'Сұлулық ұйқысы жақсы. Ал сұлулық жазылымы — одан да жақсы!';
  assert.ok(mesajPuntosu(uzunKK) < 34, 'uzun mesaj küçülmüyor');
  assert.ok(mesajPuntosu('x'.repeat(300)) >= 24, 'punto okunmaz seviyeye düşüyor');
});

test('DOKUNMA GEÇİYOR ve hareket azaltma destekleniyor', () => {
  const k = readFileSync(join(__dirname, 'ui', 'AcilisMesaji.tsx'), 'utf8');
  assert.match(k, /onPress=\{\(\) => kapat\.current\(\)\}/, 'dokunarak geçme yok');
  assert.match(k, /isReduceMotionEnabled/, 'hareket azaltma okunmuyor');
  assert.match(k, /azHareket \? 0 :/, 'hareket azaltmada süzülme kapanmıyor');
});

test('SPLASH yüklemeye EK BEKLEME yaratmıyor', () => {
  /*
   * §6.1: "Splash hiçbir koşulda yüklemeye EK bekleme yaratmaz, yalnızca
   * paralel akar." Kapanış İKİ koşula birden bağlı: süre doldu VE
   * uygulama hazır.
   */
  const k = readFileSync(join(__dirname, 'ui', 'AcilisMesaji.tsx'), 'utf8');
  assert.match(
    k,
    /sureDoldu\.current = true;\s*\n\s*if \(hazir\) kapat\.current\(\);/,
    'süre dolunca hazırlık beklenmiyor',
  );
  assert.match(
    k,
    /if \(hazir && sureDoldu\.current\) kapat\.current\(\);/,
    'hazır olunca süre beklenmiyor',
  );
});

test('MESAJ bir kez seçiliyor — ekranda dururken değişmiyor', () => {
  const k = readFileSync(join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');
  assert.match(k, /acilisSecildi\.current = true;/, 'her render yeniden seçiliyor');
});
