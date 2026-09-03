import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * TEPE IŞIĞI — ekranların en üstündeki renk yıkaması.
 *
 * Kurucu: "ana sayfada hem tüm profillerde en üstte bu şekilde bir çalışma
 * yapar mısın? tabi ki SEÇİLEN RENGİN TONLARI olacak şekilde olmalı."
 */

const oku = (p: string) => readFileSync(join(__dirname, p), 'utf8');
const bilesen = oku('ui/TepeIsigi.tsx');
const ekran = (p: string) => readFileSync(join(__dirname, '..', 'app', p), 'utf8');

test('RENK TEMADAN — sabit renk kodu yok', () => {
  /*
   * Kurucunun tekrar eden şikâyeti: "renk değiştiğinde ... sabit kalıyor."
   * Buraya bir kez `#F8D7E3` yazılsaydı aksan değiştiğinde yıkama eski
   * renkte kalır ve ekranın geri kalanıyla kavga ederdi.
   */
  assert.doesNotMatch(bilesen, /#[0-9a-fA-F]{3,8}\b/, 'sabit renk kodu var');
  assert.match(bilesen, /fill=\{colors\.accent\}/, 'aksan renginden beslenmiyor');
  assert.match(bilesen, /fill=\{colors\.gold\}/, 'ikinci ton temadan gelmiyor');
  assert.match(bilesen, /stopColor=\{colors\.bg\}/, 'erime zemin renginden değil');
});

test('DOKUNUŞ YUTMUYOR ve içeriğin ARKASINDA', () => {
  /*
   * Yıkama başlığın üstünü kaplıyor. Dokunuşu yutsaydı şehir seçici,
   * mesaj ve bildirim düğmeleri çalışmazdı — görsel bir süs yüzünden
   * işlevsel düğmeler ölürdü.
   */
  assert.match(bilesen, /pointerEvents="none"/, 'dokunuşları yutuyor');
  assert.match(bilesen, /position: 'absolute'/, 'düzeni itiyor');
});

test('KOYU TEMADA hafifletiliyor ama kaybolmuyor', () => {
  // Aynı opaklık koyu zeminde leke gibi durur; çok kısılırsa hiç görünmez.
  const m = bilesen.match(/const k = koyu \? ([\d.]+) : 1;/);
  assert.ok(m, 'koyu tema ayarı yok');
  const k = Number(m![1]);
  assert.ok(k > 0.3 && k < 0.8, `koyu tema çarpanı makul değil: ${k}`);
});

test('OKUNURLUĞU BOZMUYOR — hiçbir katman yarı yarıya opak değil', () => {
  /*
   * Başlıktaki isim yıkamanın üstünde okunuyor. Opaklık yükselirse
   * kontrast düşer ve bu testin yakalayamayacağı bir okunurluk sorunu
   * doğar; üst sınır burada tutuluyor.
   */
  const opakliklar = [...bilesen.matchAll(/opacity=\{([\d.]+) \* k\}/g)].map((x) => Number(x[1]));
  assert.ok(opakliklar.length >= 3, 'katman bulunamadı');
  for (const o of opakliklar) assert.ok(o <= 0.2, `katman fazla opak: ${o}`);
});

test('ALTA DOĞRU ERİYOR — içeriğe sert çizgiyle bitmiyor', () => {
  // Sert bir kenar, yıkamayı bir "bant" gibi gösterirdi.
  assert.match(bilesen, /LinearGradient id="ti-erime"/, 'alt erime yok');
});

test('ANA SAYFA ve TÜM PROFİLLERDE var', () => {
  const yerler: [string, string][] = [
    ['(tabs)/discover.tsx', 'ana sayfa'],
    ['(tabs)/profile.tsx', 'kendi profilim'],
    ['uzman/[id].tsx', 'uzman profili'],
    ['professional/[id].tsx', 'salon/uzman profili'],
  ];
  for (const [yol, ad] of yerler) {
    assert.match(ekran(yol), /<TepeIsigi[\s/]/, `${ad} ekranında tepe ışığı yok`);
  }
  // Sekme başlığı: Randevularım · Benim İçin · W2W üçü de buradan besleniyor.
  assert.match(oku('ui/TabHero.tsx'), /<TepeIsigi \/>/, 'sekme başlığında tepe ışığı yok');
});

test('KAPSAYICISI KAPATMIYOR — kendi zemini olan başlıkta İÇERİDE', () => {
  /*
   * İlk denememde yıkama kendi-profilim başlığının DIŞINDAYDI ve
   * başlığın `heroSoft` zemini üstünü tamamen kapatıyordu: hiç
   * görünmüyordu. Kendi zemini olan kapsayıcıda içeride durmalı.
   */
  const p = ekran('(tabs)/profile.tsx');
  const basIndex = p.indexOf('style={[styles.header, { paddingTop:');
  const isikIndex = p.indexOf('<TepeIsigi />');
  assert.ok(isikIndex > basIndex, 'yıkama başlığın dışında — zemin onu kapatır');
  assert.match(
    p,
    /borderBottomRightRadius: 28,\s*\n\s*\/\/[^\n]*\n\s*overflow: 'hidden',/,
    'yuvarlak köşede taşma kırpılmıyor',
  );
});
