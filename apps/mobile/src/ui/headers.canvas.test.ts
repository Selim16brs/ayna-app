import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ALT EKRAN BAŞLIKLARI KANVASA UYGUN KALMALI.
 *
 * Kurucu üst üste "alt ekranlarda hâlâ eski tasarım var, hepsinde" dedi.
 * Tek sebep vardı: `StackHeader` accent zeminli MOR BİR BANT çiziyordu ve
 * 73 alt ekranda ortaktı.
 *
 * Kanvasların hiçbirinde böyle bir bant yok. Randevu, Puanlar, Teklifler,
 * Yorumlar, Gizlilik, Boni ve Mesajlar artboard'larının tamamı aynı kalıbı
 * kullanıyor: sayfa zemini · 44px beyaz kart çip · KOYU başlık · soluk alt
 * başlık.
 *
 * Bu test bandın geri gelmesini engeller. Ekranı gözle kontrol eden kurucu
 * için tek koruma bu — bir daha "sadece renkler değişti" durumuna düşmemeli.
 */

const uiKok = import.meta.dirname;
const oku = (ad: string) => readFileSync(join(uiKok, ad), 'utf8');

const ORTAK_BASLIKLAR = ['StackHeader.tsx', 'TabHero.tsx'];

for (const dosya of ORTAK_BASLIKLAR) {
  test(`${dosya}: zemin SAYFA ZEMİNİ — accent bant değil`, () => {
    const src = oku(dosya);
    // Kapsayıcının kendi arka planı: ilk `backgroundColor` tanımı.
    const m = /backgroundColor:\s*colors\.(\w+)/.exec(src);
    assert.ok(m, `${dosya}: kapsayıcı arka planı bulunamadı`);
    assert.equal(
      m[1],
      'bg',
      `${dosya}: başlık zemini colors.${m[1]} — kanvasta sayfa zemini (colors.bg) var`,
    );
  });

  test(`${dosya}: başlık metni KOYU — accent üstü açık yazı değil`, () => {
    const src = oku(dosya);
    assert.ok(
      !/tone="onAccent"/.test(src),
      `${dosya}: onAccent tonu accent zemin varsayar; kanvasta başlık koyu (#261F25)`,
    );
  });
}

test('StackHeader: alt köşe yuvarlaması yok (bant kalıntısı)', () => {
  const src = oku('StackHeader.tsx');
  assert.ok(
    !/borderBottom(Left|Right)Radius/.test(src),
    'alt köşe yuvarlaması bandın kalıntısıdır — kanvasta başlık bir blok değil, bir satır',
  );
});

test('hiçbir ekran kendi mor bandını çizmiyor', () => {
  // Ortak başlık düzeltilse bile tek tek ekranlarda kopya bant kalabilirdi.
  const appKok = join(uiKok, '..', '..', 'app');
  const ihlal: string[] = [];
  const gez = (dir: string) => {
    for (const ad of readdirSync(dir)) {
      const tam = join(dir, ad);
      if (statSync(tam).isDirectory()) gez(tam);
      else if (ad.endsWith('.tsx')) {
        const src = readFileSync(tam, 'utf8');
        // BANT kalıbı: AYNI stil nesnesinde accent zemin + HER İKİ alt köşe.
        //
        // "Aynı nesne" şart: sohbet baloncuğu da accent zeminli ve tek bir alt
        // köşesi 6px'tir (kanvasta da öyle: 22px 22px 6px 22px). Dosya
        // düzeyinde arayınca baloncuklar yanlış alarm veriyordu.
        const bant = [...src.matchAll(/\{[^{}]*backgroundColor:\s*colors\.accent\b[^{}]*\}/g)].some(
          (m) => /borderBottomLeftRadius/.test(m[0]) && /borderBottomRightRadius/.test(m[0]),
        );
        if (bant) ihlal.push(tam.slice(appKok.length + 1));
      }
    }
  };
  gez(appKok);
  assert.deepEqual(ihlal, [], `Kendi mor bandını çizen ekran(lar): ${ihlal.join(', ')}`);
});
