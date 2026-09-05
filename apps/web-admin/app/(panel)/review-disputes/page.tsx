'use client';
import { Card, Loading, PageHead, SectionTitle } from '@/app/_components/ui';
import { Gate } from '@/app/_components/Gate';
import { useAsync } from '@/app/_lib/useAsync';
import { useDiyalog } from '@/app/ui/Diyalog';
import { api, type ReviewDispute } from '@/app/lib/api';

/**
 * §7.2 — yorum itiraz kuyruğu ("/review-disputes"): uzman/işletme itirazı;
 * yorum görünür kalır, admin tut/gizle karar verir.
 *
 * ROTA NOTU: tek kuyruk, filtre yok — URL'e taşınacak iç durum da yok.
 * Kazanç ekranın kendi adresi: itiraz geldiğinde bu link doğrudan
 * paylaşılabiliyor.
 */
export default function ReviewDisputesPage() {
  const { onayla } = useDiyalog();
  const { data, loading, error, reload } = useAsync<ReviewDispute[]>(
    () => api.reviewDisputes(),
    [],
  );
  const list = data ?? [];
  const resolve = async (d: ReviewDispute, action: 'keep' | 'remove') => {
    const msg =
      action === 'remove'
        ? 'Bu yorumu GİZLE? Yalnızca kural ihlali (hakaret, kişisel bilgi, alakasız içerik, sahte yorum) varsa yapılır. Dürüst negatif yorum silinmez.'
        : 'İtirazı kapat ve yorumu OLDUĞU GİBİ tut?';
    if (
      !(await onayla({
        baslik: action === 'remove' ? 'Yorumu gizle' : 'İtirazı kapat',
        mesaj: msg,
        onayEtiket: action === 'remove' ? 'Gizle' : 'Olduğu gibi tut',
        tehlikeli: action === 'remove',
      }))
    )
      return;
    await api.resolveReviewDispute(d.id, action);
    reload();
  };
  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);
  return (
    <>
      <PageHead
        title="Yorum itirazları"
        sub="Uzman/işletmenin itiraz ettiği yorumlar. Sabit ilke: yorum inceleme boyunca görünür kalır; yalnızca kural ihlalinde gizlenir — “hizmeti beğenmedim” türü dürüst negatif yorum SİLİNMEZ."
      />
      <SectionTitle>Bekleyen ({list.length})</SectionTitle>
      <Card>
        {!data ? (
          <Gate loading={loading} error={error} onRetry={reload} />
        ) : list.length === 0 ? (
          <Loading label="Bekleyen itiraz yok" />
        ) : (
          list.map((d) => (
            <div key={d.id} className="list-col">
              <div className="name">
                {stars(d.score)} · {d.authorLabel}
                {d.visible ? '' : ' · (gizli)'}
              </div>
              <div className="meta" style={{ marginTop: 4 }}>
                “{d.comment || '—'}”
              </div>
              {d.reply ? (
                <div className="meta" style={{ marginTop: 2 }}>
                  Uzman yanıtı: {d.reply}
                </div>
              ) : null}
              <div className="meta" style={{ marginTop: 2 }}>
                İtiraz gerekçesi: {d.disputeReason || '—'}
                {d.disputedAt ? ` · ${new Date(d.disputedAt).toLocaleString('tr-TR')}` : ''}
              </div>
              <div className="form-inline" style={{ marginTop: 10 }}>
                <button className="btn-sm" onClick={() => resolve(d, 'keep')}>
                  Yorumu tut
                </button>
                <button className="btn-sm btn-danger" onClick={() => resolve(d, 'remove')}>
                  Kural ihlali — gizle
                </button>
              </div>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
