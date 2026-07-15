import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale } from '../../src/locale';
import type { MessageKey } from '@ayna/i18n';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { useStore } from '../../src/store';
import { Screen, Segmented, Text } from '../../src/ui';
import type { ThemeMode } from '../../src/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

// §5.6 nihai menü. 'panel' yalnızca satıcı hesabında; 'AYNA Safe' KALDIRILDI.
const MENU: {
  key: MessageKey;
  icon: IoniconName;
  danger?: boolean;
  sellerOnly?: boolean;
  customerOnly?: boolean;
}[] = [
  { key: 'profile.menu.panel', icon: 'briefcase-outline', sellerOnly: true },
  // §9.2 — uzman/salon: kazandığı paralar (müşteri 'Bütçe'sinin satıcı karşılığı)
  { key: 'profile.menu.earnings', icon: 'cash-outline', sellerOnly: true },
  { key: 'profile.menu.passport', icon: 'card-outline' },
  { key: 'profile.menu.always', icon: 'infinite-outline' },
  { key: 'profile.menu.rewards', icon: 'gift-outline' },
  { key: 'profile.menu.budget', icon: 'wallet-outline', customerOnly: true },
  { key: 'profile.menu.saved', icon: 'bookmark-outline' },
  { key: 'profile.menu.messages', icon: 'chatbubbles-outline' },
  { key: 'profile.menu.referral', icon: 'gift-outline' },
  { key: 'profile.menu.safety', icon: 'shield-checkmark-outline' },
  { key: 'profile.menu.addresses', icon: 'location-outline' },
  { key: 'profile.menu.privacy', icon: 'lock-closed-outline' },
  { key: 'profile.menu.notifications', icon: 'notifications-outline' },
  { key: 'profile.menu.language', icon: 'language-outline' },
  { key: 'profile.menu.help', icon: 'help-circle-outline' },
  { key: 'profile.menu.logout', icon: 'log-out-outline', danger: true },
];

