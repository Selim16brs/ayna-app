'use client';
import { Card, Loading, PageHead } from '@/app/_components/ui';
import { Gate } from '@/app/_components/Gate';
import { useAsync } from '@/app/_lib/useAsync';
import { TL } from '@/app/_lib/ortak';
import { api, type QuoteReq } from '@/app/lib/api';

/**
 * §12.4 — canlı teklif talepleri ("/quotes").
 *
 * ROTA NOTU: salt okunur bir akış; filtre, sekme ya da detay paneli yok —
 * bu yüzden URL'e taşınacak iç durum da yok. Kazanç, akışın kendi adresine
 * sahip olması.
 */
export default function QuotesPage() {
  const { data, loading, error, reload } = useAsync<QuoteReq[]>(() => api.quoteRequests(), []);
  return (
    <>
      <PageHead
        title="Canlı talepler"
        sub={`§12.4 — talep akışı: kim açtı, şehir, bütçe, gelen teklifler, randevuya dönüşüm (${
          data?.length ?? 0
        })`}
      />
      <Card>
        {!data ? (
          <Gate loading={loading} error={error} onRetry={reload} />
        ) : data.length === 0 ? (
          <Loading label="Teklif talebi yok" />
        ) : (
          data.map((q) => (
            <div key={q.id} className="list-row">
              <div className="grow">
                <div className="name">
                  {q.category}
                  {q.hasPhoto ? ' · 📷' : ''}
                  {q.mode === 'describe' ? ' · ✍️' : ''}
                </div>
                <div className="meta">
                  {q.userName} · {q.city || '—'}
                  {q.budget != null ? ` · bütçe ${TL(q.budget)}` : ''} ·{' '}
                  {q.note ? q.note.slice(0, 60) : 'Not yok'}
                </div>
              </div>
              <span className="pill" style={{ background: 'var(--line)', color: 'var(--muted)' }}>
                {q.quoteCount} teklif
              </span>
              {q.bestPrice != null ? <div className="kv-v">min {TL(q.bestPrice)}</div> : null}
              <span className={`pill ${q.status === 'open' ? 'pending' : 'approved'}`}>
                {q.bookingId ? '✓ Randevu' : q.status === 'open' ? 'Açık' : 'Kapalı'}
              </span>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
