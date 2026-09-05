'use client';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { DiyalogSaglayici, useDiyalog } from './ui/Diyalog';
import {
  api,
  type AcilisMesajSatiri,
  type AcilisRaporSatiri,
  type AdBanner,
  type AdminBooking,
  type AdminReview,
  type Announcement,
  type AnnouncementSegment,
  type ApiKeyStatus,
  type ArticleInput,
  type AuditEntry,
  type BlogApplication,
  type BlogArticle,
  type Business,
  type FeatureFlag,
  type Loyalty,
  type QuoteReq,
  type BusinessDetail,
  type BizVerification,
  type SpecialistRow,
  type SpecialistDetail,
  type Campaign,
  type Category,
  type CirclePost,
  type CommissionInvoice,
  type Subscription,
  type ProfileChange,
  type KycRow,
  type I18nOverride,
  type Commissions,
  type Dispute,
  type ReviewDispute,
  clearToken,
  getToken,
  type MarketPrice,
  type Overview,
  type Pro,
  type ProInput,
  type AdminUser,
  type CategoryConfig,
  type Penalty,
  type ReviewApplication,
  type Stats,
  type SystemSettings,
  type WeeklyTheme,
  setToken,
  SupportRow,
  type DekontSatiri,
  type ReklamSiparisi,
  type IadeSatiri,
  type UzlasmaSatiri,
  type RegulatedServiceFlag,
} from './lib/api';
type Tab =
  | 'overview'
  | 'splash'
  | 'stats'
  | 'commissions'
  | 'subscriptions'
  | 'profileChanges'
  | 'kyc'
  | 'support'
  | 'businesses'
  | 'specialists'
  | 'professionals'
  | 'services'
  | 'prices'
  | 'bookings'
  | 'disputes'
  | 'reviewDisputes'
  | 'quotes'
  | 'campaigns'
  | 'ads'
  | 'moderation'
  | 'regulated'
  | 'content'
  | 'announcements'
  | 'users'
  | 'penalties'
  | 'loyalty'
  | 'flags'
  | 'system'
  | 'audit';
const TL = (n: number) => '₸' + n.toLocaleString('tr-TR');
// §12 — her liste Excel'e aktarılabilir: CSV (UTF-8 BOM → Excel Türkçe uyumlu)
function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]!);
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.join(';'), ...rows.map((r) => cols.map((c) => esc(r[c])).join(';'))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
type PendingCounts = {
  businesses: number;
  kyc: number;
  profileChanges: number;
  subscriptions: number;
  disputes: number;
  reviewDisputes: number;
  circle: number;
  /** Brief §5 — uzmanın serbest yazdığı regüle hizmet adları. */
  regulatedServices: number;
  /** Dekont yüklenmiş ama tahsil edilmemiş komisyon faturaları. */
  /*
   * Sunucunun gönderdiği para kuyrukları. Bunlar hesaplanıyordu ama panelde
   * HİÇBİR rozete bağlı değildi: dekont doğrulaması, iade, uzlaşma ve reklam
   * ödemesi bekleyen iş varken menüde hiçbir işaret çıkmıyordu.
   *
   * `invoiceReceipts` buradaydı ve sunucu onu HİÇ göndermiyordu — kaldırılan
   * komisyon faturası modelinden kalmış ölü bir alandı.
   */
  depositReceipts: number;
  refundsPending: number;
  reconciliationsOpen: number;
  adOrders: number;
};
/**
 * Kök: diyalog sağlayıcısı PANELİN TAMAMINI sarıyor.
 *
 * Her görünüm kendi onay/form kutusunu açabilmeli; sağlayıcı burada
 * olmasaydı her görünüm kendi kutusunu yazar ve panel yine dağılırdı.
 */
