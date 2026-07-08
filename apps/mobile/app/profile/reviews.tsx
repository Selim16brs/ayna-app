import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { PROFESSIONALS } from '../../src/data';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

// Profil > Değerlendirme sayısına tıklayınca: kullanıcının yazdığı tüm yorumlar
export default function MyReviewsScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const userReviews = useStore((s) => s.userReviews);

  const items = Object.entries(userReviews).flatMap(([proId, list]) =>
    list.map((r) => ({
      ...r,
      proName: PROFESSIONALS.find((p) => p.id === proId)?.name ?? proId,
    })),
  );

  return (
    <Screen edges={[]}>
      <StackHeader title={t('profile.reviews.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="star-outline" size={28} color={colors.muted} />
            </View>
            <Text variant="caption" tone="muted" style={styles.emptyText}>
              {t('profile.reviews.empty')}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((r) => (
              <View key={r.id} style={[styles.card, shadow.soft]}>
                <View style={styles.cardTop}>
                  <View style={styles.flex}>
                    <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                      {r.proName}
                    </Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {r.service} · {r.period}
                    </Text>
                  </View>
                  <View style={styles.stars}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Ionicons
                        key={i}
                        name="star"
                        size={13}
                        color={i < r.rating ? colors.gold : colors.line}
                      />
                    ))}
                  </View>
                </View>
                {r.text ? (
                  <Text variant="body" tone="inkSoft" style={styles.text}>
                    {r.text}
                  </Text>
                ) : null}
                {r.reply ? (
                  <View style={styles.replyBox}>
                    <View style={styles.replyHead}>
                      <Ionicons name="storefront" size={12} color={colors.accentFg} />
                      <Text variant="caption" tone="accentFg" style={styles.replyLabel}>
                        {t('pro.review.reply')}
                      </Text>
                    </View>
                    <Text variant="body" tone="inkSoft">
                      {r.reply}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: space(3),
      paddingTop: space(2),
      paddingBottom: TAB_BAR_CLEARANCE,
    },
    list: { gap: space(1.5) },
    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(2) },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    flex: { flex: 1 },
    stars: { flexDirection: 'row', gap: 2 },
    text: { marginTop: space(1.25), lineHeight: 21 },
    replyBox: {
      marginTop: space(1.25),
      padding: space(1.5),
      backgroundColor: colors.accentSoft,
      borderRadius: radius.md,
      gap: space(0.75),
    },
    replyHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    replyLabel: { fontWeight: '600' },
    empty: { alignItems: 'center', paddingTop: space(8), gap: space(1.5) },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: { textAlign: 'center', maxWidth: 240 },
  });
