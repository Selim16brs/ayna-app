import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../theme-context';

/**
 * TEPE IŞIĞI — ekranların en üstündeki yumuşak renk yıkaması.
 *
 * Kurucu: "ana sayfada hem tüm profillerde en üstte bu şekilde bir çalışma
 * yapar mısın? tabi ki seçilen rengin tonları olacak şekilde olmalı."
 *
 * Üst üste binen üç büyük elips; her biri AKSAN renginin farklı tonunda ve
 * kenarlara doğru tamamen saydamlaşıyor.
 *
 * ── DÜZ DOLGU, RADYAL GEÇİŞ DEĞİL ──────────────────────────────────────
 *
 * İlk denemem her elipse merkezden kenara saydamlaşan radyal geçiş
 * koyuyordu. Sonuç kurucunun gönderdiği görselden fazla soluktu ve
 * dairelerin BİRBİRİNE GİRDİĞİ yerler kaybolmuştu — oysa görselin karakteri
 * tam orada: iki daire üst üste binince renk koyulaşıyor.
 *
 * Düz dolgu + düşük opaklık bunu bedavaya veriyor: örtüşen yerler alfa
 * bileşimiyle kendiliğinden koyulaşıyor. Alt kenardaki erime ayrı bir
 * doğrusal geçişle yapılıyor, böylece yıkama içeriğe sert bir çizgiyle
 * bitmiyor.
 *
 * ── RENK TEMADAN, SABİT DEĞİL ───────────────────────────────────────────
 *
 * Kullanıcı aksan rengini değiştirebiliyor ve daha önce ikon zemininin
 * sabit kalması şikâyet konusu olmuştu. Burada tek bir renk kodu yok:
 * üçü de `colors.accent` ve `colors.gold`, yalnız saydamlıkları farklı.
 * Koyu temada daha da hafif — koyu zeminde aynı opaklık leke gibi durur.
 *
 * ── OKUNURLUĞU BOZMUYOR ─────────────────────────────────────────────────
 *
 * En koyu nokta bile %14 saydamlıkta ve yıkama İÇERİĞİN ARKASINDA
 * (`pointerEvents="none"`, mutlak konum). Başlık yazısı zeminle aynı
 * kontrastı koruyor; dokunuşları da yutmuyor.
 */

export function TepeIsigi({
  /**
   * Yükseklik verilmezse yıkama KAPSAYICISINI dolduruyor.
   *
   * Sabit bir yükseklik kullansaydık kısa başlıklarda (sekme başlığı ~120)
   * içeriğin üstüne taşardı: o kapsayıcıların `overflow` kırpması yok.
   * Yalnız kapsayıcısı TÜM EKRAN olan yerlerde (ana sayfa) yükseklik
   * veriliyor — orada doldurmak ekranın tamamını boyardı.
   */
  yukseklik,
}: {
  yukseklik?: number;
}) {
  const { colors, mode } = useTheme();
  const koyu = mode === 'dark';
  /*
   * Koyu temada aynı opaklık leke gibi durur ama çok kısarsak da hiç
   * görünmüyordu — ilk denemem oradaydı. 0.6 ikisinin arası.
   */
  const k = koyu ? 0.6 : 1;

  return (
    <View
      style={[styles.kap, yukseklik === undefined ? styles.doldur : { height: yukseklik }]}
      pointerEvents="none"
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          {/*
           * ALTA DOĞRU ERİME — geç başlıyor (%72).
           *
           * Kurucu: "çok kısa kalmış, daha aşağıya doğru ve biraz daha
           * belirgin olmalı." İlk sürümde erime %55'te başlıyordu: renk
           * alanın yarısında bitiyor, yıkama ince bir şerit gibi
           * duruyordu. Yıkama içeriğe sert bir çizgiyle de bitmemeli;
           * maskeyle değil, üstüne çizilen zemin renginden bir geçişle
           * yapılıyor — maske desteği cihazdan cihaza değişiyor.
           */}
          <LinearGradient id="ti-erime" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="72%" stopColor={colors.bg} stopOpacity={0} />
            <Stop offset="100%" stopColor={colors.bg} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        {/*
         * Üst kenardan TAŞIYORLAR: daire üstte kapanırsa "bir daire
         * çizilmiş" gibi durur, oysa istenen kenarları belirsiz bir yıkama.
         * Örtüşen yerler alfa bileşimiyle kendiliğinden koyulaşıyor —
         * kurucunun gönderdiği görselin karakteri orada.
         */}
        <Ellipse cx="20" cy="4" rx="52" ry="46" fill={colors.accent} opacity={0.26 * k} />
        <Ellipse cx="86" cy="-4" rx="50" ry="44" fill={colors.gold} opacity={0.2 * k} />
        <Ellipse cx="56" cy="34" rx="66" ry="42" fill={colors.accent} opacity={0.16 * k} />
        <Rect x="0" y="0" width="100" height="100" fill="url(#ti-erime)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  // Mutlak: başlık düzenine hiç dokunmuyor, yalnız arkasına geçiyor.
  kap: { position: 'absolute', top: 0, left: 0, right: 0 },
  doldur: { bottom: 0 },
});
