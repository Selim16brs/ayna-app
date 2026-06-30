import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { api } from '../../src/api';
import type { Appointment } from '../../src/data';
import { useLocale } from '../../src/locale';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text } from '../../src/ui';

let seq = 0;

export default function OfflineBookingScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [customer, setCustomer] = useState('');
  const [service, setService] = useState('');
  const [uzman, setUzman] = useState('');
  const [date, setDate] = useState('Bugün');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);

  const canSave = customer.trim().length > 1 && service.trim().length > 1 && !busy;

  async function save() {
    if (!canSave) return;
    setBusy(true);
    const booking: Appointment = {
      id: `off-${Date.now()}-${seq++}`,
      source: 'direct',
      service: service.trim(),
      proId: '',
      proName: 'Salonum',
      proImage: '',
      uzmanName: uzman.trim() || undefined,
      customerName: customer.trim(),
      dateLabel: date.trim() || 'Bugün',
      inDays: 0,
      price: Number(price.replace(/[^0-9]/g, '')) || 0,
      status: 'confirmed',
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
    <Screen edges={['top']}>
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
          <Field label={t('offline.date')} flex>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="Bugün 15:00"
              placeholderTextColor={colors.muted}
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
