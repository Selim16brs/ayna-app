import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View } from 'react-native';
import { useLocale } from '../locale';
import { radius, space, type ColorTokens } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';

export type SocialValue = {
  facebook: string;
  instagram: string;
  tiktok: string;
  linkedin: string;
};

export const emptySocial: SocialValue = { facebook: '', instagram: '', tiktok: '', linkedin: '' };

type Platform = { key: keyof SocialValue; icon: keyof typeof Ionicons.glyphMap; color: string };

const PLATFORMS: Platform[] = [
  { key: 'instagram', icon: 'logo-instagram', color: '#E1306C' },
  { key: 'facebook', icon: 'logo-facebook', color: '#1877F2' },
  { key: 'tiktok', icon: 'logo-tiktok', color: '#000000' },
  { key: 'linkedin', icon: 'logo-linkedin', color: '#0A66C2' },
];

/**
 * Yeniden kullanılabilir sosyal medya girişi — her platform kendi ikonuyla
 * (Instagram, Facebook, TikTok, LinkedIn). Uzman ve salon kaydında ortak.
 */
export function SocialLinks({
  value,
  onChange,
}: {
  value: SocialValue;
  onChange: (v: SocialValue) => void;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.wrap}>
      {PLATFORMS.map((p) => (
        <View key={p.key} style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: p.color }]}>
            <Ionicons name={p.icon} size={20} color="#FFFFFF" />
          </View>
          <TextInput
            value={value[p.key]}
            onChangeText={(v) => onChange({ ...value, [p.key]: v })}
            placeholder={t('social.ph')}
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
        </View>
      ))}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    wrap: { gap: space(1) },
    row: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      flex: 1,
      height: 54,
      paddingHorizontal: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      fontWeight: '500',
      fontSize: 16,
      color: colors.ink,
    },
  });
