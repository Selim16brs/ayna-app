import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { PROFESSIONALS } from '../src/data';
import { useLocale } from '../src/locale';
import { useStore } from '../src/store';
import { type ColorTokens, space } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import { Screen, StackHeader, Text } from '../src/ui';
import { ProRow } from './search';

export default function FavoritesScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const favIds = useStore((s) => s.favorites);
  const toggleFavorite = useStore((s) => s.toggleFavorite);

  const favs = favIds
    .map((id) => PROFESSIONALS.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('favorites.title')} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {favs.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="heart-outline" size={30} color={colors.rose} />
            </View>
            <Text variant="bodyStrong" tone="ink" style={styles.emptyTitle}>
              {t('favorites.empty')}
            </Text>
            <Text variant="caption" tone="muted">
              {t('favorites.empty_sub')}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {favs.map((p) => (
              <ProRow
                key={p.id}
                pro={p}
                onPress={() => router.push('/professional/' + p.id)}
                right={
                  <Pressable onPress={() => toggleFavorite(p.id)} hitSlop={10}>
                    <Ionicons name="heart" size={22} color={colors.rose} />
                  </Pressable>
                }
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
    content: { paddingHorizontal: space(2), paddingTop: space(1), paddingBottom: space(4) },
    list: { gap: space(1.25) },
    empty: { alignItems: 'center', paddingTop: space(8), gap: space(1) },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.roseSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(1),
    },
    emptyTitle: {},
  });
