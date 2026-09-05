'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Card, Loading, PageHead, Toolbar } from '@/app/_components/ui';
import { Gate } from '@/app/_components/Gate';
import { useAsync } from '@/app/_lib/useAsync';
import { TL } from '@/app/_lib/ortak';
import { useDiyalog } from '@/app/ui/Diyalog';
import { api, type Pro } from '@/app/lib/api';

/**
 * UZMAN & SALONLAR — "/professionals".
 *
 * Bölme öncesi bu ekran hem listeydi hem de ekleme/düzenleme modalıydı:
 * "Düzenle"ye basınca URL değişmiyor, sayfa yenilenince açık kayıt
 * kayboluyordu. Modal kalktı, iş kendi rotasına ayrıldı:
 *   /professionals                 → bu liste
 *   /professionals/yeni            → yeni uzman formu
 *   /professionals/guncelle?id=X   → mevcut uzmanın formu
 *
 * Arama kutusu `?ara=` sorgusuna taşındı. Süzme yine istemci tarafında
 * (kaynaktaki gibi tüm liste bir kez çekilir, filtre bellekte uygulanır);
 * URL'e taşınmasının kazancı, süzülmüş görünümün paylaşılabilir ve sayfa
 * yenilendiğinde korunur olması.
 */
function UzmanListesi() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { onayla } = useDiyalog();
  const { data, loading, error, reload } = useAsync<Pro[]>(() => api.professionals(), []);
  const q = params.get('ara') ?? '';
  const setQ = (v: string) => {
    const p = new URLSearchParams(params.toString());
    if (v) p.set('ara', v);
    else p.delete('ara');
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const list = (data ?? []).filter(
    (p) =>
      !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.sector.includes(q.toLowerCase()),
  );
  const del = async (id: string) => {
    if (
      await onayla({
        baslik: 'Uzmanı sil',
        mesaj: 'Uzman ve ona bağlı tüm teklifler kalıcı olarak silinecek.',
        onayEtiket: 'Sil',
        tehlikeli: true,
      })
    ) {
      await api.deleteProfessional(id);
      reload();
    }
  };
  return (
    <>
      <PageHead
        title="Uzman & salonlar"
        sub="Keşif listesindeki uzman/salonlar — ekle, düzenle, fiyat, öne çıkar, sil"
      />
      <Toolbar>
        <Link className="btn-sm btn-ok" href="/professionals/yeni">
          + Yeni uzman
        </Link>
        <input
          className="input"
          style={{ height: 34, maxWidth: 240 }}
          placeholder="Ara (isim / sektör)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="page-sub" style={{ margin: 0 }}>
          {list.length} kayıt
        </span>
      </Toolbar>
      <Card>
        {!data ? (
          <Gate loading={loading} error={error} onRetry={reload} />
        ) : list.length === 0 ? (
          <Loading label="Uzman yok" />
        ) : (
          list.map((p) => (
            <div key={p.id} className="list-row">
              {p.imageUrl ? (
                <img className="thumb" src={p.imageUrl} alt="" />
              ) : (
                <div className="thumb" />
              )}
              <div className="grow">
                <div className="name">
                  {p.name}
                  {p.featured ? ' · ⭐' : ''}
                </div>
                <div className="meta">
                  {p.sector} · {p.district || '—'} ·{' '}
                  {p.priceFrom > 0 ? TL(p.priceFrom) + '+' : 'fiyat yok'} · ★ {p.rating.toFixed(1)}{' '}
                  ({p.reviewCount})
                </div>
              </div>
              <button
                className={`switch ${p.featured ? 'on' : 'off'}`}
                onClick={async () => {
                  await api.setFeatured(p.id, !p.featured);
                  reload();
                }}
              >
                {p.featured ? 'Öne çıkan' : 'Normal'}
              </button>
              {/* Modal yerine rota: düzenlenen kayıt artık adres çubuğunda. */}
              <Link className="btn-sm btn-ghost" href={`/professionals/guncelle?id=${p.id}`}>
                Düzenle
              </Link>
              <button className="btn-sm btn-danger" onClick={() => del(p.id)}>
                Sil
              </button>
            </div>
          ))
        )}
      </Card>
    </>
  );
}

export default function UzmanlarSayfasi() {
  // useSearchParams istemci tarafında çözülür; Next bu sınırda Suspense ister.
  return (
    <Suspense fallback={<Loading />}>
      <UzmanListesi />
    </Suspense>
  );
}
