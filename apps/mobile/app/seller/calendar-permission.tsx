import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { api } from '../../src/api';
import { useLocale } from '../../src/locale';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, Text } from '../../src/ui';

/**
 * Faz 4 (§15) — UZMAN, salonun kendi takvimi üzerindeki yetkisini seçer.
 * Varsayılan güvenli mod: salon ekler → uzman onayına düşer. Değişiklik
 * salona bildirilir ve audit log'a yazılır (sunucu tarafı).
 */
const MODES: { id: string; labelKey: MessageKey; icon: string }[] = [
  { id: 'view_availability_only', labelKey: 'seller.calperm.view', icon: 'eye-outline' },
  {
    id: 'create_requires_approval',
    labelKey: 'seller.calperm.approval',
    icon: 'checkmark-circle-outline',
  },
  { id: 'manage_calendar', labelKey: 'seller.calperm.manage', icon: 'calendar-outline' },
];

export default function CalendarPermissionScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [mode, setMode] = useState<string>('create_requires_approval');

  useEffect(() => {
    void api
      .myCalendarPermission()
      .then((r) => setMode(r.mode))
      .catch(() => undefined);
  }, []);

  const choose = (m: string) => {
    const prev = mode;
    setMode(m);
    void api
      .setCalendarPermission(m)
      .then(() => Alert.alert(t('seller.calperm.saved')))
      .catch(() => {
        setMode(prev);
        Alert.alert(t('common.error') as string);
      });
  };

  return (
    <Screen edges={['bottom']}>
      <StackHeader title={t('seller.calperm.title')} />
      <ScrollView contentContainerStyle={styles.content}>
        {MODES.map((m) => {
          const on = m.id === mode;
          return (
            <Pressable
              key={m.id}
              onPress={() => choose(m.id)}
              style={[styles.card, shadow.soft, on && styles.cardOn]}
            >
              <Ionicons
                name={m.icon as never}
                size={20}
                color={on ? colors.onAccent : colors.inkSoft}
              />
              <Text variant="bodyStrong" tone={on ? 'onAccent' : 'ink'} style={styles.flex}>
                {t(m.labelKey)}
              </Text>
              {on ? <Ionicons name="checkmark" size={18} color={colors.onAccent} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { padding: space(3), gap: space(1.5) },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
    },
    cardOn: { backgroundColor: colors.accent },
    flex: { flex: 1 },
  });
