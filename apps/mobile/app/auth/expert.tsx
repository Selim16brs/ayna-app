import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { api } from '../../src/api';
import { CITIES, PROFESSIONALS } from '../../src/data';
import { getDeviceFingerprint } from '../../src/device';
import { activeCategories, servicesOf, tri, type TaxService } from '../../src/taxonomy';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, CitySelect, defaultHours, emptySocial, Screen, SocialLinks, StackHeader, Text, TextInput, type DayHours, type SocialValue, WorkingHours } from '../../src/ui';

// Sistemde kayıtlı salonlar (uzmanın bağlanacağı) — data'dan
const SALONS = PROFESSIONALS.filter((p) => p.kind === 'salon');
const lower = (s: string) => s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLocaleLowerCase('tr-TR');

const SERVICE_CATS = activeCategories();
// §6.1 — kayıt profil fotoğrafı için örnek çekimler (beyaz zemin referansı)
const EXAMPLES = [
  require('../../assets/reg-ex-1.png'),
  require('../../assets/reg-ex-2.png'),
  require('../../assets/reg-ex-3.png'),
];
// Etkin alt hizmet: serviceId → { price, dur } (taksonomi varsayılanıyla ön-dolu)
type SvcRow = { price: string; dur: string };

export default function ExpertRegisterScreen() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const setAuth = useStore((s) => s.setAuth);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [birth, setBirth] = useState('');
  const [city, setCity] = useState<string>(CITIES[0]!);
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [svcCat, setSvcCat] = useState<string>(SERVICE_CATS[0]!.id);
  const [svc, setSvc] = useState<Record<string, SvcRow>>({});
  const [certs, setCerts] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const [social, setSocial] = useState<SocialValue>(emptySocial);
  const [hours, setHours] = useState<DayHours[]>(defaultHours());
  const [bound, setBound] = useState(false);
  const [salonQuery, setSalonQuery] = useState('');
  const [salonId, setSalonId] = useState<string | null>(null);
  const [salonName, setSalonName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  // Normal uzman 7, premium 20 (kayıtta premium değil → 7)
  const PORTFOLIO_MAX = 7;
  const salonResults = salonQuery.trim()
    ? SALONS.filter((s) => lower(s.name).includes(lower(salonQuery.trim())))
    : [];

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

  async function addPortfolio() {
    if (portfolio.length >= PORTFOLIO_MAX) {
      Alert.alert(t('expert.reg.portfolio_limit'));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: PORTFOLIO_MAX - portfolio.length,
    });
    if (!res.canceled) setPortfolio((p) => [...p, ...res.assets.map((a) => a.uri)].slice(0, PORTFOLIO_MAX));
  }

  // Alt hizmeti aç/kapa (açınca taksonomi varsayılan fiyat/süresiyle gelir)
  const toggleSvc = (s: TaxService) =>
    setSvc((m) => {
      if (m[s.id]) {
        const next = { ...m };
        delete next[s.id];
        return next;
      }
      return { ...m, [s.id]: { price: String(s.price), dur: String(s.durationMin) } };
    });
  const editSvc = (id: string, field: keyof SvcRow, val: string) =>
    setSvc((m) => (m[id] ? { ...m, [id]: { ...m[id]!, [field]: val.replace(/[^0-9]/g, '') } } : m));

  const validServices = Object.values(svc).filter((r) => Number(r.price) > 0 && Number(r.dur) > 0);
  const valid =
    name.trim().length > 1 &&
    phone.trim().length >= 7 &&
    password.length >= 6 &&
    validServices.length > 0 &&
    (!bound || (salonId !== null && code.trim().length >= 4));

  async function submit() {
    if (validServices.length === 0) {
      Alert.alert(t('expert.reg.need_service'));
      return;
    }
    setBusy(true);
    try {
      // §4.4 — kalıcı engel 2. katmanı için cihaz parmak izi (best-effort)
      const deviceFp = await getDeviceFingerprint();
      const res = await api.registerSpecialist({
        name: name.trim(),
        phone: phone.trim(),
        password,
        city,
        kind: bound ? 'salon_bound' : 'independent',
        ...(bound && salonId ? { businessId: salonId, code: code.trim() } : {}),
        certificates: certs,
        ...(deviceFp ? { deviceFp } : {}),
      });
      setAuth({
        token: res.token,
        user: {
          id: res.specialist.id,
          name: name.trim(),
          // Backend uzmana 'professional' rolü verir; login guard'ı da bunu bekler.
          role: 'professional',
          phone: phone.trim(),
          city,
          phoneVerified: false,
        },
      });
      // NOT: hizmet+fiyat+süre listesi backend'e Faz 9'da (uzman profili API'si) yazılacak.
      // SMS OTP zorunlu (§3.2) → doğrulama sonrası panele.
      router.replace('/auth/verify?next=/seller/reports');
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
        {/* Profil fotoğrafı — örnek çekimler + otomatik cut-out anlatımı */}
        <Section text={t('expert.reg.photo')} />
        <Text variant="caption" tone="muted" style={styles.photoLead}>
          {t('expert.reg.photo_lead')}
        </Text>
        <View style={styles.exampleRow}>
          {EXAMPLES.map((src, i) => (
            <View key={i} style={styles.exampleCard}>
              <Image source={src} style={styles.exampleImg} resizeMode="cover" />
              <View style={styles.exampleTick}>
                <Ionicons name="checkmark" size={11} color={colors.onAccent} />
              </View>
            </View>
          ))}
        </View>
        <View style={styles.autoRow}>
          <Ionicons name="sparkles" size={14} color={colors.accentFg} />
          <Text variant="caption" tone="accentFg" style={styles.autoText}>
            {t('expert.reg.photo_auto')}
          </Text>
        </View>
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
        <CitySelect value={city} onChange={setCity} />
        <Label text={t('auth.f.district')} />
        <Input value={district} onChange={setDistrict} placeholder={t('auth.f.district_ph')} />
        <Label text={t('auth.f.address')} />
        <Input value={address} onChange={setAddress} placeholder={t('auth.f.address_ph')} />

        {/* Hizmetler — MERKEZİ taksonomiden: alan seç → alt hizmetleri aç + fiyat/süre gir */}
        <Section text={t('expert.reg.prof')} />
        <Label text={t('expert.reg.service_area')} />
        <View style={styles.chips}>
          {SERVICE_CATS.map((c) => {
            const on = c.id === svcCat;
            return (
              <Pressable
                key={c.id}
                onPress={() => setSvcCat(c.id)}
                style={[styles.chip, on && styles.chipActive]}
              >
                <Text variant="caption" tone={on ? 'onAccent' : 'inkSoft'}>
                  {t(c.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Label text={t('expert.reg.services')} />
        <Text variant="caption" tone="muted" style={styles.hint}>
          {t('expert.reg.services_hint')}
        </Text>
        {servicesOf(svcCat).map((s) => {
          const row = svc[s.id];
          const on = !!row;
          return (
            <View key={s.id} style={styles.svcCard}>
              <Pressable style={styles.svcTop} onPress={() => toggleSvc(s)}>
                <View style={[styles.check, on && styles.checkOn]}>
                  {on ? <Ionicons name="checkmark" size={14} color={colors.onAccent} /> : null}
                </View>
                <Text variant="bodyStrong" tone="ink" style={styles.svcNameText} numberOfLines={1}>
                  {tri(s.label, locale)}
                </Text>
              </Pressable>
              {on ? (
                <View style={styles.svcRow}>
                  <View style={styles.svcField}>
                    <TextInput
                      value={row.price}
                      onChangeText={(v) => editSvc(s.id, 'price', v)}
                      placeholder={t('expert.reg.service_price')}
                      placeholderTextColor={colors.muted}
                      keyboardType="number-pad"
                      style={styles.svcInput}
                    />
                  </View>
                  <View style={styles.svcField}>
                    <TextInput
                      value={row.dur}
                      onChangeText={(v) => editSvc(s.id, 'dur', v)}
                      placeholder={t('expert.reg.service_dur')}
                      placeholderTextColor={colors.muted}
                      keyboardType="number-pad"
                      style={styles.svcInput}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}

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
        <View style={styles.warnRow}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.accentFg} />
          <Text variant="caption" tone="accentFg" style={styles.warnText}>
            {t('expert.reg.cert_warn')}
          </Text>
        </View>

        {/* Portfolyo — yaptığın işler (normal 7 / premium 20) */}
        <Label text={`${t('expert.reg.portfolio')}  (${portfolio.length}/${PORTFOLIO_MAX})`} />
        <Text variant="caption" tone="muted" style={styles.hint}>
          {t('expert.reg.portfolio_hint')}
        </Text>
        <View style={styles.certRow}>
          {portfolio.length < PORTFOLIO_MAX ? (
            <Pressable style={styles.certAdd} onPress={addPortfolio}>
              <Ionicons name="images-outline" size={22} color={colors.inkSoft} />
            </Pressable>
          ) : null}
          {portfolio.map((uri, i) => (
            <View key={`${uri}-${i}`}>
              <Image source={{ uri }} style={styles.certThumb} />
              <Pressable
                style={styles.thumbRemove}
                hitSlop={6}
                onPress={() => setPortfolio((p) => p.filter((_, idx) => idx !== i))}
              >
                <Ionicons name="close-circle" size={20} color={colors.onColor} />
              </Pressable>
            </View>
          ))}
        </View>

        <Label text={t('expert.reg.social')} />
        <SocialLinks value={social} onChange={setSocial} />
        <Label text={t('expert.reg.hours')} />
        <WorkingHours value={hours} onChange={setHours} />

        {/* Salon bağlantısı */}
        <Section text={t('expert.reg.salon_q')} />
        <View style={styles.chips}>
          <Chip label={t('common.no')} active={!bound} onPress={() => setBound(false)} />
          <Chip label={t('common.yes')} active={bound} onPress={() => setBound(true)} />
        </View>
        {bound ? (
          <>
            {salonId ? (
              <View style={styles.selectedSalon}>
                <Ionicons name="storefront" size={18} color={colors.onAccent} />
                <View style={styles.selectedText}>
                  <Text variant="caption" tone="onAccent">
                    {t('expert.reg.salon_selected')}
                  </Text>
                  <Text variant="bodyStrong" tone="onAccent" numberOfLines={1}>
                    {salonName}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setSalonId(null);
                    setSalonName('');
                  }}
                  hitSlop={8}
                >
                  <Text variant="caption" tone="onAccent" style={styles.change}>
                    {t('expert.reg.salon_change')}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Label text={t('expert.reg.salon_search')} />
                <View style={styles.salonSearch}>
                  <Ionicons name="search" size={18} color={colors.muted} />
                  <TextInput
                    value={salonQuery}
                    onChangeText={setSalonQuery}
                    placeholder={t('expert.reg.salon_search_ph')}
                    placeholderTextColor={colors.muted}
                    style={styles.salonInput}
                  />
                </View>
                {salonQuery.trim() ? (
                  <View style={styles.salonResults}>
                    {salonResults.length === 0 ? (
                      <Text variant="caption" tone="muted" style={styles.salonEmpty}>
                        {t('expert.reg.salon_none')}
                      </Text>
                    ) : (
                      salonResults.map((s) => (
                        <Pressable
                          key={s.id}
                          style={styles.salonRow}
                          onPress={() => {
                            setSalonId(s.id);
                            setSalonName(s.name);
                            setSalonQuery('');
                          }}
                        >
                          <Image source={{ uri: s.image }} style={styles.salonThumb} />
                          <View style={styles.selectedText}>
                            <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                              {s.name}
                            </Text>
                            <Text variant="caption" tone="muted" numberOfLines={1}>
                              {s.city} · {s.district}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                        </Pressable>
                      ))
                    )}
                  </View>
                ) : null}
              </>
            )}
            {salonId ? (
              <>
                <Label text={t('expert.reg.code')} />
                <Text variant="caption" tone="muted" style={styles.hint}>
                  {t('expert.reg.code_hint')}
                </Text>
                <Input value={code} onChange={setCode} placeholder={t('expert.reg.code_ph')} />
              </>
            ) : null}
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
    // Örnek çekimler + otomatik cut-out anlatımı
    photoLead: { marginTop: -space(0.5), marginBottom: space(1.5), lineHeight: 18 },
    exampleRow: { flexDirection: 'row', gap: space(1), marginBottom: space(1.25) },
    exampleCard: {
      flex: 1,
      aspectRatio: 0.8,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      overflow: 'hidden',
      position: 'relative',
    },
    exampleImg: { width: '100%', height: '100%' },
    exampleTick: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    autoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: space(1.5),
      paddingVertical: space(1),
      borderRadius: radius.md,
      marginBottom: space(1.5),
    },
    autoText: { flex: 1, fontWeight: '600', lineHeight: 17 },
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
    svcNameText: { flex: 1 },
    check: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
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
    warnRow: { flexDirection: 'row', gap: space(1), marginTop: space(1.25) },
    warnText: { flex: 1, lineHeight: 17 },
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
    thumbRemove: {
      position: 'absolute',
      top: -6,
      right: -6,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 11,
    },
    selectedSalon: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      backgroundColor: colors.accent,
      borderRadius: radius.lg,
      padding: space(2),
    },
    selectedText: { flex: 1 },
    change: { fontWeight: '800', textDecorationLine: 'underline' },
    salonSearch: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      height: 52,
      paddingHorizontal: space(2),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    salonInput: { flex: 1, fontSize: 16, color: colors.ink },
    salonResults: { marginTop: space(1.25), gap: space(1) },
    salonEmpty: { paddingVertical: space(2), textAlign: 'center' },
    salonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.5),
    },
    salonThumb: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.bgSunken },
    footer: { paddingHorizontal: space(3), paddingTop: space(1.5), paddingBottom: space(3) },
  });
