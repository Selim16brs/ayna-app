import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocale } from '../../src/locale';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, Text } from '../../src/ui';

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=400&q=70`;

// Kayıttan gelen başlangıç galerisi (demo)
const SEED_GALLERY = [
  img('photo-1633681926022-84c23e8cb2d6'),
  img('photo-1595476108010-b4d1f102b1b1'),
  img('photo-1560066984-138dadb4c035'),
  img('photo-1521590832167-7bcbfaa6381f'),
];

export default function GalleryScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [photos, setPhotos] = useState<string[]>(SEED_GALLERY);

  async function addPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos((p) => [result.assets[0]!.uri, ...p]);
    }
  }

  function remove(uri: string) {
    Alert.alert(t('gallery.remove_confirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => setPhotos((p) => p.filter((x) => x !== uri)) },
    ]);
  }

  return (
    <Screen edges={[]}>
      <StackHeader title={t('gallery.manage_title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="caption" tone="muted" style={styles.hint}>
          {t('gallery.manage_hint')}
        </Text>
        <View style={styles.grid}>
          {/* Ekle kutusu */}
          <Pressable style={[styles.cell, styles.addCell]} onPress={addPhoto}>
            <Ionicons name="add" size={26} color={colors.rose} />
            <Text variant="caption" tone="rose">
              {t('gallery.add')}
            </Text>
          </Pressable>
          {photos.map((uri) => (
            <Pressable key={uri} style={styles.cell} onLongPress={() => remove(uri)}>
              <Image source={{ uri }} style={styles.photo} />
              <Pressable style={styles.removeBtn} onPress={() => remove(uri)} hitSlop={8}>
                <Ionicons name="close" size={13} color={colors.onColor} />
              </Pressable>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const GAP = space(1);
const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { padding: space(3), paddingBottom: space(4) },
    hint: { marginBottom: space(1.5) },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
    cell: {
      width: '31.5%',
      aspectRatio: 1,
      borderRadius: radius.md,
      overflow: 'hidden',
    },
    addCell: {
      backgroundColor: colors.roseSoft,
      borderWidth: 1,
      borderColor: colors.rose,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    photo: { width: '100%', height: '100%', backgroundColor: colors.surfaceMuted },
    removeBtn: {
      position: 'absolute',
      top: 5,
      right: 5,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
