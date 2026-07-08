import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { api } from '../../src/api';
import { useStore } from '../../src/store';
import { useLocale } from '../../src/locale';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, Text } from '../../src/ui';

// Kayıttan gelen başlangıç galerisi (demo)

export default function GalleryScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  // §6.1 — galeri HESAPTA: açılışta buluttan gelir; ekle/sil ANINDA buluta kaydedilir
  const token = useStore((s) => s.token);
  const [photos, setPhotos] = useState<string[]>([]);
  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      let alive = true;
      void api
        .myPortfolio(token)
        .then((r) => alive && setPhotos(r.photos))
        .catch(() => undefined);
      return () => {
        alive = false;
      };
    }, [token]),
  );
  const persist = (next: string[]) => {
    setPhotos(next);
    if (token) void api.setMyPortfolio(token, next).catch(() => undefined);
  };

  async function addPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.35,
      base64: true, // data URL → hesapta kalıcı + public profilde görünür
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      const uri = a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri;
      persist([uri, ...photos].slice(0, 20));
    }
  }

  function remove(uri: string) {
    Alert.alert(t('gallery.remove_confirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => persist(photos.filter((x) => x !== uri)),
      },
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
            <Ionicons name="add" size={26} color={colors.accentFg} />
            <Text variant="caption" tone="accentFg">
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
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.accentFg,
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
