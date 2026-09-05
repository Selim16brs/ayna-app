import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { api } from '../../src/api';
import { useLocale } from '../../src/locale';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, Text, useToast } from '../../src/ui';

/**
 * Faz 4 (§15) — UZMAN, salonun kendi takvimi üzerindeki yetkisini seçer.
 * Varsayılan güvenli mod: salon ekler → uzman onayına düşer. Değişiklik
 * salona bildirilir ve audit log'a yazılır (sunucu tarafı).
 */
// Her modun ne ANLAMA geldiği yazılı: etiketler tek başına ("Yalnız görsün")
// hangi yetkinin verildiğini anlatmıyordu.
const MODES: { id: string; labelKey: MessageKey; descKey: MessageKey; icon: string }[] = [
  {
    id: 'view_availability_only',
    labelKey: 'seller.calperm.view',
    descKey: 'seller.calperm.view_d',
    icon: 'eye-outline',
  },
  {
    id: 'create_requires_approval',
    labelKey: 'seller.calperm.approval',
    descKey: 'seller.calperm.approval_d',
    icon: 'checkmark-circle-outline',
  },
  {
    id: 'manage_calendar',
    labelKey: 'seller.calperm.manage',
    descKey: 'seller.calperm.manage_d',
    icon: 'calendar-outline',
  },
];

// Salonun NE GÖRDÜĞÜ moda bağlı DEĞİL — kodda sabit. Uzman bunu bilmeliydi.
// Kaynak: app/salon/agenda.tsx (kişisel randevu kilitli, yalnız bySalon'da
// müşteri adı) ve app/booking/[id].tsx (salonHidesMoney). Vaat değil, kodun
// yaptığı şeyin yazıya dökülmüş hali.
const SEES: MessageKey[] = [
  'seller.calperm.sees_1',
  'seller.calperm.sees_2',
  'seller.calperm.sees_3',
];

export default function CalendarPermissionScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [mode, setMode] = useState<string>('create_requires_approval');
  const toast = useToast();

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
      .then(() => toast.show(t('seller.calperm.saved')))
      .catch(() => {
        setMode(prev);
        Alert.alert(t('seller.calperm.title'), t('seller.calperm.save_err'));
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
              <View style={styles.flex}>
                <Text variant="title" tone={on ? 'onAccent' : 'ink'}>
                  {t(m.labelKey)}
                </Text>
                <Text variant="caption" tone={on ? 'onAccent' : 'muted'} style={styles.desc}>
                  {t(m.descKey)}
                </Text>
              </View>
              {on ? <Ionicons name="checkmark" size={18} color={colors.onAccent} /> : null}
            </Pressable>
          );
        })}

        {/* SALON NE GÖRÜYOR — mod seçimi bunu DEĞİŞTİRMEZ. Uzmanın en çok merak
            ettiği şey buydu ve ekranda hiç yazmıyordu. */}
        <View style={styles.seesCard}>
          <View style={styles.seesHead}>
            <Ionicons name="eye-off-outline" size={17} color={colors.accentFg} />
            <Text variant="title" tone="ink">
              {t('seller.calperm.sees_title')}
            </Text>
          </View>
          {SEES.map((k) => (
            <View key={k} style={styles.seesRow}>
              <Ionicons name="lock-closed" size={14} color={colors.success} />
              <Text variant="caption" tone="inkSoft" style={styles.flex}>
                {t(k)}
              </Text>
            </View>
          ))}
          <Text variant="micro" tone="muted">
            {t('seller.calperm.sees_note')}
          </Text>
        </View>
      </ScrollView>
      {toast.node}
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { padding: space(3), gap: space(1.5), paddingBottom: space(3) },
    desc: { marginTop: 2 },
    seesCard: {
      marginTop: space(1.5),
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(1.25),
    },
    seesHead: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    seesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space(1) },
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
