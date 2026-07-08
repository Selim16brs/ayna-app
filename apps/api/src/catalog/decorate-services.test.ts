import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decorateServices } from './catalog.service';

const POOL = [
  { id: 'a', name: 'A', durationMin: 60, price: 1000 },
  { id: 'b', name: 'B', durationMin: 60, price: 2000 },
  { id: 'c', name: 'C', durationMin: 60, price: 3000 },
  { id: 'd', name: 'D', durationMin: 60, price: 4000 },
];

// §6.E — ilk 2 hizmet "öne çıkan/TOP"
test('ilk iki hizmet popular işaretlenir', () => {
  const out = decorateServices(POOL, 'pro-1');
  assert.equal(out[0]!.popular, true);
  assert.equal(out[1]!.popular, true);
  assert.equal(out[2]!.popular, false);
  assert.equal(out[3]!.popular, false);
});

// §6.E — indirim deterministik (aynı pro id → aynı sonuç)
test('indirim deterministik ve tek hizmette', () => {
  const a = decorateServices(POOL, 'pro-1');
  const b = decorateServices(POOL, 'pro-1');
  const discountedA = a.filter((s) => s.discountPct > 0);
  const discountedB = b.filter((s) => s.discountPct > 0);
  assert.equal(discountedA.length, 1, 'tam olarak bir indirimli hizmet');
  assert.deepEqual(
    discountedA.map((s) => s.id),
    discountedB.map((s) => s.id),
    'aynı pro id → aynı indirimli hizmet',
  );
  assert.ok([10, 15, 20, 25].includes(discountedA[0]!.discountPct));
});

test('farklı pro id farklı indirim hizmeti seçebilir', () => {
  const idxFor = (pid: string) => decorateServices(POOL, pid).findIndex((s) => s.discountPct > 0);
  // En az iki farklı pro id arasında indirim indeksi değişmeli (deterministik dağılım)
  const indices = new Set(['x1', 'y22', 'z333', 'aaaa'].map(idxFor));
  assert.ok(indices.size >= 2);
});
