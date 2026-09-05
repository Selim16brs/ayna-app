'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Card, Loading, PageHead } from '@/app/_components/ui';
import { Gate } from '@/app/_components/Gate';
import { useAsync } from '@/app/_lib/useAsync';
import { useDiyalog } from '@/app/ui/Diyalog';
import { api, type ReklamSiparisi } from '@/app/lib/api';

/**
 * §reklam — ÜCRETLİ VİTRİN ÖDEMELERİ.
 *
 * Reklam sipariş anında yayına GİRMEZ; ödeme burada doğrulanınca yayınlanır.
 * Onaylanmadan yayınlansaydı ödenmemiş reklam vitrine düşerdi.
 *
 * Bölme notu: bu kuyruk eskiden "Reklamlar" ekranının üst yarısındaydı —
 * reklam listesiyle ödeme kuyruğu tek sayfada iç içeydi. Ayrı rotaya alındı;
 * ikisi arasında /ads ile karşılıklı bağlantı var.
 */
export default function ReklamOdemeleriSayfasi() {
  const { onayla } = useDiyalog();
  const reklam = useAsync<ReklamSiparisi[]>(() => api.reklamSiparisleri(), []);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <>
      <PageHead
        title="Reklam ödemeleri"
        sub="Uzman/salon Kaspi ile öder, dekontu burada doğrularsın. Onaylayınca reklam satın alınan süre boyunca yayına girer ve süre bitince kendiliğinden düşer. Reddedersen reklam üretilmez; uzman dekontu yeniden gönderebilir."
      />

      <div className="mb-4">
        <Link className="btn-sm" href="/ads" style={{ textDecoration: 'none' }}>
          ← Reklam listesi
        </Link>
      </div>

      {msg ? (
        <div className="mb-3 text-ax-sm font-semibold" style={{ color: 'var(--ok, #2f6b4f)' }}>
          {msg}
        </div>
      ) : null}

      {!reklam.data ? (
        <Gate loading={reklam.loading} error={reklam.error} onRetry={reklam.reload} />
      ) : (
        <Card>
          {!reklam.data.length ? (
            <Loading label="Bekleyen reklam ödemesi yok" />
          ) : (
            reklam.data.map((o) => (
              <div key={o.id} className="list-row">
                {o.image ? (
                  <img className="thumb" src={o.image} alt="" />
                ) : (
                  <div className="thumb" />
                )}
                <div className="grow">
                  <div>
                    <b>{o.proName}</b> · {o.title}
                  </div>
                  <div className="meta">
                    {o.placement === 'firsatlar' ? 'Fırsatlar' : 'Öne çıkanlar'} · {o.months} ay ·{' '}
                    {Number(o.amount).toLocaleString('tr-TR')} ₸
                  </div>
                  <div className="meta">
                    kod{' '}
                    <code>{`AYNA-${o.id
                      .replace(/[^a-zA-Z0-9]/g, '')
                      .slice(-5)
                      .toUpperCase()}`}</code>
                  </div>
                </div>
                {o.receiptUri ? (
                  <a className="btn-sm" href={o.receiptUri} target="_blank" rel="noreferrer">
                    Dekontu aç
                  </a>
                ) : (
                  <span className="meta">dekont yok</span>
                )}
                <button
                  className="btn-sm btn-ok"
                  disabled={!o.receiptUri}
                  onClick={async () => {
                    await api.reklamOnayla(o.id);
                    setMsg('Reklam yayına alındı');
                    reklam.reload();
                  }}
                >
                  Yayına al
                </button>
                <button
                  className="btn-sm btn-danger"
                  onClick={async () => {
                    if (
                      !(await onayla({
                        baslik: 'Ödeme doğrulanamadı',
                        mesaj: 'Bu ödeme doğrulanamadı olarak işaretlenecek.',
                        onayEtiket: 'İşaretle',
                      }))
                    )
                      return;
                    await api.reklamReddet(o.id);
                    setMsg('Reklam ödemesi reddedildi');
                    reklam.reload();
                  }}
                >
                  Reddet
                </button>
              </div>
            ))
          )}
        </Card>
      )}
    </>
  );
}
