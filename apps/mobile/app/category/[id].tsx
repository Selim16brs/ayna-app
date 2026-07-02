import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { categoryLabelKey } from '../../src/data';
import { useProfessionals } from '../../src/catalog';
import { useLocale } from '../../src/locale';
import { type ColorTokens, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, Segmented, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';
import { ProRow } from '../search';

type SortKey = 'rating' | 'price';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [sort, setSort] = useState<SortKey>('rating');
  const sector = id ?? '';
  const professionals = useProfessionals();

  const results = useMemo(() => {
    const list = professionals.filter((p) => p.sector === sector);
    return [...list].sort((a, b) =>
      sort === 'rating' ? b.rating - a.rating : a.priceFrom - b.priceFrom,
    );
  }, [professionals, sector, sort]);

  return (
    <Screen edges={[]}>
      <StackHeader title={t(categoryLabelKey(sector))} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Segmented
          options={[
            { value: 'rating', label: t('category.sort.rating') },
            { value: 'price', label: t('category.sort.price') },
          ]}
          value={sort}
          onChange={setSort}
        />
        <Text variant="caption" tone="muted" style={styles.count}>
          {results.length} {t('category.browse.count')}
        </Text>
        {results.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="sparkles-outline" size={30} color={colors.muted} />
            </View>
            <Text variant="caption" tone="muted">
              {t('category.empty')}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {results.map((p, i) => (
              <ProRow
                key={p.id}
                pro={p}
                index={i}
                onPress={() => router.push('/professional/' + p.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(2), paddingBottom: TAB_BAR_CLEARANCE },
    count: { marginTop: space(2), marginBottom: space(1.5), marginLeft: space(0.5) },
    list: { gap: space(1.25) },
    empty: { alignItems: 'center', paddingTop: space(8), gap: space(1) },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(1),
    },
  });
