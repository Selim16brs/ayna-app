/**
 * Panel geneli paylaşılan saf yardımcılar.
 *
 * Bölme öncesi bunların hepsi 5.000 satırlık tek page.tsx'in içindeydi; her
 * görünüm kendi dosyasına taşındığında ortak kalanlar buraya alındı.
 * Burada React yok — yalnız saf fonksiyon ve sabit.
 */

/** Kazak tengesi biçimi (₸ 12.345). */
export const TL = (n: number) => '₸' + n.toLocaleString('tr-TR');

/**
 * §12 — her liste Excel'e aktarılabilir.
 * UTF-8 BOM ekli: Excel Türkçe karakterleri ancak böyle doğru açıyor.
 */
export function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]!);
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.join(';'), ...rows.map((r) => cols.map((c) => esc(r[c])).join(';'))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Uzman havuzu sektör kodları → Türkçe etiket. */
export const SECTOR_TR: Record<string, string> = {
  hair: 'Saç',
  nails: 'Tırnak',
  skincare: 'Cilt bakımı',
  makeup: 'Makyaj',
  lashes: 'Kirpik',
  brows: 'Kaş',
  spa: 'Spa',
  epilation: 'Epilasyon',
};
export const sectorLabel = (s: string) => SECTOR_TR[s] ?? s;

/** Raporlar sayfasındaki günlük seyir grafiğinin serileri. */
export const METRICS = [
  { key: 'users' as const, label: 'Kayıt', color: '#cc6b86' },
  { key: 'bookings' as const, label: 'Randevu', color: '#6f9f86' },
  { key: 'revenue' as const, label: 'Gelir', color: '#c2a06a' },
];
export type MetricKey = (typeof METRICS)[number]['key'];

/**
 * §12.1 — nav rozetlerini besleyen bekleyen iş sayaçları.
 * /admin/overview yanıtının `pending` alanından gelir.
 */
export type PendingCounts = {
  businesses: number;
  kyc: number;
  profileChanges: number;
  subscriptions: number;
  disputes: number;
  reviewDisputes: number;
  circle: number;
  /** Brief §5 — uzmanın serbest yazdığı regüle hizmet adları. */
  regulatedServices: number;
  /*
   * Sunucunun gönderdiği para kuyrukları. Bunlar hesaplanıyordu ama panelde
   * HİÇBİR rozete bağlı değildi: dekont doğrulaması, iade, uzlaşma ve reklam
   * ödemesi bekleyen iş varken menüde hiçbir işaret çıkmıyordu.
   */
  depositReceipts: number;
  refundsPending: number;
  reconciliationsOpen: number;
  adOrders: number;
};
