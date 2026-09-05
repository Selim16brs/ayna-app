'use client';
import { Card, Loading, PageHead, SectionTitle } from '@/app/_components/ui';
import { Gate } from '@/app/_components/Gate';
import { useAsync } from '@/app/_lib/useAsync';
import { TL } from '@/app/_lib/ortak';
import { useDiyalog } from '@/app/ui/Diyalog';
import { api, type Dispute } from '@/app/lib/api';

/**
 * §12.4 Anlaşmazlık kuyruğu — depozito/iade dekont görselleri incelenir,
 * karar verilir ("/disputes").
 *
 * ROTA NOTU: ekranın iç durumu yok. "Bekleyen" ve "Çözülenler" bir filtre
 * değil, aynı anda görünen iki bölüm — birini URL'e taşımak olmayan bir
 * sekmeyi uydurmak olurdu. Kazanç, kuyruğun kendi adresine kavuşması:
 * itiraz düştüğünde yöneticiye doğrudan bu link atılabiliyor.
 */
export default function DisputesPage() {
  const { formAl } = useDiyalog();
  const { data, loading, error, reload } = useAsync<Dispute[]>(() => api.disputes(), []);
  const open = (data ?? []).filter((d) => d.status === 'open');
  const resolved = (data ?? []).filter((d) => d.status !== 'open');
  const kindLabel = (k: string) => (k === 'refund' ? 'İade dekontu' : 'Depozito itirazı');
  const statusLabel = (s: string) =>
    s === 'approved' ? 'Onaylandı' : s === 'rejected' ? 'Reddedildi' : 'Açık';
  const statusPill = (s: string) =>
    s === 'approved' ? 'approved' : s === 'rejected' ? 'rejected' : 'pending';
  const resolve = async (d: Dispute, decision: 'approve' | 'reject') => {
    const v = await formAl({
      baslik: `${kindLabel(d.kind)} — ${decision === 'approve' ? 'onayla' : 'reddet'}`,
      mesaj: `${d.proName} · ${TL(d.amount)} · Randevu #${d.bookingRef}`,
      alanlar: [{ ad: 'not', etiket: 'Karar notu', tur: 'uzun', ipucu: 'İsteğe bağlı' }],
      onayEtiket: decision === 'approve' ? 'Onayla' : 'Reddet',
    });
    if (!v) return;
    await api.resolveDispute(d.id, decision, (v.not ?? '').trim() || undefined);
    reload();
  };
  const row = (d: Dispute) => (
    <div key={d.id} className="list-col">
      <div className="name">
        {kindLabel(d.kind)} · {d.proName} · {TL(d.amount)}
      </div>
      <div className="meta" style={{ marginTop: 4 }}>
        Randevu #{d.bookingRef} {d.service ? `· ${d.service}` : ''} ·{' '}
        {new Date(d.createdAt).toLocaleString('tr-TR')}
        {d.note ? ` · "${d.note}"` : ''}
      </div>
      {d.resolution ? (
        <div className="meta" style={{ marginTop: 2 }}>
          Karar notu: {d.resolution}
        </div>
      ) : null}
      <div className="form-inline" style={{ marginTop: 10 }}>
        {d.receiptUri ? (
          <a
            className="btn-sm"
            href={d.receiptUri}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none' }}
          >
            🧾 Dekontu incele
          </a>
        ) : (
          <span className="meta">Dekont yok</span>
        )}
        {d.status === 'open' ? (
          <>
            <button className="btn-sm btn-ok" onClick={() => resolve(d, 'approve')}>
              Onayla
            </button>
            <button className="btn-sm btn-danger" onClick={() => resolve(d, 'reject')}>
              Reddet
            </button>
          </>
        ) : (
          <span className={`pill ${statusPill(d.status)}`}>{statusLabel(d.status)}</span>
        )}
      </div>
    </div>
  );
  return (
    <>
      <PageHead
        title="Depozito itirazları"
        sub="Depozito itirazları ve iade dekontları — dekont görselleri burada incelenir. Sabit ilke: dürüst eleştiri/haklı iade reddedilmez."
      />
      <SectionTitle>Bekleyen ({open.length})</SectionTitle>
      <Card className="mb-5">
        {!data ? (
          <Gate loading={loading} error={error} onRetry={reload} />
        ) : open.length === 0 ? (
          <Loading label="Bekleyen anlaşmazlık yok" />
        ) : (
          open.map(row)
        )}
      </Card>
      {resolved.length > 0 && (
        <>
          <SectionTitle>Çözülenler ({resolved.length})</SectionTitle>
          <Card className="opacity-80">{resolved.map(row)}</Card>
        </>
      )}
    </>
  );
}
