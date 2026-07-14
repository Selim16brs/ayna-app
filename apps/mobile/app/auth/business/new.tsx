import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

// Doğum tarihi gösterimi: GG.AA.YYYY
function fmtDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}
import type { MessageKey } from '@ayna/i18n';
import { api } from '../../../src/api';
import { registerErrorMessage } from '../../../src/authError';
import {
  type AutofillKind,
  autofillProps,
  isValidEmail,
  missingLabels,
} from '../../../src/formValidation';
import { activeCategories } from '../../../src/taxonomy';
import { useLocale } from '../../../src/locale';
import { radius, space, type ColorTokens } from '../../../src/theme';
import { useTheme, useThemedStyles } from '../../../src/theme-context';
import {
  AddressPicker,
  Button,
  CitySelect,
  defaultHours,
  emptySocial,
  MissingFields,
  PasswordStrength,
  Screen,
  SocialLinks,
  StackHeader,
  Text,
  TextInput,
  type DayHours,
  type SocialValue,
  WorkingHours,
} from '../../../src/ui';

// Salon hizmet alanları — MERKEZİ taksonomideki AKTİF kategoriler (fiyat YOK, yalnızca alan; §3.2 A)
const AREAS: MessageKey[] = activeCategories().map((c) => c.labelKey);

const PHOTO_MAX = 10;

// DayHours[] → kısa okunur metin (backend workingHours: string)
function serializeHours(hours: DayHours[]): string {
  return hours
    .filter((d) => d.open)
    .map((d) => `${d.wd}:${d.from}-${d.to}`)
    .join(',');
}

