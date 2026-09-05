'use client';
import Link from 'next/link';
import { Card, PageHead } from '@/app/_components/ui';
import { Gate } from '@/app/_components/Gate';
import { useAsync } from '@/app/_lib/useAsync';
import { useDiyalog } from '@/app/ui/Diyalog';
import { api, type SpecialistRow } from '@/app/lib/api';

/**
 * UZMAN DOĞRULAMA LİSTESİ — "/specialists".
 *
 * ROTA NOTU: detay eskiden `useState<SpecialistDetail | null>` ile açılan bir
 * modaldı. Yönetici bir uzmanı incelerken adres çubuğu hâlâ panelin kökünü
 * gösteriyordu: sayfa yenilenince kayıt kayboluyor, "şuna bak" demek için
 * ekran görüntüsü göndermek gerekiyordu. Artık detay kendi adresinde —
 * `/specialists/detay?id=…` — ve satırdan oraya `<Link>` ile gidiliyor.
 *
 * Sorgu dizisi kullanılıyor (dinamik `[id]` klasörü DEĞİL): panel statik
 * dışa aktarımla (`output: 'export'`) derleniyor, derleme anında bilinmeyen
 * kayıt kimlikleri için sayfa üretilemez.
 */

// §uzman onboarding — admin uzman doğrulama kontrol listesi
const SP_ENTITY_LABEL: Record<string, string> = {
  freelance: 'Serbest çalışan',
  ip: 'ИП (kayıtlı bireysel girişimci)',
};

export default function UzmanDogrulamaSayfasi() {
  const { onayla } = useDiyalog();
  const { data, loading, error, reload } = useAsync<SpecialistRow[]>(() => api.specialists(), []);
  return (
    <>
      <PageHead
        title="Uzman doğrulama"
        sub="Bağımsız uzman katmanlı doğrulama — kimlik (KYC), sertifika, sosyal medya → AYNA Onaylı"
      />
      <Card>
        {!data ? (
          <Gate loading={loading} error={error} onRetry={reload} />
        ) : data.length === 0 ? (
          <div className="empty">Kayıt yok</div>
        ) : (
          data.map((s) => (
            <div key={s.id} className="list-row">
              {/* Satırın tamamı detaya götürüyor — eskiden onClick'li bir div'di;
                  bağlantı olunca orta tıkla yeni sekmede açılabiliyor. */}
              <Link className="grow" href={`/specialists/detay?id=${s.id}`}>
                <div className="name">
                  {s.name} {s.aynaVerified ? '🛡️' : ''}
                  {/*
                    HESAP AÇIK MI. Rozetlerden ayrı bir şey: rozet "neyi
                    doğruladık", bu ise "çalışabilir mi". Onaysız uzman
                    katalogda görünmüyor ve randevu alamıyor.
                  */}
                  <span
                    className={`pill ${s.status === 'approved' ? 'approved' : s.status === 'rejected' ? 'rejected' : 'pending'}`}
                    style={{ marginLeft: 8 }}
                  >
                    {s.status === 'approved'
                      ? 'Açık'
                      : s.status === 'rejected'
                        ? 'Reddedildi'
                        : 'Onay bekliyor'}
                  </span>
                </div>
                <div className="meta">
                  {SP_ENTITY_LABEL[s.entityType] ?? s.entityType} · {s.city || '—'} · KYC:{' '}
                  {s.kycStatus}
                  {s.kind === 'independent' ? ' · Bağımsız' : ' · Salona bağlı'}
                  {s.verification.cert ? ' · ✓Sertifika' : ''}
                  {s.verification.social ? ' · ✓Sosyal' : ''}
                </div>
              </Link>
              {s.status !== 'approved' ? (
                <button
                  className="btn-sm btn-ok"
                  onClick={async () => {
                    await api.setSpecialistStatus(s.id, 'approved');
                    reload();
                  }}
                >
                  Hesabı aç
                </button>
              ) : (
                <button
                  className="btn-sm btn-ghost"
                  onClick={async () => {
                    if (
                      !(await onayla({
                        baslik: 'Uzman hesabını kapat',
                        mesaj: `${s.name} katalogdan düşecek ve yeni randevu alamayacak. Mevcut randevuları etkilenmez.`,
                        onayEtiket: 'Kapat',
                      }))
                    )
                      return;
                    await api.setSpecialistStatus(s.id, 'rejected');
                    reload();
                  }}
                >
                  Kapat
                </button>
              )}
              <Link className="btn-sm btn-ghost" href={`/specialists/detay?id=${s.id}`}>
                Detay
              </Link>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
