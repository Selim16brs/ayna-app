import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Image, ScrollView, StyleSheet, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { PressableScale, Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

// §10.1 — SALON Profil hub'ı: düzenleme + yönetim (komisyon/değerlendirme/promosyon) + hesap.
export default function SalonProfileHub() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const logout = useStore((s) => s.logout);
  const salonName = useStore((s) => s.currentUser?.name) ?? 'Salon';
  const avatarUri = useStore((s) => s.avatarUri);

  // §10 gizlilik — Komisyon/para salon panelinde YOK (uzmanın şahsi alanı). Yalnız değerlendirme + promosyon.
  const MANAGE: { icon: IoniconName; label: MessageKey; route: string }[] = [
    { icon: 'star-outline', label: 'salon.quick.reviews', route: '/seller/reviews' },
    { icon: 'pricetags-outline', label: 'salon.quick.promotions', route: '/seller/promotions' },
  ];

  return (
    <Screen edges={[]}>
      <StackHeader title={t('salon.nav.profile')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Salon başlık kartı */}
        <View style={[styles.headerCard, shadow.soft]}>
          <View style={styles.avatar}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="business" size={26} color={colors.accentFg} />
            )}
          </View>
          <View style={styles.flex}>
            <Text variant="h2" tone="ink" numberOfLines={1}>
              {salonName}
            </Text>
            <Text variant="caption" tone="muted">
              {t('reports.identity.salon')}
            </Text>
          </View>
        </View>

        {/* Profili düzenle */}
        <PressableScale style={[styles.editBtn, shadow.soft]} onPress={() => router.push('/salon/edit')}>
          <Ionicons name="create-outline" size={19} color={colors.onAccent} />
          <Text variant="bodyStrong" tone="onAccent" style={styles.editText}>
            {t('salon.edit.title')}
          </Text>
        </PressableScale>

        {/* Yönetim: komisyon · değerlendirmeler · promosyonlar */}
        <View style={[styles.group, shadow.soft]}>
          {MANAGE.map((m, i) => (
            <PressableScale
              key={m.route}
              style={[styles.row, i < MANAGE.length - 1 && styles.rowBorder]}
              onPress={() => router.push(m.route as never)}
            >
              <View style={styles.rowIcon}>
                <Ionicons name={m.icon} size={19} color={colors.accentFg} />
              </View>
              <Text variant="body" tone="ink" style={styles.flex}>
                {t(m.label)}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </PressableScale>
          ))}
        </View>

        {/* Hesap: bildirim tercihleri + çıkış */}
        <View style={[styles.group, shadow.soft]}>
          <PressableScale style={[styles.row, styles.rowBorder]} onPress={() => router.push('/profile/notifications')}>
            <View style={styles.rowIcon}>
              <Ionicons name="notifications-outline" size={19} color={colors.accentFg} />
            </View>
            <Text variant="body" tone="ink" style={styles.flex}>
              {t('notifprefs.title')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </PressableScale>
          <PressableScale
            style={styles.row}
            onPress={() =>
              Alert.alert(t('profile.menu.logout'), undefined, [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('profile.menu.logout'),
                  style: 'destructive',
                  onPress: () => {
                    logout();
                    router.replace('/');
                  },
                },
              ])
            }
          >
            <View style={[styles.rowIcon, { backgroundColor: colors.dangerSoft }]}>
              <Ionicons name="log-out-outline" size={19} color={colors.danger} />
            </View>
            <Text variant="body" style={[styles.flex, { color: colors.danger }]}>
              {t('profile.menu.logout')}
            </Text>
          </PressableScale>
        </View>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingTop: space(2), paddingBottom: TAB_BAR_CLEARANCE + space(2), gap: space(2) },
    flex: { flex: 1 },
    headerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    editBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space(1),
      backgroundColor: colors.accentFg,
      borderRadius: radius.pill,
      paddingVertical: space(1.75),
    },
    editText: { fontSize: 15 },
    group: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: space(1.25), paddingHorizontal: space(2), paddingVertical: space(1.75) },
    rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
