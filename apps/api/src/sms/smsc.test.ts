/**
 * SMSC PROTOKOLÜ — DAVRANIŞ TESTLERİ.
 *
 * Hepsi ağa çıkmadan koşuyor: protokol saf fonksiyonlarda olduğu için her
 * test koşusu para harcamıyor.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  istekGovdesi,
  numaraGecerliMi,
  otpMesaji,
  telefonuBicimle,
  tekrarDenenir,
  yanitiCoz,
} from './smsc';

const KIMLIK = { login: 'ayna', sifre: 'gizli' };

test('şifre ve numara URL’de değil GÖVDEDE gidiyor', () => {
  const g = istekGovdesi(KIMLIK, '+77771234567', 'AYNA: kodun 123456');
  // URLSearchParams gövde olarak POST ediliyor; burada içeriği doğruluyoruz.
  assert.equal(g.get('psw'), 'gizli');
  assert.equal(g.get('phones'), '+77771234567');
  // Kiril metin windows-1251 varsayılanıyla bozulur.
  assert.equal(g.get('charset'), 'utf-8');
  // fmt=0 serbest metin döner; ayrıştırması kırılgan.
  assert.equal(g.get('fmt'), '3');
});

test('gönderen adı yoksa hiç gönderilmiyor', () => {
  // Boş `sender` SMSC’ye "adsız" değil "geçersiz ad" olarak gidebilir.
  assert.equal(istekGovdesi(KIMLIK, '+7777', 'x').has('sender'), false);
  assert.equal(istekGovdesi({ ...KIMLIK, gonderen: 'AYNA' }, '+7777', 'x').get('sender'), 'AYNA');
});

test('başarı yanıtı mesaj kimliğini ve parça sayısını veriyor', () => {
  const s = yanitiCoz({ id: 4321, cnt: 1 });
  assert.equal(s.ok, true);
  assert.equal(s.ok && s.mesajId, '4321');
  assert.equal(s.ok && s.parca, 1);
});

test('HATA yanıtı `id` de taşısa BAŞARI sayılmıyor', () => {
  /*
   * SMSC dokümanı: 3,6,7,8 numaralı hatalarda cevapta `id` DE bulunuyor.
   * Önce `id`ye bakan bir çözücü, bakiyesi bitmiş hesapta "gönderildi"
   * derdi — kullanıcı hiç gelmeyecek kodu beklerdi.
   */
  const s = yanitiCoz({ error: 'нет средств', error_code: 3, id: 999 });
  assert.equal(s.ok, false);
  assert.equal(s.ok === false && s.kod, 3);
});

test('tanınmayan yanıt BAŞARISIZ sayılıyor', () => {
  // Varsayılan başarısızlık: bilinmeyeni başarı saymak, göndermeden
  // "gönderildi" demek olurdu.
  for (const ham of [null, undefined, 'ok', 42, {}, { cnt: 1 }]) {
    assert.equal(yanitiCoz(ham).ok, false, `başarı sayıldı: ${JSON.stringify(ham)}`);
  }
});

test('yalnız "çok sık istek" tekrar deneniyor', () => {
  assert.equal(tekrarDenenir(9), true, 'geçici hata tekrar denenmiyor');
  // 3 = bakiye yetersiz. Tekrar denemek aynı hatayı üretir ve döngüye sokar.
  for (const kod of [1, 2, 3, 4, 5, 6, 7, 8, null]) {
    assert.equal(tekrarDenenir(kod), false, `kod ${kod} boşuna tekrar deneniyor`);
  }
});

test('Kazakistan numarasının üç yazılışı da aynı numaraya gidiyor', () => {
  /*
   * Aynı telefon, insanların yazdığı üç biçim. Ham hâlleriyle
   * gönderilseydi ilk ikisi BAŞKA bir numaraya giderdi.
   */
  const beklenen = '+77771234567';
  assert.equal(telefonuBicimle('8 777 123 45 67'), beklenen, 'yerel "8" biçimi');
  assert.equal(telefonuBicimle('777 123 45 67'), beklenen, 'ülke kodsuz');
  assert.equal(telefonuBicimle('+7 (777) 123-45-67'), beklenen, 'uluslararası');
});

