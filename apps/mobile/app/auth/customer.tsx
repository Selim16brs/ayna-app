import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { api } from '../../src/api';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, CitySelect, Screen, Segmented, StackHeader, Text } from '../../src/ui';

type Gender = 'female' | 'other';
type AddrLabel = 'home' | 'work';
type Address = { label: AddrLabel; detail: string };

export default function CustomerRegisterScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const setAuth = useStore((s) => s.setAuth);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birth, setBirth] = useState('');
  const [gender, setGender] = useState<Gender>('female');
  const [photo, setPhoto] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState<string | null>(null);
  const [gps, setGps] = useState(false);
  const [addrLabel, setAddrLabel] = useState<AddrLabel>('home');
  const [addrDetail, setAddrDetail] = useState('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!res.canceled && res.assets[0]) setPhoto(res.assets[0].uri);
  }

  function addAddress() {
    if (!addrDetail.trim()) return;
    setAddresses((a) => [...a, { label: addrLabel, detail: addrDetail.trim() }]);
    setAddrDetail('');
  }

  const valid =
    firstName.trim().length > 1 &&
    lastName.trim().length > 1 &&
    phone.trim().length >= 7 &&
    password.length >= 6 &&
    city !== null &&
    terms;

  async function submit() {
    setBusy(true);
    try {
      const session = await api.register({
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        phone: phone.trim(),
        password,
        gender: gender === 'female' ? 'female' : 'unspecified',
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(city ? { city } : {}),
      });
      // NOT: profil fotoğrafı + adres listesi backend'e Faz 9 (profil) ile yazılacak.
      setAuth(session);
      router.replace('/discover');
    } catch (e) {
      const msg = String((e as Error).message ?? '');
      if (msg.includes('409') || msg.includes('400')) Alert.alert(t('auth.error.taken'));
      else router.replace('/discover'); // ağ hatası → demo akışı engellenmesin
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={[]}>
      <StackHeader title={t('auth.customer.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Kişisel bilgiler */}
        <Section text={t('auth.section.personal')} />
        <Pressable style={styles.photoRow} onPress={pickPhoto}>
          <View style={styles.avatar}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="camera-outline" size={24} color={colors.inkSoft} />
            )}
          </View>
          <View style={styles.photoText}>
            <Text variant="bodyStrong" tone="ink">
              {t('auth.f.photo_add')}
            </Text>
            <Text variant="caption" tone="muted">
              {t('auth.f.photo_opt')}
            </Text>
          </View>
        </Pressable>

        <View style={styles.row2}>
          <View style={styles.col}>
            <Label text={t('auth.f.firstname')} />
            <Input value={firstName} onChange={setFirstName} placeholderKey="auth.f.firstname" />
          </View>
          <View style={styles.col}>
            <Label text={t('auth.f.lastname')} />
            <Input value={lastName} onChange={setLastName} placeholderKey="auth.f.lastname" />
          </View>
        </View>
        <Label text={t('auth.f.birthdate')} />
        <Input value={birth} onChange={setBirth} placeholderKey="auth.f.birthdate_ph" />
        <Label text={t('auth.f.gender')} />
        <Segmented
          options={[
            { value: 'female', label: t('auth.gender.female') },
            { value: 'other', label: t('auth.gender.other') },
          ]}
          value={gender}
          onChange={setGender}
        />

        {/* Adres & konum */}
        <Section text={t('auth.section.address')} />
        <Label text={t('auth.f.city')} />
        <CitySelect value={city} onChange={setCity} />

        <Pressable style={[styles.gpsBox, gps && styles.gpsBoxOn]} onPress={() => setGps((v) => !v)}>
          <Ionicons
            name={gps ? 'navigate' : 'navigate-outline'}
            size={20}
            color={gps ? colors.onAccent : colors.rose}
          />
          <Text variant="bodyStrong" tone={gps ? 'onAccent' : 'rose'} style={styles.gpsText}>
            {gps ? t('auth.location.detected') : t('auth.location.use_gps')}
          </Text>
          {gps ? <Ionicons name="checkmark-circle" size={20} color={colors.onAccent} /> : null}
        </Pressable>
        <Text variant="caption" tone="muted" style={styles.hint}>
          {t('auth.location.hint')}
        </Text>

        <Label text={t('auth.address.label')} />
        <View style={styles.chips}>
          <Chip label={t('auth.address.home')} active={addrLabel === 'home'} onPress={() => setAddrLabel('home')} />
          <Chip label={t('auth.address.work')} active={addrLabel === 'work'} onPress={() => setAddrLabel('work')} />
        </View>
        <View style={styles.addrRow}>
          <TextInput
            value={addrDetail}
            onChangeText={setAddrDetail}
            placeholder={t('auth.address.detail_ph')}
            placeholderTextColor={colors.muted}
            style={styles.addrInput}
          />
          <Pressable style={styles.addrAdd} onPress={addAddress}>
            <Ionicons name="add" size={22} color={colors.onAccent} />
          </Pressable>
        </View>
        {addresses.length > 0 ? (
          <View style={styles.addrList}>
            {addresses.map((a, i) => (
              <View key={i} style={styles.addrChip}>
                <Ionicons
                  name={a.label === 'home' ? 'home' : 'briefcase'}
                  size={16}
                  color={colors.inkSoft}
                />
                <Text variant="caption" tone="ink" style={styles.addrChipText} numberOfLines={1}>
                  {t(a.label === 'home' ? 'auth.address.home' : 'auth.address.work')} · {a.detail}
                </Text>
                <Pressable onPress={() => setAddresses((l) => l.filter((_, idx) => idx !== i))} hitSlop={6}>
                  <Ionicons name="close-circle" size={18} color={colors.muted} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {/* Hesap güvenliği */}
        <Section text={t('auth.section.account')} />
        <Label text={t('auth.f.phone')} />
        <Input
          value={phone}
          onChange={(v) => setPhone(v.replace(/[^0-9 +]/g, ''))}
          keyboardType="phone-pad"
          placeholder="+7 700 123 45 67"
        />
        <Label text={t('auth.f.email')} />
        <Input value={email} onChange={setEmail} keyboardType="email-address" placeholder="ornek@mail.kz" />
        <Label text={t('auth.f.password')} />
        <Input value={password} onChange={setPassword} secure />
        <Text variant="caption" tone="muted" style={styles.hint}>
          {t('auth.f.password_hint')}
        </Text>

        <Checkbox checked={terms} onToggle={() => setTerms((v) => !v)} label={t('auth.terms.accept')} />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('auth.tab.register')}
          variant={valid && !busy ? 'primary' : 'secondary'}
          disabled={!valid || busy}
          onPress={submit}
        />
      </View>
    </Screen>
  );
}

function Section({ text }: { text: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Text variant="bodyStrong" tone="ink" style={styles.section}>
      {text}
    </Text>
  );
}

function Label({ text }: { text: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Text variant="caption" tone="inkSoft" style={styles.label}>
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
      <Text variant="caption" tone={active ? 'onAccent' : 'inkSoft'}>
        {label}
      </Text>
    </Pressable>
  );
}

function Checkbox({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable style={styles.checkRow} onPress={onToggle}>
      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked ? <Ionicons name="checkmark" size={15} color={colors.onAccent} /> : null}
      </View>
      <Text variant="caption" tone="inkSoft" style={styles.checkLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4), paddingTop: space(1) },
    section: { marginTop: space(3), marginBottom: space(1), fontSize: 17 },
    label: { marginTop: space(2), marginBottom: space(1) },
    hint: { marginTop: space(0.75), marginLeft: space(0.5) },
    row2: { flexDirection: 'row', gap: space(1.5) },
    col: { flex: 1 },
    input: {
      height: 54,
      paddingHorizontal: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      fontWeight: '500',
      fontSize: 16,
      color: colors.ink,
    },
    photoRow: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    photoText: { gap: 2 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    chip: {
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    chipActive: { backgroundColor: colors.accent },
    gpsBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      height: 54,
      paddingHorizontal: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      marginTop: space(2),
    },
    gpsBoxOn: { backgroundColor: colors.accent },
    gpsText: { flex: 1 },
    addrRow: { flexDirection: 'row', gap: space(1), alignItems: 'center' },
    addrInput: {
      flex: 1,
      height: 54,
      paddingHorizontal: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      fontSize: 16,
      color: colors.ink,
    },
    addrAdd: {
      width: 54,
      height: 54,
      borderRadius: radius.lg,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addrList: { gap: space(1), marginTop: space(1.25) },
    addrChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingHorizontal: space(1.5),
      paddingVertical: space(1.25),
    },
    addrChipText: { flex: 1 },
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
    footer: { paddingHorizontal: space(3), paddingTop: space(1.5), paddingBottom: space(3) },
  });
