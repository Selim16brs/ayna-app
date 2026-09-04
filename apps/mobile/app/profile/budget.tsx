import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { ayBasi, limitiCoz } from '../../src/butce';
import { formatPrice } from '../../src/data';
import { formatSlot } from '../../src/datetime';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import {
  Button,
  Progress,
  Screen,
  SectionHeader,
  StackHeader,
  TAB_BAR_CLEARANCE,
  Text,
} from '../../src/ui';

/*
 * AYLIK LİMİT KULLANICININ.
 *
 * Burada `const LIMIT = 80000` sabiti vardı ve ekran bunu "Aylık limit"
 * diye yazıp üstüne doluluk çubuğu ve "Kalan" tutarı çiziyordu. Kullanıcı
 * böyle bir limit hiç belirlememişti — kendi bütçesi sanılan sayı koddan
 * geliyordu.
 *
 * Kurucu: "bütçe kısmında limiti kullanıcının belirleyeceği ve istediğinde
 * değişiklik yapacağı şekilde kurgula." Limit artık kullanıcıya ait,
 * cihazda kalıcı ve istendiğinde değiştirilip kaldırılabiliyor. Limit
 * YOKKEN çubuk da "kalan" da çizilmiyor: olmayan bir sınıra göre yüzde
 * göstermek yine uydurma olurdu.
 */

