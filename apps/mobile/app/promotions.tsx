import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { type PromosyonSiralama, promosyonlariSirala } from '@ayna/domain';
import { usePromosyonlar } from '../src/catalog';
import { useLocale } from '../src/locale';
import { space, type ColorTokens } from '../src/theme';
import { useThemedStyles } from '../src/theme-context';
import { PromosyonKarti, Screen, Segmented, StackHeader, Text } from '../src/ui';

/**
 * TÜM PROMOSYONLAR — filtreli liste.
 *
 * Kurucu: "açılan ekranda yakınlık, değerlendirme ve puan gibi filtreli
 * şekilde gösterilmeli."
 *
 * Sıralama SAF bir fonksiyonda (`@ayna/domain`): bilinmeyen değerin
 * (mesafesi olmayan işletme, puanı olmayan uzman) nereye düşeceği bir
 * karar ve testi orada.
 */
export default function PromotionsScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const promosyonlar = usePromosyonlar();
  const [sira, setSira] = useState<PromosyonSiralama>('yakinlik');
  const liste = useMemo(() => promosyonlariSirala(promosyonlar, sira), [promosyonlar, sira]);

  return (
    <Screen edges={[]}>
      <StackHeader title={t('promos.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="body" tone="inkSoft" style={styles.alt}>
          {t('promos.subtitle')}
        </Text>
        <Segmented
          value={sira}
          onChange={(v: PromosyonSiralama) => setSira(v)}
          options={[
            { value: 'yakinlik', label: t('promos.sort.yakinlik') },
            { value: 'puan', label: t('promos.sort.puan') },
            { value: 'indirim', label: t('promos.sort.indirim') },
          ]}
        />
        {liste.length === 0 ? (
          <Text variant="caption" tone="muted" style={styles.bos}>
            {t('promos.empty')}
          </Text>
        ) : (
          <View style={styles.liste}>
            {liste.map((p) => (
              <PromosyonKarti
                key={`${p.proId}:${p.id}`}
                p={p}
                genis
                onPress={() => router.push(`/professional/${p.proId}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (_colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(3), gap: space(1.5) },
    alt: { marginTop: space(0.5) },
    // Tam genişlik: liste ekranında kart yatay şeritteki gibi dar durmamalı.
    liste: { gap: space(1.25) },
    bos: { textAlign: 'center', marginTop: space(4) },
  });
