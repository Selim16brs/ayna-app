import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocale } from '../../src/locale';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, Text } from '../../src/ui';

// §5.2 — "Teklif Al" sonrası ONAY ekranı: talep yakındaki uzmanlara dağıtıldı.
// Kullanıcı doğrudan sonuçlara DÜŞMEZ; teklifler zamanla toplanır (reverse marketplace).
export default function QuoteSentScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id?: string }>();

  const points: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
    { icon: 'people-outline', title: t('quote.sent.p1.title'), body: t('quote.sent.p1.body') },
    { icon: 'pricetags-outline', title: t('quote.sent.p2.title'), body: t('quote.sent.p2.body') },
    { icon: 'sparkles-outline', title: t('quote.sent.p3.title'), body: t('quote.sent.p3.body') },
  ];

  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.circle}>
          <Ionicons name="paper-plane" size={38} color={colors.onColor} />
        </View>
        <Text variant="title" tone="ink" style={styles.title}>
          {t('quote.sent.title')}
        </Text>
        <Text variant="body" tone="muted" style={styles.sub}>
          {t('quote.sent.subtitle')}
        </Text>

        <View style={styles.points}>
          {points.map((p) => (
            <View key={p.icon} style={styles.point}>
              <View style={styles.pointIcon}>
                <Ionicons name={p.icon} size={20} color={colors.accent} />
              </View>
              <View style={styles.pointText}>
                <Text variant="bodyStrong" tone="ink">
                  {p.title}
                </Text>
                <Text variant="caption" tone="muted" style={styles.pointBody}>
                  {p.body}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('quote.sent.view')}
          variant="primary"
          onPress={() => router.replace(id ? `/quote/results?id=${id}` : '/quote/results')}
        />
        <Button
          label={t('quote.sent.back')}
          variant="ghost"
          onPress={() => router.replace('/discover')}
        />
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { alignItems: 'center', paddingHorizontal: space(3), paddingTop: space(5) },
    circle: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(2.5),
    },
    title: { textAlign: 'center' },
    sub: { textAlign: 'center', marginTop: space(1), marginBottom: space(3.5) },
    points: { alignSelf: 'stretch', gap: space(1.5) },
    point: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(2),
    },
    pointIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pointText: { flex: 1, gap: 2 },
    pointBody: { lineHeight: 18 },
    footer: { paddingHorizontal: space(3), paddingTop: space(1.5), gap: space(1) },
  });