export default function BudgetScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const bookings = useStore((s) => s.bookings);
  /*
   * "BU AY" GERÇEKTEN BU AY.
   *
   * Başlık "Bu ay harcanan" diyordu ama toplam TÜM tamamlanmış
   * randevuları kapsıyordu: bir yıldır uygulamayı kullanan biri, bu ay
   * hiç randevusu olmasa bile yüksek bir "bu ay" rakamı görüyordu.
   */
  const completed = useMemo(() => {
    const bas = ayBasi(new Date());
    return bookings.filter((b) => b.status === 'tamamlandi' && b.startMs >= bas);
  }, [bookings]);
  const spent = completed.reduce((n, b) => n + b.price, 0);

  const limit = useStore((s) => s.butceLimiti);
  const setLimit = useStore((s) => s.setButceLimiti);
  const [duzenle, setDuzenle] = useState(false);
  const [taslak, setTaslak] = useState('');
  const kalan = limit !== null ? limit - spent : null;
  const asildi = kalan !== null && kalan < 0;

  const duzenlemeyiAc = () => {
    setTaslak(limit !== null ? String(limit) : '');
    setDuzenle(true);
  };
  const kaydet = () => {
    setLimit(limitiCoz(taslak));
    setDuzenle(false);
  };

  // Kategori = işletme bazlı kırılım
  const byCategory = completed.reduce<Record<string, number>>((acc, b) => {
    acc[b.proName] = (acc[b.proName] ?? 0) + b.price;
    return acc;
  }, {});
  const categories = Object.entries(byCategory);

  return (
    <Screen edges={['bottom']}>
      <StackHeader title={t('budget.title')} />
      {/* Klavye açıkken Kaydet'e TEK dokunuş yetsin (#12). */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="body" tone="inkSoft" style={styles.subtitle}>
          {t('budget.subtitle')}
        </Text>

        {/* Özet kartı */}
        <View style={[styles.card, shadow.soft]}>
          <Text variant="caption" tone="muted">
            {t('budget.spent')}
          </Text>
          <Text variant="display" tone="ink">
            {formatPrice(spent)}
          </Text>

          {limit !== null ? (
            <>
              <View style={styles.barWrap}>
                {/*
                  Çubuk 1'de duruyor: limit aşıldığında taşan bir çubuk
                  çizmek yerine aşımı YAZIYLA söylüyoruz.
                */}
                <Progress
                  value={Math.min(spent / limit, 1)}
                  color={asildi ? colors.danger : colors.accent}
                />
              </View>
              <View style={styles.cardFoot}>
                <Text variant="caption" tone="muted">
                  {t('budget.limit')}: {formatPrice(limit)}
                </Text>
                <Text variant="caption" style={{ color: asildi ? colors.danger : colors.sage }}>
                  {asildi
                    ? `${t('budget.over')}: ${formatPrice(-kalan!)}`
                    : `${t('budget.remaining')}: ${formatPrice(kalan!)}`}
                </Text>
              </View>
            </>
          ) : (
            <Text variant="caption" tone="muted" style={styles.limitYok}>
              {t('budget.no_limit')}
            </Text>
          )}

          {duzenle ? (
            <View style={styles.limitDuzen}>
              <TextInput
                style={styles.limitGirdi}
                value={taslak}
                onChangeText={setTaslak}
                keyboardType="number-pad"
                placeholder={t('budget.limit_ph')}
                placeholderTextColor={colors.muted}
                autoFocus
              />
              <Text variant="micro" tone="muted">
                {t('budget.limit_hint')}
              </Text>
              <View style={styles.limitDugmeler}>
                <Button label={t('budget.limit_save')} onPress={kaydet} />
                {limit !== null ? (
                  <Pressable
                    onPress={() => {
                      setLimit(null);
                      setDuzenle(false);
                    }}
                    hitSlop={8}
                  >
                    <Text variant="caption" style={{ color: colors.danger }}>
                      {t('budget.limit_clear')}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => setDuzenle(false)} hitSlop={8}>
                  <Text variant="caption" tone="muted">
                    {t('common.cancel')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={duzenlemeyiAc} hitSlop={8} style={styles.limitAc}>
              <Ionicons name="options-outline" size={14} color={colors.accent} />
              <Text variant="caption" style={{ color: colors.accent }}>
                {t(limit !== null ? 'budget.edit_limit' : 'budget.set_limit')}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Kategoriye göre */}
        <SectionHeader title={t('budget.by_category')} />
        {categories.length === 0 ? (
          <View style={[styles.group, styles.empty, shadow.soft]}>
            <Text variant="body" tone="muted">
              {t('budget.no_spend')}
            </Text>
          </View>
        ) : (
          <View style={[styles.group, shadow.soft]}>
            {categories.map(([name, amount], i) => (
              <View key={name} style={[styles.row, i < categories.length - 1 && styles.rowBorder]}>
                <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="storefront-outline" size={17} color={colors.ink} />
                </View>
                <Text variant="bodyStrong" tone="ink" style={styles.rowLabel} numberOfLines={1}>
                  {name}
                </Text>
                <Text variant="bodyStrong" tone="ink">
                  {formatPrice(amount)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Harcama geçmişi */}
        <SectionHeader title={t('budget.history')} />
        {completed.length === 0 ? (
          <View style={[styles.group, styles.empty, shadow.soft]}>
            <Text variant="body" tone="muted">
              {t('budget.no_spend')}
            </Text>
          </View>
        ) : (
          <View style={[styles.group, shadow.soft]}>
            {completed.map((b, i) => (
              <View
                key={b.id}
                style={[styles.historyRow, i < completed.length - 1 && styles.rowBorder]}
              >
                <View style={styles.historyText}>
                  <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                    {b.proName}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {b.service} · {formatSlot(b.startMs, t)}
                  </Text>
                </View>
                <Text variant="bodyStrong" tone="ink">
                  {formatPrice(b.price)}
                </Text>
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
      paddingTop: space(1),
      paddingBottom: TAB_BAR_CLEARANCE,
    },
    subtitle: { marginBottom: space(2.5) },
    barWrap: { marginTop: space(1.5), marginBottom: space(0.5) },
    cardFoot: { flexDirection: 'row', justifyContent: 'space-between' },
    limitYok: { marginTop: space(0.5) },
    limitAc: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space(1) },
    limitDuzen: { marginTop: space(1.5), gap: space(1) },
    limitGirdi: {
      borderWidth: 1,
      borderColor: colors.lineStrong,
      borderRadius: radius.sm,
      paddingHorizontal: space(1.5),
      paddingVertical: space(1.25),
      color: colors.ink,
      fontSize: 16,
    },
    limitDugmeler: { flexDirection: 'row', alignItems: 'center', gap: space(2), flexWrap: 'wrap' },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: space(2.75),
      gap: space(0.5),
    },
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    empty: { padding: space(2.5), alignItems: 'center' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      paddingHorizontal: space(2),
      paddingVertical: space(1.75),
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.surfaceMuted,
    },
    icon: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: { flex: 1 },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      paddingHorizontal: space(2),
      paddingVertical: space(1.75),
    },
    historyText: { flex: 1, gap: 2 },
  });
