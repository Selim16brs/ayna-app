import assert from 'node:assert/strict';
import { test } from 'node:test';
import { KATALOG } from './katalog.js';
import { MAX_SECTORS, sectorsFromServiceIds, servesSector } from './sectors.js';

test('alt hizmet kimliğinden kategori çıkar', () => {
  assert.deepEqual(sectorsFromServiceIds(['hair-cut', 'hair-color']), ['hair']);
});

test('birden çok alan korunur — kayıt ekranındaki asıl senaryo', () => {
  // Uzman saç + tırnak seçtiyse İKİSİNDE de görünmeli. Eskiden yalnız ilki
  // saklanıyordu ve tırnak aramasında hiç çıkmıyordu.
  assert.deepEqual(sectorsFromServiceIds(['hair-cut', 'nails-art', 'nails-pedi']), [
    'hair',
    'nails',
  ]);
});

test('sunucu demo kataloğunun numaralı kimlikleri de çözülür', () => {
  assert.deepEqual(sectorsFromServiceIds(['hair-1', 'nails-3']), ['hair', 'nails']);
});

test('tiresiz kimlik kategorinin kendisidir', () => {
  assert.deepEqual(sectorsFromServiceIds(['hair']), ['hair']);
});

test('ilk hizmetin alanı ilk sırada kalır (ana alan bozulmaz)', () => {
  assert.equal(sectorsFromServiceIds(['nails-art', 'hair-cut'])[0], 'nails');
});

test('bozuk girdi listeyi kirletmez', () => {
  assert.deepEqual(sectorsFromServiceIds([null, 42, '', '  ', '-orphan', 'hair-cut']), ['hair']);
});

test('alan sayısı sınırlanır', () => {
  // GERÇEK kategorilerle: uydurma önekler artık zaten eleniyor, sınırı
  // sahte kimliklerle denemek testi anlamsız kılardı.
  const cok = KATALOG.flatMap((k) => k.altHizmetler.map((a) => a.id));
  assert.ok(KATALOG.length > MAX_SECTORS, 'katalog sınırı test edecek kadar büyük değil');
  assert.equal(sectorsFromServiceIds(cok).length, MAX_SECTORS);
});

test('YENİ katalog kimlikleri kategoriye çözülüyor', () => {
  /*
   * Kimlikler `hair-cut`ten `hair.haircut`e geçti ve bir kategorinin
   * KENDİSİNDE alt çizgi var (`lashes_brows`). Tireye bakan eski kod
   * 'hair.haircut'ı olduğu gibi "alan" sanardı: o uzman hiçbir aramada
   * çıkmaz, sessizce kaybolurdu.
   */
  assert.deepEqual(sectorsFromServiceIds(['hair.haircut']), ['hair']);
  assert.deepEqual(sectorsFromServiceIds(['lashes_brows.lash_ext']), ['lashes_brows']);
  assert.deepEqual(sectorsFromServiceIds(['body_contouring.lpg']), ['body_contouring']);
  // Salon kaydı hizmet değil ALAN gönderiyor — kategori kimliğinin kendisi.
  assert.deepEqual(sectorsFromServiceIds(['makeup']), ['makeup']);
});

test('TANINMAYAN önek hayalet alan üretmiyor', () => {
  /*
   * Eskiden önek ne olursa olsun "alan" sayılıyordu: uzmanın serbest
   * yazdığı `paket-1` diye bir kimlik, hiçbir aramayla eşleşmeyen
   * `paket` kategorisini doğuruyordu.
   */
  assert.deepEqual(sectorsFromServiceIds(['paket-1', 'roza-ozel']), []);
  assert.deepEqual(sectorsFromServiceIds(['hair.haircut', 'paket-1']), ['hair']);
});

test('boş liste boş set verir — uydurma alan yok', () => {
  assert.deepEqual(sectorsFromServiceIds([]), []);
});

// ── servesSector ────────────────────────────────────────────────────────────

test('alan setine göre eşleşir', () => {
  const pro = { sectors: ['hair', 'nails'], sector: 'hair' };
  assert.equal(servesSector(pro, 'nails'), true);
  assert.equal(servesSector(pro, 'brows'), false);
});

test('yogacı tırnak aramasında ÇIKMAZ', () => {
  // Kullanıcının bildirdiği hata: her uzman her alanda görünüyordu.
  const yogaci = { sectors: ['fitness'], sector: 'fitness' };
  assert.equal(servesSector(yogaci, 'nails'), false);
});

test('alan seti boş olan ESKİ kayıt tek sector ile eşleşir', () => {
  // Geçiş sırasında kimse keşiften kaybolmamalı.
  assert.equal(servesSector({ sectors: [], sector: 'hair' }, 'hair'), true);
  assert.equal(servesSector({ sector: 'hair' }, 'hair'), true);
  assert.equal(servesSector({ sectors: null, sector: 'hair' }, 'nails'), false);
});
