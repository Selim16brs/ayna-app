import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { font, type ColorTokens } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * SAĞLAYICI FOTOĞRAFI — yoksa BAŞ HARF, başkasının fotoğrafı DEĞİL.
 *
 * İki ayrı sorunun ortak çözümü:
 *
 * 1. Fotoğraf yüklemeyen işletme onaylandığında sunucu kartına stok bir
 *    Unsplash salon fotoğrafı koyuyordu. Müşteri, o işletmeye ait olmayan
 *    bir mekânın fotoğrafını onun mekânı sanıyordu — uydurulmuş kanıt.
 * 2. Stok fotoğraf kalkınca `image` boş kalıyor ve `<Image uri="">` sessiz
 *    bir boşluk çiziyor: kart bozuk görünüyor.
 *
 * Boşken sağlayıcının KENDİ adının baş harfi yazılıyor. Uydurma değil —
 * elimizdeki tek gerçek bilgi — ve kart bilerek yapılmış görünüyor.
 */

/**
 * BAŞ HARFE göre sabitlenen ton — aynı kişi her ekranda aynı rengi alıyor.
 *
 * Tek bir aksan rengi kullanılıyordu: fotoğrafsız sağlayıcıların hepsi
 * birbirinin aynı görünüyordu ve liste tek renk bir şerit oluyordu.
 *
 * Ton önce TAM ADDAN türetiliyordu ve kurucu haklı olarak "profildeki ile
 * keşfetteki avatar aynı değil" dedi: Keşfet adı `.split(' ')[0]` ile
 * kırpıp veriyor ("Ayşe"), profil tamamını ("Ayşe Yılmaz"). Baş harf ikisinde
 * de aynı ama hash farklı çıkıyor, yani AYNI kişi iki ekranda iki renk.
 *
 * Çözüm kaynağı hizalamak değil — çağıran her ekranın adı aynı biçimde
 * vermesini ummak kırılgan. Ton, ekranda GÖRÜNEN şeyden türetiliyor: baş
 * harften. Ad ister tam ister kırpılmış gelsin, harf aynıysa renk aynı.
 *
 * Beşi de paletin `Soft`+ana çiftleri; kontrastları `aksan-kontrast` ve
 * `theme.contrast` testlerinde zaten ölçülü. Yeni renk UYDURULMADI.
 */
const TONLAR = ['rose', 'sage', 'lavender', 'blue', 'gold'] as const;
type Ton = (typeof TONLAR)[number];

function tonSec(ad: string): Ton {
  // Basit ve KARARLI dağıtım (djb2 türevi). Rastgelelik yok: aynı ad → aynı ton.
  let h = 0;
  for (let i = 0; i < ad.length; i += 1) h = (h * 31 + ad.charCodeAt(i)) >>> 0;
  return TONLAR[h % TONLAR.length] as Ton;
}

