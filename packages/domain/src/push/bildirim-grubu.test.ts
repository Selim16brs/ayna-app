import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bildirimGonderilebilir, bildirimGrubu, zorunluBildirim } from './bildirim-grubu.js';

/**
 * Kullanıcının kapattığı bildirim GERÇEKTEN kapanmalı.
 *
 * Ayarlar ekranı dört grup sunuyor ve seçim sunucuya kaydediliyordu; ama push
 * gönderen kod bu kaydı HİÇ okumuyordu. Kullanıcı "Bakım hatırlatmaları"nı
 * kapatıyor, telefonu kapattığı bildirimi almaya devam ediyordu.
 */

const KAPALI = (grup: string) => ({ [grup]: false });

test('KAPATILAN grup gönderilmiyor', () => {
  assert.equal(bildirimGonderilebilir('reengage.due', KAPALI('care')), false);
  assert.equal(bildirimGonderilebilir('booking.remind_1h', KAPALI('booking')), false);
});

test('AÇIK grup gönderiliyor', () => {
  assert.equal(bildirimGonderilebilir('reengage.due', { care: true }), true);
  assert.equal(bildirimGonderilebilir('booking.remind_1h', { booking: true }), true);
});

test('TERCİH HİÇ KAYDEDİLMEMİŞSE gönderiliyor', () => {
  // Varsayılan açık: hiç ayar yapmamış kullanıcı bildirim almalı.
  assert.equal(bildirimGonderilebilir('booking.remind_1h', {}), true);
  assert.equal(bildirimGonderilebilir('booking.remind_1h', null), true);
  assert.equal(bildirimGonderilebilir('booking.remind_1h', undefined), true);
});

test('BOZUK kayıt bildirimleri KESMİYOR', () => {
  // `false` dışındaki her değer açık sayılıyor: bozuk bir kayıt yüzünden
  // kullanıcının bildirimleri sessizce kesilmemeli.
  assert.equal(bildirimGonderilebilir('booking.remind_1h', { booking: 'hayir' }), true);
  assert.equal(bildirimGonderilebilir('booking.remind_1h', { booking: 0 }), true);
});

test('BİR GRUBU kapatmak DİĞERİNİ kapatmıyor', () => {
  assert.equal(bildirimGonderilebilir('reengage.due', KAPALI('booking')), true);
  assert.equal(bildirimGonderilebilir('booking.remind_1h', KAPALI('care')), true);
});

test('ZORUNLU bildirimler kapatılamıyor', () => {
  /*
   * Kaçırılması GERİ ALINAMAZ sonuç doğuranlar: depozito süresi biterse
   * randevu düşer, iptal haberi gelmezse müşteri kapıya gider. Kullanıcıyı
   * bildirim tercihiyle parasından etmek, tercihe uymaktan büyük zarar.
   */
  const hepsiKapali = { booking: false, care: false };
  for (const key of [
    'booking.deposit_last_minutes',
    'booking.deposit_expired',
    'booking.free_cancel_last',
    'booking.cancelled',
    'booking.cancelled_reason',
    'booking.no_show_marked',
    'refund.sent',
    'dispute.approved',
    'membership.receipt_rejected',
  ]) {
    assert.equal(zorunluBildirim(key), true, `${key} zorunlu değil`);
    assert.equal(bildirimGonderilebilir(key, hepsiKapali), true, `${key} kapatılabiliyor`);
  }
});

test('ZORUNLU liste DAR — her şey zorunlu değil', () => {
  // Her bildirimi "önemli" saymak tercihi tümden anlamsız kılardı.
  assert.equal(zorunluBildirim('booking.remind_1h'), false);
  assert.equal(zorunluBildirim('booking.remind_30m'), false);
  assert.equal(zorunluBildirim('reengage.due'), false);
});

test('GRUPLARA GİRMEYEN bildirimler tercihten etkilenmiyor', () => {
  // Uzman/salon işleyişi, mesaj, destek: ayarlardaki dört anahtarın hiçbiri
  // bunların sözünü vermiyor.
  const hepsiKapali = { booking: false, care: false };
  for (const key of ['message.new', 'staff.joined', 'support.replied', 'ad.live']) {
    assert.equal(bildirimGrubu(key), null);
    assert.equal(bildirimGonderilebilir(key, hepsiKapali), true);
  }
});

test('grup ayrımı doğru', () => {
  assert.equal(bildirimGrubu('reengage.hair_t'), 'care');
  assert.equal(bildirimGrubu('booking.confirmed'), 'booking');
  assert.equal(bildirimGrubu('quote.new_offer'), 'booking');
  assert.equal(bildirimGrubu('booking.cancelled'), null); // zorunlu
});
