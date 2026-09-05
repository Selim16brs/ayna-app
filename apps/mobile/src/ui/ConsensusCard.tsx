import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { api } from '../api';
import { useProfessionals } from '../catalog';
import { fillParams, useLocale } from '../locale';
import { radius, space, type ColorTokens } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { SaglayiciFoto } from './SaglayiciFoto';
import { Text } from './Text';

/**
 * §14 — FİKİR BİRLİĞİ KARTI.
 *
 * Yedi yorumu tek tek okumak yerine "Zarina — 7 kişiden 4'ü" tek kartta.
 * Kullanıcı 30 saniyede karar veriyor, 10 dakika yorum okumuyor.
 *
 * Sayım SUNUCUDA yapılır ve yalnız DOĞRULANMIŞ öneriler sayılır: öneren kişinin
 * o uzmanda tamamlanmış randevusu olmalı. Kural kartın altında yazılı — gizli
 * bir ağırlıklandırma yok.
 *
 * Üç kişiden az öneri varsa "fikir birliği" demek yanıltıcı olur; kart çizilmez.
 */
export function ConsensusCard({ postId }: { postId: string }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const pros = useProfessionals();
  const [data, setData] = useState<{
    voters: number;
    items: { proId: string; count: number }[];
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void api
        .circleConsensus(postId)
        .then((d) => alive && setData(d))
        .catch(() => undefined);
      return () => {
        alive = false;
      };
    }, [postId]),
  );

  if (!data || data.voters < 3 || data.items.length === 0) return null;
  const top = data.items[0]?.count ?? 1;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Ionicons name="people-outline" size={17} color={colors.accentFg} />
        <Text variant="title" tone="ink" style={styles.flex}>
          {t('circle.consensus.title')}
        </Text>
      </View>

      {data.items.map((it) => {
        const pro = pros.find((p) => p.id === it.proId);
        return (
          <Pressable
            key={it.proId}
            style={styles.row}
            disabled={!pro}
            onPress={() => pro && router.push(`/professional/${pro.id}`)}
          >
            <SaglayiciFoto uri={pro?.image} ad={pro?.name} style={styles.avatar} />
            <View style={styles.rowBody}>
              <Text variant="captionStrong" tone="ink" numberOfLines={1}>
                {pro?.name ?? it.proId}
              </Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.round((it.count / top) * 100)}%` }]} />
              </View>
            </View>
            <Text numeric variant="captionStrong" tone="ink" style={styles.count}>
              {it.count} / {data.voters}
            </Text>
          </Pressable>
        );
      })}

      {/* Ölçüt kartın içinde yazılı — gizli algoritma yok */}
      <Text variant="micro" tone="muted">
        {fillParams(t('circle.consensus.of'), { n: String(data.voters) })} ·{' '}
        {t('circle.consensus.rule')}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(1.25),
      marginBottom: space(1.5),
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    flex: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: space(1.25) },
    avatar: { width: 40, height: 40, borderRadius: radius.xs, backgroundColor: colors.bgSunken },
    rowBody: { flex: 1, gap: 5 },
    track: { height: 6, borderRadius: 3, backgroundColor: colors.bgSunken, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 3, backgroundColor: colors.accent },
    count: { minWidth: 46, textAlign: 'right' },
  });
