import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Brief §4.7/§4.8 — CEZA KURALLARI.
 *
 * | kim    | ne zaman            | sonuç                                       |
 * |--------|---------------------|---------------------------------------------|
 * | Uzman  | 3 saatten fazla var | iade; AYDA 3 ücretsiz, 4.'de 1 hafta gizli  |
 * | Uzman  | 3 saatten az kala   | no-show muamelesi: iade + 1 hafta gizli     |
 * |        |                     | (aylık 3 hakka SAYILMAZ)                    |
 * | Uzman  | gelmedi             | iade + 1 hafta gizli                        |
 */

const oku = (...p: string[]) => readFileSync(join(import.meta.dirname, ...p), 'utf8');
const svc = oku('bookings.service.ts');

test('aylık ücretsiz iptal hakkı 3, ceza 1 hafta', () => {
  assert.match(svc, /const AYLIK_UCRETSIZ_IPTAL = 3;/, 'aylık hak 3 değil');
  assert.match(svc, /const GORUNMEZLIK_MS = 7 \* 24 \* 60 \* 60 \* 1000;/, 'ceza 1 hafta değil');
  // Süre TEK yerde olmalı; ikinci bir literal, birinin değişip diğerinin
  // kalmasına açık olurdu.
  assert.equal(
    (svc.match(/7 \* 24 \* 60 \* 60 \* 1000/g) ?? []).length,
    1,
    '1 hafta süresi birden çok yerde yazılı',
  );
});

test('GEÇ iptal aylık hakka SAYILMIYOR — doğrudan cezalı', () => {
  const m = /private async uzmanIptalCezasi\([\s\S]*?\n {2}\}/.exec(svc);
  assert.ok(m, 'uzmanIptalCezasi yok');
  // Geç iptalde sayaç ARTMIYOR (hakka sayılmaz) ama ceza HER ZAMAN uygulanıyor.
  assert.match(m[0], /const yeniSayac = gecIptal \? sayac : sayac \+ 1;/, 'sayaç kuralı yanlış');
  assert.match(
    m[0],
    /const cezaGerek = gecIptal \|\| yeniSayac > AYLIK_UCRETSIZ_IPTAL;/,
    'geç iptal doğrudan cezalı değil',
  );
});

test('sayaç AY BAZLI ve ay etiketiyle sıfırlanıyor', () => {
  const m = /private async uzmanIptalCezasi\([\s\S]*?\n {2}\}/.exec(svc)![0];
  // "Her ay 1'inde toplu sıfırla" diye bir iş kurmak, o iş çalışmadığında
  // cezaları sessizce dondururdu; ay etiketi karşılaştırılıyor.
  assert.match(m, /sp\.cancelCountMonth === ay \? sp\.cancelCount : 0/, 'ay bazlı sıfırlama yok');
});

test('ceza mevcut süreyi UZATIYOR, sıfırlamıyor', () => {
  // Arka arkaya iki ceza alan uzman, ikincisinde süreyi baştan başlatarak
  // birincisini silemez.
  const m = /private async uzmanIptalCezasi\([\s\S]*?\n {2}\}/.exec(svc)![0];
  assert.match(m, /sp\.hiddenUntil\.getTime\(\) > nowMs \? sp\.hiddenUntil : new Date\(nowMs\)/);
});

test('GÖRÜNMEZLİK GERÇEKTEN UYGULANIYOR — bayrak değil kapı', () => {
  // Ceza `hiddenUntil`e yazılıyordu ama hiçbir yerde OKUNMUYORDU. Yazmak
  // cezalandırmak değildir; listede filtrelenmesi şart.
  const katalog = oku('..', 'catalog', 'catalog.service.ts');
  assert.match(katalog, /hiddenUntil: \{ gt: new Date\(\) \}/, 'cezalı uzman sorgulanmıyor');
  assert.match(
    katalog,
    /rows = tumRows\.filter\(\(r\) => !gizli\.has\(r\.id\)\)/,
    'liste filtrelenmiyor',
  );
});

test('uzman iptalinde depozito müşteriye İADE kaydı açılıyor', () => {
  const m = /private async uzmanIptalCezasi\([\s\S]*?\n {2}\}/.exec(svc)![0];
  assert.match(m, /kind: 'musteri_iade'/, 'iade kaydı açılmıyor');
});
