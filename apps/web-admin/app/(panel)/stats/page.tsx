'use client';
import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PageHead, SectionTitle, Stat, Chip, Toolbar, Card, Loading } from '@/app/_components/ui';
import { BarChart, CategoryBars } from '@/app/_components/Charts';
import { useAsync } from '@/app/_lib/useAsync';
import { TL, METRICS, type MetricKey } from '@/app/_lib/ortak';
import { api, type Stats } from '@/app/lib/api';

/** Aralık çipleri — kaynaktaki [7, 30, 90] dizisinin adlandırılmış hâli. */
const ARALIKLAR = [7, 30, 90];
const VARSAYILAN_GUN = 30;
const VARSAYILAN_METRIK: MetricKey = 'bookings';

/**
 * RAPORLAR.
 *
 * Bölme öncesi `days` ve `metric` iki useState'ti: "son 90 günün gelir
 * grafiği" bir meslektaşa gönderilemiyor, sayfa yenilenince 30 gün /
 * randevuya dönüyordu. İkisi de artık adres çubuğunda:
 * /stats?gun=90&metrik=revenue. Varsayılanlar kaynaktakiyle aynı (30,
 * 'bookings') ve geçersiz bir değer yazılırsa sessizce varsayılana düşer.
 */
function Raporlar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const gunParam = Number(params.get('gun'));
  const days = ARALIKLAR.includes(gunParam) ? gunParam : VARSAYILAN_GUN;
  const metrikParam = params.get('metrik');
  const metric: MetricKey = METRICS.find((m) => m.key === metrikParam)?.key ?? VARSAYILAN_METRIK;

  // replace (push değil): filtre değiştirmek yeni bir "sayfa" değil, geri
  // tuşu paneli terk etmesin diye tarayıcı geçmişini şişirmiyoruz.
  const yazQuery = (anahtar: string, deger: string) => {
    const p = new URLSearchParams(params.toString());
    p.set(anahtar, deger);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };
  const setDays = (d: number) => yazQuery('gun', String(d));
  const setMetric = (m: MetricKey) => yazQuery('metrik', m);

  const { data } = useAsync<Stats>(() => api.stats(days), [days]);
  const active = METRICS.find((m) => m.key === metric)!;
  return (
    <>
      <PageHead
        title="Raporlar"
        sub={`Zaman serisi — kayıt, randevu ve gelir${data ? ` · ${data.timezone}` : ''}`}
      />
      <Toolbar>
        {ARALIKLAR.map((d) => (
          <Chip key={d} active={days === d} onClick={() => setDays(d)}>
            Son {d} gün
          </Chip>
        ))}
      </Toolbar>
      {!data ? (
        <Loading />
      ) : (
        <>
          <div className="mb-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat v={String(data.totals.users)} l={`Yeni kayıt (${days}g)`} />
            <Stat v={String(data.totals.bookings)} l={`Randevu (${days}g)`} />
            <Stat v={TL(data.totals.revenue)} l={`Gelir (${days}g)`} />
          </div>
          <SectionTitle>Günlük seyir</SectionTitle>
          <Toolbar>
            {METRICS.map((m) => (
              <Chip key={m.key} active={metric === m.key} onClick={() => setMetric(m.key)}>
                {m.label}
              </Chip>
            ))}
          </Toolbar>
          <Card className="p-5">
            <BarChart
              points={data.series.map((s) => ({ label: s.date, value: s[metric] }))}
              color={active.color}
              format={metric === 'revenue' ? TL : (n) => String(n)}
            />
          </Card>
          <SectionTitle>Kategori dağılımı (uzman havuzu)</SectionTitle>
          <Card className="p-5">
            <CategoryBars items={data.categories} />
          </Card>
        </>
      )}
    </>
  );
}

/**
 * next.config.mjs'de `output: 'export'` var; statik dışa aktarımda
 * useSearchParams kullanan istemci bileşeni bir Suspense sınırı içinde
 * olmak ZORUNDA, yoksa `next build` hata verip duruyor.
 */
export default function RaporlarSayfasi() {
  return (
    <Suspense fallback={<Loading />}>
      <Raporlar />
    </Suspense>
  );
}
