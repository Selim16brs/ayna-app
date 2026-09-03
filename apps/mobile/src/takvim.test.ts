import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ayEkle, ayIzgarasi, ayniGun, gunBasi, saatUygula, secilebilir, tarihYaz } from './takvim';

/**
 * SAF TAKVİM MANTIĞI.
 *
 * Kurucu: "takvim asılı kalmış hiçbir değişiklik yapılamıyor... aynı hatalar
 * diğer takvimle giriş yapılan yerlerde de var."
 *
 * Native tarih seçici, telefondaki yapıda o modül bulunmadığı için epoch
 * sıfırda donuyor ve dokunuşa yanıt vermiyordu. OTA bunu çözemez. Takvim
 * saf JS'e taşındı; bu dosya mantığı JSX olmadan ölçüyor.
 */

test('ızgara HER AY 42 hücre — düğmeler zıplamıyor', () => {
  /*
   * Ay değişince satır sayısı oynarsa altındaki düğmeler yer değiştiriyor
   * ve kullanıcı yanlış yere basıyor.
   */
  for (const [y, a] of [
    [2026, 1], // Şubat 2026 — 28 gün, Pazar başlangıç
    [2026, 8], // Eylül 2026
    [2024, 1], // artık yıl Şubat
    [2026, 10],
  ]) {
    assert.equal(ayIzgarasi(y!, a!).length, 42, `${y}-${a! + 1} ızgarası 42 değil`);
  }
});

test('ızgara PAZARTESİ ile başlıyor', () => {
  // Türkiye'de hafta pazartesi başlar; pazar başlatmak günleri kaydırır.
  const g = ayIzgarasi(2026, 8);
  assert.equal(g[0]!.tarih.getDay(), 1, 'ilk hücre pazartesi değil');
});

test('ayın ilk günü doğru hücreye düşüyor', () => {
  // 1 Eylül 2026 salı → pazartesi başlangıçlı ızgarada ikinci hücre.
  const g = ayIzgarasi(2026, 8);
  const ilk = g.findIndex((h) => h.ayIcinde && h.tarih.getDate() === 1);
  assert.equal(new Date(2026, 8, 1).getDay(), 2, 'test varsayımı: 1 Eylül 2026 salı');
  assert.equal(ilk, 1);
});

test('komşu ayın günleri işaretli', () => {
  // Boş bırakmak haftanın hangi güne denk geldiğini okumayı zorlaştırıyor.
  const g = ayIzgarasi(2026, 8);
  assert.ok(
    g.some((h) => !h.ayIcinde),
    'komşu ay günleri yok',
  );
  assert.ok(g.filter((h) => h.ayIcinde).length === 30, 'Eylül 30 gün olmalı');
});

test('sınırlar GÜN bazında — aynı günün saati eleme yapmıyor', () => {
  /*
   * `minimumDate` "şimdi" olduğunda saat karşılaştırması bugünü seçilemez
   * yapardı; kullanıcı bugünü seçemeyince takvim bozuk görünür.
   */
  const simdi = new Date(2026, 8, 3, 9, 0);
  /*
   * KRİTİK HÜCRE: ızgaradaki günler GECE YARISINDA üretiliyor (00:00).
   * Saat bazında karşılaştırılsaydı bugünün hücresi 00:00 < 09:00 diye
   * ELENİRDİ ve kullanıcı bugünü hiç seçemezdi — ilk yazımda testim
   * 23:00 kullandığı için bu hatayı kaçırıyordu.
   */
  assert.equal(secilebilir(new Date(2026, 8, 3, 0, 0), simdi), true, 'bugün elendi');
  assert.equal(secilebilir(new Date(2026, 8, 3, 23, 0), simdi), true, 'bugün elendi');
  assert.equal(secilebilir(new Date(2026, 8, 2), simdi), false, 'dün seçilebiliyor');
});

test('ay değiştirince taşan gün ayın SONUNA sabitleniyor', () => {
  // 31 Mart'tan bir ay geri = 31 Şubat değil; sabitlenmezse Mart'a geri döner.
  const t = ayEkle(new Date(2026, 2, 31), -1);
  assert.equal(t.getMonth(), 1, 'şubata gitmedi');
  assert.equal(t.getDate(), 28, '2026 şubatı 28 gün');
});

