import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  CATEGORIES,
  QUICK_ADD,
  categoryLabelKey,
  type QuickAddKind,
  quickAddMeta,
} from '../../src/data';
import { servicesOf, tri } from '../../src/taxonomy';
import { useStore } from '../../src/store';
import { useLocale } from '../../src/locale';
import type { MessageKey } from '@ayna/i18n';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import {
  Button,
  DateField,
  formatTrDate,
  Screen,
  StackHeader,
  TAB_BAR_CLEARANCE,
  Text,
  TextInput,
} from '../../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;
type FormMode = 'log' | 'routine' | 'moment';

const KNOWN_KINDS: QuickAddKind[] = ['doctor', 'gym', 'personal', 'reminder'];

// Özel gün (doğum günü/yıldönümü) yıllık tekrarlar → seçilen gün/ay'ın BİR SONRAKİ
// gelişine kalan gün sayısı otomatik hesaplanır (kullanıcı elle "kaç gün" girmez).
function daysUntilNextOccurrence(target: Date): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), target.getMonth(), target.getDate());
  if (next.getTime() < today.getTime()) {
    next = new Date(now.getFullYear() + 1, target.getMonth(), target.getDate());
  }
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

export default function AddEntryScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { kind, mode, id } = useLocalSearchParams<{ kind?: string; mode?: string; id?: string }>();

  const formMode: FormMode = mode === 'routine' ? 'routine' : mode === 'moment' ? 'moment' : 'log';
  const titleKey: MessageKey =
    formMode === 'routine'
      ? 'care.add.routine_title'
      : formMode === 'moment'
        ? 'care.add.moment_title'
        : id
          ? 'care.add.log_edit_title'
          : 'care.add.log_title';

  return (
    <Screen edges={['bottom']}>
      <StackHeader title={t(titleKey)} />
      {formMode === 'log' ? (
        <LogForm initialKind={kind} editId={id} onDone={() => router.back()} />
      ) : formMode === 'routine' ? (
        <RoutineForm onDone={() => router.back()} />
      ) : (
        <MomentForm onDone={() => router.back()} />
      )}
    </Screen>
  );
}

