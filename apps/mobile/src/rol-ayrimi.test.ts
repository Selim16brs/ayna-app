import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * İKİ TARAF BİRBİRİNİN EKRANINI ÇALMASIN.
 *
 * Kök hata: rol HESAP TÜRÜNDEN türetiliyordu (`currentUser.role`). Uzman
 * hesabı olan biri başka bir uzmandan randevu aldığında:
 *   · kendi müşteri randevusunda UZMAN kartını görüyordu ("Onayla" düğmesi),
 *   · başlıkta kendi adı yerine "Müşteri" yazıyordu,
 *   · o konuşmada UZMAN şablonlarını görüyordu,
 *   · kendi aldığı randevu, uzman panelindeki "bekleyen talepler"e düşüyordu.
 *
 * Rol, hesabın türü değil O RANDEVUDAKİ taraftır. Sunucu bunu zaten biliyor
 * (ayrı uçlar); `benimRolum` alanı taşıyor.
 */

const KOK = join(import.meta.dirname, '..');
const oku = (...p: string[]) => readFileSync(join(KOK, ...p), 'utf8');

test('randevu kartı rolü RANDEVUDAN alıyor, hesap türünden değil', () => {
  const src = oku('app', 'booking', '[id].tsx');
  assert.match(src, /const rol: Rol = booking\.benimRolum/, 'rol randevudan gelmiyor');
  assert.ok(!/currentUser\?\.role === 'professional'/.test(src), 'kart hâlâ hesap türüne bakıyor');
});

test('mesaj şablonları rolü RANDEVUDAN alıyor', () => {
  const src = oku('app', 'messages', '[id].tsx');
  assert.match(src, /benUzman = ilgiliRandevu\?\.benimRolum === 'uzman'/);
});

test('tazeleme hangi UÇTAN geldiğini işaretliyor', () => {
  const src = oku('src', 'store.ts');
  assert.match(src, /benimRolum: 'musteri' as const/, 'müşteri ucu işaretlenmiyor');
  assert.match(src, /benimRolum: 'uzman' as const/, 'sağlayıcı ucu işaretlenmiyor');
});

test('müşteri listeleri uzman taleplerini GÖSTERMİYOR', () => {
  for (const [klasor, dosya] of [
    ['(tabs)', 'bookings.tsx'],
    ['(tabs)', 'care.tsx'],
  ] as const) {
    const src = oku('app', klasor, dosya);
    assert.match(src, /useStore\(musteriRandevulari\)/, `${dosya}: filtresiz liste okuyor`);
  }
});

test('uzman listeleri kendi MÜŞTERİ randevularını göstermiyor', () => {
  const rapor = oku('app', 'seller', 'reports.tsx');
  assert.match(rapor, /uzmanRandevulari\(st\)/, 'uzman ana ekranı filtresiz');
  const ajanda = oku('app', 'seller', 'agenda.tsx');
  assert.match(ajanda, /benimRolum === 'uzman'/, 'ajanda şeridi filtresiz');
});

test('uzman ekranları müşteri ekranlarına, müşteri ekranları uzmana sızmıyor', () => {
  // Uzman klasöründeki hiçbir ekran müşteri sekme çubuğunu çizmemeli, tersi de.
  const uzman = readdirSync(join(KOK, 'app', 'seller')).filter((f) => f.endsWith('.tsx'));
  for (const f of uzman) {
    const src = oku('app', 'seller', f);
    assert.ok(!src.includes('AppTabBar'), `seller/${f}: müşteri alt menüsünü çiziyor`);
  }
  const musteri = readdirSync(join(KOK, 'app', '(tabs)')).filter((f) => f.endsWith('.tsx'));
  for (const f of musteri) {
    const src = oku('app', '(tabs)', f);
    assert.ok(!src.includes('SellerTabBar'), `(tabs)/${f}: uzman alt menüsünü çiziyor`);
  }
});
