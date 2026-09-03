import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES } from '../data';
import { HIZMET_IKON } from '../hizmet-ikon';
import { type ColorTokens, radius } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';

/**
 * HİZMET İKONU — TEK ÇİZİM YERİ.
 *
 * Kurucu: "services ikonlarda farklılıklar var uygulama içerisinde. bütün
 * hepsi ana sayfadaki tarzda olmalı."
 *
 * Haklıydı. `HIZMET_IKON` eşlemesi tekti ama ÇİZİMİ altı ekran ayrı ayrı
 * yapıyordu ve her biri kendi ölçüsünü koymuştu:
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

/** İzin verilen tek iki ölçü. Ekranlar kendi sayısını koyamaz. */
const OLCU = {
  /** Ana sayfadaki kare — ikon kutuyu tam doldurur. */
  kutu: 64,
  /** Hap/satır içi — yazının yanında. */
  satir: 20,
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
  const kaynak = HIZMET_IKON[id];
  const olcu = OLCU[tarz];

  // Eşlemede olmayan kategori — vektör yedeği. Ana sayfa da böyle yapıyor.
  const gorsel = kaynak ? (
    <Image source={kaynak} style={{ width: olcu, height: olcu }} resizeMode="contain" />
  ) : (
    <Ionicons
      name={CATEGORIES.find((c) => c.id === id)?.icon ?? 'sparkles-outline'}
      size={tarz === 'kutu' ? 26 : 16}
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
      width: OLCU.kutu,
      height: OLCU.kutu,
      borderRadius: radius.md,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      /*
       * ── ZEMİN ARTIK AKSANI TAKİP EDİYOR ────────────────────────────
       *
       * Kurucu: "renk değiştiğinde hizmetler ikonlarının altındaki renk
       * sabit kalıyor."
       *
       * Sebep burada DEĞİLDİ: PNG'ler alfa kanalsız (RGB) geliyordu ve
       * lila zemin GÖRSELİN İÇİNE pişmişti — kutuya hangi rengi verirsek
       * verelim üstüne opak bir kare biniyordu. Görseller şeffaflaştırıldı;
       * artık kutunun rengi gerçekten görünüyor.
       *
       * `accentSoft` seçildi: aksanın açık tonu, seçilen her renk setinde
       * ikon çizgisinin altında okunur bir zemin bırakıyor.
       */
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.accentSoft,
    },
    // Seçili: yalnız çerçeve. Zemin sabit ki ikon her durumda aynı görünsün.
    kutuSecili: { borderWidth: 2, borderColor: colors.accent },
  });
