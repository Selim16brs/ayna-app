import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { QUICK_ADD, type PersonalTone, type QuickAddKind, quickAddMeta } from '../../src/data';
import { useStore } from '../../src/store';
import { useLocale } from '../../src/locale';
import type { MessageKey } from '@ayna/i18n';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Card, Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;
type FormMode = 'log' | 'routine' | 'moment';

const KNOWN_KINDS: QuickAddKind[] = ['doctor', 'gym', 'personal', 'reminder'];

export default function AddEntryScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { kind, mode } = useLocalSearchParams<{ kind?: string; mode?: string }>();

  const formMode: FormMode = mode === 'routine' ? 'routine' : mode === 'moment' ? 'moment' : 'log';
  const titleKey: MessageKey =
    formMode === 'routine'
      ? 'care.add.routine_title'
      : formMode === 'moment'
        ? 'care.add.moment_title'
        : 'care.add.log_title';

  return (
    <Screen edges={['top', 'bottom']}>
      <StackHeader title={t(titleKey)} />
      {formMode === 'log' ? (
        <LogForm initialKind={kind} onDone={() => router.back()} />
      ) : formMode === 'routine' ? (
        <RoutineForm onDone={() => router.back()} />
      ) : (
        <MomentForm onDone={() => router.back()} />
      )}
    </Screen>
  );
}

// ── Kişisel kayıt ─────────────────────────────────────────────────────────
function LogForm({ initialKind, onDone }: { initialKind?: string; onDone: () => void }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const addPersonalLog = useStore((s) => s.addPersonalLog);

  const startKind: QuickAddKind = KNOWN_KINDS.includes(initialKind as QuickAddKind)
    ? (initialKind as QuickAddKind)
    : 'personal';
  const [selKind, setSelKind] = useState<QuickAddKind>(startKind);
  const [title, setTitle] = useState('');
  const [dateLabel, setDateLabel] = useState('');
  const [note, setNote] = useState('');

  const canSave = title.trim().length > 0;

  const save = () => {
    const meta = quickAddMeta(selKind);
    addPersonalLog({
      title: title.trim(),
      dateLabel: dateLabel.trim(),
      tone: meta.tone,
      icon: meta.icon,
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    onDone();
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <Field label={t('care.add.what')}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('care.add.what_ph')}
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </Field>
          <Field label={t('care.add.date')}>
            <TextInput
              value={dateLabel}
              onChangeText={setDateLabel}
              placeholder={t('care.add.date_ph')}
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </Field>
          <Field label={t('care.add.type')} last>
            <View style={styles.chips}>
              {QUICK_ADD.map((q) => {
                const active = q.id === selKind;
                return (
                  <Pressable
                    key={q.id}
                    onPress={() => setSelKind(q.id)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Ionicons
                      name={q.icon as IoniconName}
                      size={15}
                      color={active ? colors.onColor : colors.inkSoft}
                    />
                    <Text variant="caption" tone={active ? 'onColor' : 'inkSoft'}>
                      {t(q.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>
        </Card>

        <Card style={styles.cardGap}>
          <Field label={t('care.add.note')} last>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('care.add.note_ph')}
              placeholderTextColor={colors.muted}
              multiline
              style={styles.textarea}
            />
          </Field>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('common.save')}
          variant={canSave ? 'primary' : 'secondary'}
          disabled={!canSave}
          onPress={save}
        />
      </View>
    </>
  );
}

// ── Bakım hatırlatması ────────────────────────────────────────────────────
function RoutineForm({ onDone }: { onDone: () => void }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const addRoutine = useStore((s) => s.addRoutine);
  const [name, setName] = useState('');
  const [days, setDays] = useState('');

  const canSave = name.trim().length > 0 && Number(days) > 0;

  const save = () => {
    addRoutine({ name: name.trim(), dueDays: Number(days) });
    onDone();
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <Field label={t('care.add.what')}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('care.add.routine_name_ph')}
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </Field>
          <Field label={t('care.add.in_days')} last>
            <TextInput
              value={days}
              onChangeText={(v) => setDays(v.replace(/[^0-9]/g, ''))}
              placeholder={t('care.add.in_days_ph')}
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              style={styles.input}
            />
          </Field>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('common.save')}
          variant={canSave ? 'primary' : 'secondary'}
          disabled={!canSave}
          onPress={save}
        />
      </View>
    </>
  );
}

// ── Özel gün ──────────────────────────────────────────────────────────────
function MomentForm({ onDone }: { onDone: () => void }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const addMoment = useStore((s) => s.addMoment);
  const [title, setTitle] = useState('');
  const [dateLabel, setDateLabel] = useState('');
  const [days, setDays] = useState('');

  const canSave = title.trim().length > 0 && Number(days) > 0;

  const save = () => {
    addMoment({ title: title.trim(), dateLabel: dateLabel.trim(), daysLeft: Number(days) });
    onDone();
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <Field label={t('care.add.what')}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('care.add.moment_name_ph')}
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </Field>
          <Field label={t('care.add.date')}>
            <TextInput
              value={dateLabel}
              onChangeText={setDateLabel}
              placeholder={t('care.add.date_ph')}
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </Field>
          <Field label={t('care.add.in_days')} last>
            <TextInput
              value={days}
              onChangeText={(v) => setDays(v.replace(/[^0-9]/g, ''))}
              placeholder={t('care.add.in_days_ph')}
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              style={styles.input}
            />
          </Field>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('common.save')}
          variant={canSave ? 'primary' : 'secondary'}
          disabled={!canSave}
          onPress={save}
        />
      </View>
    </>
  );
}

function Field({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.field, !last && styles.fieldGap]}>
      <Text variant="label" tone="inkSoft" style={styles.fieldLabel}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { padding: space(3), paddingBottom: space(4) },
    cardGap: { marginTop: space(2) },
    field: {},
    fieldGap: { marginBottom: space(2) },
    fieldLabel: { marginBottom: space(1) },
    input: {
      backgroundColor: colors.bgSunken,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.md,
      paddingHorizontal: space(1.75),
      height: 52,
      fontSize: 16,
      fontWeight: '500',
      color: colors.ink,
    },
    textarea: {
      backgroundColor: colors.bgSunken,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.md,
      padding: space(1.75),
      minHeight: 96,
      textAlignVertical: 'top',
      fontSize: 15,
      fontWeight: '400',
      color: colors.ink,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: space(1.5),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.bgSunken,
      borderWidth: 1,
      borderColor: colors.line,
    },
    chipActive: { backgroundColor: colors.rose, borderColor: colors.rose },
    footer: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      paddingBottom: TAB_BAR_CLEARANCE,
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
  });
