'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DiyalogSaglayici } from '../ui/Diyalog';
import { api, clearToken, getToken } from '../lib/api';
import { NAV_GROUPS, NAV_ITEMS, aktifKalem } from '../_lib/nav';
import type { PendingCounts } from '../_lib/ortak';

/**
 * PANEL İSKELETİ.
 *
 * Bölme öncesi bu iskelet 5.000 satırlık page.tsx'in içindeki `AdminGovde`
 * fonksiyonuydu ve 29 ekranı `{tab === 'x' && <XView/>}` zinciriyle
 * kendisi render ediyordu — yani panelin tek "router"ı bir useState'ti ve
 * URL hiç değişmiyordu.
 *
 * Artık iskelet yalnız iskelet: kimlik kapısı, menü, üst bar ve rozet
 * sayaçları burada; hangi ekranın çizileceğine App Router karar veriyor.
 * Her sekme kendi dosyasında, kendi URL'inde.
 */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [hazir, setHazir] = useState(false);
  const [girisli, setGirisli] = useState(false);
  const [navAra, setNavAra] = useState('');
  // §12.1 — bekleyen iş sayaçları (nav rozetleri): 30 sn'de bir tazelenir
  const [pendingCounts, setPendingCounts] = useState<PendingCounts | null>(null);

  // Token yalnızca tarayıcıda okunabilir (localStorage sunucuda yok), bu yüzden
  // ilk çizimde değil mount sonrasında bakıyoruz.
  useEffect(() => {
    const varMi = !!getToken();
    setGirisli(varMi);
    setHazir(true);
    if (!varMi) {
      // Girişten sonra kullanıcıyı istediği ekrana geri bırakabilmek için
      // bulunduğu yolu taşıyoruz.
      const nereye = pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${nereye}`);
    }
  }, [pathname, router]);

  useEffect(() => {
    if (!girisli) return;
    let canli = true;
    const cek = () =>
      api
        .overview()
        .then((o) => canli && setPendingCounts((o as { pending?: PendingCounts }).pending ?? null))
        .catch(() => undefined);
    void cek();
    const zamanlayici = setInterval(cek, 30_000);
    return () => {
      canli = false;
      clearInterval(zamanlayici);
    };
    // Eskiden bağımlılıkta `tab` da vardı: her sekme değişiminde sayaçlar
    // yeniden çekiliyordu. Rota değişimi bunu tetiklemesin — 30 sn'lik
    // periyot zaten yeterli.
  }, [girisli]);

  // İlk kare: token okunmadan menü çizmek, girişsiz kullanıcıya paneli
  // bir an göstermek demek olurdu.
  if (!hazir || !girisli) return null;

  const cikis = () => {
    clearToken();
    router.replace('/login');
  };

  const aktif = aktifKalem(pathname ?? '/');
  const aktifGrup = aktif?.grup ?? 'PANO';
  const aktifEtiket = aktif?.kalem.label ?? 'Bugün';
  const q = pendingCounts;
  // Rozetlerin toplamı: "beni bekleyen iş var mı" sorusunun tek cevabı.
  const bekleyenToplam = NAV_ITEMS.reduce((n, x) => n + (x.badge?.(q) ?? 0), 0);
  const arama = navAra.trim().toLocaleLowerCase('tr');
  const eslesiyor = (etiket: string) => etiket.toLocaleLowerCase('tr').includes(arama);
  const hicEslesmeYok = NAV_ITEMS.every((n) => !eslesiyor(n.label));

  return (
    <DiyalogSaglayici>
      <div className="shell">
        <aside
          className="sidebar"
          style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
        >
          <div className="side-brand">AYNA</div>

          {/*
            MENÜ ARAMASI — 29 kalem var.
            Gruplama tek başına yetmiyordu: aradığı ekranı bulmak için hâlâ
            yirmi dokuz satırı gözle taramak gerekiyordu. Yazınca liste
            daralıyor, hiçbir şey ezberlemek gerekmiyor.
          */}
          <input
            className="nav-ara"
            value={navAra}
            onChange={(e) => setNavAra(e.target.value)}
            placeholder="Menüde ara…"
            aria-label="Menüde ara"
          />

          <nav className="nav-liste">
            {NAV_GROUPS.map((g) => {
              const kalemler = g.items.filter((n) => eslesiyor(n.label));
              // Boş grup başlığı göstermek, aramayı gürültüye çevirirdi.
              if (!kalemler.length) return null;
              return (
                <div key={g.title} className="nav-grup">
                  <div className="nav-grup-baslik">{g.title}</div>
                  {kalemler.map((n) => {
                    const secili = aktif?.kalem.href === n.href;
                    const rozet = n.badge?.(q);
                    return (
                      <Link
                        key={n.href}
                        href={n.href}
                        className={`nav-item ${secili ? 'active' : ''}`}
                        aria-current={secili ? 'page' : undefined}
                      >
                        <span className="nav-ikon" aria-hidden="true">
                          {n.icon}
                        </span>
                        <span className="nav-etiket">{n.label}</span>
                        {rozet ? (
                          <span className="nav-rozet" title={`${rozet} bekleyen iş`}>
                            {rozet}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
            {hicEslesmeYok ? <div className="nav-bos">Eşleşen ekran yok</div> : null}
          </nav>

          <button className="nav-item logout" onClick={cikis}>
            <span>↩</span> Çıkış
          </button>
        </aside>

        <div className="govde">
          {/*
            ÜST BAR üç şeyi hep görünür tutuyor: hangi bölümdeyim, kaç iş
            beni bekliyor, kim olarak giriş yaptım.
          */}
          <header className="ustbar">
            <div className="ustbar-yol">
              <span className="ustbar-grup">{aktifGrup}</span>
              <span className="ustbar-ayrac">/</span>
              <span className="ustbar-sayfa">{aktifEtiket}</span>
            </div>
            <div className="ustbar-sag">
              {bekleyenToplam > 0 ? (
                <Link className="ustbar-bekleyen" href="/">
                  <span className="ustbar-nokta" />
                  {bekleyenToplam} iş bekliyor
                </Link>
              ) : (
                <span className="ustbar-temiz">Bekleyen iş yok</span>
              )}
              <span className="ustbar-kim">Yönetici</span>
            </div>
          </header>
          <main className="main">{children}</main>
        </div>
      </div>
    </DiyalogSaglayici>
  );
}
