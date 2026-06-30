import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { api } from '../../src/api';
import { CATEGORIES } from '../../src/data';
import { useLocale } from '../../src/locale';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text } from '../../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

export default function NewQuoteScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const categories = CATEGORIES;
  const [photo, setPhoto] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('hair');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      await api.createQuoteRequest({ categoryId: category, note: note.trim() || undefined });
    } catch {
      // demo: hata olsa da sonuç ekranına geç
    }
    router.replace('/quote/results');
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setPhoto(result.assets[0].uri);
  }

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('quote.new.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Fotoğraf */}
        <Pressable onPress={pickPhoto} style={styles.photoBox}>
          {photo ? (
            <>
              <Image source={{ uri: photo }} style={styles.photo} />
              <View style={styles.changeOverlay}>
                <Ionicons name="camera" size={16} color={colors.onColor} />
                <Text variant="caption" tone="onColor" style={styles.changeText}>
                  {t('quote.new.change_photo')}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.photoEmpty}>
              <View style={styles.photoIcon}>
                <Ionicons name="camera-outline" size={28} color={colors.rose} />
              </View>
              <Text variant="bodyStrong" tone="ink">
                {t('quote.new.photo')}
              </Text>
              <Text variant="caption" tone="muted" style={styles.photoHint}>
                {t('quote.new.photo_hint')}
              </Text>
            </View>
          )}
        </Pressable>

        {/* Kategori */}
        <Text variant="h2" tone="ink" style={styles.label}>
          {t('quote.new.category')}
        </Text>
        <View style={styles.categories}>
          {categories.map((cat) => {
            const active = cat.id === category;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setCategory(cat.id)}
                style={[styles.categoryChip, active && styles.categoryActive]}
              >
                <Ionicons
                  name={cat.icon as IoniconName}
                  size={16}
                  color={active ? colors.onColor : colors.inkSoft}
                />
                <Text variant="caption" tone={active ? 'onColor' : 'inkSoft'}>
                  {t(cat.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Not */}
        <Text variant="h2" tone="ink" style={styles.label}>
          {t('quote.new.note')}
        </Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={t('quote.new.note_ph')}
          placeholderTextColor={colors.muted}
          multiline
          style={styles.input}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('quote.new.submit')}
          variant="primary"
          disabled={submitting}
          onPress={submit}
        />
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4) },
    photoBox: {
      height: 220,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.line,
      borderStyle: 'dashed',
      overflow: 'hidden',
    },
    photo: { width: '100%', height: '100%' },
    changeOverlay: {
      position: 'absolute',
      bottom: space(1.5),
      right: space(1.5),
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(42,34,48,0.7)',
      paddingHorizontal: space(1.5),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
    },
    changeText: {},
    photoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space(1) },
    photoIcon: {
      width: 64,
      height: 64,
      borderRadius: radius.lg,
      backgroundColor: colors.roseSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(0.5),
    },
    photoHint: { textAlign: 'center', paddingHorizontal: space(4) },
    label: { marginTop: space(3), marginBottom: space(1.5) },
    categories: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    categoryActive: { backgroundColor: colors.rose, borderColor: colors.rose },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.lg,
      padding: space(2),
      minHeight: 96,
      textAlignVertical: 'top',
      fontWeight: '400',
      fontSize: 15,
      color: colors.ink,
    },
    footer: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
  });
