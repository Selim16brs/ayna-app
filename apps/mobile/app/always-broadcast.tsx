import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { fillParams, useLocale } from '../src/locale';
import { filterAlwaysAccepted, selectSellerView, useStore } from '../src/store';
import { type ColorTokens, radius, space } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import { Button, Screen, StackHeader, TAB_BAR_CLEARANCE, Text, TextInput } from '../src/ui';

// §11 — PLATINUM toplu bildirim bestesi + SORUMLULUK beyanı.
export default function AlwaysBroadcastScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();

  // primitive (sayı) selektör → yeni-dizi döngüsü riski yok
  const count = useStore(
    (s) =>
      filterAlwaysAccepted(s.alwaysBonds, s.currentUser?.name ?? '', selectSellerView(s)).length,
  );
  const sendAlwaysBroadcast = useStore((s) => s.sendAlwaysBroadcast);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const canSend = title.trim().length > 1 && body.trim().length > 2 && count > 0;

  const onSend = () => {
    const n = sendAlwaysBroadcast({ title: title.trim(), body: body.trim() });
    Alert.alert(t('always.broadcast_sent_t'), fillParams(t('always.broadcast_sent_b'), { n }), [
      { text: t('common.ok'), onPress: () => router.back() },
    ]);
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('always.broadcast_title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="caption" tone="muted">
          {count > 0
            ? fillParams(t('always.broadcast_sub'), { n: count })
            : t('always.broadcast_none')}
        </Text>

        <Text variant="label" tone="accentFg" style={styles.label}>
          {t('always.broadcast_f_title')}
        </Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder={t('always.broadcast_ph_title')}
          placeholderTextColor={colors.muted}
          maxLength={60}
        />

        <Text variant="label" tone="accentFg" style={styles.label}>
          {t('always.broadcast_f_body')}
        </Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={body}
          onChangeText={setBody}
          placeholder={t('always.broadcast_ph_body')}
          placeholderTextColor={colors.muted}
          multiline
          maxLength={280}
        />

        {/* §sözleşme — profesyonel sorumluluk beyanı */}
        <View style={styles.disclaimer}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.muted} />
          <Text variant="caption" tone="muted" style={styles.flex}>
            {t('always.disclaimer')}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('always.broadcast_send')}
          variant="primary"
          disabled={!canSend}
          onPress={onSend}
        />
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      paddingBottom: TAB_BAR_CLEARANCE + space(2),
      gap: space(0.5),
    },
    flex: { flex: 1 },
    label: { marginTop: space(2), marginBottom: space(0.75) },
    input: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingHorizontal: space(1.75),
      paddingVertical: space(1.5),
      color: colors.ink,
      fontSize: 15,
    },
    textarea: { minHeight: 110, textAlignVertical: 'top' },
    disclaimer: {
      flexDirection: 'row',
      gap: space(1),
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: space(1.5),
      marginTop: space(2.5),
    },
    footer: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      paddingBottom: TAB_BAR_CLEARANCE, // §ui — global tab bar üstünde kalsın
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
      backgroundColor: colors.bg,
    },
  });
