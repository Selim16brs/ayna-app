import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isRiskyMessage } from './messages-guard';

// Yanlış POZİTİF kabul edilebilir; yanlış NEGATİF edilemez — kaçırılan her
// dolandırıcılık girişimi kullanıcının parasıdır. Ama fiyat konuşmasını riskli
// saymak da kartı gürültüye çevirir; iki taraf da burada kilitleniyor.

test('kart numarası / uzun sayı dizisi riskli sayılır', () => {
  assert.equal(isRiskyMessage('Kaspi kartıma at 4400 4300 1234 5678'), true);
  assert.equal(isRiskyMessage('4400-4300-1234-5678'), true);
});

test('uygulama dışına çıkarma girişimi riskli sayılır (tr · ru · kk)', () => {
  assert.equal(isRiskyMessage('Davayte v WhatsApp, tam udobnee'), true);
  assert.equal(isRiskyMessage('Давайте в телеграм'), true);
  assert.equal(isRiskyMessage('Ватсапқа жаз'), true);
});

test('kişisel havale isteği riskli sayılır (tr · ru · kk)', () => {
  assert.equal(isRiskyMessage('Kaspi Gold hesabıma gönderebilirsin'), true);
  assert.equal(isRiskyMessage('Переведи на карту заранее'), true);
  assert.equal(isRiskyMessage('Картаға аудар'), true);
  assert.equal(isRiskyMessage('IBAN göndereyim mi?'), true);
});

test('normal randevu konuşması riskli SAYILMAZ', () => {
  assert.equal(isRiskyMessage('Merhaba, yarın saat 14:00 uygun mu?'), false);
  assert.equal(isRiskyMessage('Сәлем! Ертең 15:00 бос па?'), false);
  assert.equal(isRiskyMessage('Здравствуйте, приходите с чистой головой'), false);
});

test('fiyat konuşması riskli SAYILMAZ — rakam var diye uyarı çıkmamalı', () => {
  assert.equal(isRiskyMessage('Fiyat 9 000 ₸, kapora 1 800 ₸'), false);
  assert.equal(isRiskyMessage('Стрижка 9 000 ₸, предоплата 1 800 ₸'), false);
  assert.equal(isRiskyMessage('Randevu 26.08 · 16:30'), false);
});
