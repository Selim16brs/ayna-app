import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { api } from '../../src/api';
import type { Appointment } from '../../src/data';
import { almatyDayStart } from '../../src/datetime';
import { useLocale } from '../../src/locale';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, Segmented, StackHeader, Text } from '../../src/ui';

type Kind = 'normal' | 'group' | 'express';
let seq = 0;

export default function OfflineBookingScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [customer, setCustomer] = useState('');
  const [service, setService] = useState('');
  const [uzman, setUzman] = useState('');
  const [time, setTime] = useState('15:00');
  const [dur, setDur] = useState('60');
  const [price, setPrice] = useState('');
  const [kind, setKind] = useState<Kind>('normal');
  const [groupSize, setGroupSize] = useState('3');
  const [busy, setBusy] = useState(false);

  const canSave = customer.trim().length > 1 && service.trim().length > 1 && !busy;

  async function save() {
    if (!canSave) return;
    setBusy(true);
    // HH:MM (Almatı, bugün) → UTC startMs; geçersizse öğlen 12:00
    const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
    const h = m ? Math.min(23, Number(m[1])) : 12;
    const min = m ? Math.min(59, Number(m[2])) : 0;
    const startMs = almatyDayStart(Date.now(), 0) + h * 3_600_000 + min * 60_000;
    const booking: Appointment = {
      id: `off-${Date.now()}-${seq++}`,
      source: 'direct',
      service: service.trim(),
      proId: '',
      proName: 'Salonum',
      proImage: '',
      uzmanName: uzman.trim() || undefined,
      customerName: customer.trim(),
      startMs,
      durationMin: Number(dur.replace(/[^0-9]/g, '')) || 60,
      price: Number(price.replace(/[^0-9]/g, '')) || 0,
      status: 'confirmed',
      bookingKind: kind,
      ...(kind === 'group' ? { groupSize: Number(groupSize) || 2 } : {}),
    };
    try {
      await api.createBooking(booking);
      Alert.alert(t('offline.saved'));
      router.back();
    } catch {
      Alert.alert(t('offline.title'), t('common.error') as string);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={[]}>
      <StackHeader title={t('offline.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Field label={t('offline.customer')}>
          <TextInput
            style={styles.input}
            value={customer}
            onChangeText={setCustomer}
            placeholder="Ayşe K."
            placeholderTextColor={colors.muted}
          />
        </Field>
        <Field label={t('offline.service')}>
          <TextInput
            style={styles.input}
            value={service}
            onChangeText={setService}
            placeholder="Saç kesimi & fön"
            placeholderTextColor={colors.muted}
          />
        </Field>
        <Field label={t('offline.uzman')}>
          <TextInput
            style={styles.input}
            value={uzman}
            onChangeText={setUzman}
            placeholder="Madina"
            placeholderTextColor={colors.muted}
          />
        </Field>
        <View style={styles.rowFields}>
          <Field label={t('offline.time')} flex>
            <TextInput
              style={styles.input}
              value={time}
              onChangeText={setTime}
              placeholder="15:00"
              placeholderTextColor={colors.muted}
              keyboardType="numbers-and-punctuation"
            />
          </Field>
          <Field label={t('offline.dur')} flex>
            <TextInput
              style={styles.input}
              value={dur}
              onChangeText={(v) => setDur(v.replace(/[^0-9]/g, ''))}
              placeholder="60"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
            />
          </Field>
          <Field label={t('offline.price')} flex>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={(v) => setPrice(v.replace(/[^0-9]/g, ''))}
              placeholder="9000"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
            />
          </Field>
        </View>

        {/* Faz 3 — randevu türü */}
        <View style={styles.field}>
          <Text variant="label" tone="rose" style={styles.label}>
            {t('offline.kind')}
          </Text>
          <Segmented
            options={[
              { value: 'normal', label: t('offline.kind.normal') },
              { value: 'group', label: t('offline.kind.group') },
              { value: 'express', label: t('offline.kind.express') },
            ]}
            value={kind}
            onChange={setKind}
          />
        </View>
        {kind === 'group' ? (
          <Field label={t('offline.group_size')}>
            <TextInput
              style={styles.input}
              value={groupSize}
              onChangeText={(v) => setGroupSize(v.replace(/[^0-9]/g, ''))}
              placeholder="3"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
            />
          </Field>
        ) : null}

        <View style={styles.note}>
          <Text variant="caption" tone="muted">
            {t('offline.note')}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button label={busy ? '…' : t('offline.save')} onPress={save} disabled={!canSave} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Field({
  label,
  children,
  flex,
}: {
  label: string;
  children: React.ReactNode;
  flex?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.field, flex && styles.fieldFlex]}>
      <Text variant="label" tone="rose" style={styles.label}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4), gap: space(1.5) },
    field: { gap: space(0.75) },
    fieldFlex: { flex: 1 },
    label: {},
    rowFields: { flexDirection: 'row', gap: space(1.5) },
    input: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: space(1.75),
      paddingVertical: space(1.5),
      color: colors.ink,
      fontSize: 15,
    },
    note: { paddingHorizontal: space(0.5), marginTop: space(0.5) },
    actions: { marginTop: space(2) },
  });
