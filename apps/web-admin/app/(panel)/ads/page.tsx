'use client';
import Link from 'next/link';
import { PageHead, Toolbar, Card } from '@/app/_components/ui';
import { useAsync } from '@/app/_lib/useAsync';
import { useDiyalog } from '@/app/ui/Diyalog';
import { api, type AdBanner, type Pro } from '@/app/lib/api';

/**
 * REKLAM BANDI LİSTESİ — "/ads".
 *
 * Bölme öncesinde tek `AdsView` üç işi birden yapıyordu: ödeme kuyruğu,
 * ekleme formu ve bu liste. Üçü de aynı URL'deydi; ekleme formu listenin
 * üstünde her zaman açık duruyor, ödeme kuyruğu ise listeye ulaşmak için
 * her seferinde kaydırılıyordu. Artık her iş kendi rotasında:
 *   /ads          → yayındaki reklam bandı (bu dosya)
 *   /ads/yeni     → yeni reklam formu
 *   /ads/odemeler → Kaspi dekont doğrulama kuyruğu
 */
export default function ReklamlarSayfasi() {
  const { onayla } = useDiyalog();
  const { data: ads, reload } = useAsync<AdBanner[]>(() => api.ads(), []);
  const { data: pros } = useAsync<Pro[]>(() => api.professionals(), []);
  const proName = (id: string) => pros?.find((p) => p.id === id)?.name ?? id;

  return (
    <>
      <PageHead
        title="Reklamlar"
        sub="Ücretli vitrin: uzman/salon Kaspi ile öder, dekontu buradan doğrularsın. Onaylanan reklam satın alınan süre boyunca Keşfet ekranında yayınlanır."
      />
      <Toolbar>
        <Link className="btn-sm btn-ok" href="/ads/yeni">
          + Reklam ekle
        </Link>
        {/* Ödeme kuyruğu artık ayrı rota: reklamı onaylayacak kişi buraya
            gelir, randevu kuyruklarına değil. */}
        <Link className="btn-sm" href="/ads/odemeler">
          Reklam ödemeleri
        </Link>
      </Toolbar>
      <Card>
        {!ads || ads.length === 0 ? (
          <div className="empty">Reklam yok</div>
        ) : (
          ads.map((a) => (
            <div key={a.id} className="list-row">
              {a.image ? <img className="thumb" src={a.image} alt="" /> : <div className="thumb" />}
              <div className="grow">
                <div className="name">{a.title}</div>
                <div className="meta">
                  {a.subtitle}
                  {' · '}
                  {proName(a.proId)}
                </div>
                {/* Hangi vitrin + yayın penceresi. "Aktif" rozeti tek başına
                    yanıltıcıydı: süresi geçmiş bir reklam da aktif görünüyor
                    ama ekranda çıkmıyordu — sunucu onu zaten süzüyor. */}
                <div className="meta tabular-nums">
                  {a.placement === 'firsatlar' ? 'Fırsatlar' : 'Öne çıkanlar'}
                  {' · '}
                  {a.startsAt || a.endsAt
                    ? `${a.startsAt ? new Date(a.startsAt).toLocaleDateString('tr-TR') : '—'} → ${
                        a.endsAt ? new Date(a.endsAt).toLocaleDateString('tr-TR') : '—'
                      }${a.endsAt && new Date(a.endsAt) <= new Date() ? ' · SÜRESİ DOLDU' : ''}`
                    : 'süresiz'}
                </div>
              </div>
              <button
                className={`switch ${a.durum === 'yayinda' ? 'on' : 'off'}`}
                onClick={async () => {
                  await api.setAdActive(a.id, !a.active);
                  reload();
                }}
              >
                {/*
                  GERÇEK durum. Bayrağı gösteriyordu: süresi dolmuş bir
                  reklam "Aktif" görünüyor ama kimseye gösterilmiyordu —
                  yönetici ödeme aldığı reklamı yayında sanıyordu.
                */}
                {a.durum === 'yayinda'
                  ? 'Yayında'
                  : a.durum === 'doldu'
                    ? 'Süresi doldu'
                    : a.durum === 'baslamadi'
                      ? 'Başlamadı'
                      : 'Pasif'}
              </button>
              <button
                className="btn-sm btn-danger"
                onClick={async () => {
                  if (
                    await onayla({
                      baslik: 'Reklamı sil',
                      mesaj: 'Bu reklam kalıcı olarak silinecek.',
                      onayEtiket: 'Sil',
                      tehlikeli: true,
                    })
                  ) {
                    await api.deleteAd(a.id);
                    reload();
                  }
                }}
              >
                Sil
              </button>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
