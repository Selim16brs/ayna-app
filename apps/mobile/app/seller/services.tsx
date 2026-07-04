import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import type { SellerServiceRow } from '../../src/store';
import { activeCategories, servicesOf, tri, type TaxService } from '../../src/taxonomy';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text, TextInput } from '../../src/ui';

// §6.1 — uzman hizmetleri: alan seç → alt hizmetleri aç/kapat + fiyat/süre yönet.
// Merkezi taksonomiden türer; kayıtlı hizmetler store'da kalıcı — offline randevu akışı buradan besler.
type SvcRow = SellerServiceRow;
const CATS = activeCategories();

export default function SellerServicesScreen() {
  const { t, locale } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const storeServices = useStore((s) => s.sellerServices);
  const setSellerServices = useStore((s) => s.setSellerServices);
  const [cat, setCat] = useState<string>(CATS[0]!.id);
  const [svc, setSvc] = useState<Record<string, SvcRow>>(storeServices);

  const activeCount = Object.keys(svc).length;
  const rows = servicesOf(cat);

  const toggle = (s: TaxService) =>
    setSvc((m) => {
      if (m[s.id]) {
        const { [s.id]: _drop, ...rest } = m;
        return rest;
      }
      return { ...m, [s.id]: { price: String(s.price), dur: String(s.durationMin) } };
    });

  const edit = (id: string, field: keyof SvcRow, val: string) =>
    setSvc((m) => (m[id] ? { ...m, [id]: { ...m[id]!, [field]: val.replace(/[^0-9]/g, '') } } : m));

  const save = () => {
    setSellerServices(svc);
    Alert.alert(t('seller.services.title'), t('seller.services.saved'));
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('seller.services.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text variant="caption" tone="muted" style={styles.subtitle}>
            {t('seller.services.subtitle')}
          </Text>
          <View style={styles.countPill}>
            <Ionicons name="pricetags" size={13} color={colors.accentFg} />
            <Text variant="caption" tone="accentFg" style={styles.countText}>
              {activeCount} {t('seller.services.active_unit')}
            </Text>
          </View>
        </View>

        {/* Kategori seçici */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {CATS.map((c) => {
            const on = c.id === cat;
            const n = servicesOf(c.id).filter((s) => svc[s.id]).length;
            return (
              <Pressable
                key={c.id}
                onPress={() => setCat(c.id)}
                style={[styles.chip, on && styles.chipActive]}
              >
                <Text variant="caption" tone={on ? 'onAccent' : 'inkSoft'}>
                  {t(c.labelKey)}
                </Text>
                {n > 0 ? (
                  <View style={[styles.badge, on && styles.badgeOn]}>
                    <Text variant="caption" style={on ? styles.badgeTextOn : styles.badgeText}>
                      {n}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Alt hizmetler */}
        {rows.length === 0 ? (
          <Text variant="caption" tone="muted" style={styles.empty}>
            {t('seller.services.empty')}
          </Text>
        ) : (
          rows.map((s) => {
            const row = svc[s.id];
            const on = !!row;
            return (
              <View key={s.id} style={[styles.card, on && styles.cardOn]}>
                <Pressable style={styles.cardTop} onPress={() => toggle(s)}>
                  <View style={[styles.check, on && styles.checkOn]}>
                    {on ? <Ionicons name="checkmark" size={14} color={colors.onAccent} /> : null}
                  </View>
                  <Text variant="bodyStrong" tone="ink" style={styles.name} numberOfLines={1}>
                    {tri(s.label, locale)}
                  </Text>
                </Pressable>
                {on ? (
                  <View style={styles.fieldRow}>
                    <View style={styles.field}>
                      <Text variant="caption" tone="muted">
                        {t('expert.reg.service_price')}
                      </Text>
                      <TextInput
                        value={row.price}
                        onChangeText={(v) => edit(s.id, 'price', v)}
                        keyboardType="number-pad"
                        placeholderTextColor={colors.muted}
                        style={styles.input}
                      />
                    </View>
                    <View style={styles.field}>
                      <Text variant="caption" tone="muted">
                        {t('expert.reg.service_dur')}
                      </Text>
                      <TextInput
                        value={row.dur}
                        onChangeText={(v) => edit(s.id, 'dur', v)}
                        keyboardType="number-pad"
                        placeholderTextColor={colors.muted}
                        style={styles.input}
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })
        )}

        <View style={styles.save}>
          <Button label={t('common.save')} variant="primary" onPress={save} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(6) },
    intro: { marginBottom: space(2), gap: space(1.25) },
    subtitle: { lineHeight: 18 },
    countPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 5,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: space(1.5),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
    },
    countText: { fontWeight: '700' },
    chips: { gap: space(1), paddingRight: space(3), paddingBottom: space(2) },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1.25,
      borderColor: colors.line,
    },
    chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    badge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeOn: { backgroundColor: 'rgba(255,255,255,0.35)' },
    badgeText: { color: colors.accentFg, fontWeight: '700', fontSize: 11 },
    badgeTextOn: { color: colors.onAccent, fontWeight: '700', fontSize: 11 },
    empty: { textAlign: 'center', paddingVertical: space(6) },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(1.75),
      marginBottom: space(1.5),
    },
    cardOn: { borderColor: colors.accent },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: space(1.25) },
    check: {
      width: 24,
      height: 24,
      borderRadius: 7,
      borderWidth: 1.5,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    name: { flex: 1 },
    fieldRow: { flexDirection: 'row', gap: space(1.5), marginTop: space(1.5) },
    field: { flex: 1, gap: 4 },
    input: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingHorizontal: space(1.5),
      paddingVertical: space(1.25),
      color: colors.ink,
      fontSize: 15,
    },
    save: { marginTop: space(2) },
  });