export default function ProfileScreen() {
  const { t } = useLocale();
  const { colors, gradients, shadow, preference, setPreference } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const completedCount = useStore((s) => s.bookings.filter((b) => b.status === 'completed').length);
  const points = useStore((s) => s.points);
  const reviewCount = useStore((s) =>
    Object.values(s.userReviews).reduce((n, a) => n + a.length, 0),
  );
  const following = useStore((s) => s.following);
  const followerNames = useStore((s) => s.followerNames);
  const avatarUri = useStore((s) => s.avatarUri);
  const userName = useStore((s) => s.currentUser?.name) ?? '';
  const phone = useStore((s) => s.currentUser?.phone) ?? '';
  const isLoggedIn = useStore((s) => s.currentUser != null);
  const phoneVerified = useStore((s) => s.currentUser?.phoneVerified ?? false);
  const restricted = useStore((s) => s.currentUser?.restricted ?? false);
  const restrictedDaysLeft = useStore((s) => s.currentUser?.restrictedDaysLeft ?? 0);
  const premium = useStore((s) => s.premium);
  const refreshMembership = useStore((s) => s.refreshMembership);
  // §11 — Profil'e her gelişte üyelik durumu sunucudan tazelenir (onay anında yansır)
  useFocusEffect(
    useCallback(() => {
      void refreshMembership();
    }, [refreshMembership]),
  );
  const logout = useStore((s) => s.logout);
  const role = useStore((s) => s.currentUser?.role);
  const isSeller = role === 'salon' || role === 'professional';
  const menu = MENU.filter((m) => (!m.sellerOnly || isSeller) && (!m.customerOnly || !isSeller));
  // §9/§10 — panel etiketi rol-duyarlı: uzman "Uzman paneli", salon "İşletme paneli"
  const menuLabel = (key: MessageKey): string =>
    key === 'profile.menu.panel' && role === 'professional'
      ? t('profile.menu.panel_expert')
      : t(key);

  const appearance: 'system' | ThemeMode = preference ?? 'system';
  const onAppearance = (value: 'system' | ThemeMode) =>
    setPreference(value === 'system' ? null : value);

  const onPress = (key: MessageKey) => {
    if (key === 'profile.menu.panel') router.push('/seller/reports');
    else if (key === 'profile.menu.passport') router.push('/profile/passport');
    else if (key === 'profile.menu.always') router.push('/always');
    else if (key === 'profile.menu.rewards') router.push('/rewards');
    else if (key === 'profile.menu.budget') router.push('/profile/budget');
    else if (key === 'profile.menu.earnings') router.push('/seller/earnings');
    else if (key === 'profile.menu.saved') router.push('/favorites');
    else if (key === 'profile.menu.messages') router.push('/messages');
    else if (key === 'profile.menu.referral') router.push('/referral');
    else if (key === 'profile.menu.safety') router.push('/profile/safe');
    else if (key === 'profile.menu.addresses') router.push('/profile/addresses');
    else if (key === 'profile.menu.privacy') router.push('/profile/privacy');
    else if (key === 'profile.menu.notifications') router.push('/profile/notifications');
    else if (key === 'profile.menu.help') router.push('/profile/help');
    else if (key === 'profile.menu.language') router.push('/language');
    else if (key === 'profile.menu.logout') {
      logout();
      router.replace('/');
    }
  };

  return (
    <Screen edges={[]}>
      {/* ── Yeşil gradient başlık + ortalı kimlik (VELOURA "Account") ── */}
      <LinearGradient
        colors={gradients.gold}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + space(1) }]}
      >
        <Text variant="bodyStrong" tone="onAccent" style={styles.headerTitle}>
          {t('nav.profile')}
        </Text>
        <View style={[styles.avatar, shadow.soft]}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
          ) : (
            <Text variant="h2" tone="ink">
              {userName.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <Pressable style={styles.nameRow} onPress={() => router.push('/profile/edit')}>
          <Text variant="title" tone="onAccent">
            {userName}
          </Text>
          <Ionicons name="create-outline" size={18} color={colors.onAccent} />
        </Pressable>
        <View style={styles.contactRow}>
          <Ionicons name="call-outline" size={13} color={colors.onAccent} />
          <Text variant="caption" tone="onAccent" style={styles.contactText}>
            {phone || t('nav.profile')}
          </Text>
        </View>
        <View style={styles.badgeRow}>
          {phoneVerified ? (
            <View style={styles.badge}>
              <Ionicons name="checkmark-circle" size={12} color={colors.success} />
              <Text variant="caption" style={styles.badgeText}>
                {t('profile.verify.done')}
              </Text>
            </View>
          ) : null}
          {/* Üyelik durumu — Standart / Premium */}
          <View style={styles.badge}>
            <Ionicons
              name={premium ? 'star' : 'person-circle-outline'}
              size={12}
              color={premium ? colors.gold : colors.accentFg}
            />
            <Text variant="caption" style={styles.badgeText}>
              {t(premium ? 'profile.premium_member' : 'profile.standard_member')}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Üste binen beyaz sheet ── */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* İstatistikler — sayıya tıkla → ilgili detay */}
        <View style={styles.stats}>
          <Stat
            value={`${completedCount}`}
            label={t('profile.stat.bookings')}
            onPress={() => router.push('/bookings')}
          />
          <View style={styles.statDivider} />
          <Stat
            value={`${points}`}
            label={t('profile.stat.points')}
            onPress={() => router.push('/rewards')}
          />
          <View style={styles.statDivider} />
          <Stat
            value={`${reviewCount}`}
            label={t('profile.stat.reviews')}
            onPress={() => router.push('/profile/reviews')}
          />
        </View>

        {/* ── W2W Takip Ettiklerim: sayıya tıkla → liste sayfası (silme orada) ── */}
        <View style={styles.followCard}>
          <Text variant="bodyStrong" tone="ink" style={styles.followTitle}>
            {t('profile.following_title')}
          </Text>
          <View style={styles.followStats}>
            <Pressable
              style={styles.followStat}
              onPress={() => router.push('/profile/follows?tab=followers')}
            >
              <Text variant="title" tone="ink">
                {followerNames.length}
              </Text>
              <Text variant="caption" tone="muted">
                {t('profile.followers')}
              </Text>
            </Pressable>
            <View style={styles.statDivider} />
            <Pressable
              style={styles.followStat}
              onPress={() => router.push('/profile/follows?tab=following')}
            >
              <Text variant="title" tone="ink">
                {following.length}
              </Text>
              <Text variant="caption" tone="muted">
                {t('profile.following')}
              </Text>
            </Pressable>
          </View>
        </View>

        {restricted ? (
          <View style={styles.banner}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <View style={styles.bannerText}>
              <Text variant="bodyStrong" tone="ink">
                {t('profile.restricted.title')}
              </Text>
              <Text variant="caption" tone="muted">
                {restrictedDaysLeft > 0
                  ? t('profile.restricted.days').replace('{n}', String(restrictedDaysLeft))
                  : t('profile.restricted.desc')}
              </Text>
            </View>
          </View>
        ) : null}

        {isLoggedIn && !phoneVerified ? (
          <Pressable style={styles.verifyRow} onPress={() => router.push('/auth/verify')}>
            <View style={styles.verifyIcon}>
              <Ionicons name="shield-checkmark" size={18} color={colors.onAccent} />
            </View>
            <View style={styles.bannerText}>
              <Text variant="bodyStrong" tone="ink">
                {t('profile.verify.cta')}
              </Text>
              <Text variant="caption" tone="muted">
                {t('profile.verify.desc')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ) : null}

        {/* Görünüm */}
        <View style={styles.appearance}>
          <View style={styles.appearanceHead}>
            <Ionicons name="contrast-outline" size={18} color={colors.inkSoft} />
            <Text variant="bodyStrong" tone="ink" style={styles.flex}>
              {t('profile.appearance')}
            </Text>
          </View>
          <Segmented
            value={appearance}
            onChange={onAppearance}
            options={[
              { value: 'system', label: t('profile.appearance.system') },
              { value: 'light', label: t('profile.appearance.light') },
              { value: 'dark', label: t('profile.appearance.dark') },
            ]}
          />
        </View>

        {/* Menü — sade ikon + etiket + chevron + ince ayraç */}
        <View style={styles.menuCard}>
          {menu
            .filter((m) => !m.danger)
            .map((m, i, arr) => (
              <Pressable
                key={m.key}
                style={[styles.row, i < arr.length - 1 && styles.rowBorder]}
                onPress={() => onPress(m.key)}
              >
                <Ionicons name={m.icon} size={22} color={colors.ink} style={styles.rowIcon} />
                <Text variant="bodyStrong" tone="ink" style={styles.flex}>
                  {menuLabel(m.key)}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
          {menu
            .filter((m) => m.danger)
            .map((m) => (
              <Pressable
                key={m.key}
                style={[styles.row, styles.rowBorder]}
                onPress={() => onPress(m.key)}
              >
                <Ionicons name={m.icon} size={22} color={colors.danger} style={styles.rowIcon} />
                <Text variant="bodyStrong" style={[styles.flex, { color: colors.danger }]}>
                  {t(m.key)}
                </Text>
              </Pressable>
            ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Stat({ value, label, onPress }: { value: string; label: string; onPress?: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable style={styles.stat} onPress={onPress}>
      <Text variant="title" tone="ink">
        {value}
      </Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    header: {
      alignItems: 'center',
      paddingHorizontal: space(3),
      paddingBottom: space(5),
    },
    headerTitle: { marginBottom: space(2) },
    avatar: {
      width: 92,
      height: 92,
      borderRadius: 46,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(1.5),
      overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    contactRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
    contactText: { opacity: 0.9 },
    badgeRow: { flexDirection: 'row', gap: space(1), marginTop: space(1.25) },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.surface,
      paddingHorizontal: space(1.25),
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    badgeText: { color: colors.ink, fontWeight: '600' },

    // Üste binen beyaz sheet
    sheet: {
      flex: 1,
      backgroundColor: colors.bg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      marginTop: -space(3),
    },
    content: { padding: space(3), paddingTop: space(3), paddingBottom: space(13) },

    stats: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingVertical: space(2),
      marginBottom: space(2),
    },
    stat: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, height: 30, backgroundColor: colors.line },

    // W2W Takip Ettiklerim kartı
    followCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      marginBottom: space(2),
      gap: space(1.5),
    },
    followTitle: {},
    followStats: { flexDirection: 'row', alignItems: 'center' },
    followStat: { flex: 1, alignItems: 'center' },

    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.dangerSoft,
      borderRadius: radius.lg,
      padding: space(1.75),
      marginBottom: space(2),
    },
    verifyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
      marginBottom: space(2),
    },
    verifyIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bannerText: { flex: 1, gap: 2 },

    appearance: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      marginBottom: space(2),
      gap: space(1.5),
    },
    appearanceHead: { flexDirection: 'row', alignItems: 'center', gap: space(1) },

    menuCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingHorizontal: space(2),
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      paddingVertical: space(1.9),
    },
    rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
    rowIcon: { width: 26, textAlign: 'center' },
    flex: { flex: 1 },
  });
