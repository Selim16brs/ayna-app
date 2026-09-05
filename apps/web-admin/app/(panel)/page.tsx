'use client';
import Link from 'next/link';
import { PageHead, SectionTitle, Stat } from '@/app/_components/ui';
import { Gate } from '@/app/_components/Gate';
import { useAsync } from '@/app/_lib/useAsync';
import { TL } from '@/app/_lib/ortak';
import { api, type Overview } from '@/app/lib/api';

/**
 * PANO — "Bugün".
 *
 * Bölme öncesi bu ekran `OverviewView({ onGo })` idi: kuyruk kartları
 * `onClick={() => onGo(q.tab)}` ile üstteki useState'i değiştiriyordu, URL
 * yerinde sayıyordu. Artık her kart gerçek bir <Link href> — kart sağ tıkla
 * yeni sekmede açılabiliyor, adresi paylaşılabiliyor, geri tuşu çalışıyor.
 * Görünüm ve sınıflar birebir aynı kaldı.
 */
export default function BugunSayfasi() {
  const { data, loading, error, reload } = useAsync<Overview>(() => api.overview(), []);
  // §12.1 — Bekleyen İşler: tıklanabilir kuyruk kartları (rozetlerin dashboard karşılığı)
  const pend = (data as unknown as { pending?: Record<string, number> })?.pending;
  const QUEUES: { key: string; label: string; href: string }[] = [
    { key: 'businesses', label: 'Salon Onayı', href: '/businesses' },
    { key: 'kyc', label: 'Kimlik (KYC)', href: '/kyc' },
    { key: 'profileChanges', label: 'Profil Değişikliği', href: '/profile-changes' },
    { key: 'subscriptions', label: 'Abonelik Dekontu', href: '/subscriptions' },
    { key: 'disputes', label: 'Depozito İtirazı', href: '/disputes' },
    { key: 'reviewDisputes', label: 'Yorum İtirazı', href: '/review-disputes' },
    { key: 'circle', label: 'W2W Moderasyon', href: '/moderation' },
    { key: 'regulatedServices', label: 'Regüle hizmet', href: '/regulated' },
    // §reklam — AYNA'nın kazanç kuyruğu. Bekleyen ödeme kartını ana sayfada
    // görmek, onayı geciktirmemek demek: reklamı ödeyen uzman yayına
    // girmeyi bekliyor.
    { key: 'adOrders', label: 'Reklam Ödemesi', href: '/ads' },
    // Bu üçü sunucuda ZATEN sayılıyordu ama panoda hiç görünmüyordu; üstelik
    // götürdükleri sekmenin menüde girişi de yoktu.
    { key: 'depositReceipts', label: 'Dekont Doğrulama', href: '/bookings' },
    { key: 'refundsPending', label: 'İade', href: '/bookings' },
    { key: 'reconciliationsOpen', label: 'Uzlaşma', href: '/bookings' },
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
                <Link
                  key={qd.key}
                  href={qd.href}
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
                  <span
                    className={`mt-2 text-ax-sm font-semibold ${n > 0 ? 'text-err' : 'text-ink-3'}`}
                  >
                    {qd.label}
                  </span>
                </Link>
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
