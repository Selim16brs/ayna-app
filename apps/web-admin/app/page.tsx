'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  api,
  type Business,
  type Campaign,
  clearToken,
  getToken,
  type Overview,
  type Pro,
  type AdminUser,
  setToken,
} from './lib/api';

type Tab = 'overview' | 'businesses' | 'campaigns' | 'featured' | 'users';
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
    { id: 'businesses', label: 'Üyelikler', icon: '🏪' },
    { id: 'campaigns', label: 'Kampanya & Banner', icon: '🎯' },
    { id: 'featured', label: 'Öne Çıkanlar', icon: '⭐' },
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
        {tab === 'businesses' && <BusinessesView />}
        {tab === 'campaigns' && <CampaignsView />}
        {tab === 'featured' && <FeaturedView />}
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

function BusinessesView() {
  const [status, setStatus] = useState<string>('pending');
  const { data, reload } = useAsync<Business[]>(() => api.businesses(status), [status]);
  const act = async (id: string, kind: 'approve' | 'reject') => {
    if (kind === 'approve') await api.approveBusiness(id);
    else await api.rejectBusiness(id, prompt('Red sebebi:') ?? '');
    reload();
  };
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
              <div className="grow">
                <div className="name">{b.name}</div>
                <div className="meta">
                  {b.ownerName} · {b.sector} · {b.city}
                  {b.district ? ` / ${b.district}` : ''} · {b.phone}
                </div>
              </div>
              <span className={`pill ${b.status}`}>
                {b.status === 'pending' ? 'Bekliyor' : b.status === 'approved' ? 'Onaylı' : 'Red'}
              </span>
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
