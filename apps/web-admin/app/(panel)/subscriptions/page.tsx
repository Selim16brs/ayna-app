'use client';
import { Suspense, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PageHead, Chip, Toolbar, Card, Loading } from '@/app/_components/ui';
import { Gate } from '@/app/_components/Gate';
import { useAsync } from '@/app/_lib/useAsync';
import { TL } from '@/app/_lib/ortak';
import { api, type Subscription } from '@/app/lib/api';

/**
 * §11 — Abonelik dekontları.
 *
 * ROTA NOTU: durum filtresi (bekleyen/aktif/reddedilen/süresi dolan/tümü)
 * eskiden `useState('pending')` idi; "bana reddedilenlerin listesini at"
 * denilemiyor, sayfa yenilenince filtre başa dönüyordu. Artık ?durum=
 * query'sinde: her filtre paylaşılabilir bir adres. Varsayılan kaynaktaki
 * gibi 'pending'. `busy` kilidi geçici olduğu için useState kalıyor.
 *
 * Suspense: panel `output: 'export'` ile statik üretiliyor; useSearchParams
 * okuyan ağaç bir sınır içinde olmazsa derleme kırılır.
 */
export default function SubscriptionsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Abonelikler />
    </Suspense>
  );
}

function Abonelikler() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const status = params.get('durum') ?? 'pending';
  const setStatus = (d: string) => {
    const p = new URLSearchParams(params.toString());
    if (d) p.set('durum', d);
    else p.set('durum', ''); // "Tümü" de bilinçli bir seçim — adreste görünmeli
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };
  const { data, loading, error, reload } = useAsync<Subscription[]>(
    () => api.subscriptions(status || undefined),
    [status],
  );
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (fn: () => Promise<unknown>, id: string) => {
    setBusy(id);
    try {
      await fn();
      reload();
    } finally {
      setBusy(null);
    }
  };
  const FILTERS: [string, string][] = [
    ['pending', 'Bekleyen'],
    ['active', 'Aktif'],
    ['rejected', 'Reddedilen'],
    ['expired', 'Süresi dolan'],
    ['', 'Tümü'],
  ];
  const statusPill = (s: Subscription['status']) =>
    s === 'active' ? 'approved' : s === 'pending' ? 'pending' : 'rejected';
  const statusTr = (s: Subscription['status']) =>
    s === 'active'
      ? 'Aktif'
      : s === 'pending'
        ? 'Bekliyor'
        : s === 'rejected'
          ? 'Reddedildi'
          : 'Süresi doldu';
  return (
    <>
      <PageHead
        title="Abonelik dekontları"
        sub={`Premium / Platinum üyelik dekont onayı (${data?.length ?? 0} kayıt)`}
      />
      <Toolbar>
        {FILTERS.map(([s, label]) => (
          <Chip key={s || 'all'} active={status === s} onClick={() => setStatus(s)}>
            {label}
          </Chip>
        ))}
        <button
          className="btn-sm btn-ghost ml-auto"
          onClick={() => api.runSubExpire().then(reload)}
        >
          Süre dolanları düşür
        </button>
      </Toolbar>
      {!data ? (
        <Gate loading={loading} error={error} onRetry={reload} />
      ) : data.length === 0 ? (
        <Loading label="Kayıt yok." />
      ) : (
        <Card>
          {data.map((s) => (
            <div className="list-row" key={s.id}>
              <div className="grow">
                <div className="name">
                  {s.userName}{' '}
                  <span className={`pill ${s.tier === 'platinum' ? 'accent' : 'info'}`}>
                    {s.tier === 'platinum' ? '💎 Platinum' : 'Premium'}
                  </span>
                </div>
                <div className="meta">
                  {TL(s.amount)} · {new Date(s.createdAt).toLocaleDateString('tr-TR')}
                  {s.periodEnd
                    ? ` · bitiş ${new Date(s.periodEnd).toLocaleDateString('tr-TR')}`
                    : ''}
                  {s.receiptUri ? ' · 📎 dekont:' : ' · ⚠ dekont yok'}
                </div>
              </div>
              {s.receiptUri ? (
                <img
                  src={s.receiptUri}
                  alt="dekont"
                  className="cursor-zoom-in rounded-sm object-cover"
                  style={{ width: 72, height: 72 }}
                  onClick={(e) => {
                    const img = e.currentTarget;
                    img.style.width = img.style.width === '72px' ? '360px' : '72px';
                    img.style.height = 'auto';
                  }}
                />
              ) : null}
              <span className={`pill ${statusPill(s.status)}`}>{statusTr(s.status)}</span>
              {s.status === 'pending' ? (
                <div className="actions">
                  <button
                    className="btn-sm btn-ok"
                    disabled={busy === s.id}
                    onClick={() => act(() => api.approveSubscription(s.id, 1), s.id)}
                  >
                    Onayla (1 ay)
                  </button>
                  <button
                    className="btn-sm btn-danger"
                    disabled={busy === s.id}
                    onClick={() => act(() => api.rejectSubscription(s.id), s.id)}
                  >
                    Reddet
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
