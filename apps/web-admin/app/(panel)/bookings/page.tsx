'use client';
import { Suspense, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Card, Chip, Loading, PageHead, Toolbar } from '@/app/_components/ui';
import { Gate } from '@/app/_components/Gate';
import { useAsync } from '@/app/_lib/useAsync';
import { TL } from '@/app/_lib/ortak';
import { useDiyalog } from '@/app/ui/Diyalog';
import { api, type AdminBooking } from '@/app/lib/api';

/**
 * §4 — Randevular & ödemeler ("/bookings").
 *
 * ROTA NOTU: durum çipi eskiden `useState('all')` idi; "uyuşmazlıktaki
 * randevulara bak" denip link atılamıyor, sayfa yenilenince seçim başa
 * dönüyordu. Artık `?durum=` sorgusunda ve varsayılan kaynaktakiyle aynı
 * ('all' — parametre hiç yoksa geçerli olan). Serbest metin araması geçici
 * bir daraltma olduğu için useState kalıyor: adreste taşınacak bir durum
 * değil.
 *
 * Suspense: panel `output: 'export'` ile statik üretiliyor; useSearchParams
 * okuyan ağaç bir sınır içinde olmazsa derleme kırılır.
 */
const VARSAYILAN = 'all';

// Brief §3 durum sözlüğü. Adlar kod, veritabanı ve belgede AYNI; panel de
// aynı kelimeleri kullanıyor ki bir randevu üç yerde üç farklı isimle
// görünmesin. Eski sözlük (confirmed/pending/waitlist...) tamamen kaldırıldı:
// filtreler var olmayan adları sorguladığı için panel her sekmede boş dönüyordu.
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

export default function BookingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Randevular />
    </Suspense>
  );
}

function Randevular() {
  const { onayla, bildir } = useDiyalog();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const status = params.get('durum') ?? VARSAYILAN;
  const setStatus = (s: string) => {
    const p = new URLSearchParams(params.toString());
    if (s === VARSAYILAN) p.delete('durum');
    else p.set('durum', s);
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const [q, setQ] = useState('');
  const {
    data,
    loading,
    error,
    reload: run,
  } = useAsync<AdminBooking[]>(() => api.bookings(status), [status]);
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
          className="input"
          style={{ maxWidth: 260, marginLeft: 'auto' }}
          placeholder="Ara: uzman / hizmet / müşteri"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </Toolbar>
      <Card>
        {!data ? (
          <Gate loading={loading} error={error} onRetry={run} />
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
                  {b.finalPrice != null ? ` · kasada ${TL(b.finalPrice)}` : ''}
                </div>
                {/*
                  İKİ TARAFIN ONAYI — kurucu (05.09.2026): "her iki tarafın
                  onayı adminde müşterinin ayna parasını aktif hale getirir."

                  Panel bu iki onayı hiç göstermiyordu: yönetici, puanın neden
                  yazılmadığını (hangi tarafın onayının eksik olduğunu)
                  göremiyordu. Yalnız online randevularda anlamlı — offline
                  salon kaydında ayna para zaten doğmuyor.
                */}
                {b.online ? (
                  <div className="meta">
                    <span title="Müşterinin 'ödemeyi yaptım' beyanı">
                      {b.musteriOdedi ? '✓' : '○'} müşteri ödedi
                    </span>
                    {' · '}
                    <span title="Uzmanın 'ödemeyi aldım' teyidi">
                      {b.uzmanAldi ? '✓' : '○'} uzman aldı
                    </span>
                    {' · '}
                    <span title="İkisi de onayladıysa müşterinin ayna parası yazıldı">
                      {b.aynaParaAktif ? 'ayna para AKTİF' : 'ayna para bekliyor'}
                    </span>
                  </div>
                ) : null}
              </div>
              {/*
                DEPOZİTO DEKONTU GÖRÜNÜR.

                §4.4: dekont yüklendiği an randevu kesinleşiyor, yönetici
                doğrulaması SONRA geliyor. Ama panel dekontu hiç
                göstermiyordu — yönetici neyi doğrulayacağını göremiyor,
                elinde yalnız "İptal" kalıyordu (kurucu bildirdi).
              */}
              {b.depositReceiptUri ? (
                <a href={b.depositReceiptUri} target="_blank" rel="noreferrer" title="Dekontu aç">
                  <img className="thumb" src={b.depositReceiptUri} alt="dekont" />
                </a>
              ) : null}
              <div className="kv-v">{b.price > 0 ? TL(b.price) : '—'}</div>
              <span className={`pill ${pill(b.status)}`}>
                {BOOKING_STATUS_TR[b.status] ?? b.status}
              </span>
              {/* "Tamamlandı işaretle" düğmesi KALDIRILDI (§4.9): tamamlanma,
                  müşterinin "ödemeyi yaptım" ve uzmanın "ödeme aldım" el
                  sıkışmasıyla olur. Admin'in tek tuşla tamamlaması, hiç
                  ödenmemiş bir randevuya puan yükleyip komisyon tabanına
                  yazardı. §8 admin'e üç kuyruk veriyor; tamamlama vermiyor.
                  İptal destek kaçış kapısı olarak kalıyor. */}
              {/*
                SAHTE DEKONT GERİ ALINIYOR — iptal DEĞİL.
                İptal müşteriyi cezalandıran ayrı bir sonuç; para gelmediyse
                doğru sonuç randevunun depozito beklemeye dönmesi ve
                müşterinin doğru dekontu yükleyebilmesi.
              */}
              {b.depositReceiptUri && !KAPALI_DURUMLAR.includes(b.status) ? (
                <button
                  className="btn-sm btn-ghost"
                  onClick={() =>
                    act(
                      () => api.rejectReceipt(b.id),
                      `Dekont reddedilsin mi? Randevu depozito beklemeye döner. (${b.service})`,
                    )
                  }
                >
                  Dekontu reddet
                </button>
              ) : null}
              {!KAPALI_DURUMLAR.includes(b.status) ? (
                <button
                  /*
                   * SINIF ADLARI YANLIŞTI: `small` ve `danger` diye bir kural
                   * YOK (`btn-sm`, `btn-danger` var). Düğme yalnız `.btn`
                   * alıyordu ve `.btn` bir FORM düğmesi: `width: 100%`.
                   * Satırdaki tüm yeri kaplıyor, ad/hizmet sütununu bir
                   * harflik şeride eziyordu — kurucunun "yazılar iç içe
                   * geçmiş" dediği ekran. Kapalı randevularda düğme
                   * çizilmediği için o satırlar düzgün görünüyordu.
                   */
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
