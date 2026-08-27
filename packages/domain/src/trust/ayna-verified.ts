// "AYNA ONAYLI" ÜST ROZETİ — tek kural, tek yer.
//
// SORUN: kural ÜÇ yerde ayrı ayrı yazılıydı ve ikisi ayrışmıştı.
//
//   katalog (müşterinin gördüğü) : kimlik && (sertifika || sosyal || kayıtlı ИП)
//   uzmanın kendi ekranı         : kimlik && (sertifika || sosyal)
//   admin paneli                 : kimlik && (sertifika || sosyal)
//
// Sonuç: KYC'si onaylı, kayıtlı ИП ama sertifikasız/sosyalsiz bir uzmanın
// profilinde MÜŞTERİ rozeti görüyordu; uzman kendi ekranında "Henüz AYNA
// Onaylı değilsin" yazısını okuyordu; admin de doğrulanmamış sanıyordu.
// Üstelik uzman ekranı `business` bayrağını hesaplayıp KULLANMIYORDU —
// unutulmuş bir satır gibi duruyor.
//
// Kural artık BURADA. Katalog sürümü esas alındı: canlıda müşterinin gördüğü
// davranış odur ve tek yazılı gerekçesi olan sürüm odur. Daha DAR kurala
// geçmek, bugün rozeti olan uzmanlardan onu geri almak demekti — bu bir ürün
// kararı, sessizce yapılacak bir şey değil.

/** Kayıt durumu: ИП olarak kayıtlı + geçerli 12 haneli IIN. */
export function uzmanKayitli(
  entityType: string | null | undefined,
  iin: string | null | undefined,
): boolean {
  return entityType === 'ip' && /^\d{12}$/.test(iin ?? '');
}

/** Katmanlı doğrulama bayrakları — rozet şeridinin çizdiği şey. */
export interface TrustLayers {
  identity: boolean;
  business: boolean;
  bin: boolean;
  address: boolean;
  social: boolean;
  cert: boolean;
}

/**
 * Üst rozet.
 *
 * Salon ve uzman AYNI kurala tabi değil — ikisinin kanıtı farklı:
 *   salon : kimlik + (işletme kaydı | BİN)      → tüzel kişilik kanıtı
 *   uzman : kimlik + (sertifika | sosyal | ИП)  → yetkinlik ya da kayıt kanıtı
 *
 * `identity` her ikisinde de ZORUNLU: kim olduğu bilinmeyen birine güven
 * rozeti verilmez, ne kadar sertifikası olursa olsun.
 */
export function aynaOnayli(kind: string, k: TrustLayers, kayitli = false): boolean {
  if (!k.identity) return false;
  return kind === 'salon' ? k.business || k.bin : k.cert || k.social || kayitli;
}

/**
 * Ham bayrakları katmanlara çevirir.
 *
 * Bu eşleme de İKİ yerde yazılmıştı (liste ve detay ucu) — üst rozet kuralını
 * tek yere taşırken kendi elimle yeni bir kopya çıkarmıştım. Katmanlar
 * ayrışırsa aynı uzman listede doğrulanmış, profilinde doğrulanmamış görünür.
 *
 * Öncelik sırası salonda İŞLETME kaydına ait: salonun kendi doğrulama
 * bayrakları varsa onlar esastır, yoksa uzman/hesap seviyesine düşülür.
 */
export function guvenKatmanlari(input: {
  kind: string;
  kycOnayli: boolean;
  kayitli: boolean;
  salon?:
    | {
        identityVerified?: boolean | null;
        businessVerified?: boolean | null;
        binVerified?: boolean | null;
        addressVerified?: boolean | null;
        socialVerified?: boolean | null;
      }
    | null
    | undefined;
  uzman?: { certVerified?: boolean | null; socialVerified?: boolean | null } | null | undefined;
}): TrustLayers {
  const { kind, kycOnayli, kayitli, salon, uzman } = input;
  return {
    identity: salon?.identityVerified ?? kycOnayli,
    business: salon?.businessVerified ?? kayitli,
    bin: salon?.binVerified ?? kayitli,
    address: salon?.addressVerified ?? false,
    social: salon?.socialVerified ?? uzman?.socialVerified ?? false,
    // Sertifika SALONDA yok — kurumun kanıtı tüzel kişilik, kişisel yetkinlik değil.
    cert: kind === 'salon' ? false : (uzman?.certVerified ?? false),
  };
}
