'use client';
import { PageHead, SectionTitle, Card, Loading } from '@/app/_components/ui';
import { useAsync } from '@/app/_lib/useAsync';
import { useDiyalog } from '@/app/ui/Diyalog';
import { api, type AdminReview, type CirclePost } from '@/app/lib/api';

/**
 * Topluluk moderasyonu.
 *
 * ROTA NOTU: sayfada iki bağımsız kuyruk var (W2W onayı + görünür
 * yorumlar) ama ikisi de aynı işin iki yüzü ve aralarında sekme yoktu —
 * ikisi de her zaman açıktı. Bu yüzden ?bolum= gibi bir iç sekme
 * uydurulmadı: olmayan bir durumu URL'e taşımak, ekranı bölmek olurdu.
 * URL'e taşınan tek şey ekranın kendisi: /moderation.
 */
export default function ModerationPage() {
  const { onayla } = useDiyalog();
  const { data, reload } = useAsync<AdminReview[]>(() => api.reviews(), []);
  const { data: circle, reload: reloadCircle } = useAsync<CirclePost[]>(
    () => api.circleQueue(),
    [],
  );
  const hide = async (id: string) => {
    if (
      await onayla({
        baslik: 'Yorumu gizle',
        mesaj: 'Yorum moderasyon gereği gizlenecek.',
        onayEtiket: 'Gizle',
      })
    ) {
      await api.hideReview(id);
      reload();
    }
  };
  const moderateCircle = async (id: string, decision: 'approve' | 'hide') => {
    await api.moderateCircle(id, decision);
    reloadCircle();
  };
  return (
    <>
      <PageHead
        title="Topluluk moderasyonu"
        sub="W2W onay kuyruğu (otomatik filtre + şikâyet) · görünür yorumlar. Sabit ilke: dürüst eleştiri silinmez."
      />
      {/* §12.5 — W2W moderasyon kuyruğu (pending + şikâyetle gizlenen) */}
      <SectionTitle>W2W kuyruğu ({circle?.length ?? 0})</SectionTitle>
      <Card className="mb-6">
        {!circle || circle.length === 0 ? (
          <Loading label="Bekleyen W2W içeriği yok" />
        ) : (
          circle.map((p) => (
            <div key={p.id} className="list-col">
              <div className="name">
                {p.category} · {p.authorLabel}{' '}
                <span className={`pill ${p.status === 'hidden' ? 'rejected' : 'pending'}`}>
                  {p.status === 'hidden' ? `${p.reports} şikâyet` : 'moderasyon'}
                </span>
              </div>
              <div className="mt-1 text-ax-sm leading-relaxed text-ink-2">{p.text}</div>
              {p.moderationReason ? (
                <div className="mt-0.5 text-ax-sm text-ink-3">Sebep: {p.moderationReason}</div>
              ) : null}
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button className="btn-sm btn-ok" onClick={() => moderateCircle(p.id, 'approve')}>
                  Onayla (yayınla)
                </button>
                <button className="btn-sm btn-danger" onClick={() => moderateCircle(p.id, 'hide')}>
                  Gizle
                </button>
              </div>
            </div>
          ))
        )}
      </Card>
      <SectionTitle>Görünür yorumlar</SectionTitle>
      <Card>
        {!data || data.length === 0 ? (
          <Loading label="Görünür yorum yok" />
        ) : (
          data.map((r) => (
            <div key={r.id} className="list-row">
              <div className="grow">
                <div className="name">
                  {'★'.repeat(r.score)}
                  {r.serviceTag ? ` · ${r.serviceTag}` : ''}
                </div>
                <div className="meta">
                  {r.comment || '—'} — {r.authorLabel}
                </div>
                {r.reply ? <div className="meta">↳ Salon: {r.reply}</div> : null}
              </div>
              <button className="btn-sm btn-danger" onClick={() => hide(r.id)}>
                Gizle
              </button>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
