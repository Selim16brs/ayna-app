import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const yorumsuz = (k: string) =>
  k.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const oku = (...p: string[]) => yorumsuz(readFileSync(join(__dirname, '..', ...p), 'utf8'));
const api = (...p: string[]) =>
  yorumsuz(readFileSync(join(__dirname, '..', '..', 'api', 'src', ...p), 'utf8'));

/**
 * KİMLİK ADLA DEĞİL, ID İLE.
 *
 * Kurucu: "kadro ekranında adı 'Madina' olan herkese aynı üç hizmet
 * yazılıyordu. bu çok büyük sorun… kesinlikle aynı adı var diye eşit
 * muamele görmemeli sistem içerisinde."
 *
 * Ad kimlik değildir. Aynı salonda iki aynı adlı uzman varsa ada göre
 * yapılan HER eşleşme yanlış kişiyi vuruyordu.
 */

test('YETKİ adla verilmiyor', () => {
  /*
   * En ağırı buydu: `actor?.name === b.uzmanName` ile biri diğerinin
   * randevusunu iptal edebiliyor, erteleyebiliyor, tamamlandı
   * işaretleyebiliyordu. Adını değiştiren biri de aynı kapıyı açardı.
   */
  const k = api('bookings', 'bookings.service.ts');
  assert.doesNotMatch(k, /actor\?\.name === b\.uzmanName/, 'yetki hâlâ adla veriliyor');
  assert.match(k, /sp\.id === b\.uzmanId/, 'yetki kimliğe bağlanmamış');
});

test('RANDEVU LİSTESİ adla süzülmüyor', () => {
  // Aynı adlı iki uzman birbirinin müşteri adını, saatini, hizmetini
  // görüyordu.
  const k = api('bookings', 'bookings.service.ts');
  assert.doesNotMatch(k, /uzmanName: me\.name/, 'liste hâlâ adla süzülüyor');
  assert.match(k, /uzmanId: sp\.id/, 'liste kimliğe bağlanmamış');
});

test('BİLDİRİM ve TAKVİM YETKİSİ kimlikten okunuyor', () => {
  const k = api('bookings', 'bookings.service.ts');
  // Bildirim `findMany` + ad ile aranıyordu: adaşa da bildirim gidiyordu.
  assert.doesNotMatch(k, /name: b\.uzmanName/, 'bildirim hâlâ adla gidiyor');
  // Takvim izni yanlış kişiden okunuyordu: takvimini kapatmış uzman
  // adına, izin veren adaşının ayarıyla kayıt açılabiliyordu.
  assert.doesNotMatch(k, /name: input\.uzmanName/, 'takvim izni hâlâ adla okunuyor');
  assert.match(
    k,
    /where: \{ id: input\.uzmanId, businessId: biz\.id \}/,
    'izin kimliğe bağlanmamış',
  );
});

test('KADRODAN ÇIKARMA kimliğe bağlı', () => {
  /*
   * Adla eşleşiyordu: aynı salonda iki "Madina" varsa birini kadrodan
   * çıkarmak DİĞERİNİN randevularını iptal ediyor ve müşterilerine
   * "uzman kadrodan ayrıldı" bildirimi gidiyordu.
   */
  const k = oku('src', 'store.ts');
  const govde = k.slice(k.indexOf('cikanUzmanRandevulari: (uzmanId)'));
  assert.match(govde.slice(0, 700), /b\.uzmanId === uzmanId/, 'çıkarma hâlâ adla eşleşiyor');
  // Kimliği olmayan ESKİ randevular etkilenmiyor: yanlış randevuyu iptal
  // etmektense dokunmamak doğru.
  assert.match(govde.slice(0, 700), /!!uzmanId &&/, 'kimliksiz randevular da iptal ediliyor');
});

test('KADRO EKRANI üyeyi kimlikle buluyor', () => {
  const k = oku('app', 'seller', 'staff.tsx');
  assert.doesNotMatch(k, /u\.name === \(p\.name/, 'kadro üyesi hâlâ adla bulunuyor');
  assert.match(k, /u\.id === \(p\.id \?\? ''\)/, 'kadro üyesi kimlikle bulunmuyor');
  assert.match(k, /cikanUzmanRandevulari\(kimlik\)/, 'çıkarma ada göre çağrılıyor');
});

test('AJANDA sütun ve filtresi kimlikle', () => {
  const k = oku('app', 'seller', 'agenda.tsx');
  assert.match(k, /b\.uzmanId === u\.id/, 'sütunlar adla süzülüyor');
  assert.match(k, /staffFilter === u\.id/, 'filtre adla çalışıyor');
});

test('SALON RANDEVU EKLERKEN uzmanı kimlikle seçiyor', () => {
  const k = oku('app', 'salon', 'agenda.tsx');
  assert.match(k, /uzmanId: uzman,/, 'kimlik gönderilmiyor');
  assert.match(k, /const on = uzman === u\.id;/, 'çip adla seçiliyor');
});

test('ÇEVRİMDIŞI KAYITTA çakışma kimliğe bakıyor', () => {
  /*
   * Adla süzülüyordu: aynı adlı iki uzman birbirinin saatini "dolu"
   * gösteriyor, salon gerçekte boş bir saate kayıt açamıyordu.
   */
  const k = oku('app', 'seller', 'offline.tsx');
  assert.match(k, /b\.uzmanId === uzmanId/, 'çakışma hâlâ adla hesaplanıyor');
  assert.doesNotMatch(k, /onChangeText=\{setUzman\}/, 'uzman hâlâ serbest metin');
});

test('MÜŞTERİ randevu alırken uzmanın KİMLİĞİNİ gönderiyor', () => {
  const k = oku('app', 'professional', '[id].tsx');
  assert.match(k, /uzmanId: uzman\.specialistId/, 'randevu kimlik taşımıyor');
});

test('ÜYE NUMARASI profilde görünüyor', () => {
  /*
   * Kimlik zaten vardı ama hiçbir yerde GÖRÜNMÜYORDU: destekte kullanıcı
   * ancak adını söyleyebiliyor, adaşlar ayırt edilemiyordu.
   */
  const k = oku('app', '(tabs)', 'profile.tsx');
  assert.match(k, /profile\.user_id/, 'üye numarası gösterilmiyor');
  assert.match(k, /selectable/, 'numara seçilip kopyalanamıyor');
});
