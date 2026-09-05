import type { PendingCounts } from './ortak';

/**
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
 * ROTA NOTU: Menü eskiden `setTab(id)` çağıran düğmelerden oluşuyordu ve
 * URL hiç değişmiyordu — hangi ekranda olduğun paylaşılamıyor, yer imine
 * eklenemiyor, sayfa yenilenince kayboluyordu. Artık her kalem gerçek bir
 * <Link href> taşıyor.
 */

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  /** Rozet sayısını PendingCounts'tan okur; kalem rozetsizse tanımsız. */
  badge?: (q: PendingCounts | null) => number | undefined;
};

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'PANO',
    items: [
      { href: '/', label: 'Bugün', icon: '◎' },
      { href: '/stats', label: 'Raporlar', icon: '◔' },
    ],
  },
  {
    /*
     * Panelin kalbi. Dokuz kuyruğun HEPSİ burada: dağıtıldıklarında
     * "beni bekleyen iş var mı" sorusunun cevabı menüye yayılıyordu.
     */
    title: 'ONAY BEKLEYENLER',
    items: [
      {
        href: '/businesses',
        label: 'Salon başvuruları',
        icon: '◈',
        badge: (q) => q?.businesses,
      },
      { href: '/specialists', label: 'Uzman doğrulama', icon: '◇' },
      { href: '/kyc', label: 'Kimlik doğrulama', icon: '⬡', badge: (q) => q?.kyc },
      {
        href: '/profile-changes',
        label: 'Profil değişiklikleri',
        icon: '✎',
        badge: (q) => q?.profileChanges,
      },
      {
        href: '/subscriptions',
        label: 'Abonelik dekontları',
        icon: '❖',
        badge: (q) => q?.subscriptions,
      },
      { href: '/disputes', label: 'Depozito itirazları', icon: '⚖', badge: (q) => q?.disputes },
      {
        href: '/review-disputes',
        label: 'Yorum itirazları',
        icon: '❝',
        badge: (q) => q?.reviewDisputes,
      },
      {
        href: '/moderation',
        label: 'Topluluk moderasyonu',
        icon: '⛨',
        badge: (q) => q?.circle,
      },
      {
        href: '/regulated',
        label: 'Regüle hizmet uyarıları',
        icon: '⚕',
        badge: (q) => q?.regulatedServices,
      },
      { href: '/support', label: 'Destek talepleri', icon: '☏' },
    ],
  },
  {
    title: 'KİŞİLER',
    items: [
      { href: '/users', label: 'Üyeler', icon: '☰' },
      { href: '/professionals', label: 'Uzman & salonlar', icon: '✦' },
      { href: '/penalties', label: 'Kısıtlı hesaplar', icon: '⊘' },
    ],
  },
  {
    title: 'RANDEVU & PARA',
    items: [
      {
        // Bu sekme bir dönem MENÜDE HİÇ YOKTU: dekont doğrulama, iadeler
        // ve uzlaşma kuyrukları panelde açılamıyordu.
        href: '/bookings',
        label: 'Randevular & ödemeler',
        icon: '▤',
        badge: (q) =>
          (q?.depositReceipts ?? 0) + (q?.refundsPending ?? 0) + (q?.reconciliationsOpen ?? 0),
      },
      { href: '/commissions', label: 'Komisyonlar', icon: '₸' },
      { href: '/loyalty', label: 'Puan ekonomisi', icon: '◍' },
    ],
  },
  {
    title: 'KATALOG',
    items: [
      { href: '/services', label: 'Hizmetler', icon: '⊞' },
      { href: '/prices', label: 'Taban fiyatlar', icon: '⊙' },
      { href: '/quotes', label: 'Canlı talepler', icon: '◐' },
    ],
  },
  {
    title: 'İÇERİK',
    items: [
      { href: '/content', label: 'Blog & tema', icon: '▦' },
      { href: '/announcements', label: 'Duyurular', icon: '◭' },
      { href: '/splash', label: 'Açılış mesajları', icon: '✧' },
      { href: '/campaigns', label: 'Kampanyalar', icon: '◮' },
      { href: '/ads', label: 'Reklamlar', icon: '▣', badge: (q) => q?.adOrders },
    ],
  },
  {
    title: 'SİSTEM',
    items: [
      { href: '/system', label: 'Ayarlar', icon: '⚙' },
      { href: '/flags', label: 'Özellikler', icon: '⚑' },
      { href: '/audit', label: 'Denetim kaydı', icon: '⧉' },
    ],
  },
];

/** Düz kalem listesi — aktif başlık ve rozet toplamı hesaplarında kullanılır. */
export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

/**
 * Bulunulan yola karşılık gelen menü kalemini bulur.
 * En uzun eşleşen href kazanır: /businesses/42 → /businesses kalemi seçili kalır.
 */
export function aktifKalem(pathname: string): { grup: string; kalem: NavItem } | null {
  let en: { grup: string; kalem: NavItem } | null = null;
  for (const g of NAV_GROUPS) {
    for (const k of g.items) {
      const eslesti = k.href === '/' ? pathname === '/' : pathname.startsWith(k.href);
      if (!eslesti) continue;
      if (!en || k.href.length > en.kalem.href.length) en = { grup: g.title, kalem: k };
    }
  }
  return en;
}
