import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { ApiError, api } from '../../src/api';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text, TextInput } from '../../src/ui';

// §9.5 — bağımsız uzman sonradan bir salona katılır (salonun verdiği tek kullanımlık kod).
export default function JoinSalonScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const refreshMembership = useStore((s) => s.refreshMembership);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const c = code.trim();
    if (c.length < 4 || busy) return;
    setBusy(true);
    try {
      const res = await api.joinBusiness(c);
      await refreshMembership(); // businessName güncellensin
      Alert.alert(t('joinsalon.ok_t'), `${t('joinsalon.ok_b')} ${res.businessName}`.trim(), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch (err) {
      const msg =
        err instanceof ApiError && err.code === 'ALREADY_IN_BUSINESS'
          ? t('joinsalon.err_already')
          : t('joinsalon.err_code');
      Alert.alert(t('joinsalon.title'), msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('joinsalon.title')} />
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="business" size={30} color={colors.accentFg} />
        </View>
        <Text variant="body" tone="inkSoft" style={styles.desc}>
          {t('joinsalon.desc')}
        </Text>
        <TextInput
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase())}
          placeholder={t('joinsalon.code_ph')}
          placeholderTextColor={colors.muted}
          autoCapitalize="characters"
          style={styles.input}
        />
        <Button
          label={busy ? '…' : t('joinsalon.cta')}
          variant={code.trim().length >= 4 ? 'primary' : 'secondary'}
          disabled={code.trim().length < 4 || busy}
          onPress={submit}
        />
        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={14} color={colors.muted} />
          <Text variant="caption" tone="muted" style={styles.flex}>
            {t('joinsalon.note')}
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { padding: space(3), gap: space(2) },
    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginTop: space(2),
    },
    desc: { textAlign: 'center', lineHeight: 21 },
    input: {
      minHeight: 54,
      paddingHorizontal: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      fontSize: 18,
      letterSpacing: 2,
      textAlign: 'center',
      color: colors.ink,
    },
    flex: { flex: 1 },
    note: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      backgroundColor: colors.surfaceMuted,
      padding: space(1.5),
      borderRadius: radius.md,
    },
  });
