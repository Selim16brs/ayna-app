'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Card, Chip, Loading, PageHead, Toolbar } from '@/app/_components/ui';
import { Gate } from '@/app/_components/Gate';
import { useAsync } from '@/app/_lib/useAsync';
import { api, type SupportRow } from '@/app/lib/api';

/**
 * DESTEK TALEPLERİ.
 *
 * Durum filtresi `?durum=` sorgusuna taşındı: sayfa yenilenince "Açık"a geri
 * dönmüyor, kapalı talepler görünümü link olarak paylaşılabiliyor. URL boş
 * değer taşıyamadığı için "Tümü" filtresi `tumu` anahtarıyla yazılır;
 * parametre hiç yoksa kaynaktaki varsayılan (`open`) geçerli.
 *
 * Yanıt taslakları (textarea) URL'e TAŞINMAZ — yarım kalmış bir cümle adres
 * çubuğunda durmamalı, paylaşılan linkle başkasına gitmemeli.
 */
const VARSAYILAN = 'open';

function DestekTalepleri() {
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
  const { data, loading, error, reload } = useAsync<SupportRow[]>(
    () => api.supportList(status || undefined),
    [status],
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [taslak, setTaslak] = useState<Record<string, string>>({});
  const KONU: Record<string, string> = {
    payment: 'Ödeme',
    booking: 'Randevu',
    safety: 'Güvenlik',
    account: 'Hesap',
    other: 'Diğer',
  };
  const FILTERS: [string, string][] = [
    ['open', 'Açık'],
    ['answered', 'Yanıtlanan'],
    ['closed', 'Kapalı'],
    ['', 'Tümü'],
  ];
  const act = async (fn: () => Promise<unknown>, id: string) => {
    setBusy(id);
    try {
      await fn();
      reload();
    } finally {
      setBusy(null);
    }
  };
  return (
    <>
      <PageHead
        title="Destek talepleri"
        sub={`Kullanıcıdan gelen talepler. Güvenlik başlıklı olanlar önce okunmalı. (${data?.length ?? 0} kayıt)`}
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
        <Loading label="Talep yok." />
      ) : (
        <Card>
          {data.map((t) => (
            <div className="list-row" key={t.id}>
              <div className="grow">
                <div className="name">
                  {t.userName}{' '}
                  {/* §11 — ÖNCELİKLİ DESTEK. Sıralama sunucuda yapılıyor ama
                      görünür bir işaret olmazsa yönetici neden bu talebin
                      başta olduğunu anlamaz ve sırayı bozabilir. */}
                  {t.priority ? <span className="pill accent">Öncelikli</span> : null}{' '}
                  <span
                    className={`pill ${t.topic === 'safety' ? 'bg-err-soft text-err' : 'bg-info-soft text-info'}`}
                  >
                    {KONU[t.topic] ?? t.topic}
                  </span>
                </div>
                <div className="meta">{new Date(t.createdAt).toLocaleString('tr-TR')}</div>
                <p className="my-2 whitespace-pre-wrap leading-relaxed text-ink-2">{t.body}</p>
                {t.reply ? (
                  <p className="my-1 text-ax-sm text-ink-3">↳ {t.reply}</p>
                ) : (
                  <>
                    <textarea
                      rows={3}
                      className="mb-2 w-full resize-y rounded-sm border border-line bg-surface-2 px-3 py-2.5 text-ax-sm text-ink transition-colors duration-150 placeholder:text-ink-3 focus:border-accent focus:bg-surface focus:outline-none focus:[box-shadow:0_0_0_3px_var(--accent-soft)]"
                      placeholder="Yanıt yaz…"
                      value={taslak[t.id] ?? ''}
                      onChange={(e) => setTaslak((d) => ({ ...d, [t.id]: e.target.value }))}
                    />
                    <button
                      className="btn-sm btn-primary"
                      disabled={busy === t.id || !(taslak[t.id] ?? '').trim()}
                      onClick={() => act(() => api.supportReply(t.id, taslak[t.id] ?? ''), t.id)}
                    >
                      Yanıtla
                    </button>
                  </>
                )}
              </div>
              {t.status !== 'closed' ? (
                <button
                  className="btn-sm btn-ghost"
                  disabled={busy === t.id}
                  onClick={() => act(() => api.supportClose(t.id), t.id)}
                >
                  Kapat
                </button>
              ) : null}
            </div>
          ))}
        </Card>
      )}
    </>
  );
}

export default function DestekSayfasi() {
  // useSearchParams istemci tarafında çözülür; Next bu sınırda Suspense ister.
  return (
    <Suspense fallback={<Loading />}>
      <DestekTalepleri />
    </Suspense>
  );
}
