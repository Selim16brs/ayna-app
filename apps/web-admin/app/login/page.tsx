'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { api, setToken } from '../lib/api';

/**
 * GİRİŞ EKRANI.
 *
 * Bölme öncesi bu ekranın kendi URL'i yoktu: panel iskeleti token yoksa
 * aynı ağaçta koşullu olarak <Login> çiziyordu. Artık gerçek bir rota —
 * (panel) grubunun DIŞINDA, çünkü menü ve üst bar görmemeli.
 *
 * `?next=` parametresi: oturumu düşmüş kullanıcı girişten sonra bakmakta
 * olduğu ekrana geri döner, panelin başına atılmaz.
 */
function GirisFormu() {
  const router = useRouter();
  const params = useSearchParams();
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
      const next = params.get('next');
      // Açık yönlendirme açığını kapatmak için yalnız site içi yollara izin ver.
      router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : '/');
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
            placeholder="admin"
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

export default function LoginPage() {
  // useSearchParams istemci tarafında çözülür; Next bu sınırda Suspense ister.
  return (
    <Suspense fallback={<div className="login-wrap" />}>
      <GirisFormu />
    </Suspense>
  );
}
