'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Card, Chip, Loading, PageHead, Toolbar } from '@/app/_components/ui';
import { Gate } from '@/app/_components/Gate';
import { useAsync } from '@/app/_lib/useAsync';
import { useDiyalog } from '@/app/ui/Diyalog';
import { api, type Business } from '@/app/lib/api';

/**
 * SALON BAŞVURULARI — liste.
 *
 * Detay artık modal değil, kendi rotası (`/businesses/detay?id=…`). Modal
 * `useState<BusinessDetail|null>` ile tutuluyordu: açık bir başvuru
 * paylaşılamıyor, yer imine eklenemiyor, sayfa yenilenince kayboluyordu.
 *
 * Durum filtresi de `?durum=` sorgusuna taşındı — "reddedilenler" görünümü
 * artık linklenebilir. Parametre yoksa kaynaktaki varsayılan (`pending`)
 * geçerli; varsayılan seçildiğinde parametre URL'den silinir ki adres
 * çubuğu gereksiz yere dolmasın.
 */
const VARSAYILAN = 'pending';
const DURUMLAR: [string, string][] = [
  ['pending', 'Onay bekleyen'],
  ['approved', 'Onaylı'],
  ['rejected', 'Reddedilen'],
];

function SalonBasvurulari() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { formAl } = useDiyalog();
  const status = params.get('durum') ?? VARSAYILAN;
  const setStatus = (d: string) => {
    const p = new URLSearchParams(params.toString());
    if (d === VARSAYILAN) p.delete('durum');
    else p.set('durum', d);
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const { data, loading, error, reload } = useAsync<Business[]>(
    () => api.businesses(status),
    [status],
  );
  const act = async (id: string, kind: 'approve' | 'reject') => {
    if (kind === 'approve') await api.approveBusiness(id);
    else {
      const v = await formAl({
        baslik: 'Salon başvurusunu reddet',
        mesaj: 'Gerekçe başvuru sahibine iletilir.',
        alanlar: [{ ad: 'sebep', etiket: 'Red sebebi', tur: 'uzun', zorunlu: true }],
        onayEtiket: 'Reddet',
      });
      if (!v) return;
      await api.rejectBusiness(id, (v.sebep ?? '').trim());
    }
    reload();
  };
  return (
    <>
      <PageHead title="Salon başvuruları" sub="Salon (işletme) kayıt onayları ve durum yönetimi" />
      <Toolbar>
        {DURUMLAR.map(([s, label]) => (
          <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
            {label}
          </Chip>
        ))}
      </Toolbar>
      {!data ? (
        <Gate loading={loading} error={error} onRetry={reload} />
      ) : data.length === 0 ? (
        <Loading label="Kayıt yok" />
      ) : (
        <Card>
          {data.map((b) => (
            <div key={b.id} className="list-row">
              {/* Satırın gövdesi artık düğme değil LİNK: orta tıkla yeni
                  sekmede açılıyor, üzerine gelince hedef görünüyor. */}
              <Link
                href={`/businesses/detay?id=${b.id}`}
                className="grow"
                style={{ textDecoration: 'none' }}
              >
                <div className="name">{b.name}</div>
                <div className="meta">
                  {b.ownerName} · {b.sector} · {b.city}
                  {b.district ? ` / ${b.district}` : ''} · {b.phone}
                </div>
              </Link>
              <Link
                className="btn-sm btn-ghost"
                href={`/businesses/detay?id=${b.id}`}
                style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
              >
                Detay
              </Link>
              {b.status !== 'approved' ? (
                <button className="btn-sm btn-ok" onClick={() => act(b.id, 'approve')}>
                  Onayla
                </button>
              ) : null}
              {b.status !== 'rejected' ? (
                <button className="btn-sm btn-danger" onClick={() => act(b.id, 'reject')}>
                  Reddet
                </button>
              ) : null}
            </div>
          ))}
        </Card>
      )}
    </>
  );
}

export default function SalonBasvurulariSayfasi() {
  // useSearchParams istemci tarafında çözülür; Next bu sınırda Suspense ister.
  return (
    <Suspense fallback={<Loading />}>
      <SalonBasvurulari />
    </Suspense>
  );
}
