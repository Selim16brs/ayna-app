import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { api, type SellerReview, type SellerReviews } from '../../src/api';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text } from '../../src/ui';

export default function SellerReviewsScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const token = useStore((s) => s.token);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [data, setData] = useState<SellerReviews | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const biz = await api.myBusinesses(token).catch(() => []);
    const id = biz[0]?.id ?? null;
    setBusinessId(id);
    setData(id ? await api.businessReviews(token, id).catch(() => null) : { linked: false, average: null, count: 0, reviews: [] });
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('seller.reviews.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="caption" tone="muted" style={styles.hint}>
          {t('seller.reviews.hint')}
          {data && data.average != null ? `  ·  ★ ${data.average} (${data.count})` : ''}
        </Text>

        {data === null ? null : !data.linked ? (
          <View style={[styles.card, shadow.soft]}>
            <Text variant="caption" tone="muted">
              {t('seller.reviews.not_linked')}
            </Text>
          </View>
        ) : data.reviews.length === 0 ? (
          <View style={[styles.card, shadow.soft]}>
            <Text variant="caption" tone="muted">
              {t('seller.reviews.empty')}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {data.reviews.map((r) => (
              <ReviewRow
                key={r.id}
                review={r}
                businessId={businessId!}
                token={token}
                onReplied={load}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function ReviewRow({
  review,
  businessId,
  token,
  onReplied,
}: {
  review: SellerReview;
  businessId: string;
  token: string | null;
  onReplied: () => void;
}) {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!token || !businessId || !text.trim()) return;
    setBusy(true);
    try {
      await api.replyBusinessReview(token, businessId, review.id, text.trim());
      setText('');
      setOpen(false);
      onReplied();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, shadow.soft]}>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Ionicons key={s} name={s <= review.score ? 'star' : 'star-outline'} size={15} color={colors.gold} />
        ))}
        {review.serviceTag ? (
          <Text variant="caption" tone="muted">
            {' · '}
            {review.serviceTag}
          </Text>
        ) : null}
      </View>
      <Text variant="body" tone="ink" style={styles.comment}>
        {review.comment || '—'}
      </Text>
      <Text variant="caption" tone="muted">
        {review.authorLabel}
      </Text>

      {review.reply ? (
        <View style={styles.reply}>
          <Text variant="caption" tone="ink">
            ↳ {t('seller.reviews.salon_reply')}: {review.reply}
          </Text>
        </View>
      ) : open ? (
        <View style={styles.replyBox}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={t('seller.reviews.reply_ph')}
            placeholderTextColor={colors.muted}
            multiline
          />
          <Button label={busy ? '…' : t('seller.reviews.send')} onPress={send} disabled={busy || !text.trim()} />
        </View>
      ) : (
        <Text variant="caption" tone="rose" style={styles.replyLink} onPress={() => setOpen(true)}>
          {t('seller.reviews.reply')}
        </Text>
      )}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { padding: space(3), paddingBottom: space(4), gap: space(1.5) },
    hint: { marginBottom: space(0.5) },
    list: { gap: space(1.25) },
    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(2), gap: space(0.5) },
    stars: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    comment: { marginTop: space(0.5) },
    reply: { backgroundColor: colors.roseSoft, borderRadius: radius.md, padding: space(1.25), marginTop: space(1) },
    replyBox: { marginTop: space(1), gap: space(1) },
    input: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.md,
      padding: space(1.5),
      minHeight: 60,
      color: colors.ink,
      textAlignVertical: 'top',
    },
    replyLink: { marginTop: space(1), fontWeight: '600' },
  });
