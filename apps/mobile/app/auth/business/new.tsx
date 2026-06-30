import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MessageKey } from '@ayna/i18n';
import { CITIES } from '../../../src/data';
import { useLocale } from '../../../src/locale';
import { radius, space, type ColorTokens } from '../../../src/theme';
import { useTheme, useThemedStyles } from '../../../src/theme-context';
import { Button, Screen, Segmented, StackHeader, Text } from '../../../src/ui';

const SECTORS: MessageKey[] = [
  'sector.beauty',
  'sector.hairdresser',
  'sector.spa',
  'sector.cosmetology',
];
const AREAS: MessageKey[] = [
  'category.hair',
  'category.nails',
  'category.brows',
  'category.lashes',
  'category.makeup',
  'category.skincare',
  'category.spa',
  'category.epilation',
];

export default function NewBusinessScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [kind, setKind] = useState<'salon' | 'independent'>('salon');
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [sector, setSector] = useState<MessageKey>('sector.beauty');
  const [areas, setAreas] = useState<Set<MessageKey>>(new Set(['category.hair']));
  const [city, setCity] = useState<string | null>(null);
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [hours, setHours] = useState('');
  const [tax, setTax] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);

  const valid =
    name.trim().length > 1 &&
    owner.trim().length > 1 &&
    city !== null &&
    district.trim().length > 1 &&
    address.trim().length > 3 &&
    phone.trim().length >= 7 &&
    email.trim().length > 3 &&
    password.length >= 6 &&
    terms;

  function toggleArea(a: MessageKey) {
    setAreas((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      return next;
    });
  }

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('biz.new.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* İşletme bilgileri */}
        <Section text={t('biz.section.firm')} />
        <Label text={t('biz.kind.label')} />
        <Segmented
          options={[
            { value: 'salon', label: t('biz.kind.salon') },
            { value: 'independent', label: t('biz.kind.independent') },
          ]}
          value={kind}
          onChange={setKind}
        />
        <Label text={t('biz.field.name')} />
        <Input value={name} onChange={setName} placeholder="AYNA Studio" />
        <Label text={t('biz.field.owner')} />
        <Input value={owner} onChange={setOwner} placeholderKey="biz.field.owner_ph" />
        <Label text={t('biz.field.sector')} />
        <View style={styles.chips}>
          {SECTORS.map((s) => (
            <Chip key={s} label={t(s)} active={sector === s} onPress={() => setSector(s)} />
          ))}
        </View>
        <Label text={t('biz.field.area')} />
        <View style={styles.chips}>
          {AREAS.map((a) => (
            <Chip key={a} label={t(a)} active={areas.has(a)} onPress={() => toggleArea(a)} />
          ))}
        </View>

        {/* İletişim & konum */}
        <Section text={t('biz.section.contact')} />
        <Label text={t('biz.field.city')} />
        <View style={styles.chips}>
          {CITIES.map((c) => (
            <Chip key={c} label={c} active={city === c} onPress={() => setCity(c)} />
          ))}
        </View>
        <Label text={t('biz.field.district')} />
        <Input value={district} onChange={setDistrict} placeholderKey="biz.field.district_ph" />
        <Label text={t('biz.field.address')} />
        <Input value={address} onChange={setAddress} placeholderKey="biz.field.address_ph" />
        <Label text={t('biz.field.phone')} />
        <Input
          value={phone}
          onChange={(v) => setPhone(v.replace(/[^0-9 +]/g, ''))}
          placeholder="+7 700 123 45 67"
          keyboardType="phone-pad"
        />
        <Label text={t('biz.field.email')} />
        <Input
          value={email}
          onChange={setEmail}
          keyboardType="email-address"
          placeholder="info@salon.kz"
        />
        <Label text={t('biz.field.hours')} />
        <Input value={hours} onChange={setHours} placeholderKey="biz.field.hours_ph" />

        {/* Hesap & doğrulama */}
        <Section text={t('biz.section.account')} />
        <Label text={t('biz.field.tax')} />
        <Input
          value={tax}
          onChange={(v) => setTax(v.replace(/[^0-9]/g, ''))}
          placeholderKey="biz.field.tax_ph"
          keyboardType="phone-pad"
        />
        <Label text={t('biz.field.password')} />
        <Input value={password} onChange={setPassword} secure />
        <Label text={t('biz.field.docs')} />
        <Pressable style={styles.docRow}>
          <Ionicons name="cloud-upload-outline" size={20} color={colors.rose} />
          <Text variant="bodyStrong" tone="rose">
            {t('biz.field.docs_add')}
          </Text>
        </Pressable>
        <Text variant="caption" tone="muted" style={styles.docHint}>
          {t('biz.field.docs_hint')}
        </Text>

        <Checkbox
          checked={terms}
          onToggle={() => setTerms((v) => !v)}
          label={t('biz.terms.accept')}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('biz.new.submit')}
          variant={valid ? 'primary' : 'secondary'}
          disabled={!valid}
          onPress={() => router.replace('/auth/business/done')}
        />
      </View>
    </Screen>
  );
}

function Section({ text }: { text: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Text variant="label" tone="rose" style={styles.section}>
      {text}
    </Text>
  );
}

function Label({ text }: { text: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Text variant="bodyStrong" tone="ink" style={styles.label}>
      {text}
    </Text>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  placeholderKey,
  secure,
  keyboardType,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  placeholderKey?: MessageKey;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      secureTextEntry={secure}
      keyboardType={keyboardType ?? 'default'}
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
      placeholder={placeholder ?? (placeholderKey ? t(placeholderKey) : undefined)}
      placeholderTextColor={colors.muted}
      style={styles.input}
    />
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text variant="caption" tone={active ? 'onColor' : 'inkSoft'}>
        {label}
      </Text>
    </Pressable>
  );
}

function Checkbox({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable style={styles.checkRow} onPress={onToggle}>
      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked ? <Ionicons name="checkmark" size={15} color={colors.onColor} /> : null}
      </View>
      <Text variant="caption" tone="inkSoft" style={styles.checkLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4) },
    section: { marginTop: space(3), marginBottom: space(0.5) },
    label: { marginTop: space(2), marginBottom: space(1) },
    input: {
      height: 54,
      paddingHorizontal: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      fontWeight: '500',
      fontSize: 16,
      color: colors.ink,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    chip: {
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    chipActive: { backgroundColor: colors.rose, borderColor: colors.rose },
    docRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      height: 54,
      paddingHorizontal: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderStyle: 'dashed',
    },
    docHint: { marginTop: space(0.75), marginLeft: space(0.5) },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: space(1.25), marginTop: space(3) },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    checkLabel: { flex: 1, lineHeight: 18 },
    footer: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
  });
