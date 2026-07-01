'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  api,
  type AdBanner,
  type AdminBooking,
  type AdminReview,
  type AuditEntry,
  type Business,
  type FeatureFlag,
  type Loyalty,
  type QuoteReq,
  type BusinessDetail,
  type Campaign,
  type Category,
  type Commissions,
  clearToken,
  getToken,
  type MarketPrice,
  type Overview,
  type Pro,
  type ProInput,
  type AdminUser,
  type Stats,
  setToken,
} from './lib/api';

type Tab =
  | 'overview'
  | 'stats'
  | 'commissions'
  | 'businesses'
  | 'professionals'
  | 'services'
  | 'prices'
  | 'bookings'
  | 'quotes'
  | 'campaigns'
  | 'ads'
  | 'moderation'
  | 'users'
  | 'loyalty'
  | 'flags'
  | 'audit';
const TL = (n: number) => '₸' + n.toLocaleString('tr-TR');

export default function AdminApp() {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    setAuthed(!!getToken());
    setReady(true);
  }, []);

  if (!ready) return null;
  if (!authed) return <Login onDone={() => setAuthed(true)} />;

  const logout = () => {
    clearToken();
    setAuthed(false);
  };

  const NAV: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Genel Bakış', icon: '📊' },
    { id: 'stats', label: 'İstatistik', icon: '📈' },
    { id: 'commissions', label: 'Komisyon', icon: '💰' },
    { id: 'businesses', label: 'Üyelikler', icon: '🏪' },
    { id: 'professionals', label: 'Uzmanlar', icon: '💇' },
    { id: 'services', label: 'Hizmetler', icon: '🗂️' },
    { id: 'prices', label: 'Fiyatlar', icon: '🏷️' },
    { id: 'bookings', label: 'Randevular', icon: '📅' },
    { id: 'quotes', label: 'Teklifler', icon: '📩' },
    { id: 'campaigns', label: 'Kampanya & Banner', icon: '🎯' },
    { id: 'ads', label: 'Reklamlar', icon: '📢' },
    { id: 'moderation', label: 'Moderasyon', icon: '🛡️' },
    { id: 'users', label: 'Kullanıcılar', icon: '👥' },
    { id: 'loyalty', label: 'Sadakat', icon: '🎁' },
    { id: 'flags', label: 'Feature Flag', icon: '🚩' },
    { id: 'audit', label: 'Denetim Kaydı', icon: '📜' },
  ];

  return (
    <div className="shell">
      <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="side-brand">AYNA</div>
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`nav-item ${tab === n.id ? 'active' : ''}`}
            onClick={() => setTab(n.id)}
          >
            <span>{n.icon}</span> {n.label}
          </button>
        ))}
        <button className="nav-item logout" onClick={logout}>
          <span>↩</span> Çıkış
        </button>
      </aside>
      <main className="main">
        {tab === 'overview' && <OverviewView />}
        {tab === 'stats' && <StatsView />}
        {tab === 'commissions' && <CommissionsView />}
        {tab === 'businesses' && <BusinessesView />}
        {tab === 'professionals' && <ProfessionalsView />}
        {tab === 'services' && <ServicesView />}
        {tab === 'prices' && <PricesView />}
        {tab === 'bookings' && <BookingsAdminView />}
        {tab === 'quotes' && <QuotesView />}
        {tab === 'campaigns' && <CampaignsView />}
        {tab === 'ads' && <AdsView />}
        {tab === 'moderation' && <ModerationView />}
        {tab === 'users' && <UsersView />}
        {tab === 'loyalty' && <LoyaltyView />}
        {tab === 'flags' && <FlagsView />}
        {tab === 'audit' && <AuditView />}
      </main>
    </div>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setErr('');
    try {
      const res = await api.login(id.trim(), pw);
      if (res.user.role !== 'admin') {
        setErr('Bu hesap admin değil.');
        return;
      }
      setToken(res.token);
      onDone();
    } catch {
      setErr('Giriş başarısız. Bilgileri kontrol et.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand">
          AYNA<small>YÖNETİM PANELİ</small>
        </div>
        <div className="field">
          <label>E-posta</label>
          <input
            className="input"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="admin@ayna.kz"
            autoFocus
          />
        </div>
        <div className="field">
          <label>Şifre</label>
          <input
            className="input"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        {err ? <div className="err">{err}</div> : null}
        <button className="btn" onClick={submit} disabled={busy || !id || !pw}>
          {busy ? '…' : 'Giriş yap'}
        </button>
      </div>
    </div>
  );
}

