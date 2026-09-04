import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { uzmanlikYazisi } from './uzmanlik';

/**
 * UZMANIN ADI UZMANLIĞI DEĞİL.
 *
 * Sunucu, biyografi boşsa `specialty` alanına uzmanın ADINI yazıyor
 * (`(input.bio ?? '').slice(0, 60) || input.name`). Canlıdaki uzmanda
 * görülen tam olarak buydu: `specialty: 'Darina Serbu'`.
 */

const oku = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8');

test('AD TEKRARI uzmanlık diye yazılmıyor', () => {
  const y = uzmanlikYazisi(
    { name: 'Darina Serbu', specialty: 'Darina Serbu', sector: 'hair' },
    'tr',
  );
  assert.notEqual(y, 'Darina Serbu', 'ad uzmanlık yerine geçiyor');
  assert.equal(y, 'Saç', 'uzmanın seçtiği alan yazılmıyor');
});

test('GERÇEK uzmanlık yazılıysa ona dokunulmuyor', () => {
  const y = uzmanlikYazisi(
    { name: 'Darina Serbu', specialty: 'Balayage · Röfle', sector: 'hair' },
    'tr',
  );
  assert.equal(y, 'Balayage · Röfle');
});

test('ALAN da tanınmıyorsa BOŞ — yanlış uzmanlık yazılmıyor', () => {
  assert.equal(uzmanlikYazisi({ name: 'X', specialty: 'X', sector: 'bilinmeyen' }, 'tr'), '');
  assert.equal(uzmanlikYazisi({ name: 'X', specialty: '', sector: '' }, 'tr'), '');
});

test('KULLANICININ DİLİNDE', () => {
  const tr = uzmanlikYazisi({ name: 'A', specialty: 'A', sector: 'nails' }, 'tr');
  const ru = uzmanlikYazisi({ name: 'A', specialty: 'A', sector: 'nails' }, 'ru');
  assert.ok(tr && ru, 'alan adı boş dönüyor');
  assert.notEqual(tr, ru, 'alan adı dile göre değişmiyor');
});

test('RANDEVUNUN HİZMET ADI uzmanın adı OLAMAZ', () => {
  /*
   * En ağır sonucu buydu: hizmet seçilmeden ilerleyen akışta randevu
   * kaydının `service` alanına uzmanın adı yazılıyordu. Kayıt kalıcı —
   * ekrandaki bir tekrar değil, veriye geçen yanlış bilgi.
   */
  for (const yol of [
    ['app', 'booking', 'schedule.tsx'],
    ['app', 'booking', 'confirmed.tsx'],
  ]) {
    const k = oku(...yol);
    assert.doesNotMatch(k, /\bpro\.specialty\b/, `${yol.join('/')}: ham specialty kullanılıyor`);
    assert.match(k, /uzmanlikYazisi\(pro, locale\)/, `${yol.join('/')}: ortak kural kullanılmıyor`);
  }
});

test('MÜŞTERİNİN GÖRDÜĞÜ her yer aynı kuraldan', () => {
  for (const yol of [
    ['app', 'search.tsx'],
    ['app', 'map.tsx'],
    ['app', 'professional', '[id].tsx'],
  ]) {
    const k = oku(...yol);
    assert.doesNotMatch(k, /\{\s*(pro|selected|detail)\.specialty\s*\}/, `${yol.join('/')}`);
  }
});
