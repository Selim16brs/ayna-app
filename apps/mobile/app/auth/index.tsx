import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocale } from '../../src/locale';
import { colors, gradients, radius, shadow, space } from '../../src/theme';
import { Screen, StackHeader, Text } from '../../src/ui';

export default function AuthRoleScreen() {
  const router = useRouter();
  const { t } = useLocale();

  return (
    <Screen edges={['top', 'bottom']}>
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
            grad={gradients.rose}
            icon="person"
            title={t('auth.role.customer')}
            sub={t('auth.role.customer_sub')}
            onPress={() => router.push('/auth/phone?role=customer')}
          />
          <RoleCard
            grad={gradients.plum}
            icon="business"
            title={t('auth.role.business')}
            sub={t('auth.role.business_sub')}
            onPress={() => router.push('/auth/business')}
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

const styles = StyleSheet.create({
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
