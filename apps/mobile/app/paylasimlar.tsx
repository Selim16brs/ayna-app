import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { api, type ProPost } from '../src/api';
import { fillParams, useLocale } from '../src/locale';
import { useStore } from '../src/store';
import { type ColorTokens, radius, space } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import { Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../src/ui';

/**
 * UZMANIMDAN GELEN PAYLAŞIMLAR — öncesi/sonrası.
 *
 * Yalnız kendi uzmanından geleni görüyorsun: liste sunucuda alıcı
 * kaydına göre süzülüyor, herkese açık bir akış değil.
 *
 * ── ŞİKÂYET YOLU HER KARTTA ─────────────────────────────────────────────
 *
 * Öncesi/sonrası fotoğrafı kişisel veri. Müşteri KENDİ fotoğrafını
 * izinsiz görürse tek dokunuşla bildirebilmeli; gönderi o anda gizleniyor
 * ve yöneticiye düşüyor. Bekletmek, zaten yaşanmış bir mahremiyet
 * ihlalini uzatmak olurdu.
 */
export default function PaylasimlarScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const token = useStore((s) => s.token);
  const [posts, setPosts] = useState<ProPost[] | null>(null);

  const yukle = useCallback(() => {
    if (!token) return;
    void api
      .proPostInbox(token)
      .then((r) => {
        setPosts(r.posts);
        // Görüldü işareti: uzman kaç kişinin gördüğünü değil, yalnız
        // okunmamış sayacı için gerekli. Başarısız olursa akış bozulmuyor.
        for (const p of r.posts) void api.markProPostRead(token, p.id).catch(() => undefined);
      })
      .catch(() => setPosts([]));
  }, [token]);
  // Yeni paylaşımlar ekran açılınca geliyor (ilk açılışta bir kez değil).
  useFocusEffect(useCallback(yukle, [yukle]));

  const bildir = (id: string) => {
    if (!token) return;
    Alert.alert(t('propost.report_t'), t('propost.report_b'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.ok'),
        style: 'destructive',
        onPress: () => {
          void api
            .reportProPost(token, id)
            .then(() => {
              Alert.alert(t('propost.reported'));
              yukle();
            })
            .catch(() => undefined);
        },
      },
    ]);
  };

  const kalanGun = (bitis: number) =>
    Math.max(0, Math.ceil((bitis - Date.now()) / (24 * 60 * 60 * 1000)));

  return (
    <Screen edges={[]}>
      <StackHeader title={t('propost.inbox')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {posts && posts.length === 0 ? (
          <Text variant="caption" tone="muted" style={styles.bos}>
            {t('propost.inbox_empty')}
          </Text>
        ) : null}

        {(posts ?? []).map((p) => (
          <View key={p.id} style={[styles.kart, shadow.soft]}>
            <View style={styles.bas}>
              {p.proImage ? (
                <Image source={{ uri: p.proImage }} style={styles.proFoto} />
              ) : (
                <View style={[styles.proFoto, styles.proFotoBos]} />
              )}
              <View style={styles.grow}>
                <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                  {fillParams(t('propost.from'), { ad: p.proName ?? '' })}
                </Text>
                {/* Süre AÇIKÇA yazıyor: kullanıcı kaybolacağını bilmeli. */}
                <Text variant="micro" tone="muted">
                  {fillParams(t('propost.left'), { gun: String(kalanGun(p.expiresAt)) })}
                </Text>
              </View>
            </View>

            <View style={styles.fotolar}>
              {(
                [
                  [p.beforeUrl, t('propost.before')],
                  [p.afterUrl, t('propost.after')],
                ] as const
              ).map(([uri, etiket]) => (
                <View key={etiket} style={styles.fotoKap}>
                  <Image source={{ uri }} style={styles.foto} resizeMode="cover" />
                  <View style={styles.etiket}>
                    <Text variant="micro" tone="onAccent">
                      {etiket}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {p.note ? (
              <Text variant="caption" tone="inkSoft" style={styles.not}>
                {p.note}
              </Text>
            ) : null}

            <Pressable style={styles.bildir} onPress={() => bildir(p.id)} hitSlop={6}>
              <Ionicons name="flag-outline" size={13} color={colors.muted} />
              <Text variant="micro" tone="muted">
                {t('propost.report')}
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { padding: space(3), paddingBottom: TAB_BAR_CLEARANCE, gap: space(2) },
    grow: { flex: 1, minWidth: 0 },
    bos: { textAlign: 'center', lineHeight: 20, marginTop: space(4) },
    kart: {
      gap: space(1.25),
      padding: space(1.75),
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
    },
    bas: { flexDirection: 'row', alignItems: 'center', gap: space(1.25) },
    proFoto: { width: 36, height: 36, borderRadius: 18 },
    proFotoBos: { backgroundColor: colors.accentSoft },
    fotolar: { flexDirection: 'row', gap: space(1) },
    fotoKap: { flex: 1, aspectRatio: 1, borderRadius: radius.md, overflow: 'hidden' },
    foto: { width: '100%', height: '100%' },
    etiket: {
      position: 'absolute',
      left: 6,
      bottom: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
    },
    not: { lineHeight: 18 },
    bildir: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  });
