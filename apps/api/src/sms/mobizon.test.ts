import assert from 'node:assert/strict';
import { test } from 'node:test';
import { istekGovdesi, istekUcu, numarayiSadelestir, tekrarDenenir, yanitiCoz } from './mobizon';

/**
 * MOBIZON PROTOKOLÜ — DAVRANIŞ TESTLERİ.
 *
 * `smsc.test.ts` ile aynı disiplin: ağa çıkmadan, para harcamadan.
 */

const KIMLIK = { anahtar: 'k'.repeat(40) };

test('anahtar sorgu dizesinde, numara ve metin GÖVDEDE', () => {
  /*
   * Mobizon anahtarı sorgu dizesinde istiyor (dokümanın kendi örneği).
   * Ama ALICI NUMARASI kişisel veri — URL'de gitse ara sunucu kayıtlarına
   * düşerdi. O yüzden numara ve metin gövdede.
   */
  const uc = istekUcu(KIMLIK);
  assert.match(uc, /apiKey=k{40}/);
  assert.match(uc, /output=json/, 'JSON istenmiyor');
  assert.equal(uc.includes('recipient'), false, 'numara URL’de');

  const g = istekGovdesi(KIMLIK, '77771234567', 'AYNA: kodun 123456');
  assert.equal(g.get('recipient'), '77771234567');
  assert.equal(g.get('text'), 'AYNA: kodun 123456');
});

test('teslim bekleme süresi EN KISA — ölü kod teslim edilmiyor', () => {
  /*
   * OTP 5 dakikada doluyor. Telefonu kapalı birine 24 saat sonra çoktan
   * geçersiz olmuş bir kod teslim etmenin anlamı yok; kullanıcı girer ve
   * "kod geçersiz" görürdü. 60 dakika dokümanın izin verdiği alt sınır.
   */
  assert.equal(istekGovdesi(KIMLIK, '7777', 'x').get('params[validity]'), '60');
});

test('gönderen adı yoksa hiç gönderilmiyor', () => {
  assert.equal(istekGovdesi(KIMLIK, '7777', 'x').has('from'), false);
  assert.equal(istekGovdesi({ ...KIMLIK, gonderen: 'AYNA' }, '7777', 'x').get('from'), 'AYNA');
});

test('numaradaki "+" ATILIYOR — Mobizon yalnız rakam kabul ediyor', () => {
  // `telefonuBicimle` "+7…" üretiyor; olduğu gibi gönderilse istek reddedilirdi.
  assert.equal(numarayiSadelestir('+77771234567'), '77771234567');
  assert.equal(numarayiSadelestir('+7 (777) 123-45-67'), '77771234567');
});

test('başarı yanıtı mesaj kimliğini veriyor', () => {
  const s = yanitiCoz({ code: 0, data: { campaignId: 5, messageId: 987, status: 2 }, message: '' });
  assert.equal(s.ok, true);
  assert.equal(s.ok && s.mesajId, '987');
});

test('code sıfır DEĞİLSE başarı sayılmıyor', () => {
  for (const kod of [1, 2, 3, 4, 5, 6, 8, 9]) {
    const s = yanitiCoz({ code: kod, message: 'hata', data: { messageId: 1 } });
    assert.equal(s.ok, false, `code ${kod} başarı sayıldı`);
    assert.equal(s.ok === false && s.kod, kod);
  }
});

test('code sıfır ama mesaj kimliği yoksa BAŞARI DEĞİL', () => {
  /*
   * Teslim edilebilir bir şey üretilmemiş demek. "Gönderildi" deseydik
   * kullanıcı hiç gelmeyecek kodu beklerdi.
   */
  assert.equal(yanitiCoz({ code: 0, data: {} }).ok, false);
  assert.equal(yanitiCoz({ code: 0 }).ok, false);
});

test('tanınmayan yanıt BAŞARISIZ sayılıyor', () => {
  for (const ham of [null, undefined, 'ok', 42, {}, { data: { messageId: 1 } }]) {
    assert.equal(yanitiCoz(ham).ok, false, `başarı sayıldı: ${JSON.stringify(ham)}`);
  }
});

test('yalnız geçici uygulama hatası tekrar deneniyor', () => {
  assert.equal(tekrarDenenir(3), true);
  // 8/9 kimlik ve yetki: tekrar denemek anahtarı boşuna yakar.
  for (const kod of [1, 2, 4, 5, 6, 8, 9, null]) {
    assert.equal(tekrarDenenir(kod), false, `kod ${kod} boşuna tekrar deneniyor`);
  }
});

test('ağ hatası zarfı İKİ çözücüde de hata sayılıyor', async () => {
  /*
   * `sms.service` ağ hatasını tek bir zarfa çeviriyor ve o zarf hem SMSC
   * hem Mobizon çözücüsüne gidebiliyor. Biri onu "başarı" okusaydı,
   * internet koptuğunda sistem "kod gönderildi" derdi.
   */
  const zarf = { error: 'ağ: kapandı', error_code: null, code: -1, message: 'ağ: kapandı' };
  const smsc = await import('./smsc');
  assert.equal(yanitiCoz(zarf).ok, false, 'Mobizon çözücüsü ağ hatasını yuttu');
  assert.equal(smsc.yanitiCoz(zarf).ok, false, 'SMSC çözücüsü ağ hatasını yuttu');
  // Sebep kaybolmuyor: kayıtta "bilinmeyen hata" değil gerçek sebep görünmeli.
  const m = yanitiCoz(zarf);
  assert.match(m.ok === false ? m.hata : '', /ağ/);
});