test('ULUSLARARASI numara "+" ile gidiyor, "+"sız gelen dokunulmadan geçiyor', () => {
  /*
   * Bu kural TERSİNE ÇEVRİLDİ; sebebi kayda değer.
   *
   * Eskiden yabancı numaraya "+" KONMUYORDU: numaranın doğruluğundan emin
   * olunamadığı için SMSC'nin kendi düzeltmesine bırakmak, yanlış bir biçimi
   * mühürlemekten iyiydi. O belirsizlik iki şeyle kalktı:
   *   1. `auth.dto` telefonu artık E.164 olarak DOĞRULUYOR — "+"lı gelen
   *      numara geçerliliği ölçülmüş numaradır.
   *   2. Ülke seçici 11 ülkeden 245'e çıktı. Türkiye ya da Almanya numarası
   *      "+"sız gidince sağlayıcının onu Kazak numarası sanma ihtimali,
   *      düzeltme faydasından daha büyük bir risk.
   *
   * "+"sız gelen numaraya HÂLÂ dokunulmuyor: veritabanında numaralar
   * `normalizePhone` yüzünden "+"sız duruyor ve oradan gelen bir çağrı eski
   * yolu izlemeli.
   */
  assert.equal(telefonuBicimle('+44 20 7123 4567'), '+442071234567', 'E.164 mühürlenmedi');
  assert.equal(telefonuBicimle('+905321234567'), '+905321234567', 'TR numarası');
  assert.equal(telefonuBicimle('442071234567'), '442071234567', '"+"sız numaraya dokunuldu');
});

test('OTP mesajı üç dilde de TEK PARÇA', () => {
  /*
   * SMSC parça başına ücretlendiriyor: KİRİL için sınır 70 karakter.
   * 71 karakterlik bir mesaj faturayı ikiye katlar — her OTP’de.
   */
  for (const dil of ['tr', 'kk', 'ru']) {
    const m = otpMesaji('123456', dil);
    assert.ok(m.length <= 70, `${dil}: ${m.length} karakter — iki parça olur`);
    assert.ok(m.includes('123456'), `${dil}: kod mesajda yok`);
    // Kimlik avına karşı: kullanıcı kodun kimden geldiğini görmeli.
    assert.ok(m.startsWith('AYNA'), `${dil}: gönderen belli değil`);
  }
});

test('bilinmeyen dil sessizce boş mesaj üretmiyor', () => {
  const m = otpMesaji('123456', 'de');
  assert.ok(m.includes('123456'), 'kod düştü');
});

test('ülke kodsuz numara SAĞLAYICIYA HİÇ GİTMİYOR', () => {
  /*
   * ── BU KONTROL BİR SESSİZ HATADAN DOĞDU ──────────────────────────────
   *
   * Kurucu telefon değişikliğinde numarayı "0555…" diye yazdı.
   * `telefonuBicimle` Kazakistan dışını tanımıyor ve olduğu gibi geçirdi;
   * Mobizon "uluslararası biçime uymuyor" dedi, kullanıcıya yalnızca
   * "kod gönderilemedi" göründü. Artık ağa çıkmadan burada duruyor.
   */
  for (const ham of ['05551235678', '0555 123 56 78', '08123456789']) {
    assert.equal(numaraGecerliMi(telefonuBicimle(ham)), false, `başta sıfır geçti: ${ham}`);
  }
  // Çok kısa / çok uzun da geçmiyor (E.164).
  assert.equal(numaraGecerliMi('123456789'), false, '9 hane geçti');
  assert.equal(numaraGecerliMi('1234567890123456'), false, '16 hane geçti');
});

test('geçerli numaralar ENGELLENMİYOR', () => {
  // Aşırı sıkı bir kural, gerçek kullanıcıyı kayıt dışı bırakırdı.
  for (const ham of ['+7 777 123 45 67', '8 777 123 45 67', '777 123 45 67']) {
    assert.equal(numaraGecerliMi(telefonuBicimle(ham)), true, `KZ numarası engellendi: ${ham}`);
  }
  // Yabancı numara da ülke koduyla yazıldıysa geçiyor.
  assert.equal(
    numaraGecerliMi(telefonuBicimle('+90 555 123 45 67')),
    true,
    'TR numarası engellendi',
  );
});