function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const run = useCallback(() => {
    setLoading(true);
    fn()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(run, [run]);
  return { data, loading, reload: run };
}

function OverviewView() {
  const { data } = useAsync<Overview>(() => api.overview(), []);
  return (
    <>
      <h1 className="page-title">Genel Bakış</h1>
      <p className="page-sub">Platform geneli canlı metrikler</p>
      {!data ? (
        <div className="empty">Yükleniyor…</div>
      ) : (
        <>
          <div className="stat-grid">
            <Stat v={String(data.users)} l="Kullanıcı" />
            <Stat v={String(data.professionals)} l="İşletme / Uzman" />
            <Stat v={String(data.bookings.upcoming)} l="Yaklaşan randevu" />
            <Stat v={TL(data.bookings.revenue)} l="Tamamlanan gelir" />
          </div>
          <div className="section-title">Randevu durumu</div>
          <div className="stat-grid">
            <Stat v={String(data.bookings.completed)} l="Tamamlanan" />
            <Stat v={String(data.bookings.cancelled)} l="İptal" />
            <Stat v={`%${data.bookings.noShowRate}`} l="Gelmeyen oranı" />
            <Stat v={String(data.activeCampaigns)} l="Aktif kampanya" />
          </div>
          <div className="section-title">Üyelik durumu</div>
          <div className="stat-grid">
            <Stat v={String(data.businesses.pending)} l="Onay bekleyen" />
            <Stat v={String(data.businesses.approved)} l="Onaylı" />
            <Stat v={String(data.businesses.rejected)} l="Reddedilen" />
            <Stat v={String(data.bookings.total)} l="Toplam randevu" />
          </div>
        </>
      )}
    </>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <div className="stat">
      <div className="v">{v}</div>
      <div className="l">{l}</div>
    </div>
  );
}

const SECTOR_TR: Record<string, string> = {
  hair: 'Saç',
  nails: 'Tırnak',
  skincare: 'Cilt bakımı',
  makeup: 'Makyaj',
  lashes: 'Kirpik',
  brows: 'Kaş',
  spa: 'Spa',
  epilation: 'Epilasyon',
};
const sectorLabel = (s: string) => SECTOR_TR[s] ?? s;

const METRICS = [
  { key: 'users' as const, label: 'Kayıt', color: '#cc6b86' },
  { key: 'bookings' as const, label: 'Randevu', color: '#6f9f86' },
  { key: 'revenue' as const, label: 'Gelir', color: '#c2a06a' },
];

function StatsView() {
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState<'users' | 'bookings' | 'revenue'>('bookings');
  const { data } = useAsync<Stats>(() => api.stats(days), [days]);
  const active = METRICS.find((m) => m.key === metric)!;

  return (
    <>
      <h1 className="page-title">İstatistik</h1>
      <p className="page-sub">
        Zaman serisi — kayıt, randevu ve gelir {data ? `· ${data.timezone}` : ''}
      </p>

      <div className="toolbar">
        {[7, 30, 90].map((d) => (
          <button key={d} className={`chip ${days === d ? 'on' : ''}`} onClick={() => setDays(d)}>
            Son {d} gün
          </button>
        ))}
      </div>

      {!data ? (
        <div className="empty">Yükleniyor…</div>
      ) : (
        <>
          <div className="stat-grid" style={{ marginBottom: 8 }}>
            <Stat v={String(data.totals.users)} l={`Yeni kayıt (${days}g)`} />
            <Stat v={String(data.totals.bookings)} l={`Randevu (${days}g)`} />
            <Stat v={TL(data.totals.revenue)} l={`Gelir (${days}g)`} />
          </div>

          <div className="section-title">Günlük seyir</div>
          <div className="toolbar">
            {METRICS.map((m) => (
              <button
                key={m.key}
                className={`chip ${metric === m.key ? 'on' : ''}`}
                onClick={() => setMetric(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="card" style={{ padding: 20 }}>
            <BarChart
              points={data.series.map((s) => ({ label: s.date, value: s[metric] }))}
              color={active.color}
              format={metric === 'revenue' ? TL : (n) => String(n)}
            />
          </div>

          <div className="section-title">Kategori dağılımı (uzman havuzu)</div>
          <div className="card" style={{ padding: 20 }}>
            <CategoryBars items={data.categories} />
          </div>
        </>
      )}
    </>
  );
}

function BarChart({
  points,
  color,
  format,
}: {
  points: { label: string; value: number }[];
  color: string;
  format: (n: number) => string;
}) {
  const W = 900;
  const H = 220;
  const pad = { l: 8, r: 8, t: 16, b: 26 };
  const max = Math.max(1, ...points.map((p) => p.value));
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const n = points.length;
  const gap = n > 40 ? 1 : 3;
  const bw = innerW / n - gap;
  // eksende ~8 etiket göster (kalabalığı önle)
  const labelEvery = Math.ceil(n / 8);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Günlük grafik">
      {[0, 0.5, 1].map((g) => {
        const y = pad.t + innerH * (1 - g);
        return (
          <g key={g}>
            <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="#ebe6e3" strokeWidth={1} />
            <text x={W - pad.r} y={y - 3} fontSize={10} fill="#8b8479" textAnchor="end">
              {format(Math.round(max * g))}
            </text>
          </g>
        );
      })}
      {points.map((p, i) => {
        const h = (p.value / max) * innerH;
        const x = pad.l + i * (innerW / n) + gap / 2;
        const y = pad.t + innerH - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={Math.max(bw, 1)} height={h} rx={2} fill={color}>
              <title>
                {p.label}: {format(p.value)}
              </title>
            </rect>
            {i % labelEvery === 0 ? (
              <text
                x={x + bw / 2}
                y={H - 8}
                fontSize={10}
                fill="#8b8479"
                textAnchor="middle"
              >
                {p.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function CategoryBars({ items }: { items: { sector: string; count: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (items.length === 0) return <div className="empty">Veri yok</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((i) => (
        <div key={i.sector} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 96, fontSize: 13, fontWeight: 600 }}>{sectorLabel(i.sector)}</div>
          <div style={{ flex: 1, background: '#f2eff1', borderRadius: 999, height: 14 }}>
            <div
              style={{
                width: `${(i.count / max) * 100}%`,
                background: '#cc6b86',
                borderRadius: 999,
                height: 14,
                minWidth: 6,
              }}
            />
          </div>
          <div style={{ width: 28, textAlign: 'right', fontSize: 13, fontWeight: 700 }}>
            {i.count}
          </div>
        </div>
      ))}
    </div>
  );
}

function CommissionsView() {
  const { data, loading, reload } = useAsync<Commissions>(() => api.commissions(), []);
  const [rateInput, setRateInput] = useState('');
  const [busy, setBusy] = useState(false);

  const saveRate = async () => {
    const v = parseInt(rateInput, 10);
    if (!Number.isFinite(v) || v < 0 || v > 100) return;
    setBusy(true);
    try {
      await api.setCommissionRate(v);
      setRateInput('');
      reload();
    } finally {
      setBusy(false);
    }
  };

  const stateLabel = (s: string) =>
    s === 'earned' ? 'Kazanıldı' : s === 'pending' ? 'Bekliyor' : 'İptal/Gelmedi';
  const statePill = (s: string) =>
    s === 'earned' ? 'approved' : s === 'pending' ? 'pending' : 'rejected';

  return (
    <>
      <h1 className="page-title">Komisyon</h1>
      <p className="page-sub">
        App üzerinden alınan online randevulardan platform komisyonu (offline salon kayıtları hariç)
      </p>

      {loading || !data ? (
        <div className="empty">Yükleniyor…</div>
      ) : (
        <>
          <div className="stat-grid">
            <Stat v={TL(data.totals.earned)} l="Kazanılan komisyon" />
            <Stat v={TL(data.totals.collected)} l="Tahsil edilen" />
            <Stat v={TL(data.totals.outstanding)} l="Açık alacak" />
            <Stat v={`%${data.rate}`} l={`Oran · ${data.totals.count} online randevu`} />
          </div>

          <div className="section-title">Komisyon oranı</div>
          <div className="card">
            <div className="list-row">
              <div className="grow">
                <div className="name">Güncel oran: %{data.rate}</div>
                <div className="meta">
                  Her online randevu tutarının %{data.rate}'i platforma kalır (GMV:{' '}
                  {TL(data.totals.gmv)})
                </div>
              </div>
              <input
                className="input"
                style={{ width: 90, height: 34 }}
                type="number"
                min={0}
                max={100}
                placeholder={String(data.rate)}
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
              />
              <button className="btn-sm btn-ok" onClick={saveRate} disabled={busy || !rateInput}>
                Kaydet
              </button>
            </div>
          </div>

          <div className="section-title">Salon bazında — alacak & tahsilat</div>
          <div className="card">
            {data.salons.length === 0 ? (
              <div className="empty">Online randevu yok</div>
            ) : (
              data.salons.map((s) => (
                <div key={s.proId || s.proName} className="list-row">
                  <div className="grow">
                    <div className="name">{s.proName}</div>
                    <div className="meta">
                      Kazanılan {TL(s.earned)} · Tahsil {TL(s.collected)}
                      {s.pending > 0 ? ` · +${TL(s.pending)} bekleyen randevu` : ''}
                    </div>
                  </div>
                  {s.outstanding > 0 ? (
                    <span className="pill rejected">{TL(s.outstanding)} alacak</span>
                  ) : s.earned > 0 ? (
                    <span className="pill approved">Tahsil edildi</span>
                  ) : (
                    <span className="pill" style={{ background: 'var(--line)', color: 'var(--muted)' }}>
                      Alacak yok
                    </span>
                  )}
                  {s.outstanding > 0 ? (
                    <button
                      className="btn-sm btn-ok"
                      onClick={async () => {
                        const raw = prompt(
                          `${s.proName} — tahsil edilecek tutar (KZT):`,
                          String(s.outstanding),
                        );
                        if (raw == null) return;
                        const amount = Number(raw);
                        if (!Number.isFinite(amount) || amount <= 0) return;
                        await api.addPayout({
                          proId: s.proId || s.proName,
                          proName: s.proName,
                          amount,
                        });
                        reload();
                      }}
                    >
                      Tahsil et
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>

          {data.payouts.length > 0 ? (
            <>
              <div className="section-title">Tahsilat geçmişi</div>
              <div className="card">
                {data.payouts.map((p) => (
                  <div key={p.id} className="list-row">
                    <div className="grow">
                      <div className="name">{p.proName}</div>
                      <div className="meta">
                        {new Date(p.createdAt).toLocaleDateString('tr-TR')}
                        {p.note ? ` · ${p.note}` : ''}
                      </div>
                    </div>
                    <div className="kv-v" style={{ color: 'var(--success)' }}>
                      {TL(p.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <div className="section-title">Randevu kayıtları ({data.items.length})</div>
          <div className="card">
            {data.items.length === 0 ? (
              <div className="empty">Kayıt yok</div>
            ) : (
              data.items.map((it) => (
                <div key={it.id} className="list-row">
                  <div className="grow">
                    <div className="name">
                      {it.proName} · {it.service}
                    </div>
                    <div className="meta">
                      {it.dateLabel} · Tutar {TL(it.price)}
                    </div>
                  </div>
                  <div className="kv-v">{TL(it.commission)}</div>
                  <span className={`pill ${statePill(it.state)}`}>{stateLabel(it.state)}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </>
  );
}

function BusinessesView() {
  const [status, setStatus] = useState<string>('pending');
  const [detail, setDetail] = useState<BusinessDetail | null>(null);
  const { data, reload } = useAsync<Business[]>(() => api.businesses(status), [status]);
  const act = async (id: string, kind: 'approve' | 'reject') => {
    if (kind === 'approve') await api.approveBusiness(id);
    else await api.rejectBusiness(id, prompt('Red sebebi:') ?? '');
    setDetail(null);
    reload();
  };
  const openDetail = async (id: string) => setDetail(await api.businessDetail(id));
  return (
    <>
      <h1 className="page-title">Üyelikler</h1>
      <p className="page-sub">İşletme kayıt onayları ve durum yönetimi</p>
      <div className="toolbar">
        {['pending', 'approved', 'rejected'].map((s) => (
          <button key={s} className={`chip ${status === s ? 'on' : ''}`} onClick={() => setStatus(s)}>
            {s === 'pending' ? 'Onay bekleyen' : s === 'approved' ? 'Onaylı' : 'Reddedilen'}
          </button>
        ))}
      </div>
      <div className="card">
        {!data || data.length === 0 ? (
          <div className="empty">Kayıt yok</div>
        ) : (
          data.map((b) => (
            <div key={b.id} className="list-row">
              <div className="grow" style={{ cursor: 'pointer' }} onClick={() => openDetail(b.id)}>
                <div className="name">{b.name}</div>
                <div className="meta">
                  {b.ownerName} · {b.sector} · {b.city}
                  {b.district ? ` / ${b.district}` : ''} · {b.phone}
                </div>
              </div>
              <button className="btn-sm btn-ghost" onClick={() => openDetail(b.id)}>
                Detay
              </button>
              {b.status !== 'approved' ? (
                <button className="btn-sm btn-ok" onClick={() => act(b.id, 'approve')}>
                  Onayla
                </button>
              ) : null}
              {b.status !== 'rejected' ? (
                <button className="btn-sm btn-danger" onClick={() => act(b.id, 'reject')}>
                  Reddet
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>

      {detail ? (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="page-title" style={{ fontSize: 20 }}>
                  {detail.name}
                </div>
                <span className={`pill ${detail.status}`}>
                  {detail.status === 'pending'
                    ? 'Onay bekliyor'
                    : detail.status === 'approved'
                      ? 'Onaylı'
                      : 'Reddedildi'}
                </span>
              </div>
              <button className="btn-sm btn-ghost" onClick={() => setDetail(null)}>
                Kapat
              </button>
            </div>
            <div className="kv-grid">
              <KV k="Sahip" v={detail.ownerName} />
              <KV k="Sektör" v={detail.sector} />
              <KV k="Telefon" v={detail.phone} />
              <KV k="E-posta" v={detail.email || '—'} />
              <KV k="Vergi/kayıt no" v={detail.taxId || '—'} />
              <KV k="Çalışma saatleri" v={detail.workingHours || '—'} />
              <KV k="Adres" v={`${detail.city} / ${detail.district} ${detail.address}`.trim()} />
              <KV k="Kategoriler" v={detail.categories.join(', ') || '—'} />
              <KV k="Ekip (uzman)" v={String(detail.specialistCount)} />
              <KV k="Davet kodu" v={String(detail.inviteCodes.length)} />
              <KV k="Belge" v={detail.docUrl ? 'Yüklendi' : 'Yok'} />
            </div>
            {detail.about ? <p className="about">{detail.about}</p> : null}
            {detail.rejectReason ? (
              <p className="err">Red sebebi: {detail.rejectReason}</p>
            ) : null}
            <div className="modal-actions">
              {detail.status !== 'approved' ? (
                <button className="btn-sm btn-ok" onClick={() => act(detail.id, 'approve')}>
                  Onayla
                </button>
              ) : null}
              {detail.status !== 'rejected' ? (
                <button className="btn-sm btn-danger" onClick={() => act(detail.id, 'reject')}>
                  Reddet
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="kv">
      <div className="kv-k">{k}</div>
      <div className="kv-v">{v}</div>
    </div>
  );
}

function ModerationView() {
  const { data, reload } = useAsync<AdminReview[]>(() => api.reviews(), []);
  const hide = async (id: string) => {
    if (confirm('Bu yorumu gizle? (moderasyon)')) {
      await api.hideReview(id);
      reload();
    }
  };
  return (
    <>
      <h1 className="page-title">Moderasyon</h1>
      <p className="page-sub">Görünür yorumlar — uygunsuz içeriği gizle</p>
      <div className="card">
        {!data || data.length === 0 ? (
          <div className="empty">Görünür yorum yok</div>
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
      </div>
    </>
  );
}

function CampaignsView() {
  const { data, reload } = useAsync<Campaign[]>(() => api.campaigns(), []);
  const [form, setForm] = useState({ title: '', subtitle: '', badge: '', image: '', category: '' });
  const create = async () => {
    if (form.title.length < 2 || !form.image) return;
    await api.createCampaign({
      title: form.title,
      subtitle: form.subtitle || undefined,
      badge: form.badge || undefined,
      image: form.image,
      category: form.category || undefined,
    });
    setForm({ title: '', subtitle: '', badge: '', image: '', category: '' });
    reload();
  };
  return (
    <>
      <h1 className="page-title">Kampanya & Banner</h1>
      <p className="page-sub">Keşif vitrinindeki kampanyaları yönet</p>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-inline">
          <input className="input" placeholder="Başlık" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="input" placeholder="Alt başlık" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          <input className="input" placeholder="Rozet (örn. %25)" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} />
          <input className="input" placeholder="Kategori kodu (örn. hair)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input className="input full" placeholder="Görsel URL (https://...)" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
          <button className="btn-sm btn-ok full" onClick={create}>+ Kampanya ekle</button>
        </div>
      </div>

      <div className="card">
        {!data || data.length === 0 ? (
          <div className="empty">Kampanya yok</div>
        ) : (
          data.map((c) => (
            <div key={c.id} className="list-row">
              {c.image ? <img className="thumb" src={c.image} alt="" /> : <div className="thumb" />}
              <div className="grow">
                <div className="name">
                  {c.badge ? `${c.badge} · ` : ''}
                  {c.title}
                </div>
                <div className="meta">
                  {c.subtitle}
                  {c.category ? ` · ${c.category}` : ''}
                </div>
              </div>
              <button
                className={`switch ${c.active ? 'on' : 'off'}`}
                onClick={async () => {
                  await api.setCampaignActive(c.id, !c.active);
                  reload();
                }}
              >
                {c.active ? 'Aktif' : 'Pasif'}
              </button>
              <button
                className="btn-sm btn-danger"
                onClick={async () => {
                  if (confirm('Kampanya silinsin mi?')) {
                    await api.deleteCampaign(c.id);
                    reload();
                  }
                }}
              >
                Sil
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function AdsView() {
  const { data: ads, reload } = useAsync<AdBanner[]>(() => api.ads(), []);
  const { data: pros } = useAsync<Pro[]>(() => api.professionals(), []);
  const [form, setForm] = useState({ proId: '', title: '', subtitle: '', image: '' });
  const proName = (id: string) => pros?.find((p) => p.id === id)?.name ?? id;

  const create = async () => {
    if (!form.proId || form.title.length < 2 || !form.image) return;
    await api.createAd({
      proId: form.proId,
      title: form.title,
      subtitle: form.subtitle || undefined,
      image: form.image,
    });
    setForm({ proId: '', title: '', subtitle: '', image: '' });
    reload();
  };

  return (
    <>
      <h1 className="page-title">Reklamlar</h1>
      <p className="page-sub">Keşif ekranındaki sponsorlu reklam şeridi</p>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-inline">
          <select
            className="input"
            value={form.proId}
            onChange={(e) => {
              const p = pros?.find((x) => x.id === e.target.value);
              setForm({ ...form, proId: e.target.value, title: form.title || (p?.name ?? '') });
            }}
          >
            <option value="">İşletme seç…</option>
            {(pros ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.sector}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Başlık"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            className="input"
            placeholder="Alt başlık (örn. Balayage'de %30)"
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          />
          <input
            className="input"
            placeholder="Görsel URL (https://...)"
            value={form.image}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
          />
          <button className="btn-sm btn-ok full" onClick={create}>
            + Reklam ekle
          </button>
        </div>
      </div>

      <div className="card">
        {!ads || ads.length === 0 ? (
          <div className="empty">Reklam yok</div>
        ) : (
          ads.map((a) => (
            <div key={a.id} className="list-row">
              {a.image ? <img className="thumb" src={a.image} alt="" /> : <div className="thumb" />}
              <div className="grow">
                <div className="name">{a.title}</div>
                <div className="meta">
                  {a.subtitle}
                  {' · '}
                  {proName(a.proId)}
                </div>
              </div>
              <button
                className={`switch ${a.active ? 'on' : 'off'}`}
                onClick={async () => {
                  await api.setAdActive(a.id, !a.active);
                  reload();
                }}
              >
                {a.active ? 'Aktif' : 'Pasif'}
              </button>
              <button
                className="btn-sm btn-danger"
                onClick={async () => {
                  if (confirm('Reklam silinsin mi?')) {
                    await api.deleteAd(a.id);
                    reload();
                  }
                }}
              >
                Sil
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}

const EMPTY_PRO: ProInput = {
  name: '',
  sector: 'hair',
  specialty: '',
  kind: 'salon',
  district: '',
  about: '',
  experienceYears: 0,
  priceFrom: 0,
  imageUrl: '',
};

function ProfessionalsView() {
  const { data, reload } = useAsync<Pro[]>(() => api.professionals(), []);
  const { data: cats } = useAsync<Category[]>(() => api.categories(), []);
  const [edit, setEdit] = useState<{ id?: string; form: ProInput } | null>(null);
  const [q, setQ] = useState('');

  const list = (data ?? []).filter(
    (p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.sector.includes(q.toLowerCase()),
  );
  const save = async () => {
    if (!edit) return;
    if (!edit.form.name || edit.form.name.length < 2 || !edit.form.sector) return;
    // Boş opsiyonel alanları gönderme (imageUrl .url() doğrulaması boş string'i reddeder)
    const payload: ProInput = { ...edit.form };
    if (!payload.imageUrl) delete payload.imageUrl;
    if (!payload.specialty) delete payload.specialty;
    if (!payload.district) delete payload.district;
    if (!payload.about) delete payload.about;
    if (edit.id) await api.updateProfessional(edit.id, payload);
    else await api.createProfessional(payload);
    setEdit(null);
    reload();
  };
  const del = async (id: string) => {
    if (confirm('Uzman silinsin mi? (ilişkili teklifler de silinir)')) {
      await api.deleteProfessional(id);
      reload();
    }
  };

  return (
    <>
      <h1 className="page-title">Uzmanlar</h1>
      <p className="page-sub">Keşif listesindeki uzman/salonlar — ekle, düzenle, fiyat, öne çıkar, sil</p>
      <div className="toolbar">
        <button className="btn-sm btn-ok" onClick={() => setEdit({ form: { ...EMPTY_PRO } })}>
          + Yeni uzman
        </button>
        <input
          className="input"
          style={{ height: 34, maxWidth: 240 }}
          placeholder="Ara (isim / sektör)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="page-sub" style={{ margin: 0 }}>
          {list.length} kayıt
        </span>
      </div>
      <div className="card">
        {!data ? (
          <div className="empty">Yükleniyor…</div>
        ) : list.length === 0 ? (
          <div className="empty">Uzman yok</div>
        ) : (
          list.map((p) => (
            <div key={p.id} className="list-row">
              {p.imageUrl ? <img className="thumb" src={p.imageUrl} alt="" /> : <div className="thumb" />}
              <div className="grow">
                <div className="name">
                  {p.name}
                  {p.featured ? ' · ⭐' : ''}
                </div>
                <div className="meta">
                  {p.sector} · {p.district || '—'} · {p.priceFrom > 0 ? TL(p.priceFrom) + '+' : 'fiyat yok'}{' '}
                  · ★ {p.rating.toFixed(1)} ({p.reviewCount})
                </div>
              </div>
              <button
                className={`switch ${p.featured ? 'on' : 'off'}`}
                onClick={async () => {
                  await api.setFeatured(p.id, !p.featured);
                  reload();
                }}
              >
                {p.featured ? 'Öne çıkan' : 'Normal'}
              </button>
              <button
                className="btn-sm btn-ghost"
                onClick={() =>
                  setEdit({
                    id: p.id,
                    form: {
                      name: p.name,
                      sector: p.sector,
                      specialty: p.specialty,
                      kind: p.kind,
                      district: p.district,
                      about: p.about,
                      experienceYears: p.experienceYears,
                      priceFrom: p.priceFrom,
                      imageUrl: p.imageUrl,
                    },
                  })
                }
              >
                Düzenle
              </button>
              <button className="btn-sm btn-danger" onClick={() => del(p.id)}>
                Sil
              </button>
            </div>
          ))
        )}
      </div>

      {edit ? (
        <div className="modal-backdrop" onClick={() => setEdit(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="page-title" style={{ fontSize: 20 }}>
                {edit.id ? 'Uzmanı düzenle' : 'Yeni uzman'}
              </div>
              <button className="btn-sm btn-ghost" onClick={() => setEdit(null)}>
                Kapat
              </button>
            </div>
            <div className="form-inline">
              <F label="Ad *">
                <input
                  className="input"
                  value={edit.form.name}
                  onChange={(e) => setEdit({ ...edit, form: { ...edit.form, name: e.target.value } })}
                />
              </F>
              <F label="Sektör *">
                <select
                  className="input"
                  value={edit.form.sector}
                  onChange={(e) => setEdit({ ...edit, form: { ...edit.form, sector: e.target.value } })}
                >
                  {(cats ?? []).map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.nameTr} ({c.code})
                    </option>
                  ))}
                </select>
              </F>
              <F label="Uzmanlık">
                <input
                  className="input"
                  value={edit.form.specialty ?? ''}
                  onChange={(e) => setEdit({ ...edit, form: { ...edit.form, specialty: e.target.value } })}
                />
              </F>
              <F label="Tür">
                <select
                  className="input"
                  value={edit.form.kind ?? 'salon'}
                  onChange={(e) => setEdit({ ...edit, form: { ...edit.form, kind: e.target.value } })}
                >
                  <option value="salon">Salon</option>
                  <option value="independent">Bağımsız uzman</option>
                </select>
              </F>
              <F label="İlçe/Bölge">
                <input
                  className="input"
                  value={edit.form.district ?? ''}
                  onChange={(e) => setEdit({ ...edit, form: { ...edit.form, district: e.target.value } })}
                />
              </F>
              <F label="Başlangıç fiyatı (KZT)">
                <input
                  className="input"
                  type="number"
                  value={edit.form.priceFrom ?? 0}
                  onChange={(e) =>
                    setEdit({ ...edit, form: { ...edit.form, priceFrom: Number(e.target.value) } })
                  }
                />
              </F>
              <F label="Deneyim (yıl)">
                <input
                  className="input"
                  type="number"
                  value={edit.form.experienceYears ?? 0}
                  onChange={(e) =>
                    setEdit({ ...edit, form: { ...edit.form, experienceYears: Number(e.target.value) } })
                  }
                />
              </F>
              <F label="Görsel URL">
                <input
                  className="input"
                  value={edit.form.imageUrl ?? ''}
                  onChange={(e) => setEdit({ ...edit, form: { ...edit.form, imageUrl: e.target.value } })}
                />
              </F>
              <F label="Hakkında" full>
                <input
                  className="input"
                  value={edit.form.about ?? ''}
                  onChange={(e) => setEdit({ ...edit, form: { ...edit.form, about: e.target.value } })}
                />
              </F>
              <button className="btn-sm btn-ok full" onClick={save}>
                {edit.id ? 'Kaydet' : 'Uzman ekle'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function F({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'full' : ''}>
      <div className="kv-k" style={{ marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function ServicesView() {
  const { data, reload } = useAsync<Category[]>(() => api.categories(), []);
  const [form, setForm] = useState({ code: '', nameTr: '', icon: '✨', tone: 'rose', sortOrder: '' });
  const create = async () => {
    if (!form.code || !form.nameTr) return;
    await api.createCategory({
      code: form.code,
      nameTr: form.nameTr,
      icon: form.icon,
      tone: form.tone,
      sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
    });
    setForm({ code: '', nameTr: '', icon: '✨', tone: 'rose', sortOrder: '' });
    reload();
  };
  return (
    <>
      <h1 className="page-title">Hizmetler</h1>
      <p className="page-sub">Keşif kategorileri (saç, tırnak, makyaj…) — ekle, düzenle, sırala, sil</p>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-inline">
          <input className="input" placeholder="Kod (örn. hair)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <input className="input" placeholder="Ad (TR)" value={form.nameTr} onChange={(e) => setForm({ ...form, nameTr: e.target.value })} />
          <input className="input" placeholder="İkon (emoji)" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
          <input className="input" placeholder="Sıra" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          <button className="btn-sm btn-ok full" onClick={create}>+ Hizmet ekle</button>
        </div>
      </div>

      <div className="card">
        {!data ? (
          <div className="empty">Yükleniyor…</div>
        ) : data.length === 0 ? (
          <div className="empty">Hizmet yok</div>
        ) : (
          data.map((c) => <CategoryRow key={c.id} cat={c} onChanged={reload} />)
        )}
      </div>
    </>
  );
}

function CategoryRow({ cat, onChanged }: { cat: Category; onChanged: () => void }) {
  const [name, setName] = useState(cat.nameTr);
  const [icon, setIcon] = useState(cat.icon);
  const [order, setOrder] = useState(String(cat.sortOrder));
  const dirty = name !== cat.nameTr || icon !== cat.icon || order !== String(cat.sortOrder);
  return (
    <div className="list-row">
      <input
        className="input"
        style={{ height: 34, maxWidth: 150 }}
        value={icon}
        placeholder="ikon"
        onChange={(e) => setIcon(e.target.value)}
      />
      <input className="input" style={{ height: 34, flex: 1 }} value={name} onChange={(e) => setName(e.target.value)} />
      <span className="pill" style={{ background: 'var(--line)', color: 'var(--muted)' }}>{cat.code}</span>
      <input className="input" style={{ height: 34, maxWidth: 70 }} type="number" value={order} onChange={(e) => setOrder(e.target.value)} />
      {dirty ? (
        <button
          className="btn-sm btn-ok"
          onClick={async () => {
            await api.updateCategory(cat.id, { nameTr: name, icon, sortOrder: Number(order) });
            onChanged();
          }}
        >
          Kaydet
        </button>
      ) : null}
      <button
        className="btn-sm btn-danger"
        onClick={async () => {
          if (confirm(`"${cat.nameTr}" hizmeti silinsin mi?`)) {
            await api.deleteCategory(cat.id);
            onChanged();
          }
        }}
      >
        Sil
      </button>
    </div>
  );
}

function PricesView() {
  const { data, reload } = useAsync<MarketPrice[]>(() => api.marketPrices(), []);
  const { data: cats } = useAsync<Category[]>(() => api.categories(), []);
  const [form, setForm] = useState({ category: '', city: '', basePrice: '' });
  const save = async () => {
    if (!form.category || !form.basePrice) return;
    await api.setMarketPrice({
      category: form.category,
      city: form.city || undefined,
      basePrice: Number(form.basePrice),
    });
    setForm({ category: '', city: '', basePrice: '' });
    reload();
  };
  const catName = (code: string) => cats?.find((c) => c.code === code)?.nameTr ?? code;
  return (
    <>
      <h1 className="page-title">Fiyatlar</h1>
      <p className="page-sub">
        Piyasa taban fiyatları (kategori × şehir) — teklif tabanı ve %40-altı uyarısı için. Uzman
        başlangıç fiyatları "Uzmanlar" bölümünden düzenlenir.
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-inline">
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="">Kategori seç…</option>
            {(cats ?? []).map((c) => (
              <option key={c.id} value={c.code}>
                {c.nameTr}
              </option>
            ))}
          </select>
          <input className="input" placeholder="Şehir (boş = genel)" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <input className="input" placeholder="Taban fiyat (KZT)" type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
          <button className="btn-sm btn-ok full" onClick={save}>Kaydet / güncelle</button>
        </div>
      </div>

      <div className="card">
        {!data ? (
          <div className="empty">Yükleniyor…</div>
        ) : data.length === 0 ? (
          <div className="empty">Fiyat kaydı yok</div>
        ) : (
          data.map((m) => (
            <div key={m.id} className="list-row">
              <div className="grow">
                <div className="name">{catName(m.category)}</div>
                <div className="meta">
                  {m.category} · {m.city || 'Genel'}
                </div>
              </div>
              <div className="kv-v">{TL(m.basePrice)}</div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

const ROLE_TR: Record<string, string> = {
  user: 'Kullanıcı',
  professional: 'Uzman',
  salon: 'Salon',
  moderator: 'Moderatör',
  admin: 'Admin',
};

function UsersView() {
  const { data, reload } = useAsync<AdminUser[]>(() => api.users(), []);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const list = (data ?? []).filter(
    (u) =>
      (role === 'all' || u.role === role) &&
      (!q ||
        u.name.toLowerCase().includes(q.toLowerCase()) ||
        (u.email ?? '').toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <>
      <h1 className="page-title">Kullanıcılar</h1>
      <p className="page-sub">Rol, durum ve premium yönetimi ({data?.length ?? 0} kayıt)</p>
      <div className="toolbar">
        {['all', 'user', 'salon', 'professional', 'moderator', 'admin'].map((r) => (
          <button key={r} className={`chip ${role === r ? 'on' : ''}`} onClick={() => setRole(r)}>
            {r === 'all' ? 'Hepsi' : ROLE_TR[r]}
          </button>
        ))}
        <input
          className="input"
          style={{ height: 34, maxWidth: 220 }}
          placeholder="Ara (isim / e-posta)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="card">
        {list.length === 0 ? (
          <div className="empty">Kullanıcı yok</div>
        ) : (
          list.map((u) => (
            <div key={u.id} className="list-row">
              <div className="grow">
                <div className="name">
                  {u.name || '—'}
                  {u.isPremium ? ' · ⭐' : ''}
                  {u.status !== 'active' ? ' · ⛔' : ''}
                </div>
                <div className="meta">
                  {u.email ?? '—'} · {u.city ?? '—'}
                  {u.phoneVerified ? ' · ✓ telefon' : ''}
                  {u.gender === 'female' ? ' · Kadın' : ''}
                </div>
              </div>
              <select
                className="input"
                style={{ height: 32, maxWidth: 130 }}
                value={u.role}
                onChange={async (e) => {
                  await api.setUserRole(u.id, e.target.value);
                  reload();
                }}
              >
                {['user', 'salon', 'professional', 'moderator', 'admin'].map((r) => (
                  <option key={r} value={r}>
                    {ROLE_TR[r]}
                  </option>
                ))}
              </select>
              <button
                className={`switch ${u.isPremium ? 'on' : 'off'}`}
                onClick={async () => {
                  await api.setUserPremium(u.id, !u.isPremium);
                  reload();
                }}
              >
                {u.isPremium ? 'Premium' : 'Normal'}
              </button>
              {u.status === 'active' ? (
                <button
                  className="btn-sm btn-danger"
                  onClick={async () => {
                    if (u.role === 'admin') return alert('Admin askıya alınamaz.');
                    if (confirm(`${u.name || 'Kullanıcı'} askıya alınsın mı?`)) {
                      await api.setUserStatus(u.id, 'suspended');
                      reload();
                    }
                  }}
                >
                  Askıya al
                </button>
              ) : (
                <button
                  className="btn-sm btn-ok"
                  onClick={async () => {
                    await api.setUserStatus(u.id, 'active');
                    reload();
                  }}
                >
                  Aktifleştir
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}

const BOOKING_STATUS_TR: Record<string, string> = {
  confirmed: 'Onaylı',
  pending: 'Bekliyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
  no_show: 'Gelmedi',
  awaiting_provider: 'Salon onayı bekliyor',
  alternative_proposed: 'Alternatif önerildi',
  waitlist: 'Bekleme listesi',
};

function BookingsAdminView() {
  const [status, setStatus] = useState('all');
  const { data } = useAsync<AdminBooking[]>(() => api.bookings(status), [status]);
  const STATES = ['all', 'confirmed', 'completed', 'cancelled', 'no_show', 'waitlist'];
  const pill = (s: string) =>
    s === 'completed' || s === 'confirmed' ? 'approved' : s === 'cancelled' || s === 'no_show' ? 'rejected' : 'pending';
  return (
    <>
      <h1 className="page-title">Randevular</h1>
      <p className="page-sub">Platform geneli tüm randevular ({data?.length ?? 0})</p>
      <div className="toolbar">
        {STATES.map((s) => (
          <button key={s} className={`chip ${status === s ? 'on' : ''}`} onClick={() => setStatus(s)}>
            {s === 'all' ? 'Hepsi' : BOOKING_STATUS_TR[s]}
          </button>
        ))}
      </div>
      <div className="card">
        {!data ? (
          <div className="empty">Yükleniyor…</div>
        ) : data.length === 0 ? (
          <div className="empty">Randevu yok</div>
        ) : (
          data.map((b) => (
            <div key={b.id} className="list-row">
              <div className="grow">
                <div className="name">
                  {b.proName} · {b.service}
                </div>
                <div className="meta">
                  {b.dateLabel}
                  {b.customerName ? ` · ${b.customerName}` : ''} ·{' '}
                  {b.online ? 'Online (app)' : 'Offline (salon)'}
                </div>
              </div>
              <div className="kv-v">{b.price > 0 ? TL(b.price) : '—'}</div>
              <span className={`pill ${pill(b.status)}`}>{BOOKING_STATUS_TR[b.status] ?? b.status}</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function QuotesView() {
  const { data } = useAsync<QuoteReq[]>(() => api.quoteRequests(), []);
  return (
    <>
      <h1 className="page-title">Teklifler</h1>
      <p className="page-sub">Foto teklif / talep istekleri ve gelen teklifler ({data?.length ?? 0})</p>
      <div className="card">
        {!data ? (
          <div className="empty">Yükleniyor…</div>
        ) : data.length === 0 ? (
          <div className="empty">Teklif talebi yok</div>
        ) : (
          data.map((q) => (
            <div key={q.id} className="list-row">
              <div className="grow">
                <div className="name">
                  {q.category}
                  {q.hasPhoto ? ' · 📷' : ''}
                </div>
                <div className="meta">{q.note || 'Not yok'}</div>
              </div>
              <span className="pill" style={{ background: 'var(--line)', color: 'var(--muted)' }}>
                {q.quoteCount} teklif
              </span>
              {q.bestPrice != null ? <div className="kv-v">min {TL(q.bestPrice)}</div> : null}
              <span className={`pill ${q.status === 'open' ? 'pending' : 'approved'}`}>
                {q.status === 'open' ? 'Açık' : 'Kapalı'}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function LoyaltyView() {
  const { data } = useAsync<Loyalty>(() => api.loyalty(), []);
  return (
    <>
      <h1 className="page-title">Sadakat</h1>
      <p className="page-sub">Puan defteri (append-only) — bakiye dolaşımdaki puan = platform yükümlülüğü</p>
      {!data ? (
        <div className="empty">Yükleniyor…</div>
      ) : (
        <>
          <div className="stat-grid">
            <Stat v={data.totals.earned.toLocaleString('tr-TR')} l="Kazanılan puan" />
            <Stat v={data.totals.spent.toLocaleString('tr-TR')} l="Harcanan puan" />
            <Stat v={data.totals.balance.toLocaleString('tr-TR')} l="Dolaşımdaki (yükümlülük)" />
          </div>
          <div className="section-title">Son hareketler</div>
          <div className="card">
            {data.entries.length === 0 ? (
              <div className="empty">Hareket yok</div>
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
          </div>
        </>
      )}
    </>
  );
}

function FlagsView() {
  const { data, reload } = useAsync<FeatureFlag[]>(() => api.featureFlags(), []);
  const [form, setForm] = useState({ key: '', description: '' });
  const create = async () => {
    if (!form.key) return;
    await api.setFeatureFlag(form.key, false, form.description || undefined);
    setForm({ key: '', description: '' });
    reload();
  };
  return (
    <>
      <h1 className="page-title">Feature Flag</h1>
      <p className="page-sub">Özellik açma/kapama (kademeli yayın)</p>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-inline">
          <input className="input" placeholder="Anahtar (örn. new_booking_flow)" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
          <input className="input" placeholder="Açıklama" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button className="btn-sm btn-ok full" onClick={create}>+ Flag ekle (kapalı)</button>
        </div>
      </div>
      <div className="card">
        {!data ? (
          <div className="empty">Yükleniyor…</div>
        ) : data.length === 0 ? (
          <div className="empty">Flag yok</div>
        ) : (
          data.map((f) => (
            <div key={f.key} className="list-row">
              <div className="grow">
                <div className="name">{f.key}</div>
                <div className="meta">{f.description || 'Açıklama yok'}</div>
              </div>
              <button
                className={`switch ${f.enabled ? 'on' : 'off'}`}
                onClick={async () => {
                  await api.setFeatureFlag(f.key, !f.enabled);
                  reload();
                }}
              >
                {f.enabled ? 'Açık' : 'Kapalı'}
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function AuditView() {
  const { data } = useAsync<AuditEntry[]>(() => api.auditLogs(), []);
  return (
    <>
      <h1 className="page-title">Denetim Kaydı</h1>
      <p className="page-sub">Kritik eylemlerin izi (PII yok — yalnızca rol/kaynak/hash)</p>
      <div className="card">
        {!data ? (
          <div className="empty">Yükleniyor…</div>
        ) : data.length === 0 ? (
          <div className="empty">Kayıt yok</div>
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
      </div>
    </>
  );
}
