import {
  BOS_DURUM,
  acilisMesajiSec,
  type SplashBaglami,
  type SplashDurumu,
  type SplashSonucu,
} from '@ayna/domain';
import type { Appointment } from './data';

/**
 * AÇILIŞ MESAJI KAPISI — bağlamı toplar, motoru çağırır.
 *
 * Seçim kuralları `@ayna/domain`de ve SAF; burası yalnız uygulamanın
 * durumunu o kuralların beklediği biçime çeviriyor. Kuralların testi
 * orada, bu dosyanın testi "doğru bağlamı topluyor mu".
 *
 * ── YALNIZ MÜŞTERİ ──────────────────────────────────────────────────────
 *
 * Brief §1.1: "Yalnızca MÜŞTERİ rolünde gösterilir. Uzman ve salon
 * rollerinde bu özellik YOKTUR." Karar burada veriliyor; ekran hiç
 * kurulmuyor, yalnız gizlenmiyor.
 */

const GUN = 24 * 60 * 60 * 1000;

export interface AcilisGirdisi {
  rol: string | null | undefined;
  dil: string;
  ad?: string | null | undefined;
  cinsiyet?: 'female' | 'male' | 'other' | null | undefined;
  /** Profildeki doğum tarihi (UTC ms). */
  dogumTarihiMs?: number | null | undefined;
  randevular: readonly Appointment[];
  puan: number;
  /** Bu hesapta daha önce hiç açılış mesajı gösterildi mi? */
  dahaOnceAcildi: boolean;
  /** Son açılış anı (ms) — 30+ gün yokluk kuralı için. */
  sonAcilisMs?: number | null | undefined;
  durum: SplashDurumu;
  /** Brief §7.1 — uzak katalog inmişse o, yoksa cihazdaki paket. */
  katalog?: SplashBaglami['katalog'];
  simdi?: Date;
}

/** Aynı takvim gününde mi? (cihaz yerel saati — brief §3) */
const ayniGun = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * Bağlamı kurar ve mesajı seçer. Müşteri değilse `null` — ekran hiç
 * çizilmiyor.
 */
export function acilisMesajiHazirla(g: AcilisGirdisi): SplashSonucu | null {
  if (g.rol !== 'user') return null;

  const simdi = g.simdi ?? new Date();
  const yarin = new Date(simdi.getTime() + GUN);

  /*
   * ONAYLI randevu = depozito yatmış ve kesinleşmiş olan.
   *
   * `onay_bekliyor` ya da `depozito_bekliyor` için "yarın randevun var"
   * demek, henüz kesinleşmemiş bir şeyi kesinmiş gibi sunmak olurdu:
   * uzman onaylamayabilir ya da depozito süresi dolup randevu düşebilir.
   * Kullanıcı sabah "randevu günü!" mesajıyla uyanıp randevusunun
   * olmadığını öğrenirdi.
   */
  const KESIN: readonly Appointment['status'][] = [
    'kesinlesti',
    'hizmet_gunu',
    'erteleme_onerildi',
  ];
  const onayli = (a: Appointment) => KESIN.includes(a.status);
  const bugunku = g.randevular.find((a) => onayli(a) && ayniGun(new Date(a.startMs), simdi));
  const yarinki = g.randevular.find((a) => onayli(a) && ayniGun(new Date(a.startMs), yarin));

  /*
   * Tamamlanmış randevu: yalnız SON tamamlanan ve daha önce duyurulmamış
   * olan. Motor sıklık limitini randevu kimliğine bağlıyor.
   */
  const tamamlanan = [...g.randevular]
    .filter(
      (a) => a.status === 'tamamlandi' || a.status === 'degerlendirme' || a.status === 'kapandi',
    )
    .sort((a, b) => b.startMs - a.startMs)[0];

  const dogum = g.dogumTarihiMs ? new Date(g.dogumTarihiMs) : null;

  const baglam: SplashBaglami = {
    simdi,
    dil: g.dil,
    ad: g.ad ?? null,
    cinsiyet: g.cinsiyet ?? null,
    dogumGunu: dogum ? { ay: dogum.getMonth() + 1, gun: dogum.getDate() } : null,
    ilkAcilis: !g.dahaOnceAcildi,
    yoklukGunu: g.sonAcilisMs ? Math.floor((simdi.getTime() - g.sonAcilisMs) / GUN) : null,
    bugunRandevuId: bugunku?.id ?? null,
    yarinRandevuId: yarinki?.id ?? null,
    tamamlananRandevuId: tamamlanan?.id ?? null,
    puan: g.puan,
    durum: g.durum ?? BOS_DURUM,
    katalog: g.katalog,
  };
  return acilisMesajiSec(baglam);
}
