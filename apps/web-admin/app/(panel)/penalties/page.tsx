'use client';
import { useAsync } from '@/app/_lib/useAsync';
import { useDiyalog } from '@/app/ui/Diyalog';
import { api, type Penalty } from '@/app/lib/api';

// Rol kodları → Türkçe etiket. Üyeler ekranıyla aynı sözlük; bölme sonrası
// her rota kendi kopyasını taşıyor ki tek dosyaya bağımlılık kalmasın.
const ROLE_TR: Record<string, string> = {
  user: 'Kullanıcı',
  professional: 'Uzman',
  salon: 'Salon',
  moderator: 'Moderatör',
  admin: 'Admin',
};

/**
 * §12.3 Ceza Takip — 7 gün sayaçlı kısıtlı hesaplar + kalıcı engel.
 *
 * ROTA NOTU: tek kuyruk, filtre yok — URL'e taşınacak iç durum da yok.
 * Kazanç, ekranın kendi adresine (/penalties) sahip olması: süresi dolan
 * hesap için yöneticiye doğrudan bu link atılabiliyor.
 */
export default function PenaltiesPage() {
  const { onayla } = useDiyalog();
  const { data, reload } = useAsync<Penalty[]>(() => api.penalties(), []);
  return (
    <>
      <h1 className="page-title">Kısıtlı hesaplar</h1>
      <p className="page-sub">
        Kısıtlı hesaplar (yeni talep göremez) · 7 gün sayacı dolunca kalıcı engel adayı
      </p>
      <div className="card">
        {!data ? (
          <div className="empty">Yükleniyor…</div>
        ) : data.length === 0 ? (
          <div className="empty">Kısıtlı hesap yok</div>
        ) : (
          data.map((p) => (
            <div key={p.id} className="list-row">
              <div className="grow">
                <div className="name">
                  {p.name || '—'} · {ROLE_TR[p.role] ?? p.role}
                  {p.banEligible ? ' · ⚠️ süre doldu' : ''}
                </div>
                <div className="meta">
                  {p.restrictReason || 'gerekçe yok'}
                  {p.city ? ` · ${p.city}` : ''} · geçen {p.daysElapsed}g · kalan{' '}
                  <strong style={{ color: p.banEligible ? 'var(--danger)' : 'var(--gold)' }}>
                    {p.daysRemaining}g
                  </strong>
                </div>
              </div>
              <button
                className="btn-sm btn-ok"
                onClick={async () => {
                  await api.unrestrictUser(p.id);
                  reload();
                }}
              >
                Kısıtı kaldır
              </button>
              <button
                className="btn-sm btn-danger"
                onClick={async () => {
                  if (
                    await onayla({
                      baslik: 'Hesabı engelle',
                      mesaj: `${p.name || 'Hesap'} kalıcı olarak engellenecek.`,
                      onayEtiket: 'Engelle',
                      tehlikeli: true,
                    })
                  ) {
                    await api.setUserStatus(p.id, 'suspended');
                    reload();
                  }
                }}
              >
                Kalıcı engel
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
