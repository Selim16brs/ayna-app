import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SLOT_HOLDING_STATES } from '@ayna/domain';
import {
  SLOT_HOLDING_SQL_LIST,
  SLOT_KEY_BACKFILL_SQL,
  SLOT_KEY_FUNCTION_SQL,
} from './slot-key.sql';

/**
 * Bu testler ÇİFT REZERVASYONU önleyen veritabanı korumasını bekçiliyor.
 *
 * Gerçek hata: durum sözlüğü brief §3'e göre yeniden adlandırıldığında bu
 * dosyadaki SQL listesi eski adlarda (`confirmed`, `deposit_pending`...)
 * kaldı. Trigger hiçbir satırı eşleştiremedi, `slot_key` hep NULL yazıldı ve
 * unique kısıt hiçbir şeyi korumaz oldu — hiçbir test kırılmadan.
 */

test('SQL listesi, slot tutan durumların TAMAMINI içerir', () => {
  for (const durum of SLOT_HOLDING_STATES) {
    assert.ok(
      SLOT_HOLDING_SQL_LIST.includes(`'${durum}'`),
      `slot tutan '${durum}' SQL listesinde yok — o durumdaki randevu DB'de korunmuyor`,
    );
  }
});

test('SQL listesi, var olmayan bir durum adı içermez', () => {
  const gecerli = new Set<string>(SLOT_HOLDING_STATES);
  const adlar = SLOT_HOLDING_SQL_LIST.replace(/[()']/g, '').split(',');
  for (const ad of adlar) {
    assert.ok(gecerli.has(ad), `'${ad}' artık bir randevu durumu değil (ölü liste)`);
  }
});

test('trigger ve geri doldurma AYNI listeyi kullanır', () => {
  // İkisi ayrışırsa trigger'ın koruduğu küme ile doldurulan küme farklı olur:
  // aradaki randevular sessizce korumasız kalır.
  assert.ok(SLOT_KEY_FUNCTION_SQL.includes(SLOT_HOLDING_SQL_LIST));
  assert.ok(SLOT_KEY_BACKFILL_SQL.includes(SLOT_HOLDING_SQL_LIST));
});
