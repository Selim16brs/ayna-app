import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES } from '../data';
import { type ColorTokens, radius } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';

/**
 * HİZMET İKONU — TEK ÇİZİM YERİ.
 *
 * Kurucu: "services ikonlarda farklılıklar var uygulama içerisinde. bütün
 * hepsi ana sayfadaki tarzda olmalı."
 *
 * Haklıydı. Eşleme tekti ama ÇİZİMİ altı ekran ayrı ayrı yapıyordu ve her
 * biri kendi ölçüsünü koymuştu:
 *
 *   discover      64 kutu · ikon 64 (kutuyu doldurur)   ← ana sayfa, referans
 *   demand/new    64 kutu · ikon 30 (kutunun ortasında yüzüyor)
 *   quote/new     ikon 18
 *   seller/offline ikon 18
 *   circle/new    ikon 16
 *   search        ikon 16
 *
 * Aynı görsel dört farklı boyutta çiziliyordu; küçüklerde Figma çiziminin
 * ayrıntısı dağılıp başka bir ikon gibi görünüyordu.
 *
 * Artık ölçü ve kap BURADA. Ekranlar yalnız hangi bağlamda olduklarını
 * söylüyor; boyut seçme yetkileri yok, dolayısıyla yeniden ayrışamazlar.
 *
 * İKİ BAĞLAM VAR ve ikisi de gerçek:
 *   · `kutu`  — ızgara/şerit seçici, altında etiketi olan kare. Ana sayfa.
 *   · `satir` — hap ya da liste satırı; ikon yazının yanında, tek satırda.
 *              Buraya 64'lük kare sığmaz; ölçü küçülür ama GÖRSEL AYNI
 *              kalır ve tek bir değerden gelir.
 */

/**
 * İzin verilen tek iki ölçü. Ekranlar kendi sayısını koyamaz.
 *
 * `kap` kabın kenarı, `ikon` içindeki vektörün ölçüsü. PNG döneminde tek
 * sayı yetiyordu (görsel kabı dolduruyordu); vektör kabın İÇİNDE nefes
 * almalı, yoksa kenarlara yapışıp kaba görünür.
 */
const OLCU = {
  /** Ana sayfadaki kare. */
  kutu: { kap: 64, ikon: 28 },
  /** Hap/satır içi — yazının yanında, kap yok. */
  satir: { kap: 0, ikon: 16 },
} as const;

export type HizmetIkonTarzi = keyof typeof OLCU;

export function HizmetIkonu({
  id,
  tarz = 'kutu',
  secili = false,
}: {
  /** Kategori kimliği (`hair`, `nails`, …). */
  id: string;
  tarz?: HizmetIkonTarzi;
  /**
   * Seçili durum — YALNIZ kabın çerçevesini değiştirir.
   *
   * Kutunun zeminini aksanla doldurmak yok: Figma çizimi pembe zeminin
   * üstünde okunmuyor ve ana sayfadaki hâlinden bambaşka görünüyordu
   * (`demand/new` tam olarak bunu yapıyordu).
   */
  secili?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  /*
   * ── HEPSİ VEKTÖR ────────────────────────────────────────────────────
   *
   * Kurucu: "senin yaptığın 6 icon tarzı güzeldi. daha öncekileri de ona
   * benzer yap."
   *
   * 13 kategorinin 7'si Figma'dan gelen elle çizilmiş PNG'ydi, 6'sı ise
   * çizimi olmadığı için vektöre düşüyordu. Kurucu vektör tarzını seçti;
   * artık HEPSİ oradan geliyor ve set tek elden çıkmış gibi duruyor.
   *
   * Üç şey daha kendiliğinden düzeldi:
   *   · İkon ARTIK AKSANI TAKİP EDİYOR. PNG'lerin çizgi rengi (koyu
   *     erguvan) dosyanın içindeydi; kullanıcı rengi değiştirdiğinde ikon
   *     olduğu gibi kalıyordu.
   *   · Ölçek gerçek: 192px PNG küçültülüyordu, vektör her boyutta net.
   *   · Alfa kanalı tuzağı bitti — dışa aktarım hatası zemini görselin
   *     içine pişiremez.
   *
   * PNG dosyaları silinmedi: kurucu fikir değiştirirse elde duruyorlar.
   */
  const gorsel = (
    <Ionicons
      name={CATEGORIES.find((c) => c.id === id)?.icon ?? 'sparkles-outline'}
      size={OLCU[tarz].ikon}
      color={colors.accent}
    />
  );

  // Satır bağlamında kap YOK: hap zaten bir kap, içine ikinci kutu koymak
  // ekranı kalabalıklaştırır.
  if (tarz === 'satir') return gorsel;

  return <View style={[styles.kutu, secili && styles.kutuSecili]}>{gorsel}</View>;
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    // Ana sayfadaki `ikonKart` ile BİREBİR aynı — referans burasıydı.
    kutu: {
      width: OLCU.kutu.kap,
      height: OLCU.kutu.kap,
      borderRadius: radius.md,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      /*
       * ── ZEMİN VE ÇİZGİ, İKİSİ DE AKSANI TAKİP EDİYOR ───────────────
       *
       * Kurucu: "renk değiştiğinde hizmetler ikonlarının altındaki renk
       * sabit kalıyor."
       *
       * Zemin `accentSoft`, çizgi `accent`: aksanın açık tonu üzerinde
       * koyu tonu. Hangi renk seti seçilirse seçilsin okunur kalıyor ve
       * artık İKİSİ DE değişiyor — PNG döneminde çizgi rengi dosyanın
       * içinde sabitti.
       */
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.accentSoft,
    },
    // Seçili: yalnız çerçeve. Zemin sabit ki ikon her durumda aynı görünsün.
    kutuSecili: { borderWidth: 2, borderColor: colors.accent },
  });
