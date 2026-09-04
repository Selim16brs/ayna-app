import type { MessageKey } from '@ayna/i18n';

/**
 * KAYIT ADIMLARI — "ileri" basılınca ne olmalı.
 *
 * Kurucu: "kayıt işleminde ekran geçişi olmadan önce eğer girilen
 * bilgilerde (mesela eksik bilgi ya da daha önce kayıtlı numara gibi)
 * hata varsa o anda hata gösterilmeli ve doğru girdi yapılınca next step
 * olmalı."
 *
 * ── ÖNCEKİ DAVRANIŞ ─────────────────────────────────────────────────────
 *
 * "İleri" düğmesi eksik alan varken SESSİZCE PASİFTİ. Kullanıcı basıyor,
 * hiçbir şey olmuyor, neyin eksik olduğunu söyleyen bir yazı da yok.
 * Telefon çakışması ise ancak EN SONDA, kayıt denemesinde anlaşılıyordu:
 * beş adım doldurup duvara çarpmak.
 *
 * ── YENİ DAVRANIŞ ───────────────────────────────────────────────────────
 *
 * Düğme hep basılabilir. Basınca:
 *   - eksik alan varsa o adımın eksikleri YAZILIYOR, adım geçilmiyor;
 *   - kimlik adımında ayrıca sunucuya "bu numara müsait mi" soruluyor;
 *   - her şey doğruysa sıradaki adıma geçiliyor.
 *
 * Bu dosya SAF: ağ çağrısını çağıran veriyor, karar burada.
 */

export interface AdimSonucu {
  /** Adım geçilebilir mi? */
  gecebilir: boolean;
  /** Eksik alan anahtarları (çeviri anahtarı). */
  eksikler: MessageKey[];
  /** Çakışma gibi doğrudan yazılacak hata. */
  hata: string | null;
}

export const ADIM_TAMAM: AdimSonucu = { gecebilir: true, eksikler: [], hata: null };

/** Bir koşul listesinden eksik olanların anahtarları. */
export function eksikAlanlar(kosullar: readonly { ok: boolean; key: MessageKey }[]): MessageKey[] {
  return kosullar.filter((k) => !k.ok).map((k) => k.key);
}

export interface MusaitlikCevabi {
  phoneTaken: boolean;
  emailTaken: boolean;
}

/**
 * Kimlik adımının denetimi: önce YEREL alanlar, sonra sunucu çakışması.
 *
 * Sıra önemli: eksik alan varken sunucuya sormak boşuna istek olurdu ve
 * kullanıcıya "numara müsait" deyip hemen ardından "adını gir" demek
 * kafa karıştırırdı.
 */
export async function kimlikAdimi(
  kosullar: readonly { ok: boolean; key: MessageKey }[],
  sor: () => Promise<MusaitlikCevabi>,
  metin: { telefonDolu: string; epostaDolu: string },
): Promise<AdimSonucu> {
  const eksikler = eksikAlanlar(kosullar);
  if (eksikler.length > 0) return { gecebilir: false, eksikler, hata: null };
  let cevap: MusaitlikCevabi;
  try {
    cevap = await sor();
  } catch {
    /*
     * AĞ HATASI ADIMI KİLİTLEMİYOR.
     *
     * Kontrol edemediysek kullanıcıyı formda tutmak, çevrimdışı bir
     * kullanıcının kaydı hiç tamamlayamaması demek olurdu. Gerçek
     * çakışma zaten kayıt anında sunucuda YİNE denetleniyor; bu kontrol
     * erken uyarı, tek kapı değil.
     */
    return ADIM_TAMAM;
  }
  if (cevap.phoneTaken) return { gecebilir: false, eksikler: [], hata: metin.telefonDolu };
  if (cevap.emailTaken) return { gecebilir: false, eksikler: [], hata: metin.epostaDolu };
  return ADIM_TAMAM;
}
