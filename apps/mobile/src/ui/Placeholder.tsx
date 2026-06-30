import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useLocale } from '../locale';
import type { MessageKey } from '@ayna/i18n';
import { type ColorTokens, radius, space } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Screen } from './Screen';
import { Text } from './Text';

type IoniconName = keyof typeof Ionicons.glyphMap;

export function Placeholder({ icon, titleKey }: { icon: IoniconName; titleKey: MessageKey }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Screen edges={['top']}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={34} color={colors.rose} />
        </View>
        <Text variant="title" tone="ink" style={styles.title}>
          {t(titleKey)}
        </Text>
        <Text variant="body" tone="muted" style={styles.subtitle}>
          {t('screen.placeholder')}
        </Text>
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space(4) },
    iconCircle: {
      width: 84,
      height: 84,
      borderRadius: radius.xl,
      backgroundColor: colors.roseSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(2.5),
    },
    title: { textAlign: 'center' },
    subtitle: { textAlign: 'center', marginTop: space(1) },
  });
