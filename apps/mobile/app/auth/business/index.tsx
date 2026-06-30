import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocale } from '../../../src/locale';
import { radius, space, type ColorTokens } from '../../../src/theme';
import { useTheme, useThemedStyles } from '../../../src/theme-context';
import { Screen, StackHeader, Text } from '../../../src/ui';

export default function BusinessEntryScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <Screen edges={['top', 'bottom']}>
      <StackHeader title={t('biz.entry.title')} />
      <View style={styles.content}>
        <Text variant="caption" tone="muted" style={styles.sub}>
          {t('biz.entry.subtitle')}
        </Text>

        <Pressable
          style={[styles.card, shadow.soft]}
          onPress={() => router.push('/auth/business/new')}
        >
          <View style={[styles.icon, { backgroundColor: colors.roseSoft }]}>
            <Ionicons name="storefront-outline" size={24} color={colors.rose} />
          </View>
          <View style={styles.cardText}>
            <Text variant="h2" tone="ink">
              {t('biz.entry.new')}
            </Text>
            <Text variant="caption" tone="muted" style={styles.cardSub}>
              {t('biz.entry.new_sub')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>

        <Pressable
          style={[styles.card, shadow.soft]}
          onPress={() => router.push('/auth/business/join')}
        >
          <View style={[styles.icon, { backgroundColor: colors.goldSoft }]}>
            <Ionicons name="people-outline" size={24} color={colors.gold} />
          </View>
          <View style={styles.cardText}>
            <Text variant="h2" tone="ink">
              {t('biz.entry.join')}
            </Text>
            <Text variant="caption" tone="muted" style={styles.cardSub}>
              {t('biz.entry.join_sub')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { flex: 1, paddingHorizontal: space(3), paddingTop: space(1) },
    sub: { marginBottom: space(3) },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(2),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(2),
      marginBottom: space(1.5),
    },
    icon: {
      width: 50,
      height: 50,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardText: { flex: 1 },
    cardSub: { marginTop: 2 },
  });
