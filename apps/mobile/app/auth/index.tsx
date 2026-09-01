import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocale } from '../../src/locale';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, Text } from '../../src/ui';

export default function AuthRoleScreen() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { t } = useLocale();
  const styles = useThemedStyles(makeStyles);

  return (
    <Screen edges={['bottom']}>
      <StackHeader title="" />
      <View style={styles.content}>
        <Text variant="title" tone="ink">
          {t('auth.role.title')}
        </Text>
        <Text variant="caption" tone="muted" style={styles.sub}>
          {t('auth.role.subtitle')}
        </Text>

        <View style={styles.cards}>
          <RoleCard
            dolu
            icon="person"
            title={t('auth.role.customer')}
            sub={t('auth.role.customer_sub')}
            onPress={() =>
              // Misafir "Randevu al" deyip kayda geldiyse niyeti kaybolmasın:
              // kayıt + otomatik giriş sonrası o ekrana geri döner.
              router.push({ pathname: '/auth/customer', params: next ? { next } : {} } as never)
            }
          />
          <RoleCard
            icon="storefront"
            title={t('auth.role.salon')}
            sub={t('auth.role.salon_sub')}
            onPress={() => router.push('/auth/business/new')}
          />
          <RoleCard
            icon="sparkles"
            title={t('auth.role.expert')}
            sub={t('auth.role.expert_sub')}
            onPress={() => router.push('/auth/expert')}
          />
        </View>
      </View>
    </Screen>
  );
}

/**
 * ROL KARTI.
 *
 * Üç kart da gradyanlıydı ve iki sorunu vardı:
 *   · `gradients.gold` ile `gradients.plum` AYNI çift — müşteri ve salon
 *     kartları birebir aynı renkteydi, üçüncüsü (`teal`) yeşildi.
 *   · Yazı `onColor` (sabit beyaz) idi. Gradyan temaya göre değişince koyu
 *     temada beyaz yazı açık erik üstünde 2.23:1'e düşüyordu — okunmuyordu.
 *
 * Yeni dil: BİR tane dolu kart (müşteri — çoğunluk bu yoldan giriyor),
 * ötekiler yüzey + erik ikon kutusu. Renk artık "hangisi ana yol" diyor,
 * rastgele üç renk değil. Dolu kartın yazısı `onAccent`: gradyanla aynı
 * token setinden geliyor, iki temada da ölçülüyor.
 */
function RoleCard({
  dolu = false,
  icon,
  title,
  sub,
  onPress,
}: {
  dolu?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  const { colors, gradients, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const yazi = dolu ? colors.onAccent : colors.ink;

  const icerik = (
    <>
      <View style={[styles.cardIcon, dolu ? styles.cardIconDolu : styles.cardIconBos]}>
        <Ionicons name={icon} size={26} color={dolu ? colors.onAccent : colors.accent} />
      </View>
      <View style={styles.cardText}>
        <Text variant="h2" style={{ color: yazi }}>
          {title}
        </Text>
        <Text variant="caption" style={[styles.cardSub, { color: yazi }]}>
          {sub}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={dolu ? colors.onAccent : colors.muted} />
    </>
  );

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title} — ${sub}`}
    >
      {dolu ? (
        <LinearGradient
          colors={gradients.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, shadow.soft]}
        >
          {icerik}
        </LinearGradient>
      ) : (
        <View style={[styles.card, styles.cardBos, shadow.soft]}>{icerik}</View>
      )}
    </Pressable>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { flex: 1, paddingHorizontal: space(3), paddingTop: space(2) },
    sub: { marginTop: space(0.5), marginBottom: space(4) },
    cards: { gap: space(2) },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(2),
      borderRadius: radius.xl,
      padding: space(2.5),
    },
    cardBos: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accentSoft },
    cardIcon: {
      width: 52,
      height: 52,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardIconDolu: { backgroundColor: 'rgba(255,255,255,0.18)' },
    cardIconBos: { backgroundColor: colors.accentSoft },
    cardText: { flex: 1 },
    cardSub: { opacity: 0.85, marginTop: 2 },
  });
