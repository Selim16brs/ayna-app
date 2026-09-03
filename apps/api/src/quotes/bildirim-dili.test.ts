import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { QuotesService } from './quotes.service';

/**
 * BİLDİRİM METNİ — brief §4.11.
 *
 * "Hizmetle ilişkili bildirim metinlerinde alt hizmet adı AKTİF DİLDE
 * taksonomiden çekilir."
 *
 * Talep bildirimi kategori KODUNU gönderiyordu: uzmanın telefonunda "Yeni
 * lashes_brows talebi" yazıyordu. Kod bir kimliktir, kullanıcıya
 * gösterilecek metin değil — üstelik hiçbir dile çevrilmiyordu.
 */

const kaynak = readFileSync(join(import.meta.dirname, 'quotes.service.ts'), 'utf8');

/** `kategoriAdi` özel; davranışı erişilebilir bir kapıyla sınanıyor. */
const adi = (kod: string | undefined, dil: string | null) =>
  (
    new QuotesService({} as never, {} as never, {} as never, {} as never) as unknown as {
      kategoriAdi(k: string | undefined, d: string | null): string;
    }
  ).kategoriAdi(kod, dil);

test('kategori adı ALICININ dilinde', () => {
  assert.equal(adi('lashes_brows', 'tr'), 'Kirpik & Kaş');
  assert.equal(adi('lashes_brows', 'ru'), 'Ресницы и брови');
  assert.equal(adi('lashes_brows', 'kk'), 'Кірпік пен қас');
});

test('dil bilinmiyorsa TÜRKÇEYE düşüyor — kod yazılmıyor', () => {
  assert.equal(adi('hair', null), 'Saç');
  assert.equal(adi('hair', 'xx'), 'Saç');
});

test('KATALOG DIŞI kodda uydurma ad yok', () => {
  // Genel sözcük yazmak, olmayan bir kategori adı uydurmaktan iyidir.
  assert.equal(adi('boyle_bir_kategori_yok', 'tr'), 'hizmet');
  assert.equal(adi(undefined, 'tr'), 'hizmet');
});

test('bildirime KOD gönderilmiyor', () => {
  /*
   * Regresyonun tam şekli buydu: `{ cat: cat?.code ?? 'hizmet' }`.
   * Kaynakta geri gelirse yakalanmalı.
   */
  assert.doesNotMatch(kaynak, /\{ cat: cat\?\.code/, 'bildirime kategori kodu gidiyor');
  assert.match(
    kaynak,
    /\{ cat: this\.kategoriAdi\(cat\?\.code, e\.defaultLocale\) \}/,
    'ad alıcının dilinde kurulmuyor',
  );
});

test('ALICININ DİLİ sorguda çekiliyor', () => {
  // Çekilmezse `defaultLocale` undefined olur ve herkes türkçe bildirim
  // alır — hata vermeden.
  const dalga = kaynak.slice(kaynak.indexOf('async notifyNextWave'));
  assert.match(
    dalga.slice(0, 1500),
    /select: \{ id: true, kycStatus: true, createdAt: true, defaultLocale: true \}/,
    'alıcının dili sorguda yok',
  );
});
