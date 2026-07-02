import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CITIES } from '../data';
import { useLocale } from '../locale';
import { radius, space, type ColorTokens } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

// Türkçe-duyarlı küçük harf (İ/ı)
const lower = (s: string) => s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLocaleLowerCase('tr-TR');

/**
 * Yeniden kullanılabilir şehir seçici — Kazakistan'ın tüm şehirleri (CITIES), aranabilir
 * açılır menü (modal). Kayıt ve diğer formlarda tutarlı kullanım için.
 */
export function CitySelect({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (city: string) => void;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const results = useMemo(() => {
    const query = lower(q.trim());
    return query ? CITIES.filter((c) => lower(c).includes(query)) : CITIES;
  }, [q]);

  return (
    <>
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <Ionicons name="location-outline" size={18} color={colors.inkSoft} />
        <Text variant="body" tone={value ? 'ink' : 'muted'} style={styles.fieldText} numberOfLines={1}>
          {value ?? t('city.select.placeholder')}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + space(2) }]}>
            <View style={styles.sheetHead}>
              <Text variant="h2" tone="ink" style={styles.sheetTitle}>
                {t('city.select.title')}
              </Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8} style={styles.close}>
                <Ionicons name="close" size={22} color={colors.ink} />
              </Pressable>
            </View>
            <View style={styles.search}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder={t('city.select.search')}
                placeholderTextColor={colors.muted}
                autoFocus
                style={styles.searchInput}
              />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
              {results.length === 0 ? (
                <Text variant="caption" tone="muted" style={styles.empty}>
                  {t('search.empty')}
                </Text>
              ) : (
                results.map((c) => {
                  const on = c === value;
                  return (
                    <Pressable
                      key={c}
                      style={[styles.row, on && styles.rowOn]}
                      onPress={() => {
                        onChange(c);
                        setQ('');
                        setOpen(false);
                      }}
                    >
                      <Text variant="bodyStrong" tone={on ? 'onAccent' : 'ink'}>
                        {c}
                      </Text>
                      {on ? <Ionicons name="checkmark" size={18} color={colors.onAccent} /> : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      height: 54,
      paddingHorizontal: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
    },
    fieldText: { flex: 1 },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: space(3),
      paddingTop: space(2.5),
      maxHeight: '78%',
    },
    sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sheetTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
    close: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      height: 48,
      paddingHorizontal: space(2),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      marginTop: space(2),
    },
    searchInput: { flex: 1, fontSize: 16, color: colors.ink },
    list: { paddingVertical: space(1.5), gap: space(0.75) },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space(2),
      paddingVertical: space(1.75),
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
    },
    rowOn: { backgroundColor: colors.accent },
    empty: { textAlign: 'center', paddingVertical: space(4) },
  });
