import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { fillParams, useLocale } from '../src/locale';
import {
  filterAlwaysAccepted,
  filterAlwaysIncoming,
  selectSellerView,
  useStore,
} from '../src/store';
import { findService, tri } from '../src/taxonomy';
import { type ColorTokens, radius, space } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import {
  Button,
  PressableScale,
  Screen,
  Segmented,
  StackHeader,
  TAB_BAR_CLEARANCE,
  Text,
} from '../src/ui';

// §11 — ALWAYS: karşılıklı sadık-müşteri bağı. Role'a göre uyarlanır:
// uzman/salon (Platinum) → portföy + toplu bildirim; müşteri → bağlar + gelen istekleri kabul.
export default function AlwaysScreen() {
  const { t, locale } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();

  const isProvider = useStore(selectSellerView);
  const platinum = useStore((s) => s.platinum);
  const bonds = useStore((s) => s.alwaysBonds);
  const me = useStore((s) => s.currentUser?.name) ?? '';
  const accepted = useMemo(() => filterAlwaysAccepted(bonds, me, isProvider), [bonds, me, isProvider]);
  const incoming = useMemo(() => filterAlwaysIncoming(bonds, me, isProvider), [bonds, me, isProvider]);
  const acceptAlways = useStore((s) => s.acceptAlways);
  const declineAlways = useStore((s) => s.declineAlways);
  const removeAlways = useStore((s) => s.removeAlways);

  const [tab, setTab] = useState<'list' | 'requests'>('list');

  // §11 — Always portföyü Platinum'a özel (yalnız uzman/salon tarafında kapı)
  if (isProvider && !platinum) {
    return (
      <Screen edges={[]}>
        <StackHeader title={t('always.title')} />
        <View style={styles.lockWrap}>
          <View style={styles.lockIcon}>
            <Ionicons name="infinite" size={32} color={colors.accentFg} />
          </View>
          <Text variant="h2" tone="ink" style={styles.center}>
            {t('always.platinum_title')}
          </Text>
          <Text variant="body" tone="muted" style={styles.lockBody}>
            {t('always.platinum_body')}
          </Text>
          <View style={styles.lockCta}>
            <Button label={t('always.platinum_cta')} variant="primary" onPress={() => router.push('/seller/premium')} />
          </View>
        </View>
      </Screen>
    );
  }

  const serviceLabel = (id?: string) => {
    if (!id) return null;
    const s = findService(id);
    return s ? tri(s.label, locale) : null;
  };

  const nameOf = (b: { providerName: string; customerName: string }) =>
    isProvider ? b.customerName : b.providerName;
  const imgOf = (b: { providerImage?: string; customerImage?: string }) =>
    isProvider ? b.customerImage : b.providerImage;

  return (
    <Screen edges={[]}>
      <StackHeader title={t('always.title')} />
      <View style={styles.segWrap}>
        <Segmented
          options={[
            { value: 'list', label: `${t('always.tab_list')}${accepted.length ? ` (${accepted.length})` : ''}` },
            { value: 'requests', label: `${t('always.tab_requests')}${incoming.length ? ` (${incoming.length})` : ''}` },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="caption" tone="muted" style={styles.sub}>
          {isProvider ? t('always.sub') : t('always.cust_sub')}
        </Text>

        {tab === 'list' ? (
          accepted.length === 0 ? (
            <View style={[styles.card, shadow.soft]}>
              <Text variant="caption" tone="muted">
                {t('always.empty_list')}
              </Text>
            </View>
          ) : (
            accepted.map((b) => {
              const svc = serviceLabel(b.lastServiceId);
              return (
                <View key={b.id} style={[styles.row, shadow.soft]}>
                  {imgOf(b) ? <Image source={{ uri: imgOf(b) }} style={styles.avatar} /> : <View style={styles.avatar} />}
                  <View style={styles.flex}>
                    <View style={styles.nameRow}>
                      <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                        {nameOf(b)}
                      </Text>
                      <View style={styles.bondTag}>
                        <Ionicons name="infinite" size={9} color={colors.accentFg} />
                        <Text variant="caption" tone="accentFg" style={styles.bondTagText}>
                          {t('always.brand')}
                        </Text>
                      </View>
                    </View>
                    {svc ? (
                      <Text variant="caption" tone="muted" numberOfLines={1}>
                        {fillParams(t('always.last_service'), { service: svc })}
                      </Text>
                    ) : null}
                  </View>
                  <PressableScale onPress={() => removeAlways(b.id)} hitSlop={8}>
                    <Ionicons name="close" size={18} color={colors.muted} />
                  </PressableScale>
                </View>
              );
            })
          )
        ) : incoming.length === 0 ? (
          <View style={[styles.card, shadow.soft]}>
            <Text variant="caption" tone="muted">
              {t('always.empty_requests')}
            </Text>
          </View>
        ) : (
          incoming.map((b) => (
            <View key={b.id} style={[styles.card, shadow.soft]}>
              <View style={styles.reqHead}>
                {imgOf(b) ? <Image source={{ uri: imgOf(b) }} style={styles.avatar} /> : <View style={styles.avatar} />}
                <View style={styles.flex}>
                  <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                    {nameOf(b)}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={2}>
                    {fillParams(t('notif.always_request_b'), { name: nameOf(b) })}
                  </Text>
                </View>
              </View>
              <View style={styles.reqActions}>
                <View style={styles.flex}>
                  <Button label={t('always.accept')} variant="primary" onPress={() => acceptAlways(b.id)} />
                </View>
                <View style={styles.flex}>
                  <Button label={t('always.decline')} variant="secondary" onPress={() => declineAlways(b.id)} />
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* §11 — Platinum uzman/salon: toplu bildirim */}
      {isProvider && platinum ? (
        <View style={styles.footer}>
          <Button
            label={t('always.broadcast_cta')}
            variant="primary"
            onPress={() => router.push('/always-broadcast')}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    segWrap: { paddingHorizontal: space(3), paddingTop: space(1.5), paddingBottom: space(1) },
    content: { paddingHorizontal: space(3), paddingBottom: TAB_BAR_CLEARANCE + space(2), gap: space(1.25) },
    flex: { flex: 1 },
    sub: { marginBottom: space(0.5) },
    center: { textAlign: 'center' },
    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(1.75), gap: space(1.25) },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.5),
    },
    avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surfaceMuted },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: space(0.75) },
    bondTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: space(0.75),
      paddingVertical: 1,
      borderRadius: radius.pill,
    },
    bondTagText: { fontWeight: '800', fontSize: 10 },
    reqHead: { flexDirection: 'row', alignItems: 'center', gap: space(1.25) },
    reqActions: { flexDirection: 'row', gap: space(1) },
    // Platinum kilit
    lockWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space(4), gap: space(1.5) },
    lockIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
    lockBody: { textAlign: 'center', lineHeight: 22 },
    lockCta: { alignSelf: 'stretch', marginTop: space(1) },
    footer: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      paddingBottom: TAB_BAR_CLEARANCE, // §ui — global tab bar'ın (88px) üstünde kalsın
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
      backgroundColor: colors.bg,
    },
  });
