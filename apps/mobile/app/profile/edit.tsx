import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { radius, space, type ColorTokens } from '../../src/theme';
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

export default function ProfileEditScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();

  const avatarUri = useStore((s) => s.avatarUri);
  const setAvatar = useStore((s) => s.setAvatar);
  const applyProfileCutout = useStore((s) => s.applyProfileCutout); // §5.1.1 — remove.bg
  const storeName = useStore((s) => s.currentUser?.name);
  // §9.5 — uzman/salon: kayıt sonrası sertifika/sosyal medya/çalışma saatleri düzenleme
  const role = useStore((s) => s.currentUser?.role);
  const isSeller = role === 'professional' || role === 'salon';
  const sellerSocial = useStore((s) => s.sellerSocial);
  const sellerHours = useStore((s) => s.sellerHours);
  const sellerCerts = useStore((s) => s.sellerCerts);
  const setSellerProfile = useStore((s) => s.setSellerProfile);
  const updateMyProfile = useStore((s) => s.updateMyProfile);
  const submitProfileChange = useStore((s) => s.submitProfileChange);

  // Faz B — alanlar GERÇEK hesaptan gelir (hardcode yok); boşsa boş görünür.
  const me = useStore((s) => s.currentUser);
  const [name, setName] = useState(storeName ?? '');
  const [email, setEmail] = useState(me?.email ?? '');
  const [phone, setPhone] = useState(me?.phone ?? '');
  const [city, setCity] = useState(me?.city ?? '');
  const [social, setSocial] = useState(sellerSocial);
  const [hours, setHours] = useState(sellerHours);
  const [certs, setCerts] = useState(sellerCerts);

  const addCert = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!res.canceled && res.assets[0]) setCerts((c) => [...c, res.assets[0]!.uri]);
  };
  const removeCert = (uri: string) =>
    Alert.alert(t('expert.reg.cert'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.photo.remove'),
        style: 'destructive',
        onPress: () => setCerts((c) => c.filter((x) => x !== uri)),
      },
    ]);

  // §5.1.1 — foto seçildi: normal avatarı ayarla + (premium & removebg ise) arka planı
  // remove.bg ile temizle (Keşfet/uzman hero'sunda kullanılır). Premium değilse upsell.
  const onPhotoPicked = async (asset: ImagePicker.ImagePickerAsset) => {
    // data URL: hem yerelde gösterilir hem HESABA yazılır (store.setAvatar buluta senkronlar)
    setAvatar(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri);
    if (!asset.base64) return;
    const res = await applyProfileCutout(asset.base64);
    if (res === 'not_premium') {
      Alert.alert(t('cutout.upsell_title'), t('cutout.upsell_body'));
    } else if (res === 'ok') {
      Alert.alert(t('cutout.done'));
    } else if (res === 'error' || res === 'unavailable') {
      // Sessizce geçme: arka plan temizlenemedi → kullanıcı ham fotonun kullanıldığını bilsin.
      Alert.alert(t('cutout.failed'));
    }
  };

  // Galeriden fotoğraf seç (kare kırpma)
  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3, // data URL hesapta taşınır + cutout payload'ı küçük kalsın
      base64: true,
    });
    if (!res.canceled && res.assets[0]) void onPhotoPicked(res.assets[0]);
  };

  // Kamera ile çek (izin iste)
  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('profile.photo.camera_denied'));
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3, // data URL hesapta taşınır + cutout payload'ı küçük kalsın
      base64: true,
    });
    if (!res.canceled && res.assets[0]) void onPhotoPicked(res.assets[0]);
  };

  const removePhoto = () =>
    Alert.alert(t('profile.photo.remove'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.photo.remove'), style: 'destructive', onPress: () => setAvatar(null) },
    ]);

  const onSave = async () => {
    if (isSeller) {
      // §profil-onay — salon/uzman: değişiklik ADMIN ONAYINA gider, yerelde uygulanmaz
      await submitProfileChange({ name, social, hours, certs });
      Alert.alert(t('profile.edit.pending_t'), t('profile.edit.pending_b'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } else {
      // müşteri: anında uygula (boş isim kaydetme — Keşfet ismi boşalmasın)
      const trimmed = name.trim();
      if (trimmed) updateMyProfile({ name: trimmed });
      Alert.alert(t('profile.edit.saved'), undefined, [
        { text: t('common.save'), onPress: () => router.back() },
      ]);
    }
  };

  return (
    <Screen edges={['bottom']}>
      <StackHeader title={t('profile.edit.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Profil fotoğrafı: galeri / kamera / kaldır ── */}
        <View style={styles.photoSection}>
          <Pressable style={styles.avatarWrap} onPress={pickFromGallery}>
            <View style={[styles.avatar, shadow.soft]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
              ) : (
                <Text variant="display" tone="inkSoft">
                  {name.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            {/* Rozet, dairenin DIŞINDA (kırpılmaz) */}
            <View style={styles.camBadge}>
              <Ionicons name="camera" size={15} color={colors.onAccent} />
            </View>
          </Pressable>

          <View style={styles.photoActions}>
            <Pressable style={styles.photoBtn} onPress={pickFromGallery}>
              <Ionicons name="image-outline" size={16} color={colors.ink} />
              <Text variant="caption" tone="ink" style={styles.photoBtnText}>
                {t('profile.photo.gallery')}
              </Text>
            </Pressable>
            <Pressable style={styles.photoBtn} onPress={pickFromCamera}>
              <Ionicons name="camera-outline" size={16} color={colors.ink} />
              <Text variant="caption" tone="ink" style={styles.photoBtnText}>
                {t('profile.photo.camera')}
              </Text>
            </Pressable>
            {avatarUri ? (
              <Pressable style={styles.photoBtn} onPress={removePhoto}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text variant="caption" style={[styles.photoBtnText, { color: colors.danger }]}>
                  {t('profile.photo.remove')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Field label={t('profile.edit.name')} value={name} onChangeText={setName} />
        <Field
          label={t('profile.edit.email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <Field
          label={t('profile.edit.phone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Field label={t('profile.edit.city')} value={city} onChangeText={setCity} />

        {/* §9.5 — uzman/salon: sertifika + sosyal medya + çalışma saatleri (kayıt sonrası düzenleme) */}
        {isSeller ? (
          <>
            <View style={styles.sellerSection}>
              <Text variant="bodyStrong" tone="ink" style={styles.fieldLabel}>
                {t('expert.reg.cert')}
              </Text>
              <View style={styles.certRow}>
                <Pressable style={styles.certAdd} onPress={addCert}>
                  <Ionicons name="add" size={24} color={colors.inkSoft} />
                </Pressable>
                {certs.map((uri, i) => (
                  <Pressable key={`${uri}-${i}`} onPress={() => removeCert(uri)}>
                    <Image source={{ uri }} style={styles.certThumb} />
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.sellerSection}>
              <Text variant="bodyStrong" tone="ink" style={styles.fieldLabel}>
                {t('expert.reg.social')}
              </Text>
              <SocialLinks value={social} onChange={setSocial} />
            </View>

            <View style={styles.sellerSection}>
              <Text variant="bodyStrong" tone="ink" style={styles.fieldLabel}>
                {t('expert.reg.hours')}
              </Text>
              <WorkingHours value={hours} onChange={setHours} />
            </View>
          </>
        ) : null}

        <View style={styles.save}>
          <Button label={t('common.save')} onPress={onSave} />
        </View>
      </ScrollView>
    </Screen>
  );
}

// §fix — Field MODÜL SEVİYESİNDE (component içinde tanımlıydı → her render yeni referans
// → input unmount/remount → her karakterde odak kaybı). Modül-seviye = stabil, odak korunur.
function Field({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.field}>
      <Text variant="bodyStrong" tone="ink" style={styles.fieldLabel}>
        {label}
      </Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: space(3),
      paddingTop: space(3),
      paddingBottom: TAB_BAR_CLEARANCE,
      gap: space(2.5),
    },
    photoSection: { alignItems: 'center', gap: space(2) },
    avatarWrap: { width: 104, height: 104 },
    avatar: {
      width: 104,
      height: 104,
      borderRadius: 52,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    camBadge: {
      position: 'absolute',
      right: 0,
      bottom: 2,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.bg,
    },
    photoActions: { flexDirection: 'row', gap: space(1) },
    photoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.surface,
      paddingHorizontal: space(1.5),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.line,
    },
    photoBtnText: { fontWeight: '700' },
    field: { gap: space(1) },
    fieldLabel: { marginLeft: space(0.5) },
    input: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.lg,
      paddingHorizontal: space(2.25),
      paddingVertical: space(2),
      fontSize: 16,
      color: colors.ink,
    },
    save: { marginTop: space(2) },
    sellerSection: { gap: space(1) },
    certRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    certAdd: {
      width: 64,
      height: 64,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.line,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    certThumb: {
      width: 64,
      height: 64,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
    },
  });
