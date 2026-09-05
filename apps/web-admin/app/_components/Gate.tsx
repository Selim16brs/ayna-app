'use client';
import { useRouter } from 'next/navigation';
import { clearToken } from '../lib/api';

/**
 * §admin — paylaşımlı yükleme/hata durumu.
 *
 * Sonsuz "Yükleniyor" yerine gerçek hatayı gösterir. Oturum hatasında
 * (401/403) tokeni temizleyip /login'e yönlendirir — bölme öncesinde burada
 * `window.location.reload()` vardı; tam sayfa yenilemesi artık gereksiz,
 * router yönlendirmesi hem hızlı hem geri tuşuyla uyumlu.
 */
export function Gate({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}) {
  const router = useRouter();
  if (loading) return <div className="empty">Yükleniyor…</div>;
  const isAuth =
    error === 'UNAUTHENTICATED' || error === '401' || error === 'FORBIDDEN' || error === '403';
  return (
    <div className="empty">
      <div style={{ color: 'var(--danger)', fontWeight: 700, marginBottom: 8 }}>
        {isAuth ? 'Oturum geçersiz' : 'Veri yüklenemedi'}
      </div>
      <div style={{ fontSize: 13, marginBottom: 14 }}>
        {isAuth
          ? 'Oturumun süresi dolmuş ya da geçersiz. Çıkış yapıp yeniden giriş yap.'
          : error === 'Failed to fetch'
            ? 'API sunucusuna ulaşılamıyor (http://localhost:3000 çalışıyor mu?).'
            : `Hata: ${error ?? 'bilinmiyor'}`}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {isAuth ? (
          <button
            className="btn-sm"
            onClick={() => {
              clearToken();
              router.replace('/login');
            }}
          >
            Çıkış yap &amp; yeniden gir
          </button>
        ) : onRetry ? (
          <button className="btn-sm" onClick={onRetry}>
            Tekrar dene
          </button>
        ) : null}
      </div>
    </div>
  );
}
