import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * "İŞLEM SUNUCUYA YAZILDI MI, KAYBOLDU MU?"
 *
 * Gerçek hata: randevu durumu değiştiren 13 eylemin 11'i sunucu yazımını
 * `catch(() => undefined)` ile SESSİZCE yutuyordu. Telefonda "onaylandı"
 * yazıyor, sunucu hiç duymuyor, sonraki `hydrateBookings` eski durumu geri
 * getiriyor ve kullanıcının işlemi kayboluyordu — hiçbir hata görünmeden.
 *
 * Bu testler o kapıyı kilitler.
 */

const oku = (...p: string[]) => readFileSync(join(import.meta.dirname, ...p), 'utf8');
const store = oku('store.ts');
const detay = oku('..', 'app', 'booking', '[id].tsx');

test('durum değiştiren hiçbir eylem sunucu hatasını SESSİZCE yutmuyor', () => {
  // Randevu uçlarının doğrudan çağrıldığı ve hatanın yutulduğu satır kalmamalı.
  const uclar = [
    'approveBooking',
    'acceptBooking',
    'counterBooking',
    'proposeBooking',
    'submitDepositReceipt',
    'completeBookingApi',
    'balancePaid',
    'balanceReceived',
    'noShowApi',
    'providerNoShowApi',
    'disputeBookingApi',
    'cancelBooking',
  ];
  for (const uc of uclar) {
    const kotu = new RegExp(`api\\.${uc}\\([^;]*\\)\\s*\\.catch\\(\\(\\) => undefined\\)`);
    assert.ok(
      !kotu.test(store),
      `store: api.${uc} hatası sessizce yutuluyor — ağ yoksa kullanıcının işlemi kaybolur`,
    );
  }
});

test('randevu kartı da doğrudan API çağırmıyor — kuyruktan geçiyor', () => {
  // Yorum satırları hariç: gerçek çağrı kalmamalı.
  const kod = detay
    .split('\n')
    .filter((l) => !l.trimStart().startsWith('*') && !l.trimStart().startsWith('//'))
    .join('\n');
  assert.ok(
    !/\bapi\.\w+\(/.test(kod),
    'randevu kartı doğrudan API çağırıyor: ağ hatasında yalnız uyarı çıkar, eylem kaybolur',
  );
  assert.match(detay, /randevuEylemi\(booking\.id, eylem, arg\)/);
});

test('kuyruk CİHAZDA KALICI — uygulama kapansa da eylem durur', () => {
  const partialize = store.slice(store.indexOf('partialize: (s) => ({'));
  assert.match(
    partialize.slice(0, partialize.indexOf('}),')),
    /pendingBookingActions: s\.pendingBookingActions/,
    'kuyruk persist edilmiyor — kapat-aç sonrası bekleyen işlem kaybolur',
  );
});

test('kuyruk açılışta VE her tazelemede boşaltılıyor', () => {
  assert.match(
    store,
    /void useStore\.getState\(\)\.flushBookingActions\(\);/,
    'açılışta boşalmıyor',
  );
  // Sıra kritik: tazeleme önce kuyruğu göndermezse sunucunun ESKİ hâli
  // yereli ezer ve kullanıcının işlemi kaybolur.
  const i = store.indexOf('await get().flushBookingActions();');
  const j = store.indexOf('api.myBookings(token)');
  assert.ok(i > 0 && i < j, 'kuyruk, randevular çekilmeden ÖNCE gönderilmeli');
});

test('kalıcı red sonsuza kadar denenmiyor, geçici hata kuyrukta kalıyor', () => {
  assert.match(store, /function kaliciRed\(err: ApiError\): boolean/);
  const flush = store.slice(store.indexOf('flushBookingActions: async ()'));
  const govde = flush.slice(0, flush.indexOf('flushBookingSync:'));
  // Kalıcı redde kuyruktan DÜŞÜR (yoksa her açılışta aynı hata),
  // geçici hatada DÖNGÜYÜ KIR (yoksa sıradaki eylemler sırasız gider).
  assert.match(govde, /kaliciRed\(err\)/);
  assert.match(govde, /\bbreak;/);
});
