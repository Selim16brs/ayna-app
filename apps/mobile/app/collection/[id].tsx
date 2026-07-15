import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { api, type ApiCollectionDetail } from '../../src/api';
import { useLocale } from '../../src/locale';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, Text } from '../../src/ui';

// §keşif Modül 3 — koleksiyon sayfası: kürasyonlu karma liste. Üç modül burada
// birleşir: kategori (tek dokunuş talep), editoryal, kampanya, öne çıkan uzman.
export default function CollectionScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<ApiCollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    api
      .collectionDetail(id)
      .then((d) => alive && setData(d))
      .catch(() => undefined)
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  function open(item: ApiCollectionDetail['items'][number]) {
    if (item.type === 'category') {
      router.push({ pathname: '/quote/new', params: { category: item.id } });
    } else if (item.type === 'article') {
      router.push(`/life/${item.id}`);
    } else if (item.type === 'offer') {
      router.push({
        pathname: '/booking/schedule',
        params: { proId: item.proId, offerId: item.id, source: 'direct' },
      });
    } else {
      router.push(`/professional/${item.id}`);
    }
  }

  return (
    <Screen edges={[]}>
      <StackHeader title={data?.title ?? t('collections.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: space(4) }} />
        ) : !data ? (
          <Text variant="body" tone="muted" style={styles.empty}>
            {t('collections.empty')}
          </Text>
        ) : (
          <>
            {data.heroImage ? <Image source={{ uri: data.heroImage }} style={styles.hero} /> : null}
            {data.subtitle ? (
              <Text variant="body" tone="inkSoft" style={styles.subtitle}>
                {data.subtitle}
              </Text>
            ) : null}
            {data.items.map((item, i) => (
              <Pressable
                key={`${item.type}-${item.id}-${i}`}
                style={styles.row}
                onPress={() => open(item)}
              >
                {item.type === 'category' ? (
                  <View style={styles.iconBox}>
                    <Ionicons name="sparkles-outline" size={20} color={colors.accentFg} />
                  </View>
                ) : (
                  <Image
                    source={{
                      uri:
                        ('image' in item && item.image) ||
                        'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=200&q=60',
                    }}
                    style={styles.thumb}
                  />
                )}
                <View style={styles.rowBody}>
                  <Text variant="bodyStrong" tone="ink" numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {item.type === 'category'
                      ? t('collections.item.category')
                      : item.type === 'article'
                        ? t('collections.item.article')
                        : item.type === 'offer'
                          ? `${t('collections.item.offer')} · -%${item.discountValue} → ${item.finalPrice.toLocaleString('tr-TR')} ₸`
                          : item.subtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4), gap: space(1.25) },
    empty: { textAlign: 'center', marginTop: space(6) },
    hero: { width: '100%', height: 160, borderRadius: radius.xl, backgroundColor: colors.bgSunken },
    subtitle: { lineHeight: 20 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.5),
    },
    iconBox: {
      width: 52,
      height: 52,
      borderRadius: radius.md,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumb: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.bgSunken },
    rowBody: { flex: 1, gap: 2 },
  });