export function SaglayiciFoto({
  uri,
  ad,
  style,
}: {
  uri?: string | null | undefined;
  ad?: string | null | undefined;
  style: StyleProp<ImageStyle>;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  if (uri) return <Image source={{ uri }} style={style} resizeMode="cover" />;
  /*
   * Baş harf Unicode'a göre alınıyor: "Şirin" gibi adlarda `toUpperCase`
   * yerelden bağımsız çalışsın diye 'tr' verilmiyor — 'i' harfinin
   * Türkçe büyük hâli 'İ' ve o da doğru.
   */
  const harf = (ad ?? '').trim().charAt(0).toLocaleUpperCase('tr');

  /*
   * PUNTO ÖLÇÜDEN TÜRETİLİYOR — sabit 22 idi.
   *
   * Bileşen 64pt'lik salon karesinden 118×132'lik uzman portresine kadar
   * her ölçüde kullanılıyor. Tek punto ikisine birden uymuyordu: küçük
   * karede harf kutuyu dolduruyor, büyük portrede kaybolup ortada minik
   * bir leke gibi duruyordu.
   *
   * Kısa kenarın %40'ı: kare avatarda dengeli, dikdörtgen portrede de
   * taşmıyor. Uçlar bağlanmış — 12'nin altı okunmuyor, 52'nin üstü kaba.
   */
  const flat = StyleSheet.flatten(style) as ImageStyle | undefined;
  const g = typeof flat?.width === 'number' ? flat.width : 64;
  const y = typeof flat?.height === 'number' ? flat.height : g;
  const punto = Math.max(12, Math.min(52, Math.round(Math.min(g, y) * 0.4)));
  // Köşe SVG'ye de veriliyor: zemini kabın `overflow` kırpmasına bırakmıyoruz.
  const kose = typeof flat?.borderRadius === 'number' ? flat.borderRadius : 0;

  // Ton HARFTEN — adın kırpılmış hâli de aynı rengi vermeli (bkz. yukarıdaki not).
  const ton = tonSec(harf);
  const zemin = colors[`${ton}Soft` as const];
  const on = colors[ton];
  /*
   * Gradyan kimliği TONA bağlı, ekrana değil.
   *
   * SVG `id` alanı belge genelinde geçerli: sabit bir ad verilseydi aynı
   * listedeki ikinci avatar birincinin gradyanını çizerdi. Tona bağlayınca
   * çakışan tek durum "aynı ton" oluyor, o da zaten aynı boya.
   */
  const gradId = `saglayici-${ton}`;

  return (
    <View style={[style, styles.bos, { backgroundColor: zemin }]}>
      {/*
        Düz zemin yerine ÇOK YUMUŞAK bir eğim.

        Önce radyal gradyan denendi (odak sol üstte, kenarda koyulaşma) ve
        kurucu haklı olarak "balon gibi" dedi: merkezden kenara koyulaşan
        bir daire, gözde ŞİŞKİN bir küre olarak okunuyor — 92pt'lik profil
        dairesinde iyice belirgindi. Aranan hacim değil, yassılığın
        kırılmasıydı.

        Lineer ve neredeyse dikey bir geçiş bunu veriyor: yüzey düz kalıyor,
        yalnız alt kenara doğru hafifçe derinleşiyor. Hafif eğim (x2 0.3)
        tam dikey bantlaşmayı önlüyor. Opaklık 0.22'den 0.10'a indi —
        renk hâlâ seziliyor ama gölge okumuyor.
      */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0.3" y2="1">
            <Stop offset="0" stopColor={zemin} stopOpacity={1} />
            <Stop offset="1" stopColor={on} stopOpacity={0.1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" rx={kose} ry={kose} fill={`url(#${gradId})`} />
      </Svg>
      {harf ? (
        /*
         * SATIR YÜKSEKLİĞİ PUNTOYLA BİRLİKTE VERİLİYOR.
         *
         * `Text` varsayılan `body` ölçeğini uyguluyor: 16/24. Yalnız
         * `fontSize` geçilince `lineHeight` 24'te kalıyor ve 37–46 puntoluk
         * harf o kutuya sığmayıp ALTTAN VE ÜSTTEN KIRPILIYOR. Sabit 22
         * puntoda görünmüyordu, çünkü 24'ün altındaydı.
         *
         * `allowFontScaling` kapalı: avatar sabit ölçülü bir kutu, sistem
         * yazı ölçeği harfi büyütseydi daireden taşardı. Buradaki harf bir
         * metin değil, bir işaret — okunurluğu ölçekten değil kutudan geliyor.
         */
        <Text
          allowFontScaling={false}
          style={[
            styles.harf,
            { color: on, fontSize: punto, lineHeight: Math.round(punto * 1.18) },
          ]}
        >
          {harf}
        </Text>
      ) : (
        /*
         * ADI DA YOKSA kişi silueti — eskiden bomboş bir kutu kalıyordu.
         * Baş harf `''` olduğunda (adsız kayıt, yalnız boşluktan ibaret ad)
         * zemin çiziliyor ama üstü boş duruyordu; kart yine "bozuk" görünüyordu.
         */
        <Ionicons name="person" size={punto} color={on} />
      )}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    // Zemin rengi artık tona göre satır içinde veriliyor; buradaki yalnız yedek.
    bos: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
    harf: {
      fontFamily: font.semibold,
      textAlign: 'center',
      // Android'in yazı tipi payı harfi yukarı kaçırıyordu (rozet rakamıyla aynı dert).
      includeFontPadding: false,
    },
  });