export default function NewBusinessScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDate, setShowDate] = useState(false);

  const [name, setName] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [areas, setAreas] = useState<Set<MessageKey>>(new Set(['category.hair']));
  const [city, setCity] = useState<string | null>(null);
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [pinned, setPinned] = useState(false);
  const [coord, setCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [hours, setHours] = useState<DayHours[]>(defaultHours());
  const [social, setSocial] = useState<SocialValue>(emptySocial);
  const [desc, setDesc] = useState('');
  const [tax, setTax] = useState('');
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);

  async function addPhotos() {
    if (photos.length >= PHOTO_MAX) {
      Alert.alert(t('biz.field.photos_hint'));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.35,
      base64: true,
      allowsMultipleSelection: true,
      selectionLimit: PHOTO_MAX - photos.length,
    });
    if (!res.canceled)
      setPhotos((p) =>
        [
          ...p,
          ...res.assets.map((a) => (a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri)),
        ].slice(0, PHOTO_MAX),
      );
  }

  // §3.2 — işletme belgesi (ruhsat/vergi vb.) — galeriden görsel; data URL olarak kayda gider.
  async function addDoc() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.4,
      base64: true,
    });
    if (!res.canceled && res.assets[0]?.base64) {
      setDocUrl(`data:image/jpeg;base64,${res.assets[0].base64}`);
    }
  }

  function toggleArea(a: MessageKey) {
    setAreas((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      return next;
    });
  }

  const emailInvalid = email.trim().length > 0 && !isValidEmail(email);
  const valid =
    firstName.trim().length > 1 &&
    lastName.trim().length > 1 &&
    ownerPhone.trim().length >= 7 &&
    password.length >= 6 &&
    password === password2 &&
    name.trim().length > 1 &&
    areas.size > 0 &&
    city !== null &&
    district.trim().length > 1 &&
    address.trim().length > 3 &&
    phone.trim().length >= 7 &&
    !emailInvalid &&
    terms;
  const touched = !!(firstName || lastName || ownerPhone || password || name);
  const missing = missingLabels([
    { ok: firstName.trim().length > 1 && lastName.trim().length > 1, key: 'auth.miss.name' },
    { ok: name.trim().length > 1, key: 'biz.field.name' },
    {
      ok: city !== null && district.trim().length > 1 && address.trim().length > 3,
      key: 'biz.field.address',
    },
    { ok: phone.trim().length >= 7, key: 'auth.f.phone' },
    { ok: password.length >= 6 && password === password2, key: 'auth.f.password' },
    { ok: terms, key: 'auth.miss.terms' },
  ]);

  async function submit() {
    setBusy(true);
    try {
      const categories = [...areas].map((a) => a.replace('category.', ''));
      await api.registerBusiness({
        name: name.trim(),
        ownerName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        phone: ownerPhone.trim(),
        password,
        email: email.trim(),
        sector: categories[0] ?? 'hair',
        categories,
        city: city ?? '',
        district: district.trim(),
        address: address.trim(),
        ...(coord ? { lat: coord.lat, lng: coord.lng } : {}),
        ...(docUrl ? { docUrl } : {}),
        workingHours: serializeHours(hours),
        taxId: tax.trim(),
      });
      // NOT: fotoğraflar, sosyal, açıklama backend'e Faz 9'da (salon profili API'si) yazılacak.
      // Otomatik giriş YOK — kayıt tamamlandı (salon admin onayı bekler); giriş ekranına yönlendir.
      Alert.alert(t('auth.register.done_t'), t('auth.register.done_b'), [
        { text: t('common.ok'), onPress: () => router.replace('/auth/login') },
      ]);
    } catch (e) {
      Alert.alert(registerErrorMessage(e, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={[]}>
      <StackHeader title={t('biz.new.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Salon sahibi bilgileri */}
        <Section text={t('biz.section.owner')} />
        <View style={styles.row2}>
          <View style={styles.col}>
            <Label text={t('biz.field.owner_first')} />
            <Input
              value={firstName}
              onChange={setFirstName}
              placeholderKey="biz.field.owner_first"
              autofill="name"
            />
          </View>
          <View style={styles.col}>
            <Label text={t('biz.field.owner_last')} />
            <Input
              value={lastName}
              onChange={setLastName}
              placeholderKey="biz.field.owner_last"
              autofill="name"
            />
          </View>
        </View>
        <Label text={t('biz.field.phone')} />
        <Input
          value={ownerPhone}
          onChange={(v) => setOwnerPhone(v.replace(/[^0-9 +]/g, ''))}
          placeholder="+7 700 123 45 67"
          keyboardType="phone-pad"
          autofill="tel"
        />
        <Label text={t('biz.field.password')} />
        <Input
          value={password}
          onChange={setPassword}
          secure
          placeholderKey="biz.field.password"
          autofill="newPassword"
        />
        <Text variant="caption" tone="muted" style={{ marginTop: space(0.75) }}>
          {t('auth.f.password_hint')}
        </Text>
        <PasswordStrength password={password} />
        <Label text={t('auth.f.password2')} />
        <Input
          value={password2}
          onChange={setPassword2}
          secure
          placeholderKey="auth.f.password2"
          autofill="newPassword"
        />
        {password2.length > 0 && password !== password2 ? (
          <Text variant="caption" style={{ color: colors.danger, marginTop: space(0.75) }}>
            {t('auth.f.password_mismatch')}
          </Text>
        ) : null}
        <Label text={t('biz.field.birthdate')} />
        <Pressable style={styles.dateBtn} onPress={() => setShowDate(true)}>
          <Ionicons name="calendar-outline" size={20} color={colors.inkSoft} />
          <Text variant="body" tone={birthDate ? 'ink' : 'muted'} style={styles.dateText}>
            {birthDate ? fmtDate(birthDate) : t('biz.field.birthdate_ph')}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.muted} />
        </Pressable>
        {showDate && Platform.OS === 'android' ? (
          <DateTimePicker
            value={birthDate ?? new Date(1990, 0, 1)}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(_e, d) => {
              setShowDate(false);
              if (d) setBirthDate(d);
            }}
          />
        ) : null}
        {Platform.OS === 'ios' ? (
          <Modal
            visible={showDate}
            transparent
            animationType="slide"
            onRequestClose={() => setShowDate(false)}
          >
            <Pressable style={styles.dateBackdrop} onPress={() => setShowDate(false)}>
              <Pressable style={styles.dateSheet} onPress={(e) => e.stopPropagation()}>
                <DateTimePicker
                  value={birthDate ?? new Date(1990, 0, 1)}
                  mode="date"
                  display="spinner"
                  maximumDate={new Date()}
                  onChange={(_e, d) => {
                    if (d) setBirthDate(d);
                  }}
                />
                <Button label={t('common.ok')} onPress={() => setShowDate(false)} />
              </Pressable>
            </Pressable>
          </Modal>
        ) : null}

        {/* Salon bilgileri */}
        <Section text={t('biz.section.firm')} />
        <Label text={t('biz.field.name')} />
        <Input value={name} onChange={setName} placeholder="AYNA Studio" />

        <Label text={`${t('biz.field.photos')}  (${photos.length}/${PHOTO_MAX})`} />
        <Text variant="caption" tone="muted" style={styles.hint}>
          {t('biz.field.photos_hint')}
        </Text>
        <View style={styles.photoGrid}>
          {photos.length < PHOTO_MAX ? (
            <Pressable style={styles.photoAdd} onPress={addPhotos}>
              <Ionicons name="images-outline" size={24} color={colors.inkSoft} />
            </Pressable>
          ) : null}
          {photos.map((uri, i) => (
            <View key={`${uri}-${i}`}>
              <Image source={{ uri }} style={styles.photoThumb} />
              <Pressable
                style={styles.thumbRemove}
                hitSlop={6}
                onPress={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
              >
                <Ionicons name="close-circle" size={20} color={colors.onColor} />
              </Pressable>
            </View>
          ))}
        </View>

        <Label text={t('biz.field.area')} />
        <Text variant="caption" tone="muted" style={styles.hint}>
          {t('biz.field.area_hint')}
        </Text>
        <View style={styles.chips}>
          {AREAS.map((a) => (
            <Chip key={a} label={t(a)} active={areas.has(a)} onPress={() => toggleArea(a)} />
          ))}
        </View>

        <Label text={t('biz.field.desc')} />
        <TextInput
          value={desc}
          onChangeText={setDesc}
          placeholder={t('biz.field.desc_ph')}
          placeholderTextColor={colors.muted}
          multiline
          style={styles.textarea}
        />

        {/* Adres & konum */}
        <Section text={t('biz.section.contact')} />
        <Label text={t('biz.field.city')} />
        <CitySelect value={city} onChange={setCity} />
        <Label text={t('biz.field.district')} />
        <Input value={district} onChange={setDistrict} placeholderKey="biz.field.district_ph" />
        <Label text={t('biz.field.address')} />
        <Input value={address} onChange={setAddress} placeholderKey="biz.field.address_ph" />

        <Label text={t('biz.field.map')} />
        <Pressable
          style={[styles.mapBox, pinned && styles.mapBoxOn]}
          onPress={() => setMapOpen(true)}
        >
          <Ionicons
            name={pinned ? 'location' : 'location-outline'}
            size={22}
            color={pinned ? colors.onAccent : colors.accentFg}
          />
          <Text variant="bodyStrong" tone={pinned ? 'onAccent' : 'accentFg'} style={styles.mapText}>
            {pinned ? t('biz.field.map_pinned') : t('biz.field.map_pin')}
          </Text>
          {pinned ? (
            <Text variant="caption" tone="onAccent" style={styles.mapChange}>
              {t('biz.field.map_change')}
            </Text>
          ) : null}
        </Pressable>
        <AddressPicker
          visible={mapOpen}
          initialCity={city ?? undefined}
          initialCoord={coord ? { latitude: coord.lat, longitude: coord.lng } : undefined}
          onClose={() => setMapOpen(false)}
          onPick={(r) => {
            setCoord({ lat: r.lat, lng: r.lng });
            setPinned(true);
            if (r.address) setAddress(r.address);
            if (r.district) setDistrict(r.district);
            if (r.city && !city) setCity(r.city);
          }}
        />

        <Label text={t('biz.field.phone')} />
        <Input
          value={phone}
          onChange={(v) => setPhone(v.replace(/[^0-9 +]/g, ''))}
          placeholder="+7 700 123 45 67"
          keyboardType="phone-pad"
          autofill="tel"
        />
        <Label text={t('biz.field.email')} />
        <Input
          value={email}
          onChange={setEmail}
          keyboardType="email-address"
          placeholder="info@salon.kz"
          autofill="email"
        />
        {emailInvalid ? (
          <Text variant="caption" style={{ color: colors.danger, marginTop: space(0.75) }}>
            {t('auth.f.email_invalid')}
          </Text>
        ) : null}
        <Label text={t('biz.field.social')} />
        <SocialLinks value={social} onChange={setSocial} />

        <Label text={t('biz.field.hours')} />
        <WorkingHours value={hours} onChange={setHours} />

        {/* Hesap & doğrulama */}
        <Section text={t('biz.section.account')} />
        <Label text={t('biz.field.tax')} />
        <Input
          value={tax}
          onChange={(v) => setTax(v.replace(/[^0-9]/g, ''))}
          placeholderKey="biz.field.tax_ph"
          keyboardType="phone-pad"
        />
        <Label text={t('biz.field.docs')} />
        <Pressable style={[styles.docRow, docUrl && styles.docRowOn]} onPress={addDoc}>
          <Ionicons
            name={docUrl ? 'checkmark-circle' : 'cloud-upload-outline'}
            size={20}
            color={docUrl ? colors.onAccent : colors.accentFg}
          />
          <Text variant="bodyStrong" tone={docUrl ? 'onAccent' : 'accentFg'}>
            {docUrl ? t('biz.field.docs_added') : t('biz.field.docs_add')}
          </Text>
        </Pressable>
        <Text variant="caption" tone="muted" style={styles.hint}>
          {t('biz.field.docs_hint')}
        </Text>

        <Checkbox
          checked={terms}
          onToggle={() => setTerms((v) => !v)}
          label={t('biz.terms.accept')}
        />
        {/* §11/§sözleşme — Always toplu bildirim sorumluluk beyanı */}
        <Text variant="caption" tone="muted" style={styles.liability}>
          {t('biz.terms.always_liability')}
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        {touched && !valid ? <MissingFields keys={missing} /> : null}
        <Button
          label={t('biz.new.submit')}
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
  autofill,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  placeholderKey?: MessageKey;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autofill?: AutofillKind;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [hidden, setHidden] = useState(true);
  const ph = placeholder ?? (placeholderKey ? t(placeholderKey) : undefined);
  const af = autofillProps(autofill);
  if (secure) {
    return (
      <View style={styles.secureWrap}>
        <TextInput
          value={value}
          onChangeText={onChange}
          secureTextEntry={hidden}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={ph}
          placeholderTextColor={colors.muted}
          style={styles.secureInput}
          {...af}
        />
        <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} style={styles.eyeBtn}>
          <Ionicons
            name={hidden ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color={colors.inkSoft}
          />
        </Pressable>
      </View>
    );
  }
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      keyboardType={keyboardType ?? 'default'}
      autoCapitalize={
        keyboardType === 'email-address' ? 'none' : autofill === 'name' ? 'words' : 'sentences'
      }
      placeholder={ph}
      placeholderTextColor={colors.muted}
      style={styles.input}
      {...af}
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
    secureWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 54,
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      paddingRight: space(1.5),
    },
    secureInput: {
      flex: 1,
      height: '100%',
      paddingHorizontal: space(2),
      fontWeight: '500',
      fontSize: 16,
      color: colors.ink,
    },
    eyeBtn: { padding: space(0.75) },
    dateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      height: 54,
      paddingHorizontal: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
    },
    dateText: { flex: 1 },
    dateBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    dateSheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: space(3),
      paddingTop: space(2),
      paddingBottom: space(3),
    },
    label: { marginTop: space(2), marginBottom: space(1) },
    hint: { marginTop: -space(0.5), marginBottom: space(1) },
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
    textarea: {
      minHeight: 96,
      paddingHorizontal: space(2),
      paddingTop: space(1.5),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      fontSize: 16,
      color: colors.ink,
      textAlignVertical: 'top',
    },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    photoAdd: {
      width: 84,
      height: 84,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoThumb: {
      width: 84,
      height: 84,
      borderRadius: radius.md,
      backgroundColor: colors.bgSunken,
    },
    thumbRemove: {
      position: 'absolute',
      top: -6,
      right: -6,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 11,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    chip: {
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    chipActive: { backgroundColor: colors.accent },
    mapBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      height: 54,
      paddingHorizontal: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
    },
    mapBoxOn: { backgroundColor: colors.accent },
    mapText: { flex: 1 },
    mapChange: { fontWeight: '800', textDecorationLine: 'underline' },
    docRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      height: 54,
      paddingHorizontal: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
    },
    docRowOn: { backgroundColor: colors.accent },
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
    liability: { marginTop: space(1), lineHeight: 17 },
  });
