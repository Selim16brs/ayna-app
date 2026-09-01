import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * §4.4 — KASPİ İLE TEK DOKUNUŞ.
 *
 * Buradaki en pahalı hata sessiz olurdu: uydurulmuş bir bağlantı biçimi
 * gerçek telefonda ya hiç açılmaz ya yanlış ekranı açar — müşteri parayı
 * gönderemez, randevusu 10 dakikada düşer ve kimse sebebini bilmez.
 */

const src = readFileSync(join(import.meta.dirname, '..', 'app', 'booking', 'deposit.tsx'), 'utf8');

test('bağlantı KODA GÖMÜLÜ değil — admin ayarından geliyor', () => {
  assert.match(src, /st\.config\.kaspiPaymentUrl/, 'bağlantı ayardan okunmuyor');
  // Kaspi adresinin kendisi kodda yazılı olmamalı: QR yenilenince ya da hesap
  // değişince yeni sürüm çıkmak gerekirdi.
  assert.ok(!/kaspi\.kz\/[a-z]/i.test(src), 'Kaspi adresi koda gömülmüş');
});

test('bağlantı tanımlı DEĞİLSE düğme hiç gösterilmiyor', () => {
  // Çalışmayan bir ödeme düğmesi, çalışmayan bir vaattir.
  // Kaspi'ye gidildikten SONRA da gizleniyor: dönen kullanıcıya ikinci kez
  // "öde" demek, ikinci kez ödemeye davet etmektir.
  assert.match(
    src,
    /\{kaspiUrl && !kaspiyeGidildi \? \(\s*<Button/,
    'düğme koşulsuz çiziliyor olabilir',
  );
});

test('uydurulmuş parametre EKLENMİYOR — yalnız yer tutucu doldurulur', () => {
  const f = /function kaspiBaglantisi\([\s\S]*?\n\}/.exec(src);
  assert.ok(f, 'kaspiBaglantisi yok');
  assert.match(f[0], /replace\(\/\\\{tutar\\\}\/g/, 'tutar yer tutucusu doldurulmuyor');
  assert.match(f[0], /replace\(\/\\\{ref\\\}\/g/, 'referans yer tutucusu doldurulmuyor');
  // Şablonda yer tutucu yoksa bağlantıya `?amount=` gibi bir şey EKLENMEMELİ.
  assert.ok(
    !/[?&]amount=|[?&]sum=|[?&]summa=/i.test(f[0]),
    'bağlantıya uydurma parametre ekleniyor',
  );
});

test('Kaspi açılamazsa kullanıcı sebebini öğreniyor', () => {
  // Sessiz başarısızlık: kullanıcı düğmeye basar, hiçbir şey olmaz, parayı
  // gönderemez ve randevusu düşer.
  const f = /const kaspiAc = async \(\) => \{[\s\S]*?\n {2}\};/.exec(src);
  assert.ok(f, 'kaspiAc yok');
  assert.match(f[0], /Alert\.alert\(/, 'hata sessizce yutuluyor');
  assert.ok(!/catch\s*\{\s*\}/.test(f[0]), 'boş catch');
});

test('elle transfer yolu HER ZAMAN duruyor', () => {
  // Kaspi kurulu değilse ya da bağlantı bozulursa para gönderilebilmeli.
  assert.match(src, /deposit\.transfer_note_ref/);
  assert.match(src, /HESAP_ADI/);
});

test('referans kodu ödemeyi randevuyla eşleştiriyor', () => {
  // Türetme `@ayna/domain`e taşındı: aynı kodu admin paneli de gösteriyor
  // (sunucu orada üretiyor). Ekranın kendi kopyası olsaydı ikisi ayrışabilir,
  // müşterinin yazdığı kod adminin aradığıyla tutmazdı. Davranışın kendisi
  // `packages/domain/src/booking/deposit.test.ts` içinde sınanıyor.
  assert.match(
    src,
    /odemeReferansi[\s\S]{0,80}from '@ayna\/domain'/,
    'ortak türetme kullanılmıyor',
  );
  assert.ok(!/function odemeReferansi/.test(src), 'ekranda ikinci bir türetme var');
});
