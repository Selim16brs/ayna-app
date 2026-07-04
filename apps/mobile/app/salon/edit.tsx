import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
  const setSalonProfile = useStore((s) => s.setSalonProfile);
  const sellerSocial = useStore((s) => s.sellerSocial);
  const sellerHours = useStore((s) => s.sellerHours);
  const setSellerProfile = useStore((s) => s.setSellerProfile);

  const [photos, setPhotos] = useState(salonProfile.photos);
  const [about, setAbout] = useState(salonProfile.about);
  const [address, setAddress] = useState(salonProfile.address);
  const [contact, setContact] = useState(salonProfile.contact);
  const [areas, setAreas] = useState(salonProfile.areas);
  const [social, setSocial] = useState(sellerSocial);
  const [hours, setHours] = useState(sellerHours);
  const cats = activeCategories();

  const editCover = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) setAvatar(res.assets[0].uri);
  };
  const addPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!res.canceled && res.assets[0]) setPhotos((p) => [...p, res.assets[0]!.uri]);
  };
  const removePhoto = (uri: string) =>
    Alert.alert(t('salon.profile.photos'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.photo.remove'), style: 'destructive', onPress: () => setPhotos((p) => p.filter((x) => x !== uri)) },
    ]);
  const toggleArea = (id: string) =>
    setAreas((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const onSave = () => {
    setSalonProfile({ photos, about, address, contact, areas });
    setSellerProfile({ social, hours });
    Alert.alert(t('salon.profile.saved'), undefined, [{ text: t('common.save'), onPress: () => router.back() }]);
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
        <Field label={t('salon.profile.contact')} value={contact} onChangeText={setContact} keyboardType="phone-pad" />

        <Label text={t('salon.profile.areas')} />
        <View style={styles.areaRow}>
          {cats.map((c) => {
            const on = areas.includes(c.id);
            return (
              <Pressable key={c.id} onPress={() => toggleArea(c.id)} style={[styles.areaChip, on && styles.areaChipOn]}>
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
    content: { paddingHorizontal: space(3), paddingTop: space(2), paddingBottom: TAB_BAR_CLEARANCE + space(2), gap: space(1) },
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
  });
