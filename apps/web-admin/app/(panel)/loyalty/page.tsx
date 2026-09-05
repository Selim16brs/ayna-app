'use client';
import { PageHead, SectionTitle, Stat, Card, Loading } from '@/app/_components/ui';
import { Gate } from '@/app/_components/Gate';
import { useAsync } from '@/app/_lib/useAsync';
import { api, type Loyalty } from '@/app/lib/api';

/**
 * PUAN EKONOMİSİ — /loyalty
 *
 * ROTA NOTU: ekranda tek bir defter listesi var; filtre, sekme ya da seçili
 * kayıt yok. Bu yüzden URL'e taşınacak bir iç durum da yok — rotanın kendisi
 * (/loyalty) tek taşınan şey. Olmayan bir durumu ?bolum= gibi uydurmak
 * ekranı bölmek olurdu.
 *
 * Yükleme/hata artık <Gate> üzerinden: kaynakta hata durumunda ekran sonsuza
 * kadar "Yükleniyor…" yazıyordu, şimdi gerçek neden ve "Tekrar dene" var.
 */
export default function PuanEkonomisiSayfasi() {
  const { data, loading, error, reload } = useAsync<Loyalty>(() => api.loyalty(), []);
  return (
    <>
      <PageHead
        title="Puan ekonomisi"
        sub="Puan defteri (append-only) — bakiye dolaşımdaki puan = platform yükümlülüğü"
      />
      {!data ? (
        <Gate loading={loading} error={error} onRetry={reload} />
      ) : (
        <>
          <div className="stat-grid">
            <Stat v={data.totals.earned.toLocaleString('tr-TR')} l="Kazanılan puan" />
            <Stat v={data.totals.spent.toLocaleString('tr-TR')} l="Harcanan puan" />
            <Stat v={data.totals.balance.toLocaleString('tr-TR')} l="Dolaşımdaki (yükümlülük)" />
          </div>
          <SectionTitle>Son hareketler</SectionTitle>
          <Card>
            {data.entries.length === 0 ? (
              <Loading label="Hareket yok" />
            ) : (
              data.entries.map((e) => (
                <div key={e.id} className="list-row">
                  <div className="grow">
                    <div className="name">{e.userName}</div>
                    <div className="meta">
                      {e.reason}
                      {e.detail ? ` · ${e.detail}` : ''}
                    </div>
                  </div>
                  <span className={`pill ${e.points >= 0 ? 'approved' : 'rejected'}`}>
                    {e.points >= 0 ? `+${e.points}` : e.points} puan
                  </span>
                </div>
              ))
            )}
          </Card>
        </>
      )}
    </>
  );
}
