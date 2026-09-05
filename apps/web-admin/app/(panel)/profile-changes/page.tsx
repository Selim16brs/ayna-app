'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Card, Chip, Loading, PageHead, Toolbar } from '@/app/_components/ui';
import { Gate } from '@/app/_components/Gate';
import { useAsync } from '@/app/_lib/useAsync';
import { api, type ProfileChange } from '@/app/lib/api';

/**
 * §profil-onay — salon/uzman profil değişiklik onay kuyruğu.
 *
 * Durum filtresi artık `?durum=` sorgusunda: yenilenince seçim korunuyor ve
 * "reddedilenlere bak" gibi bir görünüm link olarak paylaşılabiliyor.
 * URL boş değer taşıyamadığı için "Tümü" filtresi `tumu` anahtarıyla yazılır;
 * parametre hiç yoksa kaynaktaki varsayılan (`pending`) geçerli.
 */
const VARSAYILAN = 'pending';

function ProfilDegisiklikleri() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const durumParam = params.get('durum');
  const status = durumParam === null ? VARSAYILAN : durumParam === 'tumu' ? '' : durumParam;
  const setStatus = (d: string) => {
    const p = new URLSearchParams(params.toString());
    if (d === VARSAYILAN) p.delete('durum');
    else p.set('durum', d || 'tumu');
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const { data, loading, error, reload } = useAsync<ProfileChange[]>(
    () => api.profileChanges(status || undefined),
    [status],
  );
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (fn: () => Promise<unknown>, id: string) => {
    setBusy(id);
    try {
      await fn();
      reload();
    } finally {
      setBusy(null);
    }
  };
  // değişiklik JSON'unu okunur özetle
  const summarize = (c: Record<string, unknown>): string => {
    const parts: string[] = [];
    if (typeof c.name === 'string') parts.push(`İsim → "${c.name}"`);
    /*
     * TELEFON — en kritik değişiklik, bu yüzden en başa ve tam numarayla.
     * Yeni numara SMS koduyla doğrulanmış olarak geliyor (sunucu kodsuz
     * talep kabul etmiyor); rozet bunu söylüyor ki admin "numara gerçekten
     * bu kişinin mi" sorusunu tekrar sormasın, kendi sorusuna odaklansın:
     * bu değişiklik uygun mu?
     */
    if (typeof c.phone === 'string') {
      parts.unshift(`Telefon → ${c.phone}${c.phoneVerified ? ' (SMS ile doğrulandı)' : ''}`);
    }
    const sp = c.salonProfile as Record<string, unknown> | undefined;
    if (sp) {
      if (sp.about) parts.push('Hakkında');
      if (sp.address) parts.push('Adres');
      if (sp.contact) parts.push('İletişim');
      if (Array.isArray(sp.photos)) parts.push(`${(sp.photos as unknown[]).length} foto`);
      if (Array.isArray(sp.areas)) parts.push('Hizmet alanları');
    }
    if (c.social) parts.push('Sosyal medya');
    if (c.hours) parts.push('Çalışma saatleri');
    if (Array.isArray(c.certs)) parts.push(`${(c.certs as unknown[]).length} sertifika`);
    return parts.length ? parts.join(' · ') : 'Değişiklik';
  };
  const FILTERS: [string, string][] = [
    ['pending', 'Bekleyen'],
    ['approved', 'Onaylanan'],
    ['rejected', 'Reddedilen'],
    ['', 'Tümü'],
  ];
  return (
    <>
      <PageHead
        title="Profil değişiklikleri"
        sub={`Salon/uzman profil değişiklikleri admin onayı olmadan yayınlanmaz (${data?.length ?? 0} kayıt)`}
      />
      <Toolbar>
        {FILTERS.map(([s, label]) => (
          <Chip key={s || 'all'} active={status === s} onClick={() => setStatus(s)}>
            {label}
          </Chip>
        ))}
      </Toolbar>
      {!data ? (
        <Gate loading={loading} error={error} onRetry={reload} />
      ) : data.length === 0 ? (
        <Card>
          <Loading label="Kayıt yok." />
        </Card>
      ) : (
        <Card>
          {data.map((p) => (
            <div
              className="flex items-center gap-3 border-t border-line px-4 py-3.5 transition-colors first:border-t-0 hover:bg-bg-alt"
              key={p.id}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-ax-md font-bold text-ink">
                  {p.userName}{' '}
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-ax-xs font-bold ${
                      p.role === 'salon'
                        ? 'bg-info-soft text-info'
                        : 'bg-accent-soft text-accent-ink'
                    }`}
                  >
                    {p.role === 'salon' ? 'Salon' : 'Uzman'}
                  </span>
                </div>
                <div className="mt-0.5 text-ax-sm text-ink-3">
                  {summarize(p.changes)} · {new Date(p.createdAt).toLocaleDateString('tr-TR')}
                </div>
              </div>
              <span
                className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-ax-xs font-bold ${
                  p.status === 'approved'
                    ? 'bg-ok-soft text-ok'
                    : p.status === 'pending'
                      ? 'bg-warn-soft text-warn'
                      : 'bg-err-soft text-err'
                }`}
              >
                {p.status === 'approved'
                  ? 'Onaylandı'
                  : p.status === 'pending'
                    ? 'Bekliyor'
                    : 'Reddedildi'}
              </span>
              {p.status === 'pending' ? (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    className="rounded-sm border border-line bg-surface px-3 py-1.5 text-ax-sm font-semibold text-ok transition-colors hover:border-ok hover:bg-ok-soft disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={busy === p.id}
                    onClick={() => act(() => api.approveProfileChange(p.id), p.id)}
                  >
                    Onayla
                  </button>
                  <button
                    className="rounded-sm border border-line bg-surface px-3 py-1.5 text-ax-sm font-semibold text-err transition-colors hover:border-err hover:bg-err-soft disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={busy === p.id}
                    onClick={() => act(() => api.rejectProfileChange(p.id), p.id)}
                  >
                    Reddet
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </Card>
      )}
    </>
  );
}

export default function ProfilDegisiklikleriSayfasi() {
  // useSearchParams istemci tarafında çözülür; Next bu sınırda Suspense ister.
  return (
    <Suspense fallback={<Loading />}>
      <ProfilDegisiklikleri />
    </Suspense>
  );
}
