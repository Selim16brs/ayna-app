import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { api, type SafetySession, type TrustedContact } from '../../src/api';
import { fillParams, useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, SectionHeader, StackHeader, TAB_BAR_CLEARANCE, Text, TextInput } from '../../src/ui';

// EK Z.2 — Randevu güvenlik katmanı: güvenilen kişiler + SOS + canlı konum oturumu.
// Konum paylaşımı VARSAYILAN KAPALI; kullanıcı açıkça başlatır (safety.share.default_off).
export default function SafeScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const token = useStore((s) => s.token);

  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [session, setSession] = useState<SafetySession | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', relation: '' });
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const active = session?.status === 'active' || session?.status === 'sos';

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [c, s] = await Promise.all([api.safetyContacts(token), api.safetySession(token)]);
      setContacts(c);
      setSession(s);
    } catch {
      /* yut */
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  // Ekrandan çıkınca konum izlemeyi durdur (arka planda çalışmaz)
  useEffect(() => {
    return () => {
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, []);

  const startWatching = useCallback(
    async (sessionId: string) => {
      watchRef.current?.remove();
      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 25, timeInterval: 15000 },
        (pos) => {
          if (!token) return;
          void api
            .sendSafetyLocation(token, sessionId, pos.coords.latitude, pos.coords.longitude)
            .catch(() => {});
        },
      );
    },
    [token],
  );

  const toggleMode = async (on: boolean) => {
    if (!token || busy) return;
    if (on) {
      if (contacts.length === 0) {
        Alert.alert(t('safe.title'), t('safe.need_contact'));
        return;
      }
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(t('safe.title'), t('safe.perm_denied'));
        return;
      }
      setBusy(true);
      try {
        const s = await api.startSafetySession(token);
        setSession(s);
        await startWatching(s.id);
      } finally {
        setBusy(false);
      }
    } else {
      setBusy(true);
      try {
        watchRef.current?.remove();
        watchRef.current = null;
        if (session) await api.safetyCheckIn(token, session.id);
        setSession(null);
      } finally {
        setBusy(false);
      }
    }
  };

  const onSos = async () => {
    if (!token) return;
    try {
      const res = await api.safetySos(token, session?.id);
      setSession(res);
      // Anlık konumu da iliştir (izin varsa)
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await api.sendSafetyLocation(token, res.id, pos.coords.latitude, pos.coords.longitude).catch(() => {});
      }
      Alert.alert(t('safe.sos_sent'), fillParams(t('safe.sos_sent_sub'), { n: res.notifiedContacts }));
    } catch {
      Alert.alert(t('safe.sos'), t('safe.sos_sub'));
    }
  };

  const saveContact = async () => {
    if (!token || !form.name.trim() || !form.phone.trim()) return;
    setBusy(true);
    try {
      const c = await api.addTrustedContact(token, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        relation: form.relation.trim() || undefined,
      });
      setContacts((prev) => [...prev, c]);
      setForm({ name: '', phone: '', relation: '' });
      setAdding(false);
    } finally {
      setBusy(false);
    }
  };

  const removeContact = (c: TrustedContact) => {
    if (!token) return;
    Alert.alert(c.name, t('safe.remove'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('safe.remove'),
        style: 'destructive',
        onPress: async () => {
          await api.removeTrustedContact(token, c.id).catch(() => {});
          setContacts((prev) => prev.filter((x) => x.id !== c.id));
        },
      },
    ]);
  };

  return (
    <Screen edges={['bottom']}>
      <StackHeader title={t('safe.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="body" tone="inkSoft" style={styles.subtitle}>
          {t('safe.subtitle')}
        </Text>

        {/* SOS — acil eylem */}
        <Pressable onPress={onSos} style={[styles.sos, shadow.card]}>
          <View style={styles.sosIcon}>
            <Ionicons name="alert-circle" size={26} color={colors.onColor} />
          </View>
          <View style={styles.sosText}>
            <Text variant="h2" tone="onColor">
              {t('safe.sos')}
            </Text>
            <Text variant="caption" tone="onColor" style={styles.dim}>
              {t('safe.sos_sub')}
            </Text>
          </View>
        </Pressable>

        {/* Güvenli mod (canlı konum) — varsayılan kapalı */}
        <View style={[styles.group, styles.groupGap, shadow.soft]}>
          <View style={styles.row}>
            <View style={[styles.icon, { backgroundColor: active ? colors.accent : colors.accentSoft }]}>
              <Ionicons name="location-outline" size={18} color={active ? colors.onAccent : colors.ink} />
            </View>
            <View style={styles.rowLabel}>
              <Text variant="bodyStrong" tone="ink">
                {t('safe.location')}
              </Text>
              <Text variant="caption" tone={active ? 'accentFg' : 'muted'}>
                {active ? t('safe.mode_on') : t('safe.mode_off')}
              </Text>
            </View>
            <Switch
              value={!!active}
              onValueChange={toggleMode}
              disabled={busy}
              trackColor={{ true: colors.accent, false: colors.surfaceMuted }}
            />
          </View>
        </View>
        <Text variant="caption" tone="muted" style={styles.hint}>
          {t('safe.mode_hint')}
        </Text>
        {active ? (
          <View style={styles.checkin}>
            <Button variant="ghost" label={t('safe.checkin')} onPress={() => toggleMode(false)} />
          </View>
        ) : null}

        {/* Güvendiğim kişiler */}
        <SectionHeader title={t('safe.contacts')} />
        <Text variant="caption" tone="muted" style={styles.sectionSub}>
          {t('safe.contacts_sub')}
        </Text>
        <View style={[styles.group, shadow.soft]}>
          {contacts.length === 0 && !adding ? (
            <View style={styles.row}>
              <Text variant="caption" tone="muted">
                {t('safe.no_contacts')}
              </Text>
            </View>
          ) : null}
          {contacts.map((c, i) => (
            <View key={c.id} style={[styles.row, (i < contacts.length - 1 || adding) && styles.rowBorder]}>
              <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="person-outline" size={18} color={colors.ink} />
              </View>
              <Text variant="bodyStrong" tone="ink" style={styles.rowLabel}>
                {c.name}
                {c.relation ? ` · ${c.relation}` : ''}
              </Text>
              <Pressable onPress={() => removeContact(c)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          ))}

          {adding ? (
            <View style={styles.form}>
              <TextInput
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
                placeholder={t('safe.contact_name')}
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
              <TextInput
                value={form.phone}
                onChangeText={(v) => setForm({ ...form, phone: v })}
                placeholder={t('safe.contact_phone')}
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                style={styles.input}
              />
              <TextInput
                value={form.relation}
                onChangeText={(v) => setForm({ ...form, relation: v })}
                placeholder={t('safe.contact_relation')}
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
              <Button
                label={t('safe.save')}
                onPress={saveContact}
                disabled={busy || !form.name.trim() || !form.phone.trim()}
              />
            </View>
          ) : (
            <Pressable onPress={() => setAdding(true)} style={[styles.row, contacts.length > 0 && styles.rowBorder]}>
              <View style={[styles.icon, { backgroundColor: colors.surfaceMuted }]}>
                <Ionicons name="add" size={20} color={colors.inkSoft} />
              </View>
              <Text variant="bodyStrong" tone="inkSoft" style={styles.rowLabel}>
                {t('safe.add_contact')}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingTop: space(1), paddingBottom: TAB_BAR_CLEARANCE },
    subtitle: { marginBottom: space(2.5) },
    sos: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.75),
      backgroundColor: colors.danger,
      borderRadius: radius.xl,
      padding: space(2.5),
    },
    sosIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sosText: { flex: 1, gap: 2 },
    dim: { opacity: 0.92 },
    hint: { marginTop: space(1), marginBottom: space(1), paddingHorizontal: space(1) },
    checkin: { marginBottom: space(2) },
    sectionSub: { marginTop: -space(1), marginBottom: space(1.75), paddingHorizontal: space(3) },
    group: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
    groupGap: { marginTop: space(2) },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      paddingHorizontal: space(2),
      paddingVertical: space(1.75),
    },
    rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surfaceMuted },
    icon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    rowLabel: { flex: 1, gap: 2 },
    form: { padding: space(2), gap: space(1.5) },
    input: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingHorizontal: space(1.75),
      paddingVertical: space(1.25),
      color: colors.ink,
      fontSize: 15,
    },
  });
