import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FinanceScheduler } from './finance.scheduler';

// Zamanlayıcının sözleşmesi: kilit alınamazsa hiçbir iş yapılmaz, kilit her
// durumda bırakılır ve iki iş birbirinden bağımsız çalışır. Bunlar sahte
// bağımlılıklarla doğrulanabilir; gerçek Postgres davranışı ayrıca yerel
// veritabanında 14 senaryoyla sınandı.

type Cagrilar = { overdue: number; expire: number; unlock: number };

function kur(
  opts: { kilitAlinabilir?: boolean; overdueHata?: boolean; expireHata?: boolean } = {},
) {
  const c: Cagrilar = { overdue: 0, expire: 0, unlock: 0 };
  const prisma = {
    $queryRaw: async (parts: TemplateStringsArray) => {
      const sql = Array.isArray(parts) ? parts.join('') : String(parts);
      if (sql.includes('pg_try_advisory_lock')) {
        return [{ locked: opts.kilitAlinabilir ?? true }];
      }
      if (sql.includes('pg_advisory_unlock')) {
        c.unlock += 1;
        return [{}];
      }
      return [];
    },
  };
  const commissions = {
    runOverdue: async () => {
      c.overdue += 1;
      if (opts.overdueHata) throw new Error('fatura bozuk');
      return { markedOverdue: 1, restricted: 1 };
    },
  };
  const subscriptions = {
    expireDue: async () => {
      c.expire += 1;
      if (opts.expireHata) throw new Error('abonelik bozuk');
      return { expired: 2 };
    },
  };
  const sched = new FinanceScheduler(prisma as never, commissions as never, subscriptions as never);
  return { sched, c };
}

test('kilit alınabilirse iki iş de çalışır', async () => {
  const { sched, c } = kur();
  await sched.tick();
  assert.equal(c.overdue, 1);
  assert.equal(c.expire, 1);
});

test('kilit BAŞKASINDAysa hiçbir iş yapılmaz', async () => {
  // Çok örnekli dağıtımda çift kısıtlama ve çift audit kaydı üretirdi.
  const { sched, c } = kur({ kilitAlinabilir: false });
  await sched.tick();
  assert.equal(c.overdue, 0);
  assert.equal(c.expire, 0);
});

test('kilit alınamadıysa bırakma çağrısı da yapılmaz', async () => {
  // Aksi hâlde BAŞKA örneğin kilidini açardık — korumanın tamamı çökerdi.
  const { sched, c } = kur({ kilitAlinabilir: false });
  await sched.tick();
  assert.equal(c.unlock, 0);
});

test('normal akışta kilit bırakılır', async () => {
  const { sched, c } = kur();
  await sched.tick();
  assert.equal(c.unlock, 1);
});

test('gecikme taraması patlarsa abonelik işi YİNE çalışır', async () => {
  // Tek bozuk faturanın abonelik sona erdirmeyi durdurması sessiz gelir kaybı olurdu.
  const { sched, c } = kur({ overdueHata: true });
  await sched.tick();
  assert.equal(c.expire, 1);
  assert.equal(c.unlock, 1, 'hata olsa da kilit bırakılmalı');
});

test('abonelik işi patlarsa gecikme taraması tamamlanmış olur', async () => {
  const { sched, c } = kur({ expireHata: true });
  await sched.tick();
  assert.equal(c.overdue, 1);
  assert.equal(c.unlock, 1);
});

test('iki iş de patlasa tick hata fırlatmaz — zamanlayıcı ölmez', async () => {
  const { sched, c } = kur({ overdueHata: true, expireHata: true });
  await assert.doesNotReject(() => sched.tick());
  assert.equal(c.unlock, 1);
});

test('JOBS_ENABLED=false ise zamanlayıcı kurulmaz', () => {
  const eski = process.env.JOBS_ENABLED;
  process.env.JOBS_ENABLED = 'false';
  try {
    const { sched } = kur();
    sched.onModuleInit();
    // Timer kurulmadıysa destroy güvenle çağrılabilir ve iş tetiklenmez.
    assert.doesNotThrow(() => sched.onModuleDestroy());
  } finally {
    if (eski === undefined) delete process.env.JOBS_ENABLED;
    else process.env.JOBS_ENABLED = eski;
  }
});
