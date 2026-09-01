import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CatalogService } from './catalog.service';

/**
 * REKLAM VİTRİNİ — ücretini ödeyen uzman/salonların yayını.
 *
 * Reklam ücretli olduğu için iki kural sunucuda durmak zorunda: yayın
 * penceresi ve hangi vitrinin satın alındığı. İstemciye bırakılsaydı, süresi
 * biten ücretli bir reklam eski uygulama sürümlerinde yayında kalırdı.
 */

const sahtePrisma = (rows: unknown[]) => {
  let gecenSorgu: Record<string, unknown> | undefined;
  const p = {
    adBanner: {
      findMany: (q: Record<string, unknown>) => {
        gecenSorgu = q;
        return Promise.resolve(rows);
      },
    },
  };
  return { p, sorgu: () => gecenSorgu };
};

const reklam = (o: Partial<Record<string, unknown>> = {}) => ({
  id: 'r1',
  proId: 'pro-1',
  title: 'Yaz kampanyası',
  subtitle: '-%20',
  image: 'https://x/y.jpg',
  placement: 'firsatlar',
  i18n: null,
  ...o,
});

test('yayın penceresi SUNUCUDA süzülüyor', async () => {
  const { p, sorgu } = sahtePrisma([reklam()]);
  const svc = new CatalogService(p as never);
  await svc.ads();
  const w = sorgu()?.['where'] as { active: boolean; AND: unknown[] };
  assert.equal(w.active, true, 'pasif reklamlar da geliyor');
  // Başlangıcı gelmemiş VE bitişi geçmiş reklamlar sorguda eleniyor.
  assert.equal(
    w.AND.length,
    2,
    'yayın penceresi sorguya girmiyor — süresi biten reklam yayında kalır',
  );
  assert.match(JSON.stringify(w.AND), /startsAt/, 'başlangıç süzülmüyor');
  assert.match(JSON.stringify(w.AND), /endsAt/, 'bitiş süzülmüyor');
});

test('hangi vitrinin satın alındığı istemciye GİDİYOR', async () => {
  // Bu alan olmadan istemci reklamı iki bölümde birden gösterirdi.
  const { p } = sahtePrisma([reklam({ placement: 'one_cikanlar' })]);
  const svc = new CatalogService(p as never);
  const out = (await svc.ads()) as { placement?: string }[];
  assert.equal(out[0]?.placement, 'one_cikanlar');
});

test('şema ve dağıtım SQL’i birbirini tutuyor', () => {
  // Railway `db push` çalıştırıyor, `migrate deploy` DEĞİL: sütunlar pre-push
  // SQL'i ile açılmazsa üretimde hiç var olmaz ve sorgu patlar.
  const kok = join(import.meta.dirname, '..', '..');
  const sql = readFileSync(join(kok, 'prisma', 'pre-push', '03-reklam-vitrin.sql'), 'utf8');
  for (const sutun of ['placement', 'starts_at', 'ends_at']) {
    assert.match(
      sql,
      new RegExp(`ADD COLUMN IF NOT EXISTS "${sutun}"`),
      `${sutun} dağıtımda açılmıyor`,
    );
  }
  const sema = readFileSync(join(kok, 'prisma', 'schema.prisma'), 'utf8');
  const model = sema.slice(sema.indexOf('model AdBanner'));
  const govde = model.slice(0, model.indexOf('}'));
  for (const alan of ['placement', 'startsAt', 'endsAt']) {
    assert.match(govde, new RegExp(`\\b${alan}\\b`), `${alan} şemada yok`);
  }
});
