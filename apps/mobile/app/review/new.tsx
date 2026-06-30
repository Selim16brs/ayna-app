import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text } from '../../src/ui';

const STARS = [1, 2, 3, 4, 5];

export default function ReviewNewScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const booking = useStore((s) => s.bookings.find((b) => b.id === id));
  const reviewBooking = useStore((s) => s.reviewBooking);

  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');

  if (!booking) {
    return (
      <Screen edges={['top']}>
        <StackHeader title={t('review.title')} />
        <View style={styles.empty}>
          <Ionicons name="star-outline" size={32} color={colors.muted} />
          <Text variant="caption" tone="muted" style={styles.emptyText}>
            {t('review.not_eligible')}
          </Text>
        </View>
      </Screen>
    );
  }

  function submit() {
    if (!id) return;
    reviewBooking(id, rating, text.trim());
    router.replace('/bookings');
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <StackHeader title={t('review.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="caption" tone="muted" style={styles.subtitle}>
          {t('review.subtitle')}
        </Text>

        {/* Hangi randevu */}
        <View style={[styles.proCard, shadow.soft]}>
          <Text variant="bodyStrong" tone="ink">
            {booking.proName}
          </Text>
          <Text variant="caption" tone="muted">
            {booking.service}
          </Text>
        </View>

        {/* Puan */}
        <Text variant="h2" tone="ink" style={styles.label}>
          {t('review.rating')}
        </Text>
        <View style={styles.stars}>
          {STARS.map((s) => (
            <Pressable key={s} onPress={() => setRating(s)} hitSlop={6}>
              <Ionicons
                name={s <= rating ? 'star' : 'star-outline'}
                size={36}
                color={colors.gold}
              />
            </Pressable>
          ))}
        </View>

        {/* Yorum */}
        <Text variant="h2" tone="ink" style={styles.label}>
          {t('review.comment')}
        </Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('review.comment_ph')}
          placeholderTextColor={colors.muted}
          multiline
          style={styles.input}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('review.submit')}
          variant={rating > 0 ? 'primary' : 'secondary'}
          disabled={rating === 0}
          onPress={submit}
        />
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4) },
    subtitle: { marginBottom: space(2) },
    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: space(8),
      gap: space(1.5),
    },
    emptyText: {},
    proCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(2),
      gap: 2,
    },
    label: { marginTop: space(3), marginBottom: space(1.5) },
    stars: { flexDirection: 'row', gap: space(1.5) },
    input: {
      minHeight: 120,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(2),
      textAlignVertical: 'top',
      color: colors.ink,
      fontSize: 15,
    },
    footer: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
  });
