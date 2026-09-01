import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * §6 BİLDİRİM MATRİSİ — "topun sahibi değiştiğinde karşı tarafa push gider".
 *
 * §0: "Bildirim = deep link ... push'a dokunulduğunda doğrudan ilgili randevu
 * kartı açılır (ana sayfa değil)."
 *
 * İki satır sessizce eksikti: depozito yüklendiğinde yalnız uzmana (üstelik
 * kaldırılmış onay adımını anlatan bir metinle) gidiyordu, ve "ödeme aldım"
 * bildirimi kazanılan puanı hiç söylemiyordu.
 */

const oku = (...p: string[]) => readFileSync(join(import.meta.dirname, ...p), 'utf8');
const svc = oku('bookings.service.ts');
const sch = oku('bookings.scheduler.ts');

test('§6 — depozito yüklendi bildirimi İKİ TARAFA gidiyor', () => {
  const m = /async submitDepositReceipt\([\s\S]*?\n {2}\}/.exec(svc)![0];
  assert.match(m, /taraflaraBildir\(/, 'tek tarafa gidiyor');
  assert.match(m, /Randevu kesinleşti/, 'içerik karttaki durumla aynı değil');
  const yardimci = /private async taraflaraBildir\([\s\S]*?\n {2}\}/.exec(svc)![0];
  assert.match(yardimci, /\[musteriId, uzmanId\]/, 'iki taraf da hedeflenmiyor');
});

test('§6 — "ödeme aldım" bildirimi KAZANILAN PUANI söylüyor', () => {
  const m = /async balanceReceived\([\s\S]*?\n {2}\}/.exec(svc)![0];
  assert.match(m, /cashbackPoints\(/, 'puan hesaplanmıyor');
  assert.match(m, /puan kazandın/, 'bildirim puanı söylemiyor');
});

test('§0 — bildirimler randevu KARTINA götürüyor, ana sayfaya değil', () => {
  // Randevunun ilerlemesiyle ilgili her push'un rotası karta olmalı. Listeye
  // atanlar bilinçli istisnalar: randevu artık YOK (düştü/iptal), kart açılamaz.
  const rotalar = [...svc.matchAll(/route: `\/booking\/\$\{[^}]+\}`/g)];
  assert.ok(rotalar.length >= 5, `randevu kartına giden push sayısı düşük: ${rotalar.length}`);
});

test('§4.2/§4.5 — zamanlayıcı hatırlatmaları TEKRARLAMIYOR', () => {
  // Zamanlayıcı 5 dakikada bir dönüyor: maske olmadan her tur aynı push gider.
  assert.match(sch, /gunHatirlatmalari: \{ increment: ekle \}/, 'hatırlatma maskesi yazılmıyor');
  assert.match(sch, /responseReminders: \{ lt: 2 \}/, 'yanıt hatırlatma sayacı yok');
});
