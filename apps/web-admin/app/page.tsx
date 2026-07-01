'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  api,
  type AdBanner,
  type AdminReview,
  type Business,
  type BusinessDetail,
  type Campaign,
  type Commissions,
  clearToken,
  getToken,
  type Overview,
  type Pro,
  type AdminUser,
  type Stats,
  setToken,
} from './lib/api';

type Tab =
  | 'overview'
  | 'stats'
  | 'commissions'
  | 'businesses'
  | 'campaigns'
  | 'ads'
  | 'featured'
  | 'moderation'
  | 'users';
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
    { id: 'campaigns', label: 'Kampanya & Banner', icon: '🎯' },
    { id: 'ads', label: 'Reklamlar', icon: '📢' },
    { id: 'featured', label: 'Öne Çıkanlar', icon: '⭐' },
    { id: 'moderation', label: 'Moderasyon', icon: '🛡️' },
    { id: 'users', label: 'Kullanıcılar', icon: '👥' },
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
        {tab === 'campaigns' && <CampaignsView />}
        {tab === 'ads' && <AdsView />}
        {tab === 'featured' && <FeaturedView />}
        {tab === 'moderation' && <ModerationView />}
        {tab === 'users' && <UsersView />}
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

function FeaturedView() {
  const { data, reload } = useAsync<Pro[]>(() => api.professionals(), []);
  return (
    <>
      <h1 className="page-title">Öne Çıkan Firmalar</h1>
      <p className="page-sub">Keşifte öne çıkacak işletmeleri seç</p>
      <div className="card">
        {!data ? (
          <div className="empty">Yükleniyor…</div>
        ) : (
          data.map((p) => (
            <div key={p.id} className="list-row">
              <div className="grow">
                <div className="name">{p.name}</div>
                <div className="meta">
                  {p.sector} · {p.district} · ★ {p.rating.toFixed(1)} ({p.reviewCount})
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
            </div>
          ))
        )}
      </div>
    </>
  );
}

function UsersView() {
  const { data } = useAsync<AdminUser[]>(() => api.users(), []);
  return (
    <>
      <h1 className="page-title">Kullanıcılar</h1>
      <p className="page-sub">Son kayıt olan kullanıcılar</p>
      <div className="card">
        {!data || data.length === 0 ? (
          <div className="empty">Kullanıcı yok</div>
        ) : (
          data.map((u) => (
            <div key={u.id} className="list-row">
              <div className="grow">
                <div className="name">
                  {u.name}
                  {u.isPremium ? ' · ⭐ Premium' : ''}
                </div>
                <div className="meta">
                  {u.email ?? '—'} · {u.city ?? '—'} · {u.role}
                  {u.phoneVerified ? ' · ✓ doğrulandı' : ''}
                </div>
              </div>
              <span className="pill approved">{u.gender === 'female' ? 'Kadın' : '—'}</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
