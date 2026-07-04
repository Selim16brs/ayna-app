import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocale } from '../../src/locale';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, Text } from '../../src/ui';

export default function AuthRoleScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { gradients } = useTheme();
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
            grad={gradients.gold}
            icon="person"
            title={t('auth.role.customer')}
            sub={t('auth.role.customer_sub')}
            onPress={() => router.push('/auth/customer')}
          />
          <RoleCard
            grad={gradients.plum}
            icon="storefront"
            title={t('auth.role.salon')}
            sub={t('auth.role.salon_sub')}
            onPress={() => router.push('/auth/business/new')}
          />
          <RoleCard
            grad={gradients.teal}
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

function RoleCard({
  grad,
  icon,
  title,
  sub,
  onPress,
}: {
  grad: readonly [string, string];
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={onPress}>
      <LinearGradient
        colors={grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, shadow.soft]}
      >
        <View style={styles.cardIcon}>
          <Ionicons name={icon} size={26} color={colors.onColor} />
        </View>
        <View style={styles.cardText}>
          <Text variant="h2" tone="onColor">
            {title}
          </Text>
          <Text variant="caption" tone="onColor" style={styles.cardSub}>
            {sub}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.onColor} />
      </LinearGradient>
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
    cardIcon: {
      width: 52,
      height: 52,
      borderRadius: radius.lg,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardText: { flex: 1 },
    cardSub: { opacity: 0.85, marginTop: 2 },
  });