// ── Kişisel kayıt (ekle / düzenle) ────────────────────────────────────────
function LogForm({
  initialKind,
  editId,
  onDone,
}: {
  initialKind?: string;
  editId?: string;
  onDone: () => void;
}) {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const addPersonalLog = useStore((s) => s.addPersonalLog);
  const updatePersonalLog = useStore((s) => s.updatePersonalLog);
  const deletePersonalLog = useStore((s) => s.deletePersonalLog);
  // Düzenleme: mevcut kaydı bul (varsa alanları ön-doldur)
  const existing = useStore((s) =>
    editId ? s.personalLogs.find((x) => x.id === editId) : undefined,
  );

  const startKind: QuickAddKind =
    existing?.kind ??
    (KNOWN_KINDS.includes(initialKind as QuickAddKind)
      ? (initialKind as QuickAddKind)
      : 'personal');
  const [selKind, setSelKind] = useState<QuickAddKind>(startKind);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(() =>
    existing?.dateMs ? new Date(existing.dateMs) : new Date(),
  );
  const [note, setNote] = useState(existing?.note ?? '');

  const canSave = title.trim().length > 0;

  const save = () => {
    const meta = quickAddMeta(selKind);
    const payload = {
      title: title.trim(),
      dateLabel: formatTrDate(date, true),
      tone: meta.tone,
      icon: meta.icon,
      kind: selKind,
      dateMs: date.getTime(),
      ...(note.trim() ? { note: note.trim() } : {}),
    };
    if (editId) updatePersonalLog(editId, payload);
    else addPersonalLog(payload);
    onDone();
  };

  const remove = () => {
    if (!editId) return;
    Alert.alert(t('care.add.delete_confirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deletePersonalLog(editId);
          onDone();
        },
      },
    ]);
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.panel, shadow.soft]}>
          <Field label={t('care.add.what')}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('care.add.what_ph')}
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </Field>
          <DateField label={t('care.add.date')} value={date} onChange={setDate} mode="datetime" />
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
                      color={active ? colors.onAccent : colors.inkSoft}
                    />
                    <Text
                      variant="caption"
                      tone={active ? 'onAccent' : 'inkSoft'}
                      style={active ? styles.chipTextActive : undefined}
                    >
                      {t(q.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>
        </View>

        <View style={[styles.panel, styles.cardGap, shadow.soft]}>
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
        </View>

        {/* Düzenlemede sil seçeneği — doğrudan silmek yerine detay ekranından onaylı */}
        {editId ? (
          <Pressable style={styles.deleteRow} onPress={remove}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text variant="bodyStrong" style={{ color: colors.danger }}>
              {t('care.add.delete')}
            </Text>
          </Pressable>
        ) : null}
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
  const { t, locale } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const addRoutine = useStore((s) => s.addRoutine);
  const [name, setName] = useState('');
  const [days, setDays] = useState('');
  const [catId, setCatId] = useState<string>(CATEGORIES[0]!.id);
  const [svcId, setSvcId] = useState<string | null>(null);

  // Alt hizmet seçilince ad + bakım periyodu (taksonomiden) otomatik dolar
  const pickService = (s: {
    id: string;
    label: { tr: string; kk: string; ru: string };
    periodDays?: number;
  }) => {
    setSvcId(s.id);
    setName(tri(s.label, locale));
    if (s.periodDays) setDays(String(s.periodDays));
  };

  const canSave = name.trim().length > 0 && Number(days) > 0;

  const save = () => {
    const cat = CATEGORIES.find((c) => c.id === catId);
    addRoutine({
      name: name.trim(),
      dueDays: Number(days),
      categoryCode: catId,
      ...(cat ? { icon: cat.icon } : {}),
    });
    onDone();
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.panel, shadow.soft]}>
          <Field label={t('care.add.what')}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('care.add.routine_name_ph')}
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </Field>
          {/* Kategori — "Teklif Al" kısayolu doğru kategoriyi otomatik açsın */}
          <Field label={t('care.add.category')}>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => {
                const active = c.id === catId;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      setCatId(c.id);
                      setSvcId(null);
                    }}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Ionicons
                      name={c.icon as IoniconName}
                      size={15}
                      color={active ? colors.onAccent : colors.inkSoft}
                    />
                    <Text
                      variant="caption"
                      tone={active ? 'onAccent' : 'inkSoft'}
                      style={active ? styles.chipTextActive : undefined}
                    >
                      {t(categoryLabelKey(c.id))}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>
          {/* Alt hizmet — seçince bakım periyodu otomatik gelir (taksonomi) */}
          <Field label={t('care.add.service')}>
            <View style={styles.chips}>
              {servicesOf(catId).map((s) => {
                const active = s.id === svcId;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => pickService(s)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text
                      variant="caption"
                      tone={active ? 'onAccent' : 'inkSoft'}
                      style={active ? styles.chipTextActive : undefined}
                    >
                      {tri(s.label, locale)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
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
        </View>
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
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const addMoment = useStore((s) => s.addMoment);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date());

  const canSave = title.trim().length > 0;

  const save = () => {
    // Özel gün yıllık tekrarlar → kalan gün seçilen tarihten otomatik hesaplanır.
    addMoment({
      title: title.trim(),
      dateLabel: formatTrDate(date, false),
      daysLeft: daysUntilNextOccurrence(date),
    });
    onDone();
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.panel, shadow.soft]}>
          <Field label={t('care.add.what')}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('care.add.moment_name_ph')}
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </Field>
          <DateField label={t('care.add.date')} value={date} onChange={setDate} mode="date" last />
        </View>
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
      <Text variant="bodyStrong" tone="ink" style={styles.fieldLabel}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { padding: space(3), paddingBottom: space(13) },
    panel: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2.25),
    },
    cardGap: { marginTop: space(2) },
    field: {},
    fieldGap: { marginBottom: space(2) },
    fieldLabel: { marginBottom: space(1), fontWeight: '700' },
    input: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingHorizontal: space(1.75),
      height: 52,
      fontSize: 16,
      fontWeight: '500',
      color: colors.ink,
    },
    textarea: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: space(1.75),
      minHeight: 110,
      textAlignVertical: 'top',
      fontSize: 15,
      fontWeight: '400',
      color: colors.ink,
    },
    // iOS kompakt tarih seçici sola hizalı dursun (varsayılan sağa yaslı gelir)
    iosPickerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
    dateText: { height: 52, lineHeight: 52, fontSize: 16 },
    deleteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space(1),
      marginTop: space(2.5),
      paddingVertical: space(1.5),
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: space(1.5),
      paddingVertical: space(1.1),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    chipActive: { backgroundColor: colors.accent },
    chipTextActive: { fontWeight: '700' },
    footer: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      paddingBottom: TAB_BAR_CLEARANCE,
    },
  });
