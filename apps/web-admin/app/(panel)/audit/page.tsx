'use client';
import { PageHead, Card, Loading } from '@/app/_components/ui';
import { Gate } from '@/app/_components/Gate';
import { useAsync } from '@/app/_lib/useAsync';
import { api, type AuditEntry } from '@/app/lib/api';

/**
 * DENETİM KAYDI — /audit
 *
 * ROTA NOTU: salt okunur tek liste; filtre, arama ya da seçili kayıt yok.
 * URL'e taşınan tek şey rotanın kendisi — olmayan bir iç durum uydurulmadı.
 * Kayıtlarda PII yok (yalnızca rol/kaynak/hash), spec §"audit log".
 */
export default function DenetimKaydiSayfasi() {
  const { data, loading, error, reload } = useAsync<AuditEntry[]>(() => api.auditLogs(), []);
  return (
    <>
      <PageHead
        title="Denetim kaydı"
        sub="Kritik eylemlerin izi (PII yok — yalnızca rol/kaynak/hash)"
      />
      <Card>
        {!data ? (
          <Gate loading={loading} error={error} onRetry={reload} />
        ) : data.length === 0 ? (
          <Loading label="Kayıt yok" />
        ) : (
          data.map((a) => (
            <div key={a.id} className="list-row">
              <div className="grow">
                <div className="name">
                  {a.action} · {a.resourceType}
                </div>
                <div className="meta">
                  {a.resourceId ? `#${a.resourceId.slice(0, 8)} · ` : ''}
                  {a.actorRole || 'sistem'} · {new Date(a.createdAt).toLocaleString('tr-TR')}
                </div>
              </div>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
