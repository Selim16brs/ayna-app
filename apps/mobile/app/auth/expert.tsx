import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { api } from '../../src/api';
import { CITIES } from '../../src/data';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text } from '../../src/ui';

type Service = { name: string; price: string; dur: string };

export default function ExpertRegisterScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const setAuth = useStore((s) => s.setAuth);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [birth, setBirth] = useState('');
  const [city, setCity] = useState<string>(CITIES[0]!);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [services, setServices] = useState<Service[]>([{ name: '', price: '', dur: '' }]);
  const [certs, setCerts] = useState<string[]>([]);
  const [social, setSocial] = useState('');
  const [hours, setHours] = useState('');
  const [bound, setBound] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (res.canceled || !res.assets[0]) return;
    const uri = res.assets[0].uri;
    // remove.bg + yüz tespiti (mock — gerçek anahtar admin §12.9 ile bağlanacak)
    setPhotoBusy(true);
    setTimeout(() => {
      setPhoto(uri);
      setPhotoBusy(false);
    }, 1400);
  }

  async function addCert() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!res.canceled && res.assets[0]) setCerts((c) => [...c, res.assets[0]!.uri]);
  }

  const setSvc = (i: number, field: keyof Service, val: string) =>
    setServices((list) => list.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)));

  const validServices = services.filter(
    (s) => s.name.trim() && Number(s.price) > 0 && Number(s.dur) > 0,
  );
  const valid =
    name.trim().length > 1 &&
    phone.trim().length >= 7 &&
    password.length >= 6 &&
    validServices.length > 0 &&
    (!bound || code.trim().length >= 4);

  async function submit() {
    if (validServices.length === 0) {
      Alert.alert(t('expert.reg.need_service'));
      return;
    }
    setBusy(true);
    try {
      const res = await api.registerSpecialist({
        name: name.trim(),
        phone: phone.trim(),
        password,
        city,
        kind: bound ? 'salon_bound' : 'independent',
        ...(bound ? { code: code.trim() } : {}),
        certificates: certs,
      });
      setAuth({
        token: res.token,
        user: {
          id: res.specialist.id,
          name: name.trim(),
          role: 'specialist',
          phone: phone.trim(),
          city,
          phoneVerified: true,
        },
      });
      // NOT: hizmet+fiyat+süre listesi backend'e Faz 9'da (uzman profili API'si) yazılacak.
      router.replace('/seller/reports');
    } catch (e) {
      const msg = String((e as Error).message ?? '');
      Alert.alert(msg.includes('409') ? t('auth.error.taken') : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={[]}>
      <StackHeader title={t('expert.reg.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profil fotoğrafı */}
        <Section text={t('expert.reg.personal')} />
        <Pressable style={styles.photoBox} onPress={pickPhoto}>
          {photo ? (
            <>
              <Image source={{ uri: photo }} style={styles.photo} />
              <View style={styles.faceBadge}>
                <Ionicons name="checkmark-circle" size={14} color={colors.onAccent} />
                <Text variant="caption" tone="onAccent" style={styles.faceText}>
                  {t('expert.reg.face_ok')}
                </Text>
              </View>
            </>
          ) : photoBusy ? (
            <View style={styles.photoEmpty}>
              <Ionicons name="sparkles" size={26} color={colors.accent} />
              <Text variant="caption" tone="muted">
                {t('expert.reg.photo_processing')}
              </Text>
            </View>
          ) : (
            <View style={styles.photoEmpty}>
              <Ionicons name="camera-outline" size={26} color={colors.inkSoft} />
              <Text variant="bodyStrong" tone="ink">
                {t('expert.reg.photo_add')}
              </Text>
              <Text variant="caption" tone="muted" style={styles.photoHint}>
                {t('expert.reg.photo_hint')}
              </Text>
            </View>
          )}
        </Pressable>

        <Label text={t('auth.f.name')} />
        <Input value={name} onChange={setName} placeholder={t('auth.profile.name_ph')} />
        <Label text={t('auth.f.phone')} />
        <Input value={phone} onChange={(v) => setPhone(v.replace(/[^0-9 +]/g, ''))} placeholder="+7 700 123 45 67" keyboardType="phone-pad" />
        <Label text={t('auth.f.password')} />
        <Input value={password} onChange={setPassword} secure />
        <Label text={t('auth.f.birthdate')} />
        <Input value={birth} onChange={setBirth} placeholder={t('auth.f.birthdate_ph')} />
        <Label text={t('auth.f.city')} />
        <View style={styles.chips}>
          {CITIES.map((c) => (
            <Chip key={c} label={c} active={city === c} onPress={() => setCity(c)} />
          ))}
        </View>

        {/* Hizmetler — fiyat + süre zorunlu */}
        <Section text={t('expert.reg.prof')} />
        <Label text={t('expert.reg.services')} />
        <Text variant="caption" tone="muted" style={styles.hint}>
          {t('expert.reg.services_hint')}
        </Text>
        {services.map((s, i) => (
          <View key={i} style={styles.svcCard}>
            <View style={styles.svcTop}>
              <TextInput
                value={s.name}
                onChangeText={(v) => setSvc(i, 'name', v)}
                placeholder={t('expert.reg.service_name')}
                placeholderTextColor={colors.muted}
                style={styles.svcName}
              />
              {services.length > 1 ? (
                <Pressable onPress={() => setServices((l) => l.filter((_, idx) => idx !== i))} hitSlop={8}>
                  <Ionicons name="close-circle" size={22} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>
            <View style={styles.svcRow}>
              <View style={styles.svcField}>
                <TextInput
                  value={s.price}
                  onChangeText={(v) => setSvc(i, 'price', v.replace(/[^0-9]/g, ''))}
                  placeholder={t('expert.reg.service_price')}
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  style={styles.svcInput}
                />
              </View>
              <View style={styles.svcField}>
                <TextInput
                  value={s.dur}
                  onChangeText={(v) => setSvc(i, 'dur', v.replace(/[^0-9]/g, ''))}
                  placeholder={t('expert.reg.service_dur')}
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  style={styles.svcInput}
                />
              </View>
            </View>
          </View>
        ))}
        <Pressable style={styles.addBtn} onPress={() => setServices((l) => [...l, { name: '', price: '', dur: '' }])}>
          <Ionicons name="add" size={18} color={colors.onAccent} />
          <Text variant="caption" tone="onAccent" style={styles.addText}>
            {t('expert.reg.add_service')}
          </Text>
        </Pressable>

        {/* Sertifikalar */}
        <Label text={t('expert.reg.cert')} />
        <View style={styles.certRow}>
          <Pressable style={styles.certAdd} onPress={addCert}>
            <Ionicons name="add" size={24} color={colors.inkSoft} />
          </Pressable>
          {certs.map((uri, i) => (
            <Image key={`${uri}-${i}`} source={{ uri }} style={styles.certThumb} />
          ))}
        </View>

        <Label text={t('expert.reg.social')} />
        <Input value={social} onChange={setSocial} placeholder="instagram.com/…" />
        <Label text={t('expert.reg.hours')} />
        <Input value={hours} onChange={setHours} placeholder={t('expert.reg.hours_ph')} />

        {/* Salon bağlantısı */}
        <Section text={t('expert.reg.salon_q')} />
        <View style={styles.chips}>
          <Chip label={t('common.no')} active={!bound} onPress={() => setBound(false)} />
          <Chip label={t('common.yes')} active={bound} onPress={() => setBound(true)} />
        </View>
        {bound ? (
          <>
            <Label text={t('expert.reg.code')} />
            <Text variant="caption" tone="muted" style={styles.hint}>
              {t('expert.reg.code_hint')}
            </Text>
            <Input value={code} onChange={setCode} placeholder={t('expert.reg.code_ph')} />
          </>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('expert.reg.submit')}
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
  secure,
  keyboardType,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad';
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      secureTextEntry={secure}
      keyboardType={keyboardType ?? 'default'}
      placeholder={placeholder}
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

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4), paddingTop: space(1) },
    section: { marginTop: space(3), marginBottom: space(1), fontSize: 17 },
    label: { marginTop: space(2), marginBottom: space(1) },
    hint: { marginTop: -space(0.5), marginBottom: space(1) },
    input: {
      height: 54,
      paddingHorizontal: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      fontWeight: '500',
      fontSize: 16,
      color: colors.ink,
    },
    photoBox: {
      height: 160,
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    photo: { width: '100%', height: '100%' },
    photoEmpty: { alignItems: 'center', gap: space(0.75), paddingHorizontal: space(4) },
    photoHint: { textAlign: 'center' },
    faceBadge: {
      position: 'absolute',
      bottom: space(1.25),
      right: space(1.25),
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.accent,
      paddingHorizontal: space(1.25),
      paddingVertical: 5,
      borderRadius: radius.pill,
    },
    faceText: { fontWeight: '700' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    chip: {
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    chipActive: { backgroundColor: colors.accent },
    svcCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
      marginBottom: space(1.25),
      gap: space(1),
    },
    svcTop: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    svcName: { flex: 1, fontWeight: '700', fontSize: 15, color: colors.ink, padding: 0 },
    svcRow: { flexDirection: 'row', gap: space(1) },
    svcField: { flex: 1, backgroundColor: colors.surfaceMuted, borderRadius: radius.md, paddingHorizontal: space(1.5) },
    svcInput: { height: 46, fontSize: 15, fontWeight: '600', color: colors.ink },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: colors.accent,
      paddingHorizontal: space(2),
      paddingVertical: space(1),
      borderRadius: radius.pill,
    },
    addText: { fontWeight: '800' },
    certRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    certAdd: {
      width: 72,
      height: 72,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    certThumb: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.bgSunken },
    footer: { paddingHorizontal: space(3), paddingTop: space(1.5), paddingBottom: space(3) },
  });
