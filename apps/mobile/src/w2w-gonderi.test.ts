import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * W2W GÖNDERİSİ — İKİ KOPYA YOK, HAYALET YAYIN YOK.
 *
 * Gönderi önce YERELDE açılıyor (iyimser) ve yerel bir kimlik alıyor;
 * sunucu kabul edince KENDİ kimliğini dönüyor. Sunucunun cevabı atılıyordu:
 *
 *   · Kabul edilen gönderi akış tazelenince İKİ KEZ görünüyordu.
 *   · Şüpheli bulunan gönderi akışta HİÇ yok (sunucu yalnız `published`
 *     döndürüyor) ama yerelde duruyordu: yazan kişi yayında sanıyordu.
 */

const oku = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8');
const store = oku('src', 'store.ts');

test('SUNUCU KİMLİĞİ saklanıyor ve eleme onu da sayıyor', () => {
  const i = store.indexOf('addPost: (input) => {');
  assert.ok(i > 0, 'gönderi oluşturma yok');
  const govde = store.slice(i, store.indexOf('toggleHelpful:', i));
  assert.match(govde, /sunucuId: r\.id/, 'sunucu kimliği saklanmıyor');

  // Birleştirme her iki kimliği de eleme ölçütü sayıyor.
  const j = store.indexOf('const have = new Set(');
  assert.ok(j > 0, 'birleştirme yok');
  const eleme = store.slice(j, j + 300);
  assert.match(
    eleme,
    /p\.sunucuId \? \[p\.id, p\.sunucuId\] : \[p\.id\]/,
    'sunucu kimliği elenmiyor',
  );
});

test('ŞÜPHELİ gönderi "yayında" gibi durmuyor', () => {
  const i = store.indexOf('addPost: (input) => {');
  const govde = store.slice(i, store.indexOf('toggleHelpful:', i));
  assert.match(
    govde,
    /r\.status === 'published' \? \{\} : \{ durum: 'incelemede' as const \}/,
    'inceleme durumu işaretlenmiyor',
  );
  /*
   * Sunucu gerçekten yalnız yayındakileri döndürüyor — bu testin dayandığı
   * varsayım. Değişirse burada düşsün.
   */
  const sunucu = readFileSync(
    join(__dirname, '..', '..', 'api', 'src', 'circle', 'circle.service.ts'),
    'utf8',
  );
  assert.match(sunucu, /where: \{ status: 'published' \}/, 'akış artık her durumu dönüyor');
});

test('KALICI RED işaretleniyor, GEÇİCİ hata işaretlenmiyor', () => {
  /*
   * Ağ yokken gönderi kaybolmuş gibi gösterilmemeli: kullanıcı yeniden
   * açtığında hâlâ yerelde. Ama sunucu kalıcı olarak reddettiyse ekranda
   * duran gönderi kimsenin görmediği bir yayındır.
   */
  const i = store.indexOf('addPost: (input) => {');
  const govde = store.slice(i, store.indexOf('toggleHelpful:', i));
  assert.match(
    govde,
    /if \(!\(err instanceof ApiError\) \|\| !kaliciRed\(err\)\) return;/,
    'ayrım yok',
  );
  assert.match(govde, /durum: 'gonderilemedi' as const/, 'kalıcı red işaretlenmiyor');
});

test('DURUM EKRANDA yazıyor', () => {
  const k = oku('app', '(tabs)', 'circle.tsx');
  assert.match(k, /post\.durum \? \(/, 'durum çizilmiyor');
  assert.match(k, /'circle\.state\.pending'/, 'inceleme yazısı yok');
  assert.match(k, /'circle\.state\.failed'/, 'red yazısı yok');
});
