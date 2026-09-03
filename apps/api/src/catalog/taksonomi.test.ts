import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TaksonomiService } from './taksonomi.service';

/**
 * TAKSONOMİ UCU — "YAKINDA" ROZETİ VE SIRALAMA.
 *
 * Kaynak: `AYNA_HIZMET_KATALOGU_BRIEF.md` v1.0.
 *
 * §7.4: "alt hizmette aktif ve yayında en az 1 uzman yoksa rozet görünür;
 * müşteri o alt hizmette YİNE DE talep oluşturabilir — 'Dileğin nedir?'
 * akışı reverse marketplace mantığının kalbidir, arz yoksa bile talep
 * toplanır."
 *
 * §7.3: kategori sırası admin panelden değiştirilebilir.
 */

function servis(over: { pro?: unknown[]; gizli?: unknown[]; sira?: unknown[] } = {}) {
  const prisma = {
    specialist: { findMany: () => Promise.resolve(over.gizli ?? []) },
    professional: { findMany: () => Promise.resolve(over.pro ?? []) },
    serviceCategory: { findMany: () => Promise.resolve(over.sira ?? []) },
  };
  return new TaksonomiService(prisma as never);
}

test('arz yokken TÜM alt hizmetler "Yakında"', async () => {
  const { kategoriler } = await servis().taksonomi();
  const hepsi = kategoriler.flatMap((k) => k.altHizmetler);
  assert.equal(hepsi.length, 64, 'katalog eksik geliyor');
  assert.ok(
    hepsi.every((a) => a.yakinda),
    'arz yokken rozet görünmüyor',
  );
});

test('uzmanı olan alt hizmette rozet YOK', async () => {
  const svc = servis({
    pro: [{ id: 'p1', servicesJson: JSON.stringify([{ serviceId: 'hair.haircut' }]) }],
  });
  const { kategoriler } = await svc.taksonomi();
  const sac = kategoriler.find((k) => k.id === 'hair')!;
  assert.equal(sac.altHizmetler.find((a) => a.id === 'hair.haircut')!.yakinda, false);
  // Kardeş hizmet etkilenmemeli.
  assert.equal(sac.altHizmetler.find((a) => a.id === 'hair.blowdry')!.yakinda, true);
});

test('YAYINDAN KALDIRILMIŞ uzman arz saymıyor', async () => {
  /*
   * Cezalı uzman müşteriye görünmüyor. Arz sayılsaydı müşteri "var" diye
   * görüp randevu alamayacağı bir hizmete tıklardı.
   */
  const svc = servis({
    pro: [{ id: 'p1', servicesJson: JSON.stringify([{ serviceId: 'nails.pedicure' }]) }],
    gizli: [{ proId: 'p1' }],
  });
  const { kategoriler } = await svc.taksonomi();
  const t = kategoriler.find((k) => k.id === 'nails')!;
  assert.equal(t.altHizmetler.find((a) => a.id === 'nails.pedicure')!.yakinda, true);
});

test('bozuk hizmet kaydı KATALOGU DÜŞÜRMÜYOR', async () => {
  // Tek bir uzmanın bozuk JSON'u tüm vitrini karartmamalı.
  const svc = servis({
    pro: [
      { id: 'p1', servicesJson: '{bozuk' },
      { id: 'p2', servicesJson: JSON.stringify([{ serviceId: 'skin.peeling' }]) },
    ],
  });
  const { kategoriler } = await svc.taksonomi();
  assert.equal(kategoriler.length, 13);
  const c = kategoriler.find((k) => k.id === 'skin')!;
  assert.equal(c.altHizmetler.find((a) => a.id === 'skin.peeling')!.yakinda, false);
});

test('varsayılan sıra brief §3 ile aynı', async () => {
  const { kategoriler } = await servis().taksonomi();
  assert.equal(kategoriler[0]!.id, 'hair');
  assert.equal(kategoriler[1]!.id, 'nails');
  assert.equal(kategoriler[12]!.id, 'other');
});

test('admin sırası katalog sırasını EZİYOR', async () => {
  // Brief §7.3 — sıralama panelden yönetilebilmeli.
  const svc = servis({ sira: [{ code: 'other', sortOrder: -1 }] });
  const { kategoriler } = await svc.taksonomi();
  assert.equal(kategoriler[0]!.id, 'other', 'admin sırası uygulanmıyor');
});

test('üç dilin HEPSİ gönderiliyor', async () => {
  // İstemci dili değiştirdiğinde yeniden istek atmasın.
  const { kategoriler } = await servis().taksonomi();
  const k = kategoriler[0]!;
  assert.deepEqual(Object.keys(k.ad).sort(), ['kk', 'ru', 'tr']);
  assert.deepEqual(Object.keys(k.altHizmetler[0]!.ad).sort(), ['kk', 'ru', 'tr']);
});
