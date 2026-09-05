'use client';
import { Suspense, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Card, Chip, Loading, PageHead, Toolbar } from '@/app/_components/ui';
import { Gate } from '@/app/_components/Gate';
import { useAsync } from '@/app/_lib/useAsync';
import { api, type KycRow } from '@/app/lib/api';

/**
 * EK Z.3 — KİMLİK DOĞRULAMA KUYRUĞU.
 *
 * Uzman/salon belge doğrulama kuyruğu; onaylanınca profilde "Doğrulanmış"
 * rozeti çıkar.
 *
 * ROTA NOTU: durum çipleri (bekleyen/onaylanan/reddedilen/tümü) eskiden
 * `useState('pending')` idi — sayfa yenilenince filtre başa dönüyor,
 * "reddedilenlere bak" denip link paylaşılamıyordu. Artık `?durum=`
 * sorgusunda. URL boş değer taşıyamadığı için "Tümü" filtresi `tumu`
 * anahtarıyla yazılır; parametre hiç yoksa kaynaktaki varsayılan
 * (`pending`) geçerli.
 *
 * `busy` kilidi tek bir isteğin ömrü kadar yaşayan geçici durum — adrese
 * taşınmaz, useState olarak kalır.
 *
 * Suspense: panel `output: 'export'` ile statik üretiliyor; useSearchParams
 * okuyan ağaç bir sınır içinde olmazsa `next build` kırılır.
 */
const VARSAYILAN = 'pending';

function KimlikDogrulama() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const durumParam = params.get('durum');
  const status = durumParam === null ? VARSAYILAN : durumParam === 'tumu' ? '' : durumParam;
  const setStatus = (d: string) => {
    const p = new URLSearchParams(params.toString());
    if (d === VARSAYILAN) p.delete('durum');
    else p.set('durum', d || 'tumu');
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const { data, loading, error, reload } = useAsync<KycRow[]>(
    () => api.kycQueue(status || undefined),
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
  const DOC: Record<string, string> = {
    id_card: 'Kimlik',
    passport: 'Pasaport',
    certificate: 'Sertifika',
  };
  const FILTERS: [string, string][] = [
    ['pending', 'Bekleyen'],
    ['approved', 'Onaylanan'],
    ['rejected', 'Reddedilen'],
    ['', 'Tümü'],
  ];
  return (
    <>
      <PageHead
        title="Kimlik doğrulama"
        sub={
          <>
            Uzman/salon belge doğrulama kuyruğu — onaylanınca profilde &quot;Doğrulanmış&quot;
            rozeti ({data?.length ?? 0} kayıt)
          </>
        }
      />
      <Toolbar>
        {FILTERS.map(([s, label]) => (
          <Chip key={s || 'all'} active={status === s} onClick={() => setStatus(s)}>
            {label}
          </Chip>
        ))}
      </Toolbar>
      {!data ? (
        <Gate loading={loading} error={error} onRetry={reload} />
      ) : data.length === 0 ? (
        <Loading label="Kayıt yok." />
      ) : (
        <Card>
          {data.map((k) => (
            <div className="list-row" key={k.id}>
              <div className="grow">
                <div className="name">
                  {k.userName}{' '}
                  <span className={`pill ${k.userRole === 'salon' ? 'info' : 'accent'}`}>
                    {k.userRole === 'salon' ? 'Salon' : 'Uzman'}
                  </span>
                </div>
                <div className="meta">
                  {DOC[k.docType] ?? k.docType} · {k.documents.length} belge ·{' '}
                  {new Date(k.submittedAt).toLocaleDateString('tr-TR')}
                  {k.status === 'rejected' && k.note ? ` · Ret: ${k.note}` : ''}
                </div>
              </div>
              <span
                className={`pill ${k.status === 'approved' ? 'approved' : k.status === 'pending' ? 'pending' : 'rejected'}`}
              >
                {k.status === 'approved'
                  ? 'Onaylandı'
                  : k.status === 'pending'
                    ? 'Bekliyor'
                    : 'Reddedildi'}
              </span>
              {k.status === 'pending' ? (
                <div className="actions">
                  <button
                    className="btn-sm btn-ok"
                    disabled={busy === k.id}
                    onClick={() => act(() => api.approveKyc(k.id), k.id)}
                  >
                    Onayla
                  </button>
                  <button
                    className="btn-sm btn-danger"
                    disabled={busy === k.id}
                    onClick={() => act(() => api.rejectKyc(k.id, 'Belgeler yetersiz'), k.id)}
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

export default function KycPage() {
  return (
    <Suspense fallback={<Loading />}>
      <KimlikDogrulama />
    </Suspense>
  );
}
