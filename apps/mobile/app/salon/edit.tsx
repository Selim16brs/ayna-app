import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { api } from '../../src/api';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { activeCategories } from '../../src/taxonomy';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import {
  Button,
  Screen,
  SocialLinks,
  StackHeader,
  TAB_BAR_CLEARANCE,
  Text,
  TextInput,
  WorkingHours,
} from '../../src/ui';

// §10.1/§6.2 — SALON profil DÜZENLEME formu (Profil hub'ından "Profili düzenle" ile açılır).
export default function SalonEditScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();

  const salonName = useStore((s) => s.currentUser?.name) ?? 'Salon';
  const avatarUri = useStore((s) => s.avatarUri);
  const setAvatar = useStore((s) => s.setAvatar);
  const salonProfile = useStore((s) => s.salonProfile);
  const sellerSocial = useStore((s) => s.sellerSocial);
  const sellerHours = useStore((s) => s.sellerHours);
  const submitProfileChange = useStore((s) => s.submitProfileChange);
  const setSalonProfile = useStore((s) => s.setSalonProfile);
  const setSellerProfile = useStore((s) => s.setSellerProfile);

  const [photos, setPhotos] = useState(salonProfile.photos);
  const [about, setAbout] = useState(salonProfile.about);
  const [address, setAddress] = useState(salonProfile.address);
  const [contact, setContact] = useState(salonProfile.contact);
  const [areas, setAreas] = useState(salonProfile.areas);
  const [social, setSocial] = useState(sellerSocial);
  const [hours, setHours] = useState(sellerHours);
  const cats = activeCategories();

  // §5.5 Faz 4 — sosyal medya sahiplik doğrulama (AYN-XXXX kodu Instagram bio'ya)
  const token = useStore((s) => s.token);
  const [bizId, setBizId] = useState<string | null>(null);
  const [igUser, setIgUser] = useState('');
  const [igCode, setIgCode] = useState('');
  const [igVerified, setIgVerified] = useState(false);
  const [igBusy, setIgBusy] = useState(false);
  useEffect(() => {
    if (!token) return;
    void api
      .myBusinesses(token)
      .then((list) => {
        const b = list[0];
        if (!b) return;
        setBizId(b.id);
        if (b.socialInstagram) setIgUser(b.socialInstagram);
        if (b.socialVerifyCode) setIgCode(b.socialVerifyCode);
        setIgVerified(b.verification?.social ?? false);
      })
      .catch(() => undefined);
  }, [token]);
  const genSocialCode = async () => {
    if (!token || !bizId || igUser.trim().length < 1) return;
    setIgBusy(true);
    try {
      const r = await api.socialVerifyCode(token, bizId, igUser.trim());
      setIgCode(r.code);
      setIgVerified(r.verified);
    } catch {
      Alert.alert(t('common.error'));
    } finally {
      setIgBusy(false);
    }
  };

  // KRİTİK: foto DATA URL olarak saklanır — file:// yerel yol uygulama kapanınca SİLİNİR (veri kaybı).
  const editCover = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.35,
      base64: true,
    });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      setAvatar(a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri);
    }
  };
  const addPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.35,
      base64: true,
    });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      const uri = a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri;
      setPhotos((p) => [...p, uri]);
    }
  };
  const removePhoto = (uri: string) =>
    Alert.alert(t('salon.profile.photos'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.photo.remove'),
        style: 'destructive',
        onPress: () => setPhotos((p) => p.filter((x) => x !== uri)),
      },
    ]);
  const toggleArea = (id: string) =>
    setAreas((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  // §profil-onay — salon profil değişikliği ADMIN ONAYINA gider (yerelde uygulanmaz)
  const onSave = async () => {
    // Değişiklik ANINDA yerelde uygulanır (salon kendi düzenlemesini hemen görür) +
    // admin onayına gönderilir (§profil-onay). Sertifika/foto data URL olarak kalıcıdır.
    setSalonProfile({ photos, about, address, contact, areas });
    setSellerProfile({ social, hours });
    try {
      await submitProfileChange({
        salonProfile: { photos, about, address, contact, areas },
        social,
        hours,
      });
      Alert.alert(t('profile.edit.pending_t'), t('profile.edit.pending_b'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert(t('profile.edit.title'), t('profile.edit.save_err'));
    }
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('salon.edit.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="caption" tone="muted" style={styles.intro}>
          {t('salon.profile.intro')}
        </Text>

        {/* Salon kapak fotoğrafı (ana sayfa hero'su) */}
        <Label text={t('salon.profile.photos')} />
        <Pressable style={styles.cover} onPress={editCover}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : null}
          <View style={styles.coverBadge}>
            <Ionicons name="camera" size={16} color={colors.onAccent} />
          </View>
        </Pressable>

        {/* Galeri fotoğrafları */}
        <View style={styles.photoRow}>
          <Pressable style={styles.photoAdd} onPress={addPhoto}>
            <Ionicons name="add" size={22} color={colors.inkSoft} />
          </Pressable>
          {photos.map((uri, i) => (
            <Pressable key={`${uri}-${i}`} onPress={() => removePhoto(uri)}>
              <Image source={{ uri }} style={styles.photo} />
            </Pressable>
          ))}
        </View>

        <View style={styles.nameCard}>
          <Ionicons name="business" size={16} color={colors.accentFg} />
          <Text variant="bodyStrong" tone="ink" numberOfLines={1} style={styles.flex}>
            {salonName}
          </Text>
        </View>

        <Field label={t('salon.profile.about')} value={about} onChangeText={setAbout} multiline />
        <Field label={t('salon.profile.address')} value={address} onChangeText={setAddress} />
        <Field
          label={t('salon.profile.contact')}
          value={contact}
          onChangeText={setContact}
          keyboardType="phone-pad"
        />

        <Label text={t('salon.profile.areas')} />
        <View style={styles.areaRow}>
          {cats.map((c) => {
            const on = areas.includes(c.id);
            return (
              <Pressable
                key={c.id}
                onPress={() => toggleArea(c.id)}
                style={[styles.areaChip, on && styles.areaChipOn]}
              >
                <Ionicons name={c.icon} size={13} color={on ? colors.onAccent : colors.muted} />
                <Text variant="caption" tone={on ? 'onAccent' : 'inkSoft'}>
                  {t(c.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Label text={t('salon.profile.hours')} />
        <WorkingHours value={hours} onChange={setHours} />
        <Label text={t('salon.profile.social')} />
        <SocialLinks value={social} onChange={setSocial} />

        {/* §5.5 Faz 4 — Instagram sahiplik doğrulama (kod-bio yöntemi) */}
        {bizId ? (
          <>
            <Label text={t('salon.social.verify_title')} />
            {igVerified ? (
              <View style={styles.igVerified}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text variant="body" tone="ink">
                  {t('salon.social.verified')} @{igUser}
                </Text>
              </View>
            ) : (
              <>
                <Text variant="caption" tone="muted" style={styles.igHint}>
                  {t('salon.social.verify_hint')}
                </Text>
                <View style={styles.igRow}>
                  <View style={styles.igInput}>
                    <TextInput
                      value={igUser}
                      onChangeText={(v) => setIgUser(v.replace(/^@+/, ''))}
                      placeholder="kullanici_adi"
                      placeholderTextColor={colors.muted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.igField}
                    />
                  </View>
                  <Button
                    label={t('salon.social.get_code')}
                    variant={igUser.trim() && !igBusy ? 'primary' : 'secondary'}
                    onPress={genSocialCode}
                  />
                </View>
                {igCode ? (
                  <View style={styles.igCodeBox}>
                    <Text variant="caption" tone="muted">
                      {t('salon.social.add_to_bio')}
                    </Text>
                    <Text variant="display" tone="accentFg" style={styles.igCode}>
                      {igCode}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {t('salon.social.pending_admin')}
                    </Text>
                  </View>
                ) : null}
              </>
            )}
          </>
        ) : null}

        <View style={styles.save}>
          <Button label={t('common.save')} variant="primary" onPress={onSave} />
        </View>
      </ScrollView>
    </Screen>
  );

  function Label({ text }: { text: string }) {
    return (
      <Text variant="label" tone="accentFg" style={styles.label}>
        {text}
      </Text>
    );
  }

  function Field({
    label,
    value,
    onChangeText,
    keyboardType,
    multiline,
  }: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    keyboardType?: 'default' | 'phone-pad';
    multiline?: boolean;
  }) {
    return (
      <View style={styles.field}>
        <Text variant="label" tone="accentFg" style={styles.label}>
          {label}
        </Text>
        <TextInput
          style={[styles.input, multiline && styles.inputMulti]}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          placeholderTextColor={colors.muted}
        />
      </View>
    );
  }
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: space(3),
      paddingTop: space(2),
      paddingBottom: TAB_BAR_CLEARANCE + space(2),
      gap: space(1),
    },
    intro: { lineHeight: 18, marginBottom: space(1) },
    flex: { flex: 1 },
    label: { marginTop: space(1.5), marginBottom: space(0.5) },
    cover: {
      height: 150,
      borderRadius: radius.lg,
      overflow: 'hidden',
      backgroundColor: colors.surfaceMuted,
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      padding: space(1.25),
    },
    coverBadge: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    photoAdd: {
      width: 72,
      height: 72,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.line,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    photo: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
    nameCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: space(1.75),
      paddingVertical: space(1.5),
      marginTop: space(1.5),
    },
    field: { gap: space(0.5) },
    input: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingHorizontal: space(1.75),
      paddingVertical: space(1.5),
      color: colors.ink,
      fontSize: 15,
    },
    inputMulti: { minHeight: 72, textAlignVertical: 'top' },
    areaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    areaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: space(1.25),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
      borderWidth: 1.25,
      borderColor: colors.line,
      backgroundColor: colors.surface,
    },
    areaChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    save: { marginTop: space(2.5) },
    igHint: { marginBottom: space(1) },
    igRow: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    igInput: { flex: 1 },
    igField: {
      height: 48,
      paddingHorizontal: space(1.75),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      color: colors.ink,
      fontSize: 15,
    },
    igCodeBox: {
      marginTop: space(1.5),
      padding: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      gap: space(0.5),
    },
    igCode: { fontSize: 26, fontWeight: '900', letterSpacing: 2 },
    igVerified: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      marginTop: space(0.5),
    },
  });
