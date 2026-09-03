import { type UzakKatalog, uzakKatalogAyikla } from '@ayna/domain';

/**
 * UZAK KATALOG EŞİTLEMESİ — brief §7.1.
 *
 * "Açılışta arka planda sunucudan güncel katalog senkronize edilir."
 *
 * ── AÇILIŞI HİÇBİR ŞEKİLDE BEKLETMİYOR ──────────────────────────────────
 *
 * Eşitleme mesaj SEÇİLDİKTEN SONRA arka planda koşuyor ve sonucu bir
 * SONRAKİ açılışta devreye giriyor. Önce indirip sonra seçseydik, ağın
 * yavaş olduğu her açılışta kullanıcı boş ekrana bakardı — brief §6.1
 * "splash hiçbir koşulda yüklemeye ek bekleme yaratmaz" derken tam da
 * bunu yasaklıyor.
 *
 * ── BAŞARISIZLIK SESSİZ VE ZARARSIZ ─────────────────────────────────────
 *
 * Ağ yoksa, sunucu hata verirse ya da gövde doğrulamayı geçmezse eldeki
 * katalog OLDUĞU GİBİ kalıyor. Kullanıcıya hata göstermenin anlamı yok:
 * açılış mesajı zaten cihazdaki paketle çalışıyor.
 */
export async function acilisKatalogunuEsitle(
  /**
   * Kataloğu indiren çağrı DIŞARIDAN geliyor (`api.splashKatalog`).
   * `api` modülünü içeri alsaydık bu dosya expo/react-native'i de içeri
   * çeker ve SINANAMAZ olurdu — ağ hatasının kataloğu bozmadığını
   * kanıtlayamazdım.
   */
  indir: () => Promise<unknown>,
  mevcut: UzakKatalog | null,
  yaz: (k: UzakKatalog) => void,
): Promise<void> {
  try {
    const ham = await indir();
    const yeni = uzakKatalogAyikla(ham);
    if (!yeni) return;
    // Sürüm aynıysa yazmıyoruz: her açılışta kalıcı depoya 54 mesaj
    // yazmanın faydası yok.
    if (mevcut && mevcut.surum === yeni.surum) return;
    yaz(yeni);
  } catch {
    // Bilinçli sessiz: eldeki katalog geçerliliğini koruyor.
  }
}

/**
 * GÖSTERİM ÖLÇÜMÜ — brief §7.3.
 *
 * Gövde kişiye ait hiçbir alan taşımıyor. Hata yutuluyor: ölçüm
 * yazılamadı diye kullanıcıya bir şey olmamalı.
 */
export function acilisOlcumuGonder(
  gonder: (g: { code: string; locale: string; atlandi: boolean }) => Promise<unknown>,
  code: string,
  locale: string,
  atlandi: boolean,
): void {
  void gonder({ code, locale, atlandi }).catch(() => undefined);
}
