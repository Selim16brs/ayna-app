import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLocale } from '../../src/locale';
import { font, radius, space, type ColorTokens } from '../../src/theme';
import { darkColors } from '../../src/theme.palette';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

/**
 * TEKLİF AL — iki yollu giriş.
 *
 * Keşfet'teki "Dileğini Anlat" BURAYA gelir, `/quote/new`'e değil: iki ayrı
 * akış var ve seçim kullanıcınındır.
 *
 *   · `/quote/new`   — fotoğrafla teklif (istediğini göster)
 *   · `/demand/new`  — fiyat/talep ile teklif (bütçeni söyle)
 *
 * Doğrudan fotoğraf akışına yönlendirmek fiyat yolunu ERİŞİLEMEZ yapıyordu;
 * ekranın tek işi bu seçimi görünür kılmak.
 *
 * Tasarım: Figma paleti. Kartlar eskiden sabit pastel gradyanlardı
 * (#EFE7FA/#FBE3EE ve lime #EEF7C8/#D6EE94) — o renkler bu tasarım dilinde
 * yok ve temaya da bağlı değillerdi. Şimdi: birinci yol dolu erik gradyanı,
 * ikincisi yüzey + erik kenarlık. İkisi de iki temada ölçülüyor
 * (`teklif-yollari.test.ts`).
 */

/** Dolu kartın gradyanı — uzman özet kartıyla aynı (ölçülmüş kontrast). */
/** Erik gradyanın üstündeki yazı — iki temada da sabit açık. */
export const YOL_YAZI = darkColors.ink;

export default function QuoteHubScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);

  return (
    <Screen edges={[]}>
      <StackHeader title={t('quote.hub.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="body" tone="inkSoft" style={styles.subtitle}>
          {t('quote.hub.subtitle')}
        </Text>

        <YolKarti
          index={0}
          dolu
          icon="camera"
          badge={t('quote.hub.badge.photo')}
          title={t('quote.hub.photo.title')}
          desc={t('quote.hub.photo.desc')}
          cta={t('quote.hub.start')}
          onPress={() => router.push('/quote/new')}
        />
        <YolKarti
          index={1}
          icon="wallet"
          badge={t('quote.hub.badge.demand')}
          title={t('quote.hub.demand.title')}
          desc={t('quote.hub.demand.desc')}
          cta={t('quote.hub.start')}
          onPress={() => router.push('/demand/new')}
        />
      </ScrollView>
    </Screen>
  );
}

function YolKarti({
  index,
  dolu = false,
  icon,
  badge,
  title,
  desc,
  cta,
  onPress,
}: {
  index: number;
  dolu?: boolean;
  icon: IoniconName;
  badge: string;
  title: string;
  desc: string;
  cta: string;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors, gradients, shadow } = useTheme();

  // Dolu kartın üstündeki her şey sabit açık; boş kart temanın token'larını
  // kullanır. İkisini karıştırmak koyu temada okunmaz yazı demek.
  const yazi = dolu ? YOL_YAZI : colors.ink;
  const soluk = dolu ? 'rgba(255,240,245,0.78)' : colors.muted;

  return (
    <Animated.View entering={FadeInDown.duration(380).delay(index * 110)}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title} — ${desc}`}
        style={({ pressed }) => [
          styles.kart,
          dolu ? styles.kartDolu : styles.kartBos,
          shadow.card,
          pressed && styles.basili,
        ]}
      >
        {dolu ? (
          <LinearGradient
            colors={gradients.deep}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        <View style={styles.ust}>
          <View style={[styles.ikonKutu, dolu ? styles.ikonKutuDolu : styles.ikonKutuBos]}>
            <Ionicons name={icon} size={24} color={dolu ? YOL_YAZI : colors.accent} />
          </View>
          <View style={[styles.rozet, dolu ? styles.rozetDolu : styles.rozetBos]}>
            <Text variant="caption" style={[styles.rozetYazi, { color: yazi }]}>
              {badge}
            </Text>
          </View>
        </View>

        <Text variant="h2" style={[styles.baslik, { color: yazi }]}>
          {title}
        </Text>
        <Text variant="caption" style={[styles.aciklama, { color: soluk }]}>
          {desc}
        </Text>

        <View style={[styles.dugme, dolu ? styles.dugmeDolu : styles.dugmeBos]}>
          <Text
            variant="caption"
            style={[styles.dugmeYazi, { color: dolu ? colors.accent : colors.onAccent }]}
          >
            {cta}
          </Text>
          <Ionicons name="arrow-forward" size={13} color={dolu ? colors.accent : colors.onAccent} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: space(3),
      paddingTop: space(1),
      paddingBottom: TAB_BAR_CLEARANCE,
    },
    subtitle: { marginBottom: space(3) },

    kart: {
      borderRadius: 24,
      padding: space(2.75),
      marginBottom: space(2),
      overflow: 'hidden',
      minHeight: 168,
    },
    /*
     * Zemin SEÇİLEN AKSANDAN. `lightColors.accent` sabitiydi: kullanıcı
     * hangi rengi seçerse seçsin kart aynı kırmızı kalıyordu ve üstündeki
     * yazı da o sabite göre ayarlıydı — seçilen renk değişince kontrast
     * bozuluyordu.
     */
    kartDolu: { backgroundColor: colors.accent },
    kartBos: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accentSoft },
    basili: { opacity: 0.97, transform: [{ scale: 0.985 }] },

    ust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    ikonKutu: {
      width: 52,
      height: 52,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ikonKutuDolu: { backgroundColor: 'rgba(255,240,245,0.16)' },
    ikonKutuBos: { backgroundColor: colors.accentSoft },

    rozet: {
      paddingHorizontal: space(1.5),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
    },
    rozetDolu: { backgroundColor: 'rgba(255,240,245,0.16)' },
    rozetBos: { backgroundColor: colors.accentSoft },
    rozetYazi: { fontFamily: font.semibold },

    baslik: {
      fontSize: 21,
      fontFamily: font.semibold,
      letterSpacing: -0.3,
      marginTop: space(2.25),
    },
    aciklama: { marginTop: space(1), lineHeight: 19, maxWidth: '86%' },

    dugme: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      marginTop: space(2),
      paddingHorizontal: space(1.75),
      // Dokunma hedefi değil (kartın kendisi basılıyor) ama görsel denge için.
      paddingVertical: space(1),
      borderRadius: radius.pill,
    },
    dugmeDolu: { backgroundColor: darkColors.ink },
    dugmeBos: { backgroundColor: colors.accent },
    dugmeYazi: { fontFamily: font.semibold },
  });
