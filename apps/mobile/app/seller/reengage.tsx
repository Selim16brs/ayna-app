import { Ionicons } from '@expo/vector-icons';
import { Alert, Image, ScrollView, StyleSheet, View } from 'react-native';
import { SELLER_PAST_CLIENTS, reengageTemplate } from '../../src/data';
import { fillParams, useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { findServiceWithCategory, tri } from '../../src/taxonomy';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, PressableScale, Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

// §10/§4 — GERİ ÇAĞIRMA: periyodu dolan memnun müşterilere sıcak hatırlatma gönderme ekranı.
const DAY = 24 * 60 * 60_000;

export default function ReengageScreen() {
  const { t, locale } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const expertName = useStore((s) => s.currentUser?.name) ?? 'Uzman';
  const reengagedIds = useStore((s) => s.reengagedIds);
  const sendReengage = useStore((s) => s.sendReengage);

  const now = Date.now();
  const rows = SELLER_PAST_CLIENTS.map((c) => {
    const found = findServiceWithCategory(c.serviceId);
    const period = found?.service.periodDays ?? 30;
    const label = found ? tri(found.service.label, locale) : c.serviceId;
    const categoryId = found?.categoryId ?? '';
    const daysSince = Math.round((now - c.lastVisitMs) / DAY);
    const over = daysSince - period; // >=0 geçti, <0 kaldı
    const tpl = reengageTemplate(categoryId);
    const preview = fillParams(t(tpl.bodyKey), { expert: expertName, service: label });
    return { c, categoryId, label, period, daysSince, over, preview };
  }).sort((a, b) => b.over - a.over);

  const due = rows.filter((r) => r.over >= 0);
  const soon = rows.filter((r) => r.over < 0);

  const onSend = (r: (typeof rows)[number]) => {
    sendReengage({
      clientId: r.c.id,
      customerName: r.c.name,
      serviceLabel: r.label,
      categoryId: r.categoryId,
      expertName,
    });
    Alert.alert(t('reengage.toast_t'), fillParams(t('reengage.toast_b'), { name: r.c.name }));
  };

  const renderCard = (r: (typeof rows)[number]) => {
    const sent = reengagedIds.includes(r.c.id);
    const isDue = r.over >= 0;
    return (
      <View key={r.c.id} style={[styles.card, styles.shadowSoft]}>
        <View style={styles.head}>
          {r.c.image ? <Image source={{ uri: r.c.image }} style={styles.avatar} /> : null}
          <View style={styles.flex}>
            <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
              {r.c.name}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {r.label}
            </Text>
          </View>
          <View style={[styles.chip, { backgroundColor: isDue ? colors.accentSoft : colors.surfaceMuted }]}>
            <Ionicons
              name={isDue ? 'alarm' : 'hourglass-outline'}
              size={11}
              color={isDue ? colors.accentFg : colors.muted}
            />
            <Text variant="caption" tone={isDue ? 'accentFg' : 'muted'} style={styles.chipText}>
              {isDue
                ? fillParams(t('reengage.overdue'), { n: r.over })
                : fillParams(t('reengage.soon_left'), { n: -r.over })}
            </Text>
          </View>
        </View>

        <View style={styles.meta}>
          <Ionicons name="time-outline" size={12} color={colors.muted} />
          <Text variant="caption" tone="muted">
            {fillParams(t('reengage.meta'), { last: r.daysSince, period: r.period })}
          </Text>
        </View>

        {/* Gidecek sıcak mesaj önizlemesi */}
        <View style={styles.preview}>
          <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.accentFg} />
          <Text variant="caption" tone="inkSoft" style={styles.flex}>
            {r.preview}
          </Text>
        </View>

        {sent ? (
          <View style={styles.sentRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text variant="bodyStrong" tone="ink">
              {t('reengage.sent')}
            </Text>
          </View>
        ) : (
          <View style={styles.cta}>
            <Button label={t('reengage.cta')} variant="primary" onPress={() => onSend(r)} />
          </View>
        )}
      </View>
    );
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('reengage.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="caption" tone="muted" style={styles.sub}>
          {t('reengage.sub')}
        </Text>
        <View style={styles.info}>
          <Ionicons name="lock-closed" size={13} color={colors.muted} />
          <Text variant="caption" tone="muted" style={styles.flex}>
            {t('reengage.info')}
          </Text>
        </View>

        {rows.length === 0 ? (
          <View style={[styles.card, styles.shadowSoft]}>
            <Text variant="caption" tone="muted">
              {t('reengage.empty')}
            </Text>
          </View>
        ) : null}

        {due.length > 0 ? (
          <>
            <Text variant="label" tone="accentFg" style={styles.section}>
              {t('reengage.due')}
            </Text>
            {due.map(renderCard)}
          </>
        ) : null}

        {soon.length > 0 ? (
          <>
            <Text variant="label" tone="accentFg" style={styles.section}>
              {t('reengage.soon')}
            </Text>
            {soon.map(renderCard)}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingTop: space(1.5), paddingBottom: TAB_BAR_CLEARANCE + space(2), gap: space(1.25) },
    flex: { flex: 1 },
    shadowSoft: {
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    sub: { marginBottom: space(0.5) },
    info: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: space(1.5),
      marginBottom: space(1),
    },
    section: { marginTop: space(1.5), marginBottom: space(0.25) },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
      gap: space(1.25),
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: space(1.25) },
    avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surfaceMuted },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: space(1),
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    chipText: { fontWeight: '800', fontSize: 11 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: space(0.75) },
    preview: {
      flexDirection: 'row',
      gap: space(1),
      backgroundColor: colors.accentSoft,
      borderRadius: radius.md,
      padding: space(1.5),
    },
    sentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space(0.75), paddingVertical: space(0.5) },
    cta: { marginTop: space(0.25) },
  });
