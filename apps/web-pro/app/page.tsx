'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  api,
  type Business,
  clearToken,
  getToken,
  type InviteCode,
  setToken,
} from './lib/api';

type Tab = 'profile' | 'codes';

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
const STATUS_TR: Record<string, string> = {
  pending: 'Onay bekliyor',
  approved: 'Onaylı',
  rejected: 'Reddedildi',
};

export default function ProApp() {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState('');
  const [name, setName] = useState('');
  const [tab, setTab] = useState<Tab>('profile');

  useEffect(() => {
    setAuthed(!!getToken());
    setRole(window.localStorage.getItem('ayna_pro_role') ?? '');
    setName(window.localStorage.getItem('ayna_pro_name') ?? '');
    setReady(true);
  }, []);

  if (!ready) return null;
  if (!authed)
    return (
      <Login
        onDone={(r, n) => {
          setRole(r);
          setName(n);
          setAuthed(true);
        }}
      />
    );

  const logout = () => {
    clearToken();
    window.localStorage.removeItem('ayna_pro_role');
    window.localStorage.removeItem('ayna_pro_name');
    setAuthed(false);
  };

  const roleLabel = role === 'salon' ? 'Salon Sahibi' : role === 'professional' ? 'Uzman' : 'İşletme';
  const NAV: { id: Tab; label: string; icon: string }[] = [
    { id: 'profile', label: 'İşletme Profili', icon: '🏪' },
    { id: 'codes', label: 'Davet Kodları', icon: '🔑' },
  ];

  return (
    <div className="shell">
      <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="side-brand">AYNA</div>
        <div className="side-role">
          PRO · {roleLabel}
          {name ? ` · ${name}` : ''}
        </div>
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
        {tab === 'profile' && <ProfileView />}
        {tab === 'codes' && <CodesView />}
      </main>
    </div>
  );
}

function Login({ onDone }: { onDone: (role: string, name: string) => void }) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setErr('');
    try {
      const res = await api.login(id.trim(), pw);
      if (res.user.role !== 'salon' && res.user.role !== 'professional') {
        setErr('Bu panel salon ve uzman hesapları içindir.');
        return;
      }
      setToken(res.token);
      window.localStorage.setItem('ayna_pro_role', res.user.role);
      window.localStorage.setItem('ayna_pro_name', res.user.name);
      onDone(res.user.role, res.user.name);
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
          AYNA<small>SALON &amp; UZMAN PANELİ</small>
        </div>
        <div className="field">
          <label>E-posta veya telefon</label>
          <input
            className="input"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="salon@ornek.kz"
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
  const [error, setError] = useState(false);
  const run = useCallback(() => {
    setLoading(true);
    setError(false);
    fn()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(run, [run]);
  return { data, loading, error, reload: run };
}

function ProfileView() {
  const { data, loading } = useAsync<Business[]>(() => api.myBusinesses(), []);
  if (loading) return <div className="empty">Yükleniyor…</div>;
  const biz = data?.[0];
  if (!biz)
    return (
      <>
        <h1 className="page-title">İşletme Profili</h1>
        <p className="page-sub">Hesabına bağlı bir işletme kaydı bulunamadı.</p>
        <div className="card">
          <div className="hint">
            Uzman hesabıysan, salonundan aldığın davet koduyla mobil uygulamadan katılabilirsin.
            Salon sahibiysen işletme kaydını mobil uygulamadan tamamla.
          </div>
        </div>
      </>
    );
  return (
    <>
      <h1 className="page-title">{biz.name}</h1>
      <p className="page-sub">İşletme profili ve onay durumu</p>
      <div className="profile-card">
        <span className={`pill ${biz.status}`}>{STATUS_TR[biz.status] ?? biz.status}</span>
        {biz.status === 'rejected' && biz.rejectReason ? (
          <p className="err">Red sebebi: {biz.rejectReason}</p>
        ) : null}
        <div className="kv-grid">
          <KV k="Sahip" v={biz.ownerName} />
          <KV k="Sektör" v={sectorLabel(biz.sector)} />
          <KV k="Telefon" v={biz.phone} />
          <KV k="E-posta" v={biz.email || '—'} />
          <KV k="Çalışma saatleri" v={biz.workingHours || '—'} />
          <KV k="Kategoriler" v={biz.categories.map(sectorLabel).join(', ') || '—'} />
          <KV k="Adres" v={`${biz.city} / ${biz.district} ${biz.address}`.trim()} />
        </div>
      </div>
    </>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="kv-k">{k}</div>
      <div className="kv-v">{v}</div>
    </div>
  );
}

function CodesView() {
  const { data: businesses, loading: bl } = useAsync<Business[]>(() => api.myBusinesses(), []);
  const biz = businesses?.[0];
  const {
    data: codes,
    loading,
    reload,
  } = useAsync<InviteCode[]>(
    () => (biz ? api.inviteCodes(biz.id) : Promise.resolve([])),
    [biz?.id],
  );
  const [busy, setBusy] = useState(false);

  if (bl) return <div className="empty">Yükleniyor…</div>;
  if (!biz)
    return (
      <>
        <h1 className="page-title">Davet Kodları</h1>
        <p className="page-sub">Uzmanlarını ekibe davet et</p>
        <div className="card">
          <div className="hint">Önce hesabına bağlı bir işletme kaydı gerekir.</div>
        </div>
      </>
    );

  const generate = async () => {
    setBusy(true);
    try {
      await api.createInviteCode(biz.id);
      reload();
    } finally {
      setBusy(false);
    }
  };
  const revoke = async (codeId: string) => {
    if (!confirm('Bu davet kodu iptal edilsin mi?')) return;
    await api.revokeInviteCode(biz.id, codeId);
    reload();
  };

  return (
    <>
      <h1 className="page-title">Davet Kodları</h1>
      <p className="page-sub">
        Uzmanların bu kodla mobil uygulamadan ekibine katılır — {biz.name}
      </p>
      <div className="toolbar">
        <button className="btn-sm btn-ok" onClick={generate} disabled={busy}>
          {busy ? '…' : '+ Yeni davet kodu üret'}
        </button>
      </div>
      <div className="card">
        {loading ? (
          <div className="empty">Yükleniyor…</div>
        ) : !codes || codes.length === 0 ? (
          <div className="empty">Henüz davet kodu yok</div>
        ) : (
          codes.map((c) => (
            <div key={c.id} className="list-row">
              <div className="grow">
                <div className="code-tag">{c.code}</div>
                <div className="meta">
                  {typeof c.attempts === 'number' ? `${c.attempts} deneme` : ''}
                </div>
              </div>
              <span className={`pill ${c.status}`}>
                {c.status === 'active' ? 'Aktif' : c.status === 'used' ? 'Kullanıldı' : 'İptal'}
              </span>
              {c.status === 'active' ? (
                <button className="btn-sm btn-danger" onClick={() => revoke(c.id)}>
                  İptal et
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </>
  );
}