export default function AdminApp() {
  return (
    <DiyalogSaglayici>
      <AdminGovde />
    </DiyalogSaglayici>
  );
}
function AdminGovde() {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [navAra, setNavAra] = useState('');
  // §12.1 — bekleyen iş sayaçları (nav rozetleri): 30 sn'de bir tazelenir
  const [pendingCounts, setPendingCounts] = useState<PendingCounts | null>(null);
  useEffect(() => {
    setAuthed(!!getToken());
    setReady(true);
  }, []);
  useEffect(() => {
    if (!authed) return;
    let alive = true;
    const pull = () =>
      api
        .overview()
        .then((o) => alive && setPendingCounts((o as { pending?: PendingCounts }).pending ?? null))
        .catch(() => undefined);
    void pull();
    const timer = setInterval(pull, 30_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [authed, tab]);
  if (!ready) return null;
  if (!authed) return <Login onDone={() => setAuthed(true)} />;
  const logout = () => {
    clearToken();
    setAuthed(false);
  };
  // §12 — bilgi mimarisi: işletim mantığına göre GRUPLU nav. "Onay Kuyruğu" panelin kalbi:
  // bekleyen iş sayaçları (rozet) /admin/overview.pending'den gelir, 30 sn'de bir tazelenir.
  /*
   * ── BİLGİ MİMARİSİ ────────────────────────────────────────────────────
   *
   * Kurucu: "app'de çalışan fonksiyonları gruplayarak doğru başlıklar
   * altında mantıklı ve user friendly olarak yap."
   *
   * Eski gruplama İÇ MODÜLLERE göreydi ("Pazar", "Finans") ve yöneticinin
   * yaptığı işe karşılık gelmiyordu. Yeni gruplar bir soruyu cevaplıyor:
   *
   *   PANO              Bugün ne durumdayız?
   *   ONAY BEKLEYENLER  Birileri BENİ bekliyor. (kuyrukların hepsi burada)
   *   KİŞİLER           Kim var, kimi kısıtladım?
   *   RANDEVU & PARA    Para nerede, kim kime ne borçlu?
   *   KATALOG           Platform NE satıyor?
   *   İÇERİK            Kullanıcıya ne gösteriyoruz?
   *   SİSTEM            Ayarlar ve iz kaydı.
   *
   * Etiketler de değişti: "Randevu & Ödeme Kuyrukları" gibi iç isimler
   * yerine yöneticinin kafasındaki adlar ("Randevular & Ödemeler").
   */
  type NavItem = { id: Tab; label: string; icon: string; badge?: number };
  const q = pendingCounts;
  const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
    {
      title: 'PANO',
      items: [
        { id: 'overview', label: 'Bugün', icon: '◎' },
        { id: 'stats', label: 'Raporlar', icon: '◔' },
      ],
    },
    {
      /*
       * Panelin kalbi. Dokuz kuyruğun HEPSİ burada: dağıtıldıklarında
       * "beni bekleyen iş var mı" sorusunun cevabı menüye yayılıyordu.
       */
      title: 'ONAY BEKLEYENLER',
      items: [
        { id: 'businesses', label: 'Salon başvuruları', icon: '◈', badge: q?.businesses },
        { id: 'specialists', label: 'Uzman doğrulama', icon: '◇' },
        { id: 'kyc', label: 'Kimlik doğrulama', icon: '⬡', badge: q?.kyc },
        {
          id: 'profileChanges',
          label: 'Profil değişiklikleri',
          icon: '✎',
          badge: q?.profileChanges,
        },
        { id: 'subscriptions', label: 'Abonelik dekontları', icon: '❖', badge: q?.subscriptions },
        { id: 'disputes', label: 'Depozito itirazları', icon: '⚖', badge: q?.disputes },
        { id: 'reviewDisputes', label: 'Yorum itirazları', icon: '❝', badge: q?.reviewDisputes },
        { id: 'moderation', label: 'Topluluk moderasyonu', icon: '⛨', badge: q?.circle },
        {
          id: 'regulated',
          label: 'Regüle hizmet uyarıları',
          icon: '⚕',
          badge: q?.regulatedServices,
        },
        { id: 'support', label: 'Destek talepleri', icon: '☏' },
      ],
    },
    {
      title: 'KİŞİLER',
      items: [
        { id: 'users', label: 'Üyeler', icon: '☰' },
        { id: 'professionals', label: 'Uzman & salonlar', icon: '✦' },
        { id: 'penalties', label: 'Kısıtlı hesaplar', icon: '⊘' },
      ],
    },
    {
      title: 'RANDEVU & PARA',
      items: [
        {
          // Bu sekme bir dönem MENÜDE HİÇ YOKTU: dekont doğrulama, iadeler
          // ve uzlaşma kuyrukları panelde açılamıyordu.
          id: 'bookings',
          label: 'Randevular & ödemeler',
          icon: '▤',
          badge:
            (q?.depositReceipts ?? 0) + (q?.refundsPending ?? 0) + (q?.reconciliationsOpen ?? 0),
        },
        { id: 'commissions', label: 'Komisyonlar', icon: '₸' },
        { id: 'loyalty', label: 'Puan ekonomisi', icon: '◍' },
      ],
    },
    {
      title: 'KATALOG',
      items: [
        { id: 'services', label: 'Hizmetler', icon: '⊞' },
        { id: 'prices', label: 'Taban fiyatlar', icon: '⊙' },
        { id: 'quotes', label: 'Canlı talepler', icon: '◐' },
      ],
    },
    {
      title: 'İÇERİK',
      items: [
        { id: 'content', label: 'Blog & tema', icon: '▦' },
        { id: 'announcements', label: 'Duyurular', icon: '◭' },
        { id: 'splash', label: 'Açılış mesajları', icon: '✧' },
        { id: 'campaigns', label: 'Kampanyalar', icon: '◮' },
        { id: 'ads', label: 'Reklamlar', icon: '▣', badge: q?.adOrders },
      ],
    },
    {
      title: 'SİSTEM',
      items: [
        { id: 'system', label: 'Ayarlar', icon: '⚙' },
        { id: 'flags', label: 'Özellikler', icon: '⚑' },
        { id: 'audit', label: 'Denetim kaydı', icon: '⧉' },
      ],
    },
  ];

  /*
   * NEREDEYİM / KAÇ İŞ BEKLİYOR.
   *
   * Kurucu: "admin paneli çorba gibi, ne nerede ne iş yapıyor ne ile
   * alakalı hiçbir şey belli değil, sıra sıra dizilmiş öylesine."
   *
   * Bu üç değer üst barı besliyor. Menüdeki vurgu tek başına yetmiyordu:
   * kaydırınca menü gözden çıkıyor ve ekranın hangi bölüme ait olduğu
   * kayboluyordu.
   */
  const aktifGrup = NAV_GROUPS.find((g) => g.items.some((n) => n.id === tab))?.title ?? 'PANO';
  const aktifEtiket =
    NAV_GROUPS.flatMap((g) => g.items).find((n) => n.id === tab)?.label ?? 'Bugün';
  // Rozetlerin toplamı: "beni bekleyen iş var mı" sorusunun tek cevabı.
  const bekleyenToplam = NAV_GROUPS.flatMap((g) => g.items).reduce((n, x) => n + (x.badge ?? 0), 0);

  return (
    <div className="shell">
      <aside
        className="sidebar"
        style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
      >
        <div className="side-brand">AYNA</div>

        {/*
          MENÜ ARAMASI — 26 kalem var.
          Kurucu: "admin paneli rezil durumda hiç user friendly değil ve
          karışık." Gruplama tek başına yetmiyordu: aradığı ekranı bulmak
          için hâlâ yirmi altı satırı gözle taramak gerekiyordu. Yazınca
          liste daralıyor, hiçbir şey ezberlemek gerekmiyor.
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
            const kalemler = g.items.filter((n) =>
              n.label.toLocaleLowerCase('tr').includes(navAra.trim().toLocaleLowerCase('tr')),
            );
            // Boş grup başlığı göstermek, aramayı gürültüye çevirirdi.
            if (!kalemler.length) return null;
            return (
              <div key={g.title} className="nav-grup">
                <div className="nav-grup-baslik">{g.title}</div>
                {kalemler.map((n) => (
                  <button
                    key={n.id}
                    className={`nav-item ${tab === n.id ? 'active' : ''}`}
                    onClick={() => setTab(n.id)}
                    aria-current={tab === n.id ? 'page' : undefined}
                  >
                    <span className="nav-ikon" aria-hidden="true">
                      {n.icon}
                    </span>
                    <span className="nav-etiket">{n.label}</span>
                    {n.badge ? (
                      <span className="nav-rozet" title={`${n.badge} bekleyen iş`}>
                        {n.badge}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            );
          })}
          {NAV_GROUPS.every((g) =>
            g.items.every(
              (n) =>
                !n.label.toLocaleLowerCase('tr').includes(navAra.trim().toLocaleLowerCase('tr')),
            ),
          ) ? (
            <div className="nav-bos">Eşleşen ekran yok</div>
          ) : null}
        </nav>

        <button className="nav-item logout" onClick={logout}>
          <span>↩</span> Çıkış
        </button>
      </aside>
      <div className="govde">
        {/*
          ÜST BAR — panelde HİÇ YOKTU.
          Sonuç: ekran doğrudan içerikle başlıyor, hangi bölümde olunduğu
          yalnız menüdeki vurgudan anlaşılıyor ve panel bir ürün değil ham
          bir liste gibi duruyordu. Üst bar üç şeyi hep görünür tutuyor:
          hangi bölümdeyim, kaç iş beni bekliyor, kim olarak giriş yaptım.
        */}
        <header className="ustbar">
          <div className="ustbar-yol">
            <span className="ustbar-grup">{aktifGrup}</span>
            <span className="ustbar-ayrac">/</span>
            <span className="ustbar-sayfa">{aktifEtiket}</span>
          </div>
          <div className="ustbar-sag">
            {bekleyenToplam > 0 ? (
              <button className="ustbar-bekleyen" onClick={() => setTab('overview')}>
                <span className="ustbar-nokta" />
                {bekleyenToplam} iş bekliyor
              </button>
            ) : (
              <span className="ustbar-temiz">Bekleyen iş yok</span>
            )}
            <span className="ustbar-kim">Yönetici</span>
          </div>
        </header>
        <main className="main">
          {tab === 'overview' && <OverviewView onGo={setTab} />}
          {tab === 'stats' && <StatsView />}
          {tab === 'splash' && <SplashView />}
          {tab === 'commissions' && <CommissionsView />}
          {tab === 'subscriptions' && <SubscriptionsView />}
          {tab === 'profileChanges' && <ProfileChangesView />}
          {tab === 'kyc' && <KycView />}
          {tab === 'support' && <SupportView />}
          {tab === 'businesses' && <BusinessesView />}
          {tab === 'specialists' && <SpecialistsView />}
          {tab === 'professionals' && <ProfessionalsView />}
          {tab === 'services' && <ServicesView />}
          {tab === 'prices' && <PricesView />}
          {tab === 'bookings' && <BookingsAdminView />}
          {tab === 'disputes' && <DisputesView />}
          {tab === 'reviewDisputes' && <ReviewDisputesView />}
          {tab === 'quotes' && <QuotesView />}
          {tab === 'campaigns' && <CampaignsView />}
          {tab === 'ads' && <AdsView />}
          {tab === 'moderation' && <ModerationView />}
          {tab === 'regulated' && <ReguleHizmetView />}
          {tab === 'content' && <ContentView />}
          {tab === 'announcements' && <AnnouncementsView />}
          {tab === 'users' && <UsersView />}
          {tab === 'penalties' && <PenaltiesView />}
          {tab === 'loyalty' && <LoyaltyView />}
          {tab === 'flags' && <FlagsView />}
          {tab === 'system' && <SystemView />}
          {tab === 'audit' && <AuditView />}
        </main>
      </div>
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
function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(() => {
    setLoading(true);
    setError(null);
    fn()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        setData(null);
        // §admin — hatayı YÜZEYE çıkar (sessiz yutma → sonsuz "Yükleniyor" bug'ı giderildi)
        setError(e instanceof Error ? e.message : 'Bağlantı hatası');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(run, [run]);
  return { data, loading, error, reload: run };
}
// §admin — paylaşımlı yükleme/hata durumu (sonsuz "Yükleniyor" yerine gerçek hata)
function Gate({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}) {
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
              window.location.reload();
            }}
          >
            Çıkış yap & yeniden gir
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
// §14.5 — 3 DİL form yardımcıları: app'e ulaşan içerik tr(base)+kk+ru girilir
type Lang = 'tr' | 'kk' | 'ru';
const LANGS: Lang[] = ['tr', 'kk', 'ru'];
function LangTabs({
  lang,
  setLang,
  filled,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  filled: (l: Lang) => boolean;
}) {
  return (
    <div className="toolbar full" style={{ marginBottom: 0 }}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          className={`chip ${lang === l ? 'on' : ''}`}
          onClick={() => setLang(l)}
        >
          {l.toUpperCase()}
          {l === 'tr' ? ' (kaynak)' : filled(l) ? ' ✓' : ' —'}
        </button>
      ))}
    </div>
  );
}
// kk/ru alanlarından i18n objesi kur (yalnız dolu alanlar; hiçbiri yoksa undefined → yalnız tr)
function buildI18n(fields: Record<string, { kk: string; ru: string }>): I18nOverride | undefined {
  const out: I18nOverride = {};
  for (const loc of ['kk', 'ru'] as const) {
    const o: Record<string, string> = {};
    for (const [k, v] of Object.entries(fields)) if (v[loc].trim()) o[k] = v[loc].trim();
    if (Object.keys(o).length) out[loc] = o;
  }
  return Object.keys(out).length ? out : undefined;
}
// §profil-onay — salon/uzman profil değişiklik onay kuyruğu
function ProfileChangesView() {
  const [status, setStatus] = useState<string>('pending');
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
function SupportView() {
  const [status, setStatus] = useState<string>('open');
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
function KycView() {
  const [status, setStatus] = useState<string>('pending');
  const { data, loading, error, reload } = useAsync<KycRow[]>(
    () => api.kycQueue(status || undefined),
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
  const DOC: Record<string, string> = {
    id_card: 'Kimlik',
    passport: 'Pasaport',
    certificate: 'Sertifika',
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
        title="Kimlik doğrulama"
        sub={
          <>
            Uzman/salon belge doğrulama kuyruğu — onaylanınca profilde &quot;Doğrulanmış&quot; rozeti (
            {data?.length ?? 0} kayıt)
          </>
        }
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
        <Loading label="Kayıt yok." />
      ) : (
        <Card className="p-2">
          {data.map((k) => (
            <div
              className="flex items-center gap-3 px-3 py-3 border-b border-line last:border-b-0 hover:bg-bg-alt"
              key={k.id}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-ax-md font-semibold text-ink">
                  {k.userName}{' '}
                  <span
                    className={`inline-flex items-center rounded-sm px-2 py-0.5 text-ax-xs font-medium ${k.userRole === 'salon' ? 'text-info bg-info-soft' : 'text-accent-ink bg-accent-soft'}`}
                  >
                    {k.userRole === 'salon' ? 'Salon' : 'Uzman'}
                  </span>
                </div>
                <div className="mt-0.5 text-ax-sm text-ink-3 tabular-nums">
                  {DOC[k.docType] ?? k.docType} · {k.documents.length} belge ·{' '}
                  {new Date(k.submittedAt).toLocaleDateString('tr-TR')}
                  {k.status === 'rejected' && k.note ? ` · Ret: ${k.note}` : ''}
                </div>
              </div>
              <span
                className={`inline-flex items-center rounded-sm px-2 py-0.5 text-ax-xs font-medium ${k.status === 'approved' ? 'text-ok bg-ok-soft' : k.status === 'pending' ? 'text-warn bg-warn-soft' : 'text-err bg-err-soft'}`}
              >
                {k.status === 'approved'
                  ? 'Onaylandı'
                  : k.status === 'pending'
                    ? 'Bekliyor'
                    : 'Reddedildi'}
              </span>
              {k.status === 'pending' ? (
                <div className="flex items-center gap-2">
                  <button
                    className="btn-sm btn-ok"
                    disabled={busy === k.id}
                    onClick={() => act(() => api.approveKyc(k.id), k.id)}
                  >
                    Onayla
                  </button>
                  <button
                    className="btn-sm btn-danger"
                    disabled={busy === k.id}
                    onClick={() => act(() => api.rejectKyc(k.id, 'Belgeler yetersiz'), k.id)}
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
function SubscriptionsView() {
  const [status, setStatus] = useState<string>('pending');
  const { data, loading, error, reload } = useAsync<Subscription[]>(
    () => api.subscriptions(status || undefined),
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
  const FILTERS: [string, string][] = [
    ['pending', 'Bekleyen'],
    ['active', 'Aktif'],
    ['rejected', 'Reddedilen'],
    ['expired', 'Süresi dolan'],
    ['', 'Tümü'],
  ];
  const statusPill = (s: Subscription['status']) =>
    s === 'active' ? 'approved' : s === 'pending' ? 'pending' : 'rejected';
  const statusTr = (s: Subscription['status']) =>
    s === 'active'
      ? 'Aktif'
      : s === 'pending'
        ? 'Bekliyor'
        : s === 'rejected'
          ? 'Reddedildi'
          : 'Süresi doldu';
  return (
    <>
      <PageHead
        title="Abonelik dekontları"
        sub={`Premium / Platinum üyelik dekont onayı (${data?.length ?? 0} kayıt)`}
      />
      <Toolbar>
        {FILTERS.map(([s, label]) => (
          <Chip key={s || 'all'} active={status === s} onClick={() => setStatus(s)}>
            {label}
          </Chip>
        ))}
        <button
          className="btn-sm btn-ghost ml-auto"
          onClick={() => api.runSubExpire().then(reload)}
        >
          Süre dolanları düşür
        </button>
      </Toolbar>
      {!data ? (
        <Gate loading={loading} error={error} onRetry={reload} />
      ) : data.length === 0 ? (
        <Loading label="Kayıt yok." />
      ) : (
        <Card>
          {data.map((s) => (
            <div className="list-row" key={s.id}>
              <div className="grow">
                <div className="name">
                  {s.userName}{' '}
                  <span className={`pill ${s.tier === 'platinum' ? 'accent' : 'info'}`}>
                    {s.tier === 'platinum' ? '💎 Platinum' : 'Premium'}
                  </span>
                </div>
                <div className="meta">
                  {TL(s.amount)} · {new Date(s.createdAt).toLocaleDateString('tr-TR')}
                  {s.periodEnd
                    ? ` · bitiş ${new Date(s.periodEnd).toLocaleDateString('tr-TR')}`
                    : ''}
                  {s.receiptUri ? ' · 📎 dekont:' : ' · ⚠ dekont yok'}
                </div>
              </div>
              {s.receiptUri ? (
                <img
                  src={s.receiptUri}
                  alt="dekont"
                  className="cursor-zoom-in rounded-sm object-cover"
                  style={{ width: 72, height: 72 }}
                  onClick={(e) => {
                    const img = e.currentTarget;
                    img.style.width = img.style.width === '72px' ? '360px' : '72px';
                    img.style.height = 'auto';
                  }}
                />
              ) : null}
              <span className={`pill ${statusPill(s.status)}`}>{statusTr(s.status)}</span>
              {s.status === 'pending' ? (
                <div className="actions">
                  <button
                    className="btn-sm btn-ok"
                    disabled={busy === s.id}
                    onClick={() => act(() => api.approveSubscription(s.id, 1), s.id)}
                  >
                    Onayla (1 ay)
                  </button>
                  <button
                    className="btn-sm btn-danger"
                    disabled={busy === s.id}
                    onClick={() => act(() => api.rejectSubscription(s.id), s.id)}
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
function OverviewView({ onGo }: { onGo: (t: Tab) => void }) {
  const { data, loading, error, reload } = useAsync<Overview>(() => api.overview(), []);
  // §12.1 — Bekleyen İşler: tıklanabilir kuyruk kartları (rozetlerin dashboard karşılığı)
  const pend = (data as unknown as { pending?: Record<string, number> })?.pending;
  const QUEUES: { key: string; label: string; tab: Tab }[] = [
    { key: 'businesses', label: 'Salon Onayı', tab: 'businesses' },
    { key: 'kyc', label: 'Kimlik (KYC)', tab: 'kyc' },
    { key: 'profileChanges', label: 'Profil Değişikliği', tab: 'profileChanges' },
    { key: 'subscriptions', label: 'Abonelik Dekontu', tab: 'subscriptions' },
    { key: 'disputes', label: 'Depozito İtirazı', tab: 'disputes' },
    { key: 'reviewDisputes', label: 'Yorum İtirazı', tab: 'reviewDisputes' },
    { key: 'circle', label: 'W2W Moderasyon', tab: 'moderation' },
    { key: 'regulatedServices', label: 'Regüle hizmet', tab: 'regulated' },
    // §reklam — AYNA'nın kazanç kuyruğu. Bekleyen ödeme kartını ana sayfada
    // görmek, onayı geciktirmemek demek: reklamı ödeyen uzman yayına
    // girmeyi bekliyor.
    { key: 'adOrders', label: 'Reklam Ödemesi', tab: 'ads' },
    // Bu üçü sunucuda ZATEN sayılıyordu ama panoda hiç görünmüyordu; üstelik
    // götürdükleri sekmenin menüde girişi de yoktu.
    { key: 'depositReceipts', label: 'Dekont Doğrulama', tab: 'bookings' },
    { key: 'refundsPending', label: 'İade', tab: 'bookings' },
    { key: 'reconciliationsOpen', label: 'Uzlaşma', tab: 'bookings' },
  ];
  return (
    <>
      <PageHead title="Bugün" sub="Platform geneli canlı metrikler" />
      {!data ? (
        <Gate loading={loading} error={error} onRetry={reload} />
      ) : (
        <>
          <SectionTitle>Bekleyen İşler</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {QUEUES.map((qd) => {
              const n = pend?.[qd.key] ?? 0;
              // Sayı SIFIRDAN BÜYÜKSE kart öne çıkar: on bir kart yan yana
              // dururken hepsi aynı görünürse bekleyen işi taramak gözle sayma
              // işine döner. Renk anlam tokenından gelir (err), sabit kod değil.
              return (
                <button
                  key={qd.key}
                  onClick={() => onGo(qd.tab)}
                  className={`group relative flex flex-col overflow-hidden rounded-md border px-4 pb-3 pt-4 text-left shadow-1 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-2 ${
                    n > 0 ? 'border-err bg-err-soft' : 'border-line bg-surface hover:border-ink-3'
                  }`}
                >
                  <span
                    className={`absolute inset-y-0 left-0 w-1 transition-colors ${
                      n > 0 ? 'bg-err' : 'bg-transparent group-hover:bg-accent'
                    }`}
                  />
                  <span
                    className={`text-[28px] font-extrabold leading-none tracking-[-1px] tabular-nums ${
                      n > 0 ? 'text-err' : 'text-ink'
                    }`}
                  >
                    {n}
                  </span>
                  <span className={`mt-2 text-ax-sm font-semibold ${n > 0 ? 'text-err' : 'text-ink-3'}`}>
                    {qd.label}
                  </span>
                </button>
              );
            })}
          </div>
          <SectionTitle>Platform</SectionTitle>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat v={String(data.users)} l="Kullanıcı" />
            <Stat v={String(data.professionals)} l="İşletme / Uzman" />
            <Stat v={String(data.bookings.upcoming)} l="Yaklaşan randevu" />
            <Stat v={TL(data.bookings.revenue)} l="Tamamlanan gelir" />
          </div>
          <SectionTitle>Randevu durumu</SectionTitle>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat v={String(data.bookings.completed)} l="Tamamlanan" />
            <Stat v={String(data.bookings.cancelled)} l="İptal" />
            <Stat v={`%${data.bookings.noShowRate}`} l="Gelmeyen oranı" />
            <Stat v={String(data.activeCampaigns)} l="Aktif kampanya" />
          </div>
          <SectionTitle>Üyelik durumu</SectionTitle>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
// ── Ortak görsel atomlar (Tailwind) ──────────────────────────────────────────
// Tüm sekmeler bunları paylaşır: bir kez Tailwind'e çevrildiğinde panel geneli
// tutarlı görünüm kazanır. Mantık yok — yalnız sunum.
function PageHead({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-ax-2xl font-extrabold leading-tight tracking-[-0.7px] text-ink">{title}</h1>
      {sub ? (
        <p className="mt-1 max-w-[70ch] text-ax-md leading-relaxed text-ink-3">{sub}</p>
      ) : null}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 mt-8 text-ax-xs font-extrabold uppercase tracking-[1.2px] text-ink-3 first:mt-0">
      {children}
    </div>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <div className="rounded-md border border-line bg-surface px-4 pb-3 pt-4 shadow-1 transition-shadow duration-150 hover:shadow-2">
      <div className="text-[28px] font-extrabold leading-[1.15] tracking-[-1px] tabular-nums text-ink">{v}</div>
      <div className="mt-1 text-ax-sm font-semibold text-ink-3">{l}</div>
    </div>
  );
}

// Filtre çipi (aç/kapa) — panel genelinde sekme/filtre seçimlerinde kullanılır.
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-ax-sm font-semibold transition-colors duration-150 ${
        active
          ? 'border-accent bg-accent text-on-accent'
          : 'border-line bg-surface text-ink-3 hover:border-ink-3 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

// Yatay araç çubuğu (filtre/aksiyon satırı).
function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-2">{children}</div>;
}

// Beyaz yüzey kart.
function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-md border border-line bg-surface shadow-1 ${className}`}>
      {children}
    </div>
  );
}

// Yükleniyor / boş durum.
function Loading({ label = 'Yükleniyor…' }: { label?: string }) {
  return <div className="py-16 text-center text-ax-md text-ink-3">{label}</div>;
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
      <PageHead
        title="Raporlar"
        sub={`Zaman serisi — kayıt, randevu ve gelir${data ? ` · ${data.timezone}` : ''}`}
      />
      <Toolbar>
        {[7, 30, 90].map((d) => (
          <Chip key={d} active={days === d} onClick={() => setDays(d)}>
            Son {d} gün
          </Chip>
        ))}
      </Toolbar>
      {!data ? (
        <Loading />
      ) : (
        <>
          <div className="mb-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat v={String(data.totals.users)} l={`Yeni kayıt (${days}g)`} />
            <Stat v={String(data.totals.bookings)} l={`Randevu (${days}g)`} />
            <Stat v={TL(data.totals.revenue)} l={`Gelir (${days}g)`} />
          </div>
          <SectionTitle>Günlük seyir</SectionTitle>
          <Toolbar>
            {METRICS.map((m) => (
              <Chip key={m.key} active={metric === m.key} onClick={() => setMetric(m.key)}>
                {m.label}
              </Chip>
            ))}
          </Toolbar>
          <Card className="p-5">
            <BarChart
              points={data.series.map((s) => ({ label: s.date, value: s[metric] }))}
              color={active.color}
              format={metric === 'revenue' ? TL : (n) => String(n)}
            />
          </Card>
          <SectionTitle>Kategori dağılımı (uzman havuzu)</SectionTitle>
          <Card className="p-5">
            <CategoryBars items={data.categories} />
          </Card>
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
              <text x={x + bw / 2} y={H - 8} fontSize={10} fill="#8b8479" textAnchor="middle">
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
// Randevu & ödeme kuyrukları: dekont doğrulama, iadeler, uzlaşma kayıtları.
/**
 * Brief §8 — RANDEVU KUYRUKLARI.
 *
 * Eski "Dönem faturaları" bölümü kaldırıldı: brief §4.4/§10 ikinci tahsilatı
 * tümden sildi (depozito zaten AYNA'nın komisyonu), dolayısıyla kesilecek
 * fatura da kalmadı. Yerine brief'in istediği üç kuyruk geldi.
 */
function RandevuKuyruklari() {
  const { onayla, formAl } = useDiyalog();
  const dekont = useAsync<DekontSatiri[]>(() => api.dekontKuyrugu(), []);
  const iade = useAsync<IadeSatiri[]>(() => api.iadeKuyrugu(), []);
  const uzlasma = useAsync<UzlasmaSatiri[]>(() => api.uzlasmaKuyrugu(), []);
  const [msg, setMsg] = useState<string | null>(null);
  const kzt = (n: number) => `${n.toLocaleString('tr-TR')} ₸`;
  return (
    <>
      {/* ── §8.1 Dekont doğrulama ── */}
      <div className="section-title">Dekont doğrulama ({dekont.data?.length ?? 0})</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="meta full" style={{ marginBottom: 8 }}>
          Randevu dekont yüklenince ZATEN kesinleşti. Bu kuyruk sahte dekontu sonradan yakalamak
          için. Reddedersen randevu iptal olur ve kullanıcı yasaklanır.
        </div>
        {!dekont.data?.length ? (
          <div className="empty">Bekleyen dekont yok</div>
        ) : (
          dekont.data.map((b) => (
            <div key={b.id} className="row">
              <div className="grow">
                <div>
                  <b>{b.proName}</b> · {b.service}
                </div>
                <div className="meta">
                  {new Date(b.startAt).toLocaleString('tr-TR')} · depozito {kzt(b.deposit)} /{' '}
                  {kzt(b.price)}
                </div>
                {/* ÖDEME KODU + RANDEVU NO. Dekont bir görselden ibaretti;
                    admin, banka ekstresindeki transferi hangi randevuya
                    yazacağını bulamıyordu. Müşterinin Kaspi açıklamasına
                    yazdığı kodun aynısı burada. */}
                <div className="meta">
                  kod <code>{b.odemeKodu}</code> · randevu <code>{b.id}</code>
                </div>
              </div>
              {b.depositReceiptUri ? (
                <a className="btn-sm" href={b.depositReceiptUri} target="_blank" rel="noreferrer">
                  Dekontu aç
                </a>
              ) : null}
              <button
                className="btn-sm btn-ok"
                onClick={async () => {
                  await api.dekontOnayla(b.id);
                  setMsg('Dekont doğrulandı');
                  dekont.reload();
                }}
              >
                Doğrula
              </button>
              <button
                className="btn-sm btn-danger"
                onClick={async () => {
                  // Yıkıcı: randevu iptal + hesap yasaklı. Onay istemek şart.
                  if (
                    !(await onayla({
                      baslik: 'Sahte dekont olarak işaretle',
                      mesaj:
                        'Randevu iptal edilecek ve kullanıcının hesabı yasaklanacak. Bu işlem geri alınamaz.',
                      onayEtiket: 'Sahte olarak işaretle',
                      tehlikeli: true,
                    }))
                  )
                    return;
                  await api.dekontReddet(b.id);
                  setMsg('Dekont reddedildi, kullanıcı yasaklandı');
                  dekont.reload();
                }}
              >
                Sahte
              </button>
            </div>
          ))
        )}
      </div>
      {/* ── §8.2 İadeler ── */}
      <div className="section-title">İadeler ({iade.data?.length ?? 0})</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="meta full" style={{ marginBottom: 8 }}>
          Müşteri iadeleri ve müşteri no-show'unda uzmana ödenecek %9 payı AYNI kuyruktan işlenir.
          İç hedef: 24 saat.
        </div>
        {!iade.data?.length ? (
          <div className="empty">Bekleyen iade yok</div>
        ) : (
          iade.data.map((r) => (
            <div key={r.id} className="row">
              <div className="grow">
                <div>
                  <b>{kzt(Number(r.amount))}</b> ·{' '}
                  {r.kind === 'musteri_iade' ? 'Müşteri iadesi' : 'Uzman payı (%9)'}
                </div>
                {/* PII: ödeme bilgisi yalnız burada görünür, log'a yazılmaz. */}
                <div className="meta">
                  {r.payoutInfo || 'hesap bilgisi girilmemiş'} ·{' '}
                  {new Date(r.createdAt).toLocaleString('tr-TR')}
                </div>
              </div>
              <button
                className="btn-sm btn-ok"
                onClick={async () => {
                  await api.iadeOdendi(r.id);
                  setMsg('İade ödendi olarak işaretlendi');
                  iade.reload();
                }}
              >
                Ödendi
              </button>
            </div>
          ))
        )}
      </div>
      {/* ── §8.3 Uzlaşma ── */}
      <div className="section-title">Uzlaşma kayıtları ({uzlasma.data?.length ?? 0})</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="meta full" style={{ marginBottom: 8 }}>
          "Gelmedi" ve ödeme itirazları. %90'lık doğrudan ödemede AYNA hakem DEĞİLDİR — o yüzden
          "karar yok" seçeneği var.
        </div>
        {!uzlasma.data?.length ? (
          <div className="empty">Bekleyen uzlaşma yok</div>
        ) : (
          uzlasma.data.map((u) => (
            <div key={u.id} className="row">
              <div className="grow">
                <div>
                  <b>{u.kind === 'no_show' ? 'Gelmedi itirazı' : 'Ödeme itirazı'}</b>
                </div>
                <div className="meta">{u.reason || 'gerekçe yazılmamış'}</div>
                {u.evidence.length ? (
                  <div className="meta">{u.evidence.length} kanıt eklendi</div>
                ) : null}
              </div>
              {(
                [
                  ['musteri_lehine', 'Müşteri lehine'],
                  ['uzman_lehine', 'Uzman lehine'],
                  ['karar_yok', 'Karar yok'],
                ] as const
              ).map(([k, etiket]) => (
                <button
                  key={k}
                  className="btn-sm"
                  onClick={async () => {
                    const v = await formAl({
                      baslik: `Uzlaşma — ${etiket}`,
                      mesaj: 'Karar denetim kaydına yazılır.',
                      alanlar: [
                        {
                          ad: 'not',
                          etiket: 'Telefon teyidi / not',
                          tur: 'uzun',
                          ipucu: 'İsteğe bağlı',
                        },
                      ],
                      onayEtiket: etiket,
                    });
                    if (!v) return;
                    await api.uzlasmaCoz(u.id, k, (v.not ?? '').trim());
                    setMsg('Uzlaşma çözüldü');
                    uzlasma.reload();
                  }}
                >
                  {etiket}
                </button>
              ))}
            </div>
          ))
        )}
      </div>
      {msg ? (
        <div className="meta full" style={{ color: 'var(--success)' }}>
          {msg}
        </div>
      ) : null}
    </>
  );
}
function CommissionsView() {
  const { formAl, bildir } = useDiyalog();
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
      <div className="mb-6">
        <h1 className="flex flex-wrap items-center gap-2 text-ax-2xl font-extrabold leading-tight tracking-[-0.7px] text-ink">
          Komisyonlar{' '}
          {data ? (
            <button
              className="btn-sm"
              onClick={() =>
                exportCsv(
                  'ayna-komisyon.csv',
                  data.salons.map((r) => ({
                    uzman_salon: r.proName,
                    randevu: r.count,
                    ciro: r.gmv,
                    komisyon: r.earned,
                    bekleyen: r.pending,
                    tahsil: r.collected,
                    kalan: r.outstanding,
                  })),
                )
              }
            >
              ⬇ Excel
            </button>
          ) : null}
        </h1>
        <p className="mt-1 max-w-[70ch] text-ax-md leading-relaxed text-ink-3">
          App üzerinden alınan online randevulardan platform komisyonu (offline salon kayıtları
          hariç)
        </p>
      </div>
      {loading || !data ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat v={TL(data.totals.earned)} l="Kazanılan komisyon" />
            <Stat v={TL(data.totals.collected)} l="Tahsil edilen" />
            <Stat v={TL(data.totals.outstanding)} l="Açık alacak" />
            <Stat v={`%${data.rate}`} l={`Oran · ${data.totals.count} online randevu`} />
          </div>
          <SectionTitle>Komisyon oranı</SectionTitle>
          <Card>
            <div className="list-row">
              <div className="grow">
                <div className="name">Güncel oran: %{data.rate}</div>
                <div className="meta">
                  Her online randevu tutarının %{data.rate}'i platforma kalır (GMV:{' '}
                  {TL(data.totals.gmv)})
                </div>
              </div>
              <input
                className="input h-[34px] w-[90px]"
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
          </Card>
          <SectionTitle>Salon bazında — alacak & tahsilat</SectionTitle>
          <Card>
            {data.salons.length === 0 ? (
              <Loading label="Online randevu yok" />
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
                    <span className="pill bg-line text-ink-3">Alacak yok</span>
                  )}
                  {s.outstanding > 0 ? (
                    <button
                      className="btn-sm btn-ok"
                      onClick={async () => {
                        const v = await formAl({
                          baslik: `${s.proName} — tahsilat`,
                          mesaj: `Ödenmemiş komisyon: ${s.outstanding.toLocaleString('tr-TR')} ₸`,
                          alanlar: [
                            {
                              ad: 'tutar',
                              etiket: 'Tahsil edilecek tutar (₸)',
                              tur: 'number',
                              deger: String(s.outstanding),
                              zorunlu: true,
                            },
                          ],
                          onayEtiket: 'Tahsilatı kaydet',
                        });
                        if (!v) return;
                        const amount = Number(v.tutar);
                        // Para kaydı: geçersiz tutar sessizce yazılmamalı.
                        if (!Number.isFinite(amount) || amount <= 0) {
                          bildir('Tutar geçerli bir sayı olmalı.', true);
                          return;
                        }
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
          </Card>
          {data.payouts.length > 0 ? (
            <>
              <SectionTitle>Tahsilat geçmişi</SectionTitle>
              <Card>
                {data.payouts.map((p) => (
                  <div key={p.id} className="list-row">
                    <div className="grow">
                      <div className="name">{p.proName}</div>
                      <div className="meta">
                        {new Date(p.createdAt).toLocaleDateString('tr-TR')}
                        {p.note ? ` · ${p.note}` : ''}
                      </div>
                    </div>
                    <div className="kv-v text-ok">{TL(p.amount)}</div>
                  </div>
                ))}
              </Card>
            </>
          ) : null}
          <RandevuKuyruklari />
          <SectionTitle>Randevu kayıtları ({data.items.length})</SectionTitle>
          <Card>
            {data.items.length === 0 ? (
              <Loading label="Kayıt yok" />
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
          </Card>
        </>
      )}
    </>
  );
}
const ENTITY_LABEL: Record<string, string> = {
  llp: 'ТОО / LLP (tüzel kişi)',
  ip: 'ИП (bireysel girişimci)',
  freelance: 'Serbest uzman',
  branch: 'Salon şubesi',
};
const VERIFY_CHECKS: { key: keyof BizVerification; label: string }[] = [
  { key: 'identity', label: 'Kimlik' },
  { key: 'business', label: 'İşletme' },
  { key: 'bin', label: 'BİN' },
  { key: 'address', label: 'Adres' },
  { key: 'social', label: 'Sosyal medya' },
];
function BusinessesView() {
  const { formAl } = useDiyalog();
  const [status, setStatus] = useState<string>('pending');
  const [detail, setDetail] = useState<BusinessDetail | null>(null);
  const { data, reload } = useAsync<Business[]>(() => api.businesses(status), [status]);
  const act = async (id: string, kind: 'approve' | 'reject') => {
    if (kind === 'approve') await api.approveBusiness(id);
    else {
      const v = await formAl({
        baslik: 'Salon başvurusunu reddet',
        mesaj: 'Gerekçe başvuru sahibine iletilir.',
        alanlar: [{ ad: 'sebep', etiket: 'Red sebebi', tur: 'uzun', zorunlu: true }],
        onayEtiket: 'Reddet',
      });
      if (!v) return;
      await api.rejectBusiness(id, (v.sebep ?? '').trim());
    }
    setDetail(null);
    reload();
  };
  const decide = async (id: string, status: string, defaultReason?: string) => {
    let reason: string | undefined;
    if (status === 'needs_docs') {
      const v = await formAl({
        baslik: 'Eksik belge iste',
        mesaj: 'Hangi belgenin eksik olduğu başvuru sahibine iletilir.',
        alanlar: [
          {
            ad: 'belge',
            etiket: 'Eksik belge / açıklama',
            tur: 'uzun',
            deger: defaultReason ?? '',
            zorunlu: true,
          },
        ],
        onayEtiket: 'Gönder',
      });
      if (!v) return;
      reason = (v.belge ?? '').trim();
    }
    await api.decisionBusiness(id, status, reason);
    setDetail(null);
    reload();
  };
  const toggleVerify = async (key: keyof BizVerification, on: boolean) => {
    if (!detail) return;
    const r = await api.verifyBusiness(detail.id, { [key]: on });
    setDetail({ ...detail, verification: r.verification });
  };
  const openDetail = async (id: string) => setDetail(await api.businessDetail(id));
  return (
    <>
      <PageHead
        title="Salon başvuruları"
        sub="Salon (işletme) kayıt onayları ve durum yönetimi"
      />
      <Toolbar>
        {['pending', 'approved', 'rejected'].map((s) => (
          <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
            {s === 'pending' ? 'Onay bekleyen' : s === 'approved' ? 'Onaylı' : 'Reddedilen'}
          </Chip>
        ))}
      </Toolbar>
      <Card>
        {!data || data.length === 0 ? (
          <Loading label="Kayıt yok" />
        ) : (
          data.map((b) => (
            <div key={b.id} className="list-row">
              <div className="grow cursor-pointer" onClick={() => openDetail(b.id)}>
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
      </Card>
      {detail ? (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="text-ax-xl font-extrabold tracking-[-0.4px] text-ink">
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
              <KV k="İşletme türü" v={ENTITY_LABEL[detail.entityType ?? ''] ?? '—'} />
              <KV k="BİN / IIN" v={detail.bin || '—'} />
              <KV k="Resmî ad" v={detail.legalName || '—'} />
              <KV k="Yönetici" v={detail.managerName || '—'} />
              <KV k="OKED" v={detail.oked || '—'} />
              <KV k="KDV mükellefi" v={detail.vatPayer ? 'Evet' : 'Hayır'} />
              <KV k="Sahip" v={detail.ownerName} />
              <KV k="Sektör" v={detail.sector} />
              <KV k="Telefon" v={detail.phone} />
              <KV k="E-posta" v={detail.email || '—'} />
              <KV k="Instagram" v={detail.socialInstagram || '—'} />
              <KV k="Çalışma saatleri" v={detail.workingHours || '—'} />
              <KV k="Adres" v={`${detail.city} / ${detail.district} ${detail.address}`.trim()} />
              <KV k="Kategoriler" v={detail.categories.join(', ') || '—'} />
              <KV k="Ekip (uzman)" v={String(detail.specialistCount)} />
              <KV
                k="Belge"
                v={
                  detail.docUrl ? `Yüklendi${detail.docType ? ' · ' + detail.docType : ''}` : 'Yok'
                }
              />
            </div>
            {/* §3.3 — Katmanlı doğrulama kontrol listesi (admin işaretler) */}
            <SectionTitle>Doğrulama kontrol listesi</SectionTitle>
            <div className="verify-grid">
              {VERIFY_CHECKS.map((vc) => {
                const on = detail.verification?.[vc.key] ?? false;
                return (
                  <button
                    key={vc.key}
                    className={`verify-chip ${on ? 'on' : ''}`}
                    onClick={() => toggleVerify(vc.key, !on)}
                  >
                    {on ? '✓' : '○'} {vc.label}
                  </button>
                );
              })}
            </div>
            {detail.docUrl ? (
              <a
                className="btn-sm btn-ghost mt-2"
                href={detail.docUrl}
                target="_blank"
                rel="noreferrer"
              >
                Belgeyi aç ↗
              </a>
            ) : null}
            {detail.reviewNote ? (
              <p className="mt-4 text-ax-md leading-relaxed text-ink-3">Not: {detail.reviewNote}</p>
            ) : null}
            {detail.about ? <p className="about">{detail.about}</p> : null}
            {detail.rejectReason ? (
              <p className="mt-3 text-ax-sm text-err">Red sebebi: {detail.rejectReason}</p>
            ) : null}
            <div className="modal-actions">
              {detail.status !== 'approved' ? (
                <button className="btn-sm btn-ok" onClick={() => act(detail.id, 'approve')}>
                  Onayla
                </button>
              ) : null}
              <button
                className="btn-sm btn-ghost"
                onClick={() => decide(detail.id, 'needs_docs', 'Ek belge gerekli')}
              >
                Ek belge iste
              </button>
              <button
                className="btn-sm btn-ghost"
                onClick={() => decide(detail.id, 'under_review')}
              >
                İncelemeye al
              </button>
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
const SP_ENTITY_LABEL: Record<string, string> = {
  freelance: 'Serbest çalışan',
  ip: 'ИП (kayıtlı bireysel girişimci)',
};
// Kimlik = KYC (ayrı kuyruk, salt-okunur burada). Sertifika + Sosyal = admin işaretler.
const SP_VERIFY_CHECKS: { key: 'cert' | 'social'; label: string }[] = [
  { key: 'cert', label: 'Sertifika' },
  { key: 'social', label: 'Sosyal medya' },
];
function SpecialistsView() {
  const { onayla } = useDiyalog();
  const [detail, setDetail] = useState<SpecialistDetail | null>(null);
  const { data, reload } = useAsync<SpecialistRow[]>(() => api.specialists(), []);
  const openDetail = async (id: string) => setDetail(await api.specialistDetail(id));
  const toggleVerify = async (key: 'cert' | 'social', on: boolean) => {
    if (!detail) return;
    const r = await api.verifySpecialist(detail.id, { [key]: on });
    setDetail({
      ...detail,
      verification: {
        ...detail.verification,
        cert: r.verification.cert,
        social: r.verification.social,
      },
      aynaVerified: detail.verification.identity && (r.verification.cert || r.verification.social),
    });
  };
  return (
    <>
      <PageHead
        title="Uzman doğrulama"
        sub="Bağımsız uzman katmanlı doğrulama — kimlik (KYC), sertifika, sosyal medya → AYNA Onaylı"
      />
      <Card className="p-2">
        {!data || data.length === 0 ? (
          <Loading label="Kayıt yok" />
        ) : (
          data.map((s) => (
            <div key={s.id} className="list-row">
              <div className="grow cursor-pointer" onClick={() => openDetail(s.id)}>
                <div className="name">
                  {s.name} {s.aynaVerified ? '🛡️' : ''}
                  {/*
                    HESAP AÇIK MI. Rozetlerden ayrı bir şey: rozet "neyi
                    doğruladık", bu ise "çalışabilir mi". Onaysız uzman
                    katalogda görünmüyor ve randevu alamıyor.
                  */}
                  <span
                    className={`pill ml-2 ${s.status === 'approved' ? 'approved' : s.status === 'rejected' ? 'rejected' : 'pending'}`}
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
              </div>
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
              <button className="btn-sm btn-ghost" onClick={() => openDetail(s.id)}>
                Detay
              </button>
            </div>
          ))
        )}
      </Card>
      {detail ? (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="text-ax-xl font-bold text-ink">
                  {detail.name} {detail.aynaVerified ? '🛡️ AYNA Onaylı' : ''}
                </div>
                <span
                  className={`pill ${detail.kycStatus === 'approved' ? 'approved' : 'pending'}`}
                >
                  KYC: {detail.kycStatus}
                </span>
              </div>
              <button className="btn-sm btn-ghost" onClick={() => setDetail(null)}>
                Kapat
              </button>
            </div>
            <div className="kv-grid">
              <KV k="Uzman türü" v={SP_ENTITY_LABEL[detail.entityType] ?? detail.entityType} />
              <KV k="IIN" v={detail.iin || '—'} />
              <KV k="Şehir" v={detail.city || '—'} />
              <KV k="Sertifika sayısı" v={String(detail.certificates.length)} />
              <KV k="Instagram" v={detail.socialInstagram || '—'} />
              <KV k="Sosyal doğrulama kodu" v={detail.socialVerifyCode || '—'} />
              <KV k="Bio" v={detail.bio || '—'} />
            </div>
            <h3 className="section-head mt-3.5">
              Doğrulama kontrol listesi
            </h3>
            <p className="page-sub mt-0">
              Kimlik, KYC kuyruğundan onaylanır. Sertifika ve sosyal medyayı burada işaretle.
            </p>
            <div className="verify-grid">
              <div className={`verify-chip ${detail.verification.identity ? 'on' : ''}`}>
                {detail.verification.identity ? '✓' : '○'} Kimlik (KYC)
              </div>
              {SP_VERIFY_CHECKS.map((vc) => {
                const on = detail.verification[vc.key];
                return (
                  <button
                    key={vc.key}
                    className={`verify-chip ${on ? 'on' : ''}`}
                    onClick={() => toggleVerify(vc.key, !on)}
                  >
                    {on ? '✓' : '○'} {vc.label}
                  </button>
                );
              })}
            </div>
            {detail.certificates.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2.5">
                {detail.certificates.map((c, i) => (
                  <a key={i} href={c} target="_blank" rel="noreferrer">
                    <img
                      src={c}
                      alt={`sertifika ${i + 1}`}
                      className="w-[72px] h-[72px] object-cover rounded-sm border border-line"
                    />
                  </a>
                ))}
              </div>
            ) : null}
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
function ReguleHizmetView() {
  const { onayla } = useDiyalog();
  const { data, reload } = useAsync<RegulatedServiceFlag[]>(() => api.regulatedServices(), []);

  const karar = async (f: RegulatedServiceFlag, k: 'cleared' | 'removed') => {
    const kaldir = k === 'removed';
    if (
      await onayla({
        baslik: kaldir ? 'Hizmet kaldırıldı olarak işaretle' : 'Sorun yok',
        mesaj: kaldir
          ? `"${f.serviceName}" hizmeti için uzman uyarılacak ve kayıt iz olarak kalacak.`
          : `"${f.serviceName}" sorunsuz sayılacak ve bu ad bir daha kuyruğa düşmeyecek.`,
        onayEtiket: kaldir ? 'Kaldırıldı' : 'Sorun yok',
      })
    ) {
      await api.decideRegulatedService(f.id, k);
      reload();
    }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-ax-2xl font-extrabold leading-tight tracking-[-0.7px] text-ink">
          Regüle hizmet uyarıları
        </h1>
        <p className="mt-1 max-w-[70ch] text-ax-md leading-relaxed text-ink-3">
          Botoks, dolgu, mezoterapi, diş estetiği ve beslenme danışmanlığı lisans gerektirdiği için
          katalogda yok. Uzman bu işlemleri kendi yazdığı hizmet adına girerse satır buraya düşer.{' '}
          <strong className="font-bold text-ink">Kayıt engellenmedi</strong> — karar sende.
        </p>
      </div>
      <Card>
        {!data || data.length === 0 ? (
          <Loading label="Bekleyen uyarı yok" />
        ) : (
          data.map((f) => (
            <div key={f.id} className="border-b border-line-2 p-4 last:border-b-0">
              <div className="flex flex-wrap items-center gap-2 text-ax-md font-bold tracking-[-0.15px] text-ink">
                {f.proName || f.proId} <span className="pill pending">{f.reason}</span>
              </div>
              {/*
               * Uzmanın YAZDIĞI ad aynen gösteriliyor: yöneticinin kararı
               * buna dayanıyor. Özetlemek ya da kısaltmak, kararı verenden
               * kanıtı saklamak olurdu.
               */}
              <div className="mt-1 text-ax-sm text-ink-3">
                “{f.serviceName}”{f.city ? ` · ${f.city}` : ''} ·{' '}
                {new Date(f.createdAt).toLocaleDateString('tr-TR')}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-sm" onClick={() => void karar(f, 'cleared')}>
                  Sorun yok
                </button>
                <button className="btn-sm btn-primary" onClick={() => void karar(f, 'removed')}>
                  Kaldırıldı
                </button>
              </div>
            </div>
          ))
        )}
      </Card>
    </>
  );
}

function ModerationView() {
  const { onayla } = useDiyalog();
  const { data, reload } = useAsync<AdminReview[]>(() => api.reviews(), []);
  const { data: circle, reload: reloadCircle } = useAsync<CirclePost[]>(
    () => api.circleQueue(),
    [],
  );
  const hide = async (id: string) => {
    if (
      await onayla({
        baslik: 'Yorumu gizle',
        mesaj: 'Yorum moderasyon gereği gizlenecek.',
        onayEtiket: 'Gizle',
      })
    ) {
      await api.hideReview(id);
      reload();
    }
  };
  const moderateCircle = async (id: string, decision: 'approve' | 'hide') => {
    await api.moderateCircle(id, decision);
    reloadCircle();
  };
  return (
    <>
      <PageHead
        title="Topluluk moderasyonu"
        sub="W2W onay kuyruğu (otomatik filtre + şikâyet) · görünür yorumlar. Sabit ilke: dürüst eleştiri silinmez."
      />
      {/* §12.5 — W2W moderasyon kuyruğu (pending + şikâyetle gizlenen) */}
      <SectionTitle>W2W kuyruğu ({circle?.length ?? 0})</SectionTitle>
      <Card className="mb-6">
        {!circle || circle.length === 0 ? (
          <Loading label="Bekleyen W2W içeriği yok" />
        ) : (
          circle.map((p) => (
            <div key={p.id} className="list-col">
              <div className="name">
                {p.category} · {p.authorLabel}{' '}
                <span className={`pill ${p.status === 'hidden' ? 'rejected' : 'pending'}`}>
                  {p.status === 'hidden' ? `${p.reports} şikâyet` : 'moderasyon'}
                </span>
              </div>
              <div className="mt-1 text-ax-sm leading-relaxed text-ink-2">{p.text}</div>
              {p.moderationReason ? (
                <div className="mt-0.5 text-ax-sm text-ink-3">Sebep: {p.moderationReason}</div>
              ) : null}
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button className="btn-sm btn-ok" onClick={() => moderateCircle(p.id, 'approve')}>
                  Onayla (yayınla)
                </button>
                <button className="btn-sm btn-danger" onClick={() => moderateCircle(p.id, 'hide')}>
                  Gizle
                </button>
              </div>
            </div>
          ))
        )}
      </Card>
      <SectionTitle>Görünür yorumlar</SectionTitle>
      <Card>
        {!data || data.length === 0 ? (
          <Loading label="Görünür yorum yok" />
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
      </Card>
    </>
  );
}
function CampaignsView() {
  const { onayla } = useDiyalog();
  const { data, reload } = useAsync<Campaign[]>(() => api.campaigns(), []);
  const empty = {
    title: '',
    subtitle: '',
    titleKk: '',
    subtitleKk: '',
    titleRu: '',
    subtitleRu: '',
    badge: '',
    image: '',
    category: '',
  };
  const [form, setForm] = useState(empty);
  const [lang, setLang] = useState<Lang>('tr');
  const tKey = (
    lang === 'tr' ? 'title' : lang === 'kk' ? 'titleKk' : 'titleRu'
  ) as keyof typeof form;
  const sKey = (
    lang === 'tr' ? 'subtitle' : lang === 'kk' ? 'subtitleKk' : 'subtitleRu'
  ) as keyof typeof form;
  const create = async () => {
    if (form.title.length < 2 || !form.image) return; // tr (kaynak) zorunlu
    await api.createCampaign({
      title: form.title,
      subtitle: form.subtitle || undefined,
      i18n: buildI18n({
        title: { kk: form.titleKk, ru: form.titleRu },
        subtitle: { kk: form.subtitleKk, ru: form.subtitleRu },
      }),
      badge: form.badge || undefined,
      image: form.image,
      category: form.category || undefined,
    });
    setForm(empty);
    setLang('tr');
    reload();
  };
  return (
    <>
      <PageHead title="Kampanyalar" sub="Keşif vitrinindeki kampanyaları yönet" />
      <Card className="mb-5">
        <div className="form-inline">
          <LangTabs
            lang={lang}
            setLang={setLang}
            filled={(l) =>
              l === 'kk' ? !!form.titleKk || !!form.subtitleKk : !!form.titleRu || !!form.subtitleRu
            }
          />
          <input
            className="input"
            placeholder={lang === 'tr' ? 'Başlık (TR — kaynak)' : `Başlık (${lang.toUpperCase()})`}
            value={form[tKey]}
            onChange={(e) => setForm({ ...form, [tKey]: e.target.value })}
          />
          <input
            className="input"
            placeholder={lang === 'tr' ? 'Alt başlık (TR)' : `Alt başlık (${lang.toUpperCase()})`}
            value={form[sKey]}
            onChange={(e) => setForm({ ...form, [sKey]: e.target.value })}
          />
          <input
            className="input"
            placeholder="Rozet (örn. %25) — dilden bağımsız"
            value={form.badge}
            onChange={(e) => setForm({ ...form, badge: e.target.value })}
          />
          <input
            className="input"
            placeholder="Kategori kodu (örn. hair)"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <input
            className="input full"
            placeholder="Görsel URL (https://...)"
            value={form.image}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
          />
          <button className="btn-sm btn-ok full" onClick={create}>
            + Kampanya ekle
          </button>
        </div>
      </Card>
      <Card>
        {!data || data.length === 0 ? (
          <Loading label="Kampanya yok" />
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
                  if (
                    await onayla({
                      baslik: 'Kampanyayı sil',
                      mesaj: 'Bu kampanya kalıcı olarak silinecek.',
                      onayEtiket: 'Sil',
                      tehlikeli: true,
                    })
                  ) {
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
      </Card>
    </>
  );
}
function ContentView() {
  const { onayla, formAl } = useDiyalog();
  const { data: articles, reload: reloadArticles } = useAsync<BlogArticle[]>(
    () => api.blogArticles(),
    [],
  );
  const { data: apps, reload: reloadApps } = useAsync<BlogApplication[]>(
    () => api.blogApplications(),
    [],
  );
  const { data: themes, reload: reloadThemes } = useAsync<WeeklyTheme[]>(() => api.themes(), []);
  const empty: ArticleInput = {
    title: '',
    tag: '',
    categoryCode: '',
    contentType: 'guide',
    readMin: 3,
    image: '',
    excerpt: '',
    body: [''],
    published: true,
  };
  const [form, setForm] = useState<ArticleInput>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  // §14.5 — kk/ru override alanları (blog: title/tag/excerpt/body). body = satır bazlı metin.
  const blankOv = {
    kk: { title: '', tag: '', excerpt: '', body: '' },
    ru: { title: '', tag: '', excerpt: '', body: '' },
  };
  const [ov, setOv] = useState(blankOv);
  const [lang, setLang] = useState<Lang>('tr');
  type BField = 'title' | 'tag' | 'excerpt' | 'body';
  const fieldVal = (f: BField): string => {
    if (lang === 'tr')
      return f === 'body' ? (form.body ?? []).join('\n') : ((form[f] as string) ?? '');
    return ov[lang][f];
  };
  const setFieldVal = (f: BField, v: string) => {
    if (lang === 'tr') {
      if (f === 'body') setForm({ ...form, body: v.split('\n') });
      else setForm({ ...form, [f]: v });
    } else {
      setOv({ ...ov, [lang]: { ...ov[lang], [f]: v } });
    }
  };
  const buildArticleI18n = (): I18nOverride | undefined => {
    const out: I18nOverride = {};
    for (const loc of ['kk', 'ru'] as const) {
      const o = ov[loc];
      const entry: Record<string, string | string[]> = {};
      if (o.title.trim()) entry.title = o.title.trim();
      if (o.tag.trim()) entry.tag = o.tag.trim();
      if (o.excerpt.trim()) entry.excerpt = o.excerpt.trim();
      const b = o.body
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean);
      if (b.length) entry.body = b;
      if (Object.keys(entry).length) out[loc] = entry;
    }
    return Object.keys(out).length ? out : undefined;
  };
  const resetForm = () => {
    setForm(empty);
    setOv(blankOv);
    setLang('tr');
    setEditId(null);
  };
  const save = async () => {
    const body = (form.body ?? []).map((p) => p.trim()).filter(Boolean);
    if (form.title.length < 3 || !form.tag || !form.excerpt || body.length === 0) return; // tr (kaynak) zorunlu
    const payload: ArticleInput = {
      ...form,
      body,
      i18n: buildArticleI18n(),
      categoryCode: form.categoryCode || null,
      contentType: form.contentType || 'guide',
    };
    if (editId) await api.updateArticle(editId, payload);
    else await api.createArticle(payload);
    resetForm();
    reloadArticles();
  };
  const edit = (a: BlogArticle) => {
    setEditId(a.id);
    setForm({
      title: a.title,
      tag: a.tag,
      categoryCode: a.categoryCode ?? '',
      contentType: (a as { contentType?: string }).contentType ?? 'guide',
      readMin: a.readMin,
      image: a.image,
      excerpt: a.excerpt,
      body: a.body.length ? a.body : [''],
      published: a.published,
    });
    // §14.5 — mevcut kk/ru override'ları ön-doldur (varsa)
    const i = a.i18n ?? {};
    const asStr = (v: unknown): string =>
      Array.isArray(v) ? v.join('\n') : typeof v === 'string' ? v : '';
    setOv({
      kk: {
        title: asStr(i.kk?.title),
        tag: asStr(i.kk?.tag),
        excerpt: asStr(i.kk?.excerpt),
        body: asStr(i.kk?.body),
      },
      ru: {
        title: asStr(i.ru?.title),
        tag: asStr(i.ru?.tag),
        excerpt: asStr(i.ru?.excerpt),
        body: asStr(i.ru?.body),
      },
    });
    setLang('tr');
  };
  const emptyTheme = {
    title: '',
    prompt: '',
    titleKk: '',
    promptKk: '',
    titleRu: '',
    promptRu: '',
    weekStart: '',
  };
  const [themeForm, setThemeForm] = useState(emptyTheme);
  const [themeLang, setThemeLang] = useState<Lang>('tr');
  const thT = (
    themeLang === 'tr' ? 'title' : themeLang === 'kk' ? 'titleKk' : 'titleRu'
  ) as keyof typeof themeForm;
  const thP = (
    themeLang === 'tr' ? 'prompt' : themeLang === 'kk' ? 'promptKk' : 'promptRu'
  ) as keyof typeof themeForm;
  const createTheme = async () => {
    if (themeForm.title.length < 2 || themeForm.prompt.length < 2) return; // tr (kaynak) zorunlu
    await api.createTheme({
      title: themeForm.title,
      prompt: themeForm.prompt,
      weekStart: themeForm.weekStart || new Date().toISOString(),
      i18n: buildI18n({
        title: { kk: themeForm.titleKk, ru: themeForm.titleRu },
        prompt: { kk: themeForm.promptKk, ru: themeForm.promptRu },
      }),
    });
    setThemeForm(emptyTheme);
    setThemeLang('tr');
    reloadThemes();
  };
  const pending = (apps ?? []).filter((a) => a.status === 'pending');
  const reviewed = (apps ?? []).filter((a) => a.status !== 'pending');
  return (
    <>
      <PageHead
        title="Blog & tema"
        sub="AYNA Blog editörü · kullanıcı başvuruları (onayla → puan) · haftalık W2W teması"
      />
      {/* Blog editörü */}
      <SectionTitle>{editId ? 'Yazıyı düzenle' : 'Yeni yazı'}</SectionTitle>
      <Card className="mb-5">
        <div className="form-inline">
          <LangTabs
            lang={lang}
            setLang={setLang}
            filled={(l) => l !== 'tr' && Object.values(ov[l]).some((v) => !!v.trim())}
          />
          <input
            className="input"
            placeholder={lang === 'tr' ? 'Başlık (TR — kaynak)' : `Başlık (${lang.toUpperCase()})`}
            value={fieldVal('title')}
            onChange={(e) => setFieldVal('title', e.target.value)}
          />
          <input
            className="input"
            placeholder={lang === 'tr' ? 'Etiket (örn. Bakım)' : `Etiket (${lang.toUpperCase()})`}
            value={fieldVal('tag')}
            onChange={(e) => setFieldVal('tag', e.target.value)}
          />
          <input
            className="input"
            placeholder="Kategori kodu → Teklif al CTA (örn. hair)"
            value={form.categoryCode ?? ''}
            onChange={(e) => setForm({ ...form, categoryCode: e.target.value })}
          />
          <select
            className="input"
            value={form.contentType ?? 'guide'}
            onChange={(e) => setForm({ ...form, contentType: e.target.value })}
          >
            <option value="guide">Rehber</option>
            <option value="trend">Trend (Keşfet bandı)</option>
            <option value="care_plan">Bakım planı</option>
            <option value="expert_spotlight">Uzman vitrini</option>
            <option value="listicle">Listicle</option>
          </select>
          <input
            className="input"
            type="number"
            placeholder="Okuma dk"
            value={form.readMin ?? 3}
            onChange={(e) => setForm({ ...form, readMin: Number(e.target.value) })}
          />
          <input
            className="input full"
            placeholder="Görsel URL (https://...)"
            value={form.image ?? ''}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
          />
          <input
            className="input full"
            placeholder={
              lang === 'tr' ? 'Özet (kart altında görünür)' : `Özet (${lang.toUpperCase()})`
            }
            value={fieldVal('excerpt')}
            onChange={(e) => setFieldVal('excerpt', e.target.value)}
          />
          <textarea
            className="input full"
            placeholder={
              lang === 'tr'
                ? 'İçerik — her satır bir paragraf'
                : `İçerik (${lang.toUpperCase()}) — her satır bir paragraf`
            }
            rows={6}
            value={fieldVal('body')}
            onChange={(e) => setFieldVal('body', e.target.value)}
          />
          <label className="check">
            <input
              type="checkbox"
              checked={form.published ?? false}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
            />
            Yayında
          </label>
          <button className="btn-sm btn-ok" onClick={save}>
            {editId ? 'Kaydet' : '+ Yazı ekle'}
          </button>
          {editId && (
            <button className="btn-sm" onClick={resetForm}>
              Vazgeç
            </button>
          )}
        </div>
      </Card>
      <Card className="mb-7">
        {!articles || articles.length === 0 ? (
          <Loading label="Yazı yok" />
        ) : (
          articles.map((a) => (
            <div key={a.id} className="list-row">
              {a.image ? <img className="thumb" src={a.image} alt="" /> : <div className="thumb" />}
              <div className="grow">
                <div className="name">
                  {a.tag} · {a.title}
                </div>
                <div className="meta">
                  {a.excerpt}
                  {a.categoryCode ? ` · CTA: ${a.categoryCode}` : ''} · {a.readMin} dk
                </div>
              </div>
              <button
                className={`switch ${a.published ? 'on' : 'off'}`}
                onClick={async () => {
                  await api.updateArticle(a.id, { published: !a.published });
                  reloadArticles();
                }}
              >
                {a.published ? 'Yayında' : 'Taslak'}
              </button>
              <button className="btn-sm" onClick={() => edit(a)}>
                Düzenle
              </button>
              <button
                className="btn-sm btn-danger"
                onClick={async () => {
                  if (
                    await onayla({
                      baslik: 'Yazıyı sil',
                      mesaj: 'Bu blog yazısı kalıcı olarak silinecek.',
                      onayEtiket: 'Sil',
                      tehlikeli: true,
                    })
                  ) {
                    await api.deleteArticle(a.id);
                    reloadArticles();
                  }
                }}
              >
                Sil
              </button>
            </div>
          ))
        )}
      </Card>
      {/* Kullanıcı blog başvuruları */}
      <h2 className="section-head">Kullanıcı blog başvuruları</h2>
      <p className="mb-6 mt-1 max-w-[70ch] text-ax-md leading-relaxed text-ink-3">
        Onaylanan başvuru otomatik yayına alınır ve yazara 200 puan verilir.
      </p>
      <Card className="mb-7">
        {pending.length === 0 ? (
          <Loading label="Bekleyen başvuru yok" />
        ) : (
          pending.map((a) => (
            <div key={a.id} className="list-col">
              <div className="name">{a.title}</div>
              <div className="meta">
                {a.authorName} · {a.tag || 'Topluluk'} ·{' '}
                {new Date(a.createdAt).toLocaleDateString('tr-TR')}
              </div>
              <div className="mt-1.5 text-ax-sm text-ink-3">
                {a.excerpt || a.body[0]?.slice(0, 140)}
              </div>
              <div className="form-inline mt-2.5">
                <input
                  className="input"
                  placeholder="Kategori kodu (opsiyonel)"
                  id={`cat-${a.id}`}
                />
                <input className="input" placeholder="Görsel URL (opsiyonel)" id={`img-${a.id}`} />
                <button
                  className="btn-sm btn-ok"
                  onClick={async () => {
                    const cat = (document.getElementById(`cat-${a.id}`) as HTMLInputElement)?.value;
                    const img = (document.getElementById(`img-${a.id}`) as HTMLInputElement)?.value;
                    const body: ReviewApplication = { decision: 'approve' };
                    if (cat) body.categoryCode = cat;
                    if (img) body.image = img;
                    await api.reviewApplication(a.id, body);
                    reloadApps();
                    reloadArticles();
                  }}
                >
                  Onayla → yayınla + 200 puan
                </button>
                <button
                  className="btn-sm btn-danger"
                  onClick={async () => {
                    const v = await formAl({
                      baslik: 'Blog başvurusunu reddet',
                      alanlar: [
                        { ad: 'not', etiket: 'Red gerekçesi', tur: 'uzun', ipucu: 'İsteğe bağlı' },
                      ],
                      onayEtiket: 'Reddet',
                    });
                    if (!v) return;
                    await api.reviewApplication(a.id, {
                      decision: 'reject',
                      note: (v.not ?? '').trim(),
                    });
                    reloadApps();
                  }}
                >
                  Reddet
                </button>
              </div>
            </div>
          ))
        )}
        {reviewed.length > 0 && (
          <div className="mt-3 opacity-70">
            {reviewed.map((a) => (
              <div key={a.id} className="list-row">
                <div className="grow">
                  <div className="name">{a.title}</div>
                  <div className="meta">
                    {a.authorName} ·{' '}
                    {a.status === 'approved' ? `onaylandı (+${a.points} puan)` : 'reddedildi'}
                    {a.note ? ` · ${a.note}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      {/* Haftalık W2W teması */}
      <h2 className="section-head">Haftalık W2W teması</h2>
      <p className="mb-6 mt-1 max-w-[70ch] text-ax-md leading-relaxed text-ink-3">App&apos;te haftanın sorusu/teması. Tek tema aktif olabilir.</p>
      <Card className="mb-5">
        <div className="form-inline">
          <LangTabs
            lang={themeLang}
            setLang={setThemeLang}
            filled={(l) =>
              l === 'kk'
                ? !!themeForm.titleKk || !!themeForm.promptKk
                : !!themeForm.titleRu || !!themeForm.promptRu
            }
          />
          <input
            className="input"
            placeholder={
              themeLang === 'tr'
                ? 'Tema başlığı (TR — kaynak)'
                : `Tema başlığı (${themeLang.toUpperCase()})`
            }
            value={themeForm[thT]}
            onChange={(e) => setThemeForm({ ...themeForm, [thT]: e.target.value })}
          />
          <input
            className="input full"
            placeholder={
              themeLang === 'tr'
                ? 'Soru / yönlendirme metni'
                : `Soru / yönlendirme (${themeLang.toUpperCase()})`
            }
            value={themeForm[thP]}
            onChange={(e) => setThemeForm({ ...themeForm, [thP]: e.target.value })}
          />
          <input
            className="input"
            type="date"
            value={themeForm.weekStart}
            onChange={(e) => setThemeForm({ ...themeForm, weekStart: e.target.value })}
          />
          <button className="btn-sm btn-ok" onClick={createTheme}>
            + Tema ekle
          </button>
        </div>
      </Card>
      <Card>
        {!themes || themes.length === 0 ? (
          <Loading label="Tema yok" />
        ) : (
          themes.map((th) => (
            <div key={th.id} className="list-row">
              <div className="grow">
                <div className="name">{th.title}</div>
                <div className="meta">
                  {th.prompt} · {new Date(th.weekStart).toLocaleDateString('tr-TR')}
                </div>
              </div>
              {th.active ? (
                <span className="switch on">Aktif</span>
              ) : (
                <button
                  className="btn-sm"
                  onClick={async () => {
                    await api.activateTheme(th.id);
                    reloadThemes();
                  }}
                >
                  Aktifleştir
                </button>
              )}
            </div>
          ))
        )}
      </Card>
    </>
  );
}
const SEGMENTS: { id: AnnouncementSegment; label: string }[] = [
  { id: 'all', label: 'Tüm kullanıcılar' },
  { id: 'premium', label: 'Premium üyeler' },
  { id: 'platinum', label: '💎 Platinum üyeler' },
  { id: 'professionals', label: 'Uzmanlar' },
  { id: 'salons', label: 'Salonlar' },
  { id: 'city', label: 'Şehir bazlı' },
];
/**
 * AÇILIŞ MESAJLARI — brief §7.2 (yönetim) + §7.3 (analitik).
 *
 * ── TABLO BOŞ GÖRÜNMEZ ──────────────────────────────────────────────────
 *
 * Uygulama kataloğu kendi içinde taşıyor; bu tablo yalnız "uzaktan
 * değiştirme" katmanı. Panel boş açılsaydı yönetici "mesajlar nerede,
 * bozuldu mu?" diye sorardı. Boşken ne olduğu YAZIYOR ve tek tuşla
 * paketi tabloya alabiliyor.
 *
 * ── ÜÇ DİL ZORUNLU ──────────────────────────────────────────────────────
 *
 * Kaydet düğmesi üç dil dolmadan çalışmıyor. Eksik dil, o dildeki
 * kullanıcıya BOŞ açılış ekranı demek olurdu.
 */
function SplashView() {
  const { data, reload } = useAsync<AcilisMesajSatiri[]>(() => api.acilisMesajlari(), []);
  const { data: rapor } = useAsync<AcilisRaporSatiri[]>(() => api.acilisRapor(30), []);
  const [duzenlenen, setDuzenlenen] = useState<AcilisMesajSatiri | null>(null);
  const [form, setForm] = useState({ tr: '', kk: '', ru: '' });
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);

  const oranlar = new Map((rapor ?? []).map((r) => [r.code, r]));
  const eksikDil = !form.tr.trim() || !form.kk.trim() || !form.ru.trim();

  const ac = (m: AcilisMesajSatiri) => {
    setDuzenlenen(m);
    setForm({ tr: m.tr, kk: m.kk, ru: m.ru });
    setHata(null);
  };

  const kaydet = async () => {
    if (!duzenlenen || eksikDil) return;
    setHata(null);
    try {
      /*
       * KOŞULLAR OLDUĞU GİBİ GERİ GÖNDERİLİYOR. Yalnız metni yollasaydık
       * sunucu eksik alanları varsayılana çeker ve mesajın saat/pencere
       * koşulları sessizce SİLİNİRDİ.
       */
      const m = duzenlenen;
      await api.acilisMesajKaydet(m.code, {
        grup: m.grup,
        etiket: m.etiket,
        metin: { tr: form.tr.trim(), kk: form.kk.trim(), ru: form.ru.trim() },
        active: m.active,
        sira: m.sira,
        ...(m.saatBas !== null && m.saatSon !== null ? { saat: [m.saatBas, m.saatSon] } : {}),
        ...(m.haftaSonu ? { haftaSonu: true as const } : {}),
        ...(m.gunler.length > 0 ? { gunler: m.gunler } : {}),
        ...(m.pencereBasAy !== null &&
        m.pencereBasGun !== null &&
        m.pencereSonAy !== null &&
        m.pencereSonGun !== null
          ? {
              pencere: {
                bas: [m.pencereBasAy, m.pencereBasGun],
                son: [m.pencereSonAy, m.pencereSonGun],
              },
            }
          : {}),
        ...(m.oncelikliOzelGun ? { oncelikliOzelGun: true as const } : {}),
        ...(m.adGerekli ? { adGerekli: true as const } : {}),
        ...(m.dogumGunu ? { dogumGunu: true as const } : {}),
        ...(m.davranis ? { davranis: m.davranis } : {}),
      });
      setDuzenlenen(null);
      reload();
    } catch (e) {
      setHata(String((e as Error).message));
    }
  };

  const durumDegistir = async (m: AcilisMesajSatiri) => {
    await api.acilisMesajDurum(m.code, !m.active);
    reload();
  };

  const aktar = async () => {
    const r = await api.acilisPaketiAktar();
    setBilgi(`${r.eklenen} mesaj tabloya alındı. Var olan kayıtlara dokunulmadı.`);
    reload();
  };

  return (
    <>
      <h2 className="section-head">Açılış mesajları</h2>
      {!data || data.length === 0 ? (
        <Card className="p-5">
          <div className="max-w-[70ch] text-left leading-relaxed text-ink-2">
            <b className="text-ink">Tablo boş — bu normal.</b>
            <br />
            Uygulama 54 mesajı kendi içinde taşıyor ve internetsiz de çalışıyor. Bu ekran yalnızca
            uzaktan değiştirme katmanı: bir mesajı düzenlemek ya da pasife almak istediğinizde
            paketi tabloya alın.
          </div>
          <button className="btn-sm btn-ok mt-4" onClick={aktar}>
            Paketi tabloya al
          </button>
          {bilgi && <div className="mt-2 text-ax-sm text-ok">{bilgi}</div>}
        </Card>
      ) : (
        <Card>
          {data.map((m) => {
            const r = oranlar.get(m.code);
            return (
              <div key={m.code} className="list-col">
                <div className="name">
                  {m.code} · {m.grup}
                  {m.active ? '' : ' · PASİF'}
                </div>
                <div className="mt-1 text-ax-sm text-ink-2">{m.tr}</div>
                <div className="mt-1.5 text-ax-sm text-ink-3">
                  {/*
                    Gösterimi olmayan mesaja oran YAZILMIYOR. "%0 atlanıyor"
                    deseydik hiç gösterilmemiş bir mesaj en başarılı görünür,
                    ayıklama yanlış mesajı korurdu.
                  */}
                  {r && r.skipOrani !== null
                    ? `${r.gosterim} gösterim · %${Math.round(r.skipOrani * 100)} atlandı`
                    : 'Henüz gösterim verisi yok'}
                </div>
                <div className="mt-2 flex gap-2">
                  <button className="btn-sm" onClick={() => ac(m)}>
                    Düzenle
                  </button>
                  <button className="btn-sm" onClick={() => durumDegistir(m)}>
                    {m.active ? 'Pasife al' : 'Aktif et'}
                  </button>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {duzenlenen && (
        <Card className="mt-3 p-5">
          <h2 className="section-head">{duzenlenen.code} — üç dil zorunlu</h2>
          {(['tr', 'kk', 'ru'] as const).map((d) => (
            <textarea
              key={d}
              className="input full mb-2"
              rows={2}
              placeholder={d.toUpperCase()}
              value={form[d]}
              onChange={(e) => setForm({ ...form, [d]: e.target.value })}
            />
          ))}
          <div className="mt-2 flex gap-2">
            <button className="btn-sm btn-ok" disabled={eksikDil} onClick={kaydet}>
              Kaydet
            </button>
            <button className="btn-sm" onClick={() => setDuzenlenen(null)}>
              Vazgeç
            </button>
          </div>
          {eksikDil && (
            <div className="mt-2 text-ax-sm text-ink-3">
              Üç dil de dolmadan kaydedilemez — eksik dil, o dildeki kullanıcıya boş açılış ekranı
              demek.
            </div>
          )}
          {hata && (
            <div className="mt-2 text-ax-sm text-err">Kaydedilemedi: {hata}</div>
          )}
        </Card>
      )}
    </>
  );
}

function AnnouncementsView() {
  const { onayla } = useDiyalog();
  const { data, reload } = useAsync<Announcement[]>(() => api.announcements(), []);
  const empty = {
    title: '',
    body: '',
    titleKk: '',
    bodyKk: '',
    titleRu: '',
    bodyRu: '',
    segment: 'all' as AnnouncementSegment,
    city: '',
  };
  const [form, setForm] = useState(empty);
  const [lang, setLang] = useState<Lang>('tr');
  const [sent, setSent] = useState<string | null>(null);
  // aktif dile göre başlık/gövde alan adları
  const tKey = (
    lang === 'tr' ? 'title' : lang === 'kk' ? 'titleKk' : 'titleRu'
  ) as keyof typeof form;
  const bKey = (lang === 'tr' ? 'body' : lang === 'kk' ? 'bodyKk' : 'bodyRu') as keyof typeof form;
  const send = async () => {
    if (form.title.length < 2 || form.body.length < 2) return; // tr (kaynak) zorunlu
    if (form.segment === 'city' && !form.city) return;
    if (
      !(await onayla({
        baslik: 'Duyuruyu gönder',
        mesaj: `"${form.title}" duyurusu seçili segmente gönderilecek. Gönderilen duyuru geri alınamaz.`,
        onayEtiket: 'Gönder',
      }))
    )
      return;
    const i18n = buildI18n({
      title: { kk: form.titleKk, ru: form.titleRu },
      body: { kk: form.bodyKk, ru: form.bodyRu },
    });
    const res = await api.sendAnnouncement({
      title: form.title,
      body: form.body,
      i18n,
      segment: form.segment,
      city: form.segment === 'city' ? form.city : undefined,
    });
    setSent(`Gönderildi — ${res.recipientCount} alıcı`);
    setForm(empty);
    setLang('tr');
    reload();
  };
  const segLabel = (s: AnnouncementSegment) => SEGMENTS.find((x) => x.id === s)?.label ?? s;
  return (
    <>
      <PageHead title="Duyurular" sub="Segment bazlı toplu duyuru — app bildirim listesine düşer" />
      <Card className="mb-5">
        <div className="form-inline">
          <LangTabs
            lang={lang}
            setLang={setLang}
            filled={(l) =>
              l === 'kk' ? !!form.titleKk || !!form.bodyKk : !!form.titleRu || !!form.bodyRu
            }
          />
          <input
            className="input full"
            placeholder={
              lang === 'tr' ? 'Duyuru başlığı (TR — kaynak)' : `Başlık (${lang.toUpperCase()})`
            }
            value={form[tKey]}
            onChange={(e) => setForm({ ...form, [tKey]: e.target.value })}
          />
          <textarea
            className="input full"
            placeholder={
              lang === 'tr' ? 'Duyuru metni (TR — kaynak)' : `Metin (${lang.toUpperCase()})`
            }
            rows={3}
            value={form[bKey]}
            onChange={(e) => setForm({ ...form, [bKey]: e.target.value })}
          />
          <select
            className="input"
            value={form.segment}
            onChange={(e) => setForm({ ...form, segment: e.target.value as AnnouncementSegment })}
          >
            {SEGMENTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          {form.segment === 'city' && (
            <input
              className="input"
              placeholder="Şehir (örn. Almatı)"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          )}
          <button className="btn-sm btn-ok full" onClick={send}>
            📣 Duyuruyu gönder
          </button>
          {sent && (
            <div className="full text-ax-sm font-semibold text-ok">{sent}</div>
          )}
        </div>
      </Card>
      <h2 className="section-head">Gönderim geçmişi</h2>
      <Card>
        {!data || data.length === 0 ? (
          <Loading label="Henüz duyuru gönderilmedi" />
        ) : (
          data.map((a) => (
            <div key={a.id} className="list-col">
              <div className="name">{a.title}</div>
              <div className="meta !mt-1">{a.body}</div>
              <div className="meta !mt-1.5 tabular-nums">
                {segLabel(a.segment)}
                {a.city ? ` · ${a.city}` : ''} · {a.recipientCount} alıcı ·{' '}
                {new Date(a.createdAt).toLocaleString('tr-TR')}
              </div>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
function AdsView() {
  const { onayla } = useDiyalog();
  const { data: ads, reload } = useAsync<AdBanner[]>(() => api.ads(), []);
  // Ödeme kuyruğu BURADA: reklamı onaylayacak kişi "Reklamlar"a bakar,
  // randevu kuyruklarına değil.
  const reklam = useAsync<ReklamSiparisi[]>(() => api.reklamSiparisleri(), []);
  const [msg, setMsg] = useState<string | null>(null);
  const { data: pros } = useAsync<Pro[]>(() => api.professionals(), []);
  const empty = {
    proId: '',
    title: '',
    subtitle: '',
    titleKk: '',
    subtitleKk: '',
    titleRu: '',
    subtitleRu: '',
    image: '',
    placement: 'one_cikanlar' as 'firsatlar' | 'one_cikanlar',
    startsAt: '',
    endsAt: '',
  };
  const [form, setForm] = useState(empty);
  const [lang, setLang] = useState<Lang>('tr');
  const tKey = (
    lang === 'tr' ? 'title' : lang === 'kk' ? 'titleKk' : 'titleRu'
  ) as keyof typeof form;
  const sKey = (
    lang === 'tr' ? 'subtitle' : lang === 'kk' ? 'subtitleKk' : 'subtitleRu'
  ) as keyof typeof form;
  const proName = (id: string) => pros?.find((p) => p.id === id)?.name ?? id;
  /*
   * TARİHLER ZORUNLU. Kurucu: "reklam girişleri yaparken başlangıç bitiş
   * tarihleri seçilmeli. seçilmediyse onay butonu çalışmamalı."
   *
   * Boş bırakılan reklam SINIRSIZ yayınlanıyordu: bir aylığına ödenmiş
   * vitrin, kapatmak unutulduğu sürece bedava yayında kalıyordu.
   */
  const tarihlerTamam =
    !!form.startsAt && !!form.endsAt && new Date(form.endsAt) > new Date(form.startsAt);
  const eklenebilir = !!form.proId && form.title.length >= 2 && !!form.image && tarihlerTamam;

  const create = async () => {
    if (!eklenebilir) return;
    await api.createAd({
      proId: form.proId,
      title: form.title,
      subtitle: form.subtitle || undefined,
      i18n: buildI18n({
        title: { kk: form.titleKk, ru: form.titleRu },
        subtitle: { kk: form.subtitleKk, ru: form.subtitleRu },
      }),
      image: form.image,
      placement: form.placement,
      // Boş bırakılırsa sınırsız yayın. Tarih girilirse süresi bitince
      // reklam KENDİLİĞİNDEN düşer — kapatmayı unutmak ödenmemiş reklamı
      // yayında bırakıyordu.
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    });
    setForm(empty);
    setLang('tr');
    reload();
  };
  return (
    <>
      <PageHead
        title="Reklamlar"
        sub="Ücretli vitrin: uzman/salon Kaspi ile öder, dekontu buradan doğrularsın. Onaylanan reklam satın alınan süre boyunca Keşfet ekranında yayınlanır."
      />
      {/* ── §reklam — ÜCRETLİ VİTRİN ÖDEMELERİ ──
          Reklam sipariş anında yayına GİRMEZ; ödeme burada doğrulanınca
          yayınlanır. Onaylanmadan yayınlansaydı ödenmemiş reklam vitrine
          düşerdi. */}
      <SectionTitle>Reklam ödemeleri ({reklam.data?.length ?? 0})</SectionTitle>
      <Card className="mb-4">
        <div className="border-b border-line-2 px-4 py-3 text-ax-sm leading-relaxed text-ink-3">
          Onaylayınca reklam satın alınan süre boyunca yayına girer ve süre bitince kendiliğinden
          düşer. Reddedersen reklam üretilmez; uzman dekontu yeniden gönderebilir.
        </div>
        {!reklam.data?.length ? (
          <div className="empty">Bekleyen reklam ödemesi yok</div>
        ) : (
          reklam.data.map((o) => (
            <div key={o.id} className="list-row">
              {o.image ? <img className="thumb" src={o.image} alt="" /> : <div className="thumb" />}
              <div className="grow">
                <div className="text-ax-md text-ink">
                  <b>{o.proName}</b> · {o.title}
                </div>
                <div className="meta tabular-nums">
                  {o.placement === 'firsatlar' ? 'Fırsatlar' : 'Öne çıkanlar'} · {o.months} ay ·{' '}
                  {Number(o.amount).toLocaleString('tr-TR')} ₸
                </div>
                <div className="meta">
                  kod{' '}
                  <code className="rounded-sm bg-bg-alt px-1.5 py-0.5 font-mono text-ax-xs font-bold tracking-wide text-ink-2">{`AYNA-${o.id
                    .replace(/[^a-zA-Z0-9]/g, '')
                    .slice(-5)
                    .toUpperCase()}`}</code>
                </div>
              </div>
              {o.receiptUri ? (
                <a className="btn-sm" href={o.receiptUri} target="_blank" rel="noreferrer">
                  Dekontu aç
                </a>
              ) : (
                <span className="meta">dekont yok</span>
              )}
              <button
                className="btn-sm btn-ok"
                disabled={!o.receiptUri}
                onClick={async () => {
                  await api.reklamOnayla(o.id);
                  setMsg('Reklam yayına alındı');
                  reklam.reload();
                }}
              >
                Yayına al
              </button>
              <button
                className="btn-sm btn-danger"
                onClick={async () => {
                  if (
                    !(await onayla({
                      baslik: 'Ödeme doğrulanamadı',
                      mesaj: 'Bu ödeme doğrulanamadı olarak işaretlenecek.',
                      onayEtiket: 'İşaretle',
                    }))
                  )
                    return;
                  await api.reklamReddet(o.id);
                  setMsg('Reklam ödemesi reddedildi');
                  reklam.reload();
                }}
              >
                Reddet
              </button>
            </div>
          ))
        )}
      </Card>
      <Card className="mb-5">
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
          <LangTabs
            lang={lang}
            setLang={setLang}
            filled={(l) =>
              l === 'kk' ? !!form.titleKk || !!form.subtitleKk : !!form.titleRu || !!form.subtitleRu
            }
          />
          <input
            className="input"
            placeholder={lang === 'tr' ? 'Başlık (TR — kaynak)' : `Başlık (${lang.toUpperCase()})`}
            value={form[tKey]}
            onChange={(e) => setForm({ ...form, [tKey]: e.target.value })}
          />
          <input
            className="input"
            placeholder={lang === 'tr' ? 'Alt başlık (TR)' : `Alt başlık (${lang.toUpperCase()})`}
            value={form[sKey]}
            onChange={(e) => setForm({ ...form, [sKey]: e.target.value })}
          />
          <input
            className="input"
            placeholder="Görsel URL (https://...)"
            value={form.image}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
          />
          {/* HANGİ VİTRİN satın alındı. Aynı kartı iki bölümde birden
              göstermek ekranı tekrarlı gösterirdi; yerleşimi reklamı ödeyen
              seçiyor. */}
          <select
            className="input"
            value={form.placement}
            onChange={(e) =>
              setForm({ ...form, placement: e.target.value as 'firsatlar' | 'one_cikanlar' })
            }
          >
            <option value="one_cikanlar">Öne çıkanlar</option>
            <option value="firsatlar">Fırsatlar</option>
          </select>
          {/* YAYIN PENCERESİ — boş = sınırsız. */}
          <input
            className="input"
            type="date"
            title="Yayın başlangıcı (zorunlu)"
            value={form.startsAt}
            onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
          />
          <input
            className="input"
            type="date"
            title="Yayın bitişi (zorunlu)"
            value={form.endsAt}
            onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
          />
          <button className="btn-sm btn-ok full" disabled={!eklenebilir} onClick={create}>
            + Reklam ekle
          </button>
          {!tarihlerTamam && (
            <div className="col-span-full text-ax-sm leading-relaxed text-warn">
              Başlangıç ve bitiş tarihi zorunlu; bitiş başlangıçtan sonra olmalı. Tarihsiz reklam
              süresiz yayında kalırdı.
            </div>
          )}
        </div>
      </Card>
      <Card>
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
                {/* Hangi vitrin + yayın penceresi. "Aktif" rozeti tek başına
                    yanıltıcıydı: süresi geçmiş bir reklam da aktif görünüyor
                    ama ekranda çıkmıyordu — sunucu onu zaten süzüyor. */}
                <div className="meta tabular-nums">
                  {a.placement === 'firsatlar' ? 'Fırsatlar' : 'Öne çıkanlar'}
                  {' · '}
                  {a.startsAt || a.endsAt
                    ? `${a.startsAt ? new Date(a.startsAt).toLocaleDateString('tr-TR') : '—'} → ${
                        a.endsAt ? new Date(a.endsAt).toLocaleDateString('tr-TR') : '—'
                      }${a.endsAt && new Date(a.endsAt) <= new Date() ? ' · SÜRESİ DOLDU' : ''}`
                    : 'süresiz'}
                </div>
              </div>
              <button
                className={`switch ${a.durum === 'yayinda' ? 'on' : 'off'}`}
                onClick={async () => {
                  await api.setAdActive(a.id, !a.active);
                  reload();
                }}
              >
                {/*
                  GERÇEK durum. Bayrağı gösteriyordu: süresi dolmuş bir
                  reklam "Aktif" görünüyor ama kimseye gösterilmiyordu —
                  yönetici ödeme aldığı reklamı yayında sanıyordu.
                */}
                {a.durum === 'yayinda'
                  ? 'Yayında'
                  : a.durum === 'doldu'
                    ? 'Süresi doldu'
                    : a.durum === 'baslamadi'
                      ? 'Başlamadı'
                      : 'Pasif'}
              </button>
              <button
                className="btn-sm btn-danger"
                onClick={async () => {
                  if (
                    await onayla({
                      baslik: 'Reklamı sil',
                      mesaj: 'Bu reklam kalıcı olarak silinecek.',
                      onayEtiket: 'Sil',
                      tehlikeli: true,
                    })
                  ) {
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
      </Card>
      {/* Onay/red sonrası GERİ BİLDİRİM. Durum yazılıyor ama hiç
          gösterilmiyordu: admin düğmeye basıp bir şey olup olmadığını
          anlayamıyordu. */}
      {msg ? (
        <div className="mt-4 text-ax-sm font-semibold text-ok">
          {msg}
        </div>
      ) : null}
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
  const { onayla } = useDiyalog();
  const { data, reload } = useAsync<Pro[]>(() => api.professionals(), []);
  const { data: cats } = useAsync<Category[]>(() => api.categories(), []);
  const [edit, setEdit] = useState<{ id?: string; form: ProInput } | null>(null);
  const [q, setQ] = useState('');
  const list = (data ?? []).filter(
    (p) =>
      !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.sector.includes(q.toLowerCase()),
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
    if (
      await onayla({
        baslik: 'Uzmanı sil',
        mesaj: 'Uzman ve ona bağlı tüm teklifler kalıcı olarak silinecek.',
        onayEtiket: 'Sil',
        tehlikeli: true,
      })
    ) {
      await api.deleteProfessional(id);
      reload();
    }
  };
  return (
    <>
      <PageHead
        title="Uzman & salonlar"
        sub="Keşif listesindeki uzman/salonlar — ekle, düzenle, fiyat, öne çıkar, sil"
      />
      <Toolbar>
        <button className="btn-sm btn-ok" onClick={() => setEdit({ form: { ...EMPTY_PRO } })}>
          + Yeni uzman
        </button>
        <input
          className="input !h-[34px] max-w-[240px]"
          placeholder="Ara (isim / sektör)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="ml-auto text-ax-sm font-semibold tabular-nums text-ink-3">
          {list.length} kayıt
        </span>
      </Toolbar>
      <Card>
        {!data ? (
          <Loading />
        ) : list.length === 0 ? (
          <Loading label="Uzman yok" />
        ) : (
          list.map((p) => (
            <div key={p.id} className="list-row">
              {p.imageUrl ? (
                <img className="thumb" src={p.imageUrl} alt="" />
              ) : (
                <div className="thumb" />
              )}
              <div className="grow">
                <div className="name">
                  {p.name}
                  {p.featured ? ' · ⭐' : ''}
                </div>
                <div className="meta">
                  {p.sector} · {p.district || '—'} ·{' '}
                  {p.priceFrom > 0 ? TL(p.priceFrom) + '+' : 'fiyat yok'} · ★ {p.rating.toFixed(1)}{' '}
                  ({p.reviewCount})
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
      </Card>
      {edit ? (
        <div className="modal-backdrop" onClick={() => setEdit(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="text-ax-xl font-extrabold tracking-[-0.7px] text-ink">
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
                  onChange={(e) =>
                    setEdit({ ...edit, form: { ...edit.form, name: e.target.value } })
                  }
                />
              </F>
              <F label="Sektör *">
                <select
                  className="input"
                  value={edit.form.sector}
                  onChange={(e) =>
                    setEdit({ ...edit, form: { ...edit.form, sector: e.target.value } })
                  }
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
                  onChange={(e) =>
                    setEdit({ ...edit, form: { ...edit.form, specialty: e.target.value } })
                  }
                />
              </F>
              <F label="Tür">
                <select
                  className="input"
                  value={edit.form.kind ?? 'salon'}
                  onChange={(e) =>
                    setEdit({ ...edit, form: { ...edit.form, kind: e.target.value } })
                  }
                >
                  <option value="salon">Salon</option>
                  <option value="independent">Bağımsız uzman</option>
                </select>
              </F>
              <F label="İlçe/Bölge">
                <input
                  className="input"
                  value={edit.form.district ?? ''}
                  onChange={(e) =>
                    setEdit({ ...edit, form: { ...edit.form, district: e.target.value } })
                  }
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
                    setEdit({
                      ...edit,
                      form: { ...edit.form, experienceYears: Number(e.target.value) },
                    })
                  }
                />
              </F>
              <F label="Görsel URL">
                <input
                  className="input"
                  value={edit.form.imageUrl ?? ''}
                  onChange={(e) =>
                    setEdit({ ...edit, form: { ...edit.form, imageUrl: e.target.value } })
                  }
                />
              </F>
              <F label="Hakkında" full>
                <input
                  className="input"
                  value={edit.form.about ?? ''}
                  onChange={(e) =>
                    setEdit({ ...edit, form: { ...edit.form, about: e.target.value } })
                  }
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
function F({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
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
  const [sira, setSira] = useState<string[] | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  // Sunucudan gelen sıra taslağın temeli; yönetici oynatana kadar aynısı.
  const liste = (() => {
    if (!data) return [];
    if (!sira) return data;
    const kod = new Map(data.map((c) => [c.code, c]));
    return sira.map((c) => kod.get(c)).filter((c): c is Category => !!c);
  })();
  const degisti = !!sira && data ? sira.join() !== data.map((c) => c.code).join() : false;

  const oynat = (i: number, yon: -1 | 1) => {
    const kodlar = liste.map((c) => c.code);
    const j = i + yon;
    if (j < 0 || j >= kodlar.length) return;
    [kodlar[i], kodlar[j]] = [kodlar[j]!, kodlar[i]!];
    setSira(kodlar);
  };

  const kaydet = async () => {
    if (!sira) return;
    setKaydediliyor(true);
    try {
      await api.reorderCategories(sira);
      setSira(null);
      reload();
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <>
      {/*
       * PANEL ARTIK GERÇEĞİ SÖYLÜYOR.
       *
       * Burada kategori ekleme formu ve ad düzenleme kutuları vardı;
       * üçü de sessizce hiçbir şey yapmıyordu:
       *   · ad değiştirmek → uygulama adları katalogdan okuyor, telefonda
       *     eski ad kalıyordu;
       *   · silmek → sunucu bir sonraki açılışta geri ekliyordu;
       *   · eklemek → uygulama listeyi katalogdan kuruyor, yeni kategori
       *     hiçbir ekranda görünmüyordu.
       *
       * Değiştirilebilen tek şey SIRA (brief §7.3) ve o gerçekten
       * uygulamaya yansıyor.
       */}
      <div className="mb-6">
        <h1 className="text-ax-2xl font-extrabold leading-tight tracking-[-0.7px] text-ink">
          Hizmetler
        </h1>
        <p className="mt-1 max-w-[70ch] text-ax-md leading-relaxed text-ink-3">
          Kategoriler ve alt hizmetler <strong className="font-bold text-ink-2">hizmet kataloğunda</strong> tanımlı — adları buradan
          değişmez. Buradan <strong className="font-bold text-ink-2">sırayı</strong> değiştirebilirsin; uygulamada kategoriler bu
          sırayla görünür.
        </p>
      </div>

      <Card>
        {!data ? (
          <Loading />
        ) : liste.length === 0 ? (
          <Loading label="Katalog boş" />
        ) : (
          liste.map((c, i) => (
            <div key={c.code} className="list-row">
              <span className="pill inline-flex h-6 min-w-[24px] items-center justify-center bg-line text-ax-xs text-ink-3 tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="name text-ink">{c.nameTr}</div>
                {/* Üç dil birden: kurucunun kk/ru karşılıklarını görmesi
                    için tek yer burası. */}
                <div className="meta">
                  {c.nameRu} · {c.nameKk} · <span className="opacity-70">{c.code}</span>
                </div>
              </div>
              {/*
               * ARZ DURUMU — brief §7.4. Hangi alt hizmette yayında uzman
               * var? Sıfırsa o kategori müşteriye "Yakında" rozetiyle
               * çıkıyor; yöneticinin nereye uzman bulması gerektiğini
               * görebileceği tek yer burası.
               */}
              <span
                className={`pill ${c.suppliedCount === 0 ? 'pending' : 'approved'}`}
                title="Yayında uzmanı olan alt hizmet / toplam"
              >
                {c.suppliedCount}/{c.serviceCount} hizmette uzman var
              </span>
              <button
                className="btn-sm"
                disabled={i === 0}
                onClick={() => oynat(i, -1)}
                aria-label="Yukarı taşı"
              >
                ↑
              </button>
              <button
                className="btn-sm"
                disabled={i === liste.length - 1}
                onClick={() => oynat(i, 1)}
                aria-label="Aşağı taşı"
              >
                ↓
              </button>
            </div>
          ))
        )}
      </Card>

      {degisti ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className="btn-sm" onClick={() => setSira(null)} disabled={kaydediliyor}>
            Vazgeç
          </button>
          <button
            className="btn-sm btn-primary"
            onClick={() => void kaydet()}
            disabled={kaydediliyor}
          >
            {kaydediliyor ? 'Kaydediliyor…' : 'Sırayı kaydet'}
          </button>
        </div>
      ) : null}
    </>
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
      <PageHead
        title="Taban fiyatlar"
        sub={'Piyasa taban fiyatları (kategori × şehir) — teklif tabanı ve %40-altı uyarısı için. Uzman başlangıç fiyatları "Uzmanlar" bölümünden düzenlenir.'}
      />
      <Card className="p-5 mb-5">
        <div className="form-inline">
          <select
            className="input"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="">Kategori seç…</option>
            {(cats ?? []).map((c) => (
              <option key={c.id} value={c.code}>
                {c.nameTr}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Şehir (boş = genel)"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <input
            className="input"
            placeholder="Taban fiyat (KZT)"
            type="number"
            value={form.basePrice}
            onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
          />
          <button className="btn-sm btn-ok full" onClick={save}>
            Kaydet / güncelle
          </button>
        </div>
      </Card>
      <Card className="p-5">
        {!data ? (
          <Loading />
        ) : data.length === 0 ? (
          <Loading label="Fiyat kaydı yok" />
        ) : (
          data.map((m) => (
            <div key={m.id} className="list-row">
              <div className="grow">
                <div className="name">{catName(m.category)}</div>
                <div className="meta">
                  {m.category} · {m.city || 'Genel'}
                </div>
              </div>
              <div className="kv-v tabular-nums">{TL(m.basePrice)}</div>
            </div>
          ))
        )}
      </Card>
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
// §12.3 Ceza Takip — 7 gün sayaçlı kısıtlı hesaplar + kalıcı engel
function PenaltiesView() {
  const { onayla } = useDiyalog();
  const { data, reload } = useAsync<Penalty[]>(() => api.penalties(), []);
  return (
    <>
      <PageHead
        title="Kısıtlı hesaplar"
        sub="Kısıtlı hesaplar (yeni talep göremez) · 7 gün sayacı dolunca kalıcı engel adayı"
      />
      <Card className="p-0 overflow-hidden">
        {!data ? (
          <Loading />
        ) : data.length === 0 ? (
          <Loading label="Kısıtlı hesap yok" />
        ) : (
          data.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-5 py-4 border-b border-line last:border-b-0 hover:bg-bg-alt transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-ax-sm font-semibold text-ink">
                  {p.name || '—'} · {ROLE_TR[p.role] ?? p.role}
                  {p.banEligible ? ' · ⚠️ süre doldu' : ''}
                </div>
                <div className="mt-0.5 text-ax-xs text-ink-3">
                  {p.restrictReason || 'gerekçe yok'}
                  {p.city ? ` · ${p.city}` : ''} · geçen {p.daysElapsed}g · kalan{' '}
                  <strong className={`tabular-nums ${p.banEligible ? 'text-err' : 'text-warn'}`}>
                    {p.daysRemaining}g
                  </strong>
                </div>
              </div>
              <button
                className="btn-sm btn-ok shrink-0"
                onClick={async () => {
                  await api.unrestrictUser(p.id);
                  reload();
                }}
              >
                Kısıtı kaldır
              </button>
              <button
                className="btn-sm btn-danger shrink-0"
                onClick={async () => {
                  if (
                    await onayla({
                      baslik: 'Hesabı engelle',
                      mesaj: `${p.name || 'Hesap'} kalıcı olarak engellenecek.`,
                      onayEtiket: 'Engelle',
                      tehlikeli: true,
                    })
                  ) {
                    await api.setUserStatus(p.id, 'suspended');
                    reload();
                  }
                }}
              >
                Kalıcı engel
              </button>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
function TierEditor({ user, onSaved }: { user: AdminUser; onSaved: () => void }) {
  const current: 'free' | 'premium' | 'platinum' =
    user.membershipTier ?? (user.isPremium ? 'premium' : 'free');
  const [tier, setTier] = useState<'free' | 'premium' | 'platinum'>(current);
  const [saving, setSaving] = useState(false);
  // reload sonrası (kaydedilen değer gelince) seçimi güncel değere çek → "kirli" durum sıfırlanır
  useEffect(() => setTier(current), [current]);
  const dirty = tier !== current;
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <select
        className="input"
        style={{ height: 32, maxWidth: 120 }}
        value={tier}
        onChange={(e) => setTier(e.target.value as 'free' | 'premium' | 'platinum')}
      >
        <option value="free">Normal</option>
        <option value="premium">Premium</option>
        <option value="platinum">Platinum</option>
      </select>
      <button
        className="btn-sm"
        disabled={!dirty || saving}
        style={{ opacity: dirty && !saving ? 1 : 0.5, fontWeight: 700 }}
        onClick={async () => {
          setSaving(true);
          try {
            await api.setUserTier(user.id, tier);
            onSaved();
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? '…' : 'Kaydet'}
      </button>
    </div>
  );
}
function UsersView() {
  const { onayla, formAl, bildir } = useDiyalog();
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
      <PageHead
        title="Üyeler"
        sub={`Uygulamaya kayıtlı herkes — kullanıcı, uzman, salon. Üyelik seviyesi + parola yönetimi (${
          data?.length ?? 0
        } kayıt)`}
      />
      <Toolbar>
        {['all', 'user', 'salon', 'professional', 'moderator', 'admin'].map((r) => (
          <Chip key={r} active={role === r} onClick={() => setRole(r)}>
            {r === 'all' ? 'Hepsi' : ROLE_TR[r]}
          </Chip>
        ))}
        <input
          className="input !h-[34px] max-w-[220px]"
          placeholder="Ara (isim / e-posta)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className="btn-sm"
          onClick={() =>
            exportCsv(
              'ayna-uyeler.csv',
              list.map((u) => ({
                isim: u.name,
                rol: u.role,
                sehir: u.city ?? '',
                eposta: u.email ?? '',
                uyelik: u.membershipTier ?? 'free',
                durum: u.status,
              })),
            )
          }
        >
          ⬇ Excel
        </button>
      </Toolbar>
      <Card>
        {list.length === 0 ? (
          <Loading label="Kullanıcı yok" />
        ) : (
          list.map((u) => (
            <div key={u.id} className="list-row">
              <div className="grow">
                <div className="name">
                  {u.name || '—'}
                  {u.membershipTier === 'platinum'
                    ? ' · 💎'
                    : u.membershipTier === 'premium' || u.isPremium
                      ? ' · ⭐'
                      : ''}
                  {u.status !== 'active' ? ' · ⛔' : ''}
                </div>
                <div className="meta">
                  {u.email ?? '—'} · {u.city ?? '—'}
                  {u.phoneVerified ? ' · ✓ telefon' : ''}
                  {u.adminApproved ? ' · ✓ elle onaylı' : ''}
                  {u.gender === 'female' ? ' · Kadın' : ''}
                </div>
                {/*
                  RANDEVU KAPISI. Doğrulanmamış ve onaylanmamış müşteri
                  randevu VEREMİYOR: numarası doğrulanmamış bir hesap için
                  uzman hazırlanıp bekliyor, gelen olmuyor ve ulaşılacak
                  numara da yok.
                */}
                {u.role === 'user' && !u.phoneVerified && !u.adminApproved ? (
                  <div className="mt-0.5 text-ax-sm font-semibold text-err">
                    Randevu veremez — telefonu doğrulanmamış
                  </div>
                ) : null}
              </div>
              {u.role === 'user' && !u.phoneVerified ? (
                <button
                  className={`btn-sm ${u.adminApproved ? 'btn-ghost' : 'btn-ok'}`}
                  onClick={async () => {
                    await api.setUserApproved(u.id, !u.adminApproved);
                    reload();
                  }}
                  title="Telefon doğrulamasının alternatifi: SMS ulaşmayan gerçek müşteri için."
                >
                  {u.adminApproved ? 'Onayı kaldır' : 'Onayla'}
                </button>
              ) : null}
              <select
                className="input !h-8 max-w-[130px]"
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
              <TierEditor user={u} onSaved={reload} />
              {/* §12.2 — kimlik bilgisi düzenleme. Panelde yalnız rol/durum/parola
                  değiştirilebiliyordu; e-postası bozulan bir üyeye dokunmanın yolu
                  veritabanına doğrudan bağlanmaktı. */}
              <button
                className="btn-sm"
                onClick={async () => {
                  /*
                   * TEK FORM — eskiden ARKA ARKAYA DÖRT tarayıcı penceresi
                   * açılıyordu (ad, e-posta, şehir, telefon). Üçüncüde
                   * vazgeçen kişi ilk ikisini de kaybediyordu ve hangi üyeyi
                   * düzenlediği ekranda görünmüyordu.
                   */
                  // Mevcut numara AYRI bir uçtan okunuyor: liste bilerek
                  // telefonsuz. Körlemesine düzenlemek yanlış hesabı
                  // düzeltmeye kapı bırakırdı.
                  let mevcutTel = '';
                  try {
                    mevcutTel = (await api.userPhone(u.id)).phone;
                  } catch {
                    // Okunamazsa akış durmasın; boş bırakılırsa dokunulmuyor.
                  }
                  const v = await formAl({
                    baslik: `${u.name || 'Üye'} — bilgileri düzenle`,
                    alanlar: [
                      { ad: 'name', etiket: 'Ad', deger: u.name ?? '', zorunlu: true },
                      {
                        ad: 'email',
                        etiket: 'E-posta',
                        deger: u.email ?? '',
                        tur: 'email',
                        not: 'Boş bırakırsan e-posta silinir.',
                      },
                      { ad: 'city', etiket: 'Şehir', deger: u.city ?? '' },
                      {
                        ad: 'phone',
                        etiket: 'Telefon',
                        deger: mevcutTel,
                        tur: 'tel',
                        // Telefon giriş kimliği; boşaltmak hesabı girişsiz
                        // bırakırdı, o yüzden silme yok — dokunmama var.
                        not: 'Değiştirmezsen dokunulmaz. Değiştirirsen numara "doğrulanmamış" olarak işaretlenir.',
                      },
                    ],
                  });
                  if (!v) return;
                  try {
                    await api.setUserProfile(u.id, {
                      name: (v.name ?? '').trim(),
                      email: (v.email ?? '').trim(),
                      city: (v.city ?? '').trim(),
                      ...((v.phone ?? '').trim() && (v.phone ?? '').trim() !== mevcutTel
                        ? { phone: (v.phone ?? '').trim() }
                        : {}),
                    });
                    bildir('Üye bilgileri güncellendi.');
                    reload();
                  } catch (e) {
                    // Sunucu e-posta/telefon çakışmasını REDDEDER; sessizce
                    // ezmek o hesabı girişsiz bırakırdı. Sebebi göster.
                    bildir(e instanceof Error ? e.message : 'Kaydedilemedi', true);
                  }
                }}
              >
                Düzenle
              </button>
              <button
                className="btn-sm"
                onClick={async () => {
                  const v = await formAl({
                    baslik: `${u.name || 'Üye'} — yeni parola`,
                    mesaj: 'Üye bir sonraki girişinde bu parolayı kullanacak.',
                    alanlar: [
                      {
                        ad: 'pw',
                        etiket: 'Yeni parola',
                        tur: 'password',
                        zorunlu: true,
                        not: 'En az 6 karakter.',
                      },
                    ],
                    onayEtiket: 'Parolayı değiştir',
                  });
                  if (!v) return;
                  if ((v.pw ?? '').trim().length < 6) {
                    bildir('Parola en az 6 karakter olmalı.', true);
                    return;
                  }
                  await api.setUserPassword(u.id, (v.pw ?? '').trim());
                  bildir('Parola güncellendi.');
                }}
              >
                Şifre
              </button>
              {u.status === 'active' && u.role !== 'admin' && (
                <button
                  className="btn-sm"
                  onClick={async () => {
                    const v = await formAl({
                      baslik: `${u.name || 'Üye'} — kısıtla`,
                      mesaj: 'Hesap 7 gün sayaçlı kısıtlı moda alınır.',
                      alanlar: [
                        {
                          ad: 'reason',
                          etiket: 'Gerekçe',
                          tur: 'uzun',
                          zorunlu: true,
                          not: 'Denetim kaydına yazılır.',
                        },
                      ],
                      onayEtiket: 'Kısıtla',
                    });
                    if (!v?.reason?.trim()) return;
                    await api.restrictUser(u.id, v.reason.trim());
                    bildir('Üye kısıtlandı.');
                    reload();
                  }}
                >
                  Kısıtla
                </button>
              )}
              {u.status === 'active' ? (
                <button
                  className="btn-sm btn-danger"
                  onClick={async () => {
                    if (u.role === 'admin') return bildir('Yönetici hesabı askıya alınamaz.', true);
                    if (
                      await onayla({
                        baslik: 'Üyeyi askıya al',
                        mesaj: `${u.name || 'Kullanıcı'} askıya alınacak; giriş yapamayacak.`,
                        onayEtiket: 'Askıya al',
                        tehlikeli: true,
                      })
                    ) {
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
      </Card>
    </>
  );
}
const BOOKING_STATUS_TR: Record<string, string> = {
  taslak: 'Taslak',
  onay_bekliyor: 'Uzman onayı bekliyor',
  degisiklik_onerildi: 'Değişiklik önerildi',
  karsi_oneri: 'Karşı öneri',
  depozito_bekliyor: 'Depozito bekliyor',
  kesinlesti: 'Kesinleşti',
  erteleme_onerildi: 'Erteleme önerildi',
  hizmet_gunu: 'Hizmet günü',
  odeme_bekliyor: 'Ödeme bekliyor',
  tamamlandi: 'Tamamlandı',
  degerlendirme: 'Değerlendirme',
  kapandi: 'Kapandı',
  iptal_musteri: 'Müşteri iptal etti',
  iptal_uzman: 'Uzman iptal etti',
  otomatik_dustu: 'Süre doldu — düştü',
  no_show_musteri: 'Müşteri gelmedi',
  no_show_uzman: 'Uzman gelmedi',
  uyusmazlik: 'Uyuşmazlık',
};
/** Kapanmış (bir daha akmayacak) durumlar — eylem düğmeleri gösterilmez. */
const KAPALI_DURUMLAR = [
  'tamamlandi',
  'degerlendirme',
  'kapandi',
  'iptal_musteri',
  'iptal_uzman',
  'otomatik_dustu',
  'no_show_musteri',
  'no_show_uzman',
  'uyusmazlik',
];
function BookingsAdminView() {
  const { onayla, bildir } = useDiyalog();
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const { data, reload: run } = useAsync<AdminBooking[]>(() => api.bookings(status), [status]);
  const act = async (fn: () => Promise<unknown>, msg: string) => {
    if (!(await onayla({ baslik: 'Randevu işlemi', mesaj: msg, onayEtiket: 'Uygula' }))) return;
    try {
      await fn();
      run();
    } catch {
      bildir('İşlem başarısız — durum geçişi geçersiz olabilir.', true);
    }
  };
  const rows = (data ?? []).filter((b) => {
    const hay = `${b.proName} ${b.service} ${b.customerName ?? ''}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });
  // 18 durumun hepsine çip koymak araç çubuğunu okunmaz yapardı; adminin
  // gerçekten süzdüğü aşamalar seçildi (para bekleyen, biten, sorunlu).
  const STATES = [
    'all',
    'onay_bekliyor',
    'depozito_bekliyor',
    'kesinlesti',
    'odeme_bekliyor',
    'tamamlandi',
    'iptal_musteri',
    'uyusmazlik',
  ];
  const pill = (s: string) =>
    s === 'tamamlandi' || s === 'degerlendirme' || s === 'kapandi' || s === 'kesinlesti'
      ? 'approved'
      : s.startsWith('iptal_') ||
          s.startsWith('no_show_') ||
          s === 'uyusmazlik' ||
          s === 'otomatik_dustu'
        ? 'rejected'
        : 'pending';
  return (
    <>
      <PageHead
        title="Randevular & ödemeler"
        sub={`Platform geneli tüm randevular (${data?.length ?? 0})`}
      />
      <Toolbar>
        {STATES.map((s) => (
          <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
            {s === 'all' ? 'Hepsi' : BOOKING_STATUS_TR[s]}
          </Chip>
        ))}
        <input
          className="input ml-auto max-w-[260px]"
          placeholder="Ara: uzman / hizmet / müşteri"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </Toolbar>
      <Card>
        {!data ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Loading label="Randevu yok" />
        ) : (
          rows.map((b) => (
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
              <div className="kv-v tabular-nums">{b.price > 0 ? TL(b.price) : '—'}</div>
              <span className={`pill ${pill(b.status)}`}>
                {BOOKING_STATUS_TR[b.status] ?? b.status}
              </span>
              {/* "Tamamlandı işaretle" düğmesi KALDIRILDI (§4.9): tamamlanma,
                  müşterinin "ödemeyi yaptım" ve uzmanın "ödeme aldım" el
                  sıkışmasıyla olur. Admin'in tek tuşla tamamlaması, hiç
                  ödenmemiş bir randevuya puan yükleyip komisyon tabanına
                  yazardı. §8 admin'e üç kuyruk veriyor; tamamlama vermiyor.
                  İptal destek kaçış kapısı olarak kalıyor. */}
              {!KAPALI_DURUMLAR.includes(b.status) ? (
                <button
                  className="btn-sm btn-danger"
                  onClick={() =>
                    act(() => api.cancelBooking(b.id), `Randevu iptal edilsin mi? (${b.service})`)
                  }
                >
                  İptal
                </button>
              ) : null}
            </div>
          ))
        )}
      </Card>
    </>
  );
}
function DisputesView() {
  const { formAl } = useDiyalog();
  const { data, reload } = useAsync<Dispute[]>(() => api.disputes(), []);
  const open = (data ?? []).filter((d) => d.status === 'open');
  const resolved = (data ?? []).filter((d) => d.status !== 'open');
  const kindLabel = (k: string) => (k === 'refund' ? 'İade dekontu' : 'Depozito itirazı');
  const statusLabel = (s: string) =>
    s === 'approved' ? 'Onaylandı' : s === 'rejected' ? 'Reddedildi' : 'Açık';
  const statusPill = (s: string) =>
    s === 'approved' ? 'approved' : s === 'rejected' ? 'rejected' : 'pending';
  const resolve = async (d: Dispute, decision: 'approve' | 'reject') => {
    const v = await formAl({
      baslik: `${kindLabel(d.kind)} — ${decision === 'approve' ? 'onayla' : 'reddet'}`,
      mesaj: `${d.proName} · ${TL(d.amount)} · Randevu #${d.bookingRef}`,
      alanlar: [{ ad: 'not', etiket: 'Karar notu', tur: 'uzun', ipucu: 'İsteğe bağlı' }],
      onayEtiket: decision === 'approve' ? 'Onayla' : 'Reddet',
    });
    if (!v) return;
    await api.resolveDispute(d.id, decision, (v.not ?? '').trim() || undefined);
    reload();
  };
  const row = (d: Dispute) => (
    <div key={d.id} className="list-col">
      <div className="font-bold tracking-[-0.15px] text-ink">
        {kindLabel(d.kind)} · {d.proName} · {TL(d.amount)}
      </div>
      <div className="mt-1 text-ax-sm text-ink-3">
        Randevu #{d.bookingRef} {d.service ? `· ${d.service}` : ''} ·{' '}
        {new Date(d.createdAt).toLocaleString('tr-TR')}
        {d.note ? ` · "${d.note}"` : ''}
      </div>
      {d.resolution ? (
        <div className="mt-0.5 text-ax-sm text-ink-3">
          Karar notu: {d.resolution}
        </div>
      ) : null}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {d.receiptUri ? (
          <a
            className="btn-sm no-underline"
            href={d.receiptUri}
            target="_blank"
            rel="noreferrer"
          >
            🧾 Dekontu incele
          </a>
        ) : (
          <span className="text-ax-sm text-ink-3">Dekont yok</span>
        )}
        {d.status === 'open' ? (
          <>
            <button className="btn-sm btn-ok" onClick={() => resolve(d, 'approve')}>
              Onayla
            </button>
            <button className="btn-sm btn-danger" onClick={() => resolve(d, 'reject')}>
              Reddet
            </button>
          </>
        ) : (
          <span className={`pill ${statusPill(d.status)}`}>{statusLabel(d.status)}</span>
        )}
      </div>
    </div>
  );
  return (
    <>
      <PageHead
        title="Depozito itirazları"
        sub="Depozito itirazları ve iade dekontları — dekont görselleri burada incelenir. Sabit ilke: dürüst eleştiri/haklı iade reddedilmez."
      />
      <SectionTitle>Bekleyen ({open.length})</SectionTitle>
      <Card className="mb-5">
        {open.length === 0 ? (
          <Loading label="Bekleyen anlaşmazlık yok" />
        ) : (
          open.map(row)
        )}
      </Card>
      {resolved.length > 0 && (
        <>
          <SectionTitle>Çözülenler ({resolved.length})</SectionTitle>
          <Card className="opacity-80">{resolved.map(row)}</Card>
        </>
      )}
    </>
  );
}
function ReviewDisputesView() {
  const { onayla } = useDiyalog();
  const { data, reload } = useAsync<ReviewDispute[]>(() => api.reviewDisputes(), []);
  const list = data ?? [];
  const resolve = async (d: ReviewDispute, action: 'keep' | 'remove') => {
    const msg =
      action === 'remove'
        ? 'Bu yorumu GİZLE? Yalnızca kural ihlali (hakaret, kişisel bilgi, alakasız içerik, sahte yorum) varsa yapılır. Dürüst negatif yorum silinmez.'
        : 'İtirazı kapat ve yorumu OLDUĞU GİBİ tut?';
    if (
      !(await onayla({
        baslik: action === 'remove' ? 'Yorumu gizle' : 'İtirazı kapat',
        mesaj: msg,
        onayEtiket: action === 'remove' ? 'Gizle' : 'Olduğu gibi tut',
        tehlikeli: action === 'remove',
      }))
    )
      return;
    await api.resolveReviewDispute(d.id, action);
    reload();
  };
  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);
  return (
    <>
      <PageHead
        title="Yorum itirazları"
        sub={
          'Uzman/işletmenin itiraz ettiği yorumlar. Sabit ilke: yorum inceleme boyunca görünür kalır; yalnızca kural ihlalinde gizlenir — “hizmeti beğenmedim” türü dürüst negatif yorum SİLİNMEZ.'
        }
      />
      <SectionTitle>Bekleyen ({list.length})</SectionTitle>
      <Card className="p-2">
        {list.length === 0 ? (
          <Loading label="Bekleyen itiraz yok" />
        ) : (
          list.map((d) => (
            <div
              key={d.id}
              className="border-b border-line px-3 py-4 last:border-b-0"
            >
              <div className="text-ax-md font-semibold text-ink">
                <span className="tabular-nums text-warn">{stars(d.score)}</span> · {d.authorLabel}
                {d.visible ? '' : ' · (gizli)'}
              </div>
              <div className="mt-1 text-ax-sm italic text-ink-2">
                “{d.comment || '—'}”
              </div>
              {d.reply ? (
                <div className="mt-1 text-ax-sm text-ink-2">
                  Uzman yanıtı: {d.reply}
                </div>
              ) : null}
              <div className="mt-1 text-ax-xs text-ink-3">
                İtiraz gerekçesi: {d.disputeReason || '—'}
                {d.disputedAt ? ` · ${new Date(d.disputedAt).toLocaleString('tr-TR')}` : ''}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-sm" onClick={() => resolve(d, 'keep')}>
                  Yorumu tut
                </button>
                <button className="btn-sm btn-danger" onClick={() => resolve(d, 'remove')}>
                  Kural ihlali — gizle
                </button>
              </div>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
function QuotesView() {
  const { data } = useAsync<QuoteReq[]>(() => api.quoteRequests(), []);
  return (
    <>
      <PageHead
        title="Canlı talepler"
        sub={`§12.4 — talep akışı: kim açtı, şehir, bütçe, gelen teklifler, randevuya dönüşüm (${data?.length ?? 0})`}
      />
      <Card>
        {!data ? (
          <Loading />
        ) : data.length === 0 ? (
          <Loading label="Teklif talebi yok" />
        ) : (
          data.map((q) => (
            <div key={q.id} className="list-row">
              <div className="grow">
                <div className="name">
                  {q.category}
                  {q.hasPhoto ? ' · 📷' : ''}
                  {q.mode === 'describe' ? ' · ✍️' : ''}
                </div>
                <div className="meta">
                  {q.userName} · {q.city || '—'}
                  {q.budget != null ? ` · bütçe ${TL(q.budget)}` : ''} ·{' '}
                  {q.note ? q.note.slice(0, 60) : 'Not yok'}
                </div>
              </div>
              <span className="pill bg-line text-ink-3">{q.quoteCount} teklif</span>
              {q.bestPrice != null ? (
                <div className="whitespace-nowrap text-ax-sm font-bold tabular-nums text-ink">
                  min {TL(q.bestPrice)}
                </div>
              ) : null}
              <span className={`pill ${q.status === 'open' ? 'pending' : 'approved'}`}>
                {q.bookingId ? '✓ Randevu' : q.status === 'open' ? 'Açık' : 'Kapalı'}
              </span>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
function LoyaltyView() {
  const { data } = useAsync<Loyalty>(() => api.loyalty(), []);
  return (
    <>
      <PageHead
        title="Puan ekonomisi"
        sub="Puan defteri (append-only) — bakiye dolaşımdaki puan = platform yükümlülüğü"
      />
      {!data ? (
        <Loading />
      ) : (
        <>
          <div className="mb-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat v={data.totals.earned.toLocaleString('tr-TR')} l="Kazanılan puan" />
            <Stat v={data.totals.spent.toLocaleString('tr-TR')} l="Harcanan puan" />
            <Stat v={data.totals.balance.toLocaleString('tr-TR')} l="Dolaşımdaki (yükümlülük)" />
          </div>
          <SectionTitle>Son hareketler</SectionTitle>
          <Card>
            {data.entries.length === 0 ? (
              <Loading label="Hareket yok" />
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
                  <span className={`pill ${e.points >= 0 ? 'approved' : 'rejected'} tabular-nums`}>
                    {e.points >= 0 ? `+${e.points}` : e.points} puan
                  </span>
                </div>
              ))
            )}
          </Card>
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
      <PageHead title="Özellikler" sub="Özellik açma/kapama (kademeli yayın)" />
      <Card className="mb-5">
        <div className="form-inline">
          <input
            className="input"
            placeholder="Anahtar (örn. new_booking_flow)"
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
          />
          <input
            className="input"
            placeholder="Açıklama"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <button className="btn-sm btn-ok full" onClick={create}>
            + Flag ekle (kapalı)
          </button>
        </div>
      </Card>
      <Card>
        {!data ? (
          <Loading />
        ) : data.length === 0 ? (
          <Loading label="Flag yok" />
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
      </Card>
    </>
  );
}
function SystemView() {
  const { data, reload } = useAsync<SystemSettings>(() => api.systemSettings(), []);
  const [rateEdits, setRateEdits] = useState<Record<string, string>>({});
  const [keyEdits, setKeyEdits] = useState<Record<string, string>>({});
  const [tests, setTests] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [cityActive, setCityActive] = useState('');
  const [citySoon, setCitySoon] = useState('');
  const [kaspiEdit, setKaspiEdit] = useState('');
  const saveRate = async (key: string) => {
    const raw = rateEdits[key];
    if (raw === undefined || raw === '') return;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) return;
    await api.setRate(key, Math.round(value));
    setRateEdits((s) => ({ ...s, [key]: '' }));
    reload();
  };
  const saveKey = async (provider: string) => {
    const value = keyEdits[provider] ?? '';
    await api.setApiKey(provider, value);
    setKeyEdits((s) => ({ ...s, [provider]: '' }));
    reload();
  };
  const saveKaspi = async () => {
    // Boş kaydetmek özelliği KAPATIR — bilinçli bir seçenek: bağlantı bozulursa
    // düğmeyi gizlemek, müşteriyi çalışmayan bir yola göndermekten iyidir.
    await api.setKaspiLink(kaspiEdit.trim());
    setKaspiEdit('');
    reload();
  };
  const test = async (provider: string) => {
    const res = await api.testApiKey(provider);
    setTests((s) => ({ ...s, [provider]: res }));
  };
  const saveCities = async () => {
    const active = cityActive
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    const soon = citySoon
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    if (active.length === 0) return;
    await api.setCities(active, soon);
    setCityActive('');
    setCitySoon('');
    reload();
  };
  return (
    <>
      <PageHead
        title="Ayarlar"
        sub="Parametrik oranlar · dış servis anahtarları · şehir yönetimi"
      />
      {/* Parametrik oranlar */}
      <SectionTitle>Ceza / depozito tutarları ve oranlar</SectionTitle>
      <p className="-mt-1 mb-4 max-w-[70ch] text-ax-sm leading-relaxed text-ink-3">
        Değişiklikler app&apos;e `/config` üzerinden yansır.
      </p>
      <Card>
        {!data ? (
          <Loading />
        ) : (
          data.rates.map((r) => (
            <div key={r.key} className="list-row">
              <div className="grow">
                <div className="name">{r.label}</div>
                <div className="meta">
                  {r.key} · güncel: {r.value} {r.suffix}
                </div>
              </div>
              <input
                className="input w-[120px]"
                type="number"
                placeholder={String(r.value)}
                value={rateEdits[r.key] ?? ''}
                onChange={(e) => setRateEdits((s) => ({ ...s, [r.key]: e.target.value }))}
              />
              <button className="btn-sm btn-ok" onClick={() => saveRate(r.key)}>
                Kaydet
              </button>
            </div>
          ))
        )}
      </Card>
      {/* §4.4 — Kaspi ödeme bağlantısı */}
      <SectionTitle>Kaspi ile ödeme</SectionTitle>
      <p className="-mt-1 mb-4 max-w-[70ch] text-ax-sm leading-relaxed text-ink-3">
        SES INVEST QR kodunun içeriği (bir bağlantı). Doluysa müşteri depozito ekranında “Kaspi ile
        öde” düğmesini görür; boşsa düğme hiç görünmez.
      </p>
      <Card>
        <div className="list-row">
          <div className="grow">
            <div className="name">Ödeme bağlantısı</div>
            <div className="meta">
              {data?.kaspi.configured
                ? `Tanımlı · ${data.kaspi.url}`
                : 'Tanımlı değil — düğme gizli'}
            </div>
            <div className="meta !mt-1">
              Bağlantı tutarı destekliyorsa <code className="rounded-sm bg-bg-alt px-1 py-0.5 text-ax-xs font-semibold text-ink-2">{'{tutar}'}</code>, randevu referansını
              destekliyorsa <code className="rounded-sm bg-bg-alt px-1 py-0.5 text-ax-xs font-semibold text-ink-2">{'{ref}'}</code> yazın; uygulama bunları doldurur. Hangi biçimin
              çalıştığını telefonda deneyerek doğrulayın.
            </div>
          </div>
          <input
            className="input w-[360px]"
            placeholder="https://kaspi.kz/pay/..."
            value={kaspiEdit}
            onChange={(e) => setKaspiEdit(e.target.value)}
          />
          <button className="btn-sm btn-ok" onClick={saveKaspi}>
            Kaydet
          </button>
        </div>
      </Card>
      {/* API anahtarları */}
      <SectionTitle>API anahtarları</SectionTitle>
      <p className="-mt-1 mb-4 max-w-[70ch] text-ax-sm leading-relaxed text-ink-3">
        Maskeli görünüm — değer asla panele/app&apos;e dönmez. &quot;Test Et&quot; biçim/varlık
        kontrolü yapar.
      </p>
      <Card>
        {!data ? (
          <Loading />
        ) : (
          data.apiKeys.map((k: ApiKeyStatus) => (
            <div key={k.provider} className="list-col">
              <div className="name">{k.label}</div>
              <div className="meta">
                {k.configured ? `Tanımlı: ${k.masked}` : 'Tanımsız'}
                {tests[k.provider] && (
                  <span
                    className={tests[k.provider]!.ok ? 'font-semibold text-ok' : 'font-semibold text-err'}
                  >
                    {' '}
                    · {tests[k.provider]!.ok ? '✓' : '✗'} {tests[k.provider]!.message}
                  </span>
                )}
              </div>
              <div className="form-inline mt-2.5">
                <input
                  className="input"
                  placeholder="Yeni anahtar (boş = temizle)"
                  value={keyEdits[k.provider] ?? ''}
                  onChange={(e) => setKeyEdits((s) => ({ ...s, [k.provider]: e.target.value }))}
                />
                <button className="btn-sm btn-ok" onClick={() => saveKey(k.provider)}>
                  Kaydet
                </button>
                <button className="btn-sm" onClick={() => test(k.provider)}>
                  Test Et
                </button>
              </div>
            </div>
          ))
        )}
      </Card>
      {/* Şehir yönetimi */}
      <SectionTitle>Şehir yönetimi</SectionTitle>
      <p className="-mt-1 mb-4 max-w-[70ch] text-ax-sm leading-relaxed text-ink-3">
        Aktif şehirler + &quot;yakında&quot; listesi (virgülle ayır).
      </p>
      <Card className="mb-8">
        {!data ? (
          <Loading />
        ) : (
          <>
            <div className="list-col">
              <div className="name">Aktif şehirler</div>
              <div className="meta">{data.cities.active.join(', ') || '—'}</div>
            </div>
            <div className="list-col">
              <div className="name">Yakında</div>
              <div className="meta">{data.cities.soon.join(', ') || '—'}</div>
            </div>
            <div className="form-inline">
              <input
                className="input"
                placeholder={`Aktif (örn. ${data.cities.active.join(', ')})`}
                value={cityActive}
                onChange={(e) => setCityActive(e.target.value)}
              />
              <input
                className="input"
                placeholder={`Yakında (örn. ${data.cities.soon.join(', ')})`}
                value={citySoon}
                onChange={(e) => setCitySoon(e.target.value)}
              />
              <button className="btn-sm btn-ok full" onClick={saveCities}>
                Şehirleri güncelle
              </button>
            </div>
          </>
        )}
      </Card>
      <CategorySection />
    </>
  );
}
function CategorySection() {
  const { data, reload } = useAsync<CategoryConfig>(() => api.categoryConfig(), []);
  const [edits, setEdits] = useState<CategoryConfig>({});
  const save = async () => {
    if (!data) return;
    await api.setCategoryConfig({ ...data, ...edits });
    setEdits({});
    reload();
  };
  const set = (cat: string, field: 'maintenanceDays' | 'serviceMin', v: string) => {
    const base = data?.[cat] ?? { maintenanceDays: 0, serviceMin: 0 };
    setEdits((s) => ({ ...s, [cat]: { ...base, ...s[cat], [field]: Number(v) } }));
  };
  const val = (cat: string, field: 'maintenanceDays' | 'serviceMin') =>
    edits[cat]?.[field] ?? data?.[cat]?.[field] ?? 0;
  return (
    <>
      <h2 className="section-head">Kategori ayarları — bakım periyodu & hizmet süresi</h2>
      <p className="page-sub">Bakım Takvimi periyodu (gün) + slot motoru varsayılan süresi (dk).</p>
      <div className="card">
        {!data ? (
          <div className="empty">Yükleniyor…</div>
        ) : (
          <>
            {Object.keys(data).map((cat) => (
              <div key={cat} className="list-row">
                <div className="grow">
                  <div className="name">{cat}</div>
                </div>
                <label className="meta">
                  Bakım (gün)
                  <input
                    className="input"
                    style={{ width: 80 }}
                    type="number"
                    value={val(cat, 'maintenanceDays')}
                    onChange={(e) => set(cat, 'maintenanceDays', e.target.value)}
                  />
                </label>
                <label className="meta">
                  Süre (dk)
                  <input
                    className="input"
                    style={{ width: 80 }}
                    type="number"
                    value={val(cat, 'serviceMin')}
                    onChange={(e) => set(cat, 'serviceMin', e.target.value)}
                  />
                </label>
              </div>
            ))}
            <div style={{ padding: 16 }}>
              <button
                className="btn-sm btn-ok"
                onClick={save}
                disabled={Object.keys(edits).length === 0}
              >
                Kategori ayarlarını kaydet
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
function AuditView() {
  const { data } = useAsync<AuditEntry[]>(() => api.auditLogs(), []);
  return (
    <>
      <PageHead title="Denetim kaydı" sub="Kritik eylemlerin izi (PII yok — yalnızca rol/kaynak/hash)" />
      <Card className="overflow-hidden p-0">
        {!data ? (
          <Loading />
        ) : data.length === 0 ? (
          <Loading label="Kayıt yok" />
        ) : (
          data.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 hover:bg-bg-alt transition-colors"
            >
              <div className="grow min-w-0">
                <div className="text-ax-sm font-medium text-ink truncate">
                  {a.action} · {a.resourceType}
                </div>
                <div className="mt-0.5 text-ax-xs text-ink-3 tabular-nums">
                  {a.resourceId ? `#${a.resourceId.slice(0, 8)} · ` : ''}
                  {a.actorRole || 'sistem'} · {new Date(a.createdAt).toLocaleString('tr-TR')}
                </div>
              </div>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