test('saat uygulanınca GÜN kaymıyor', () => {
  const t = saatUygula(new Date(2026, 8, 3), 23, 45);
  assert.equal(t.getDate(), 3);
  assert.equal(t.getHours(), 23);
  assert.equal(t.getMinutes(), 45);
});

test('aynı gün karşılaştırması saatten etkilenmiyor', () => {
  assert.equal(ayniGun(new Date(2026, 8, 3, 0, 1), new Date(2026, 8, 3, 23, 59)), true);
  assert.equal(ayniGun(new Date(2026, 8, 3), new Date(2026, 8, 4)), false);
});

test('gün başı saati sıfırlıyor', () => {
  const g = gunBasi(new Date(2026, 8, 3, 17, 42));
  assert.equal(g.getHours(), 0);
  assert.equal(g.getMinutes(), 0);
});

test('tarih yazımı Türkçe ve okunur', () => {
  assert.equal(tarihYaz(new Date(2026, 8, 3), false), '3 Eylül 2026');
  assert.equal(tarihYaz(new Date(2026, 8, 3, 9, 5), true), '3 Eylül 2026 · 09:05');
});

/* ── NATIVE MODÜL GERİ GELMESİN ────────────────────────────────────────── */

test('hiçbir ekran NATIVE tarih seçici kullanmıyor', async () => {
  /*
   * ── BU TESTİN SEBEBİ ────────────────────────────────────────────────
   *
   * Kurucu: "takvim asılı kalmış hiçbir değişiklik yapılamıyor... aynı
   * hatalar diğer takvimle giriş yapılan yerlerde de var."
   *
   * `@react-native-community/datetimepicker` NATIVE bir modül. Telefondaki
   * yapı onu içermediğinde tarih 1 Oca 1970'te donuyor ve dokunuşa yanıt
   * vermiyordu — beş ekranda birden.
   *
   * En sinsi tarafı: `app.json` içinde `runtimeVersion: sdkVersion` var,
   * yani OTA güncellemeleri AYNI SDK'lı ESKİ yapılara da iniyor. JS
   * güncelleniyor ama native modül gelmiyor; OTA bunu ÇÖZEMİYOR ve hata
   * ancak yeni bir mağaza yapısıyla kapanıyor.
   *
   * Bu yüzden takvim saf JS'e taşındı. Modül yeniden kullanılırsa aynı
   * tuzak geri gelir — bu test onu engelliyor.
   */
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const kok = join(import.meta.dirname, '..');

  const dosyalar = (d: string): string[] =>
    readdirSync(d, { withFileTypes: true }).flatMap((g) => {
      const y = join(d, g.name);
      if (g.isDirectory()) return g.name === 'node_modules' ? [] : dosyalar(y);
      return /\.(ts|tsx)$/.test(g.name) && !g.name.endsWith('.test.ts') ? [y] : [];
    });

  // Yorumsuz kaynak: modülün NEDEN kaldırıldığını anlatan yorumlara takılmasın.
  const yorumsuz = (k: string) =>
    k
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      .split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');

  const suclular: string[] = [];
  for (const y of [...dosyalar(join(kok, 'app')), ...dosyalar(join(kok, 'src'))]) {
    if (yorumsuz(readFileSync(y, 'utf8')).includes('@react-native-community/datetimepicker')) {
      suclular.push(y.split('/apps/mobile/')[1]!);
    }
  }
  assert.deepEqual(suclular, [], `native tarih seçici geri gelmiş: ${suclular.join(', ')}`);
});

test('tarih girilen her ekran ORTAK takvimi kullanıyor', async () => {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const kok = join(import.meta.dirname, '..');
  for (const ad of [
    'app/auth/customer.tsx',
    'app/auth/expert.tsx',
    'app/auth/business/new.tsx',
    'src/ui/DateField.tsx',
    'src/ui/TarihSecici.tsx',
  ]) {
    const kod = readFileSync(join(kok, ad), 'utf8');
    assert.match(kod, /<TakvimSecici/, `${ad}: ortak takvimi kullanmıyor`);
  }
});
