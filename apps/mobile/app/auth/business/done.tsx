import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useLocale } from '../../../src/locale';
import { colors, space } from '../../../src/theme';
import { Button, Screen, Text } from '../../../src/ui';

export default function BusinessDoneScreen() {
  const router = useRouter();
  const { t } = useLocale();

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.circle}>
          <Ionicons name="checkmark" size={40} color={colors.onColor} />
        </View>
        <Text variant="title" tone="ink" style={styles.title}>
          {t('biz.done.title')}
        </Text>
        <Text variant="body" tone="muted" style={styles.sub}>
          {t('biz.done.subtitle')}
        </Text>
      </View>
      <View style={styles.footer}>
        <Button
          label={t('biz.done.cta')}
          variant="primary"
          onPress={() => router.replace('/seller/reports')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space(4) },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space(2.5),
  },
  title: { textAlign: 'center' },
  sub: { textAlign: 'center', marginTop: space(1) },
  footer: { paddingHorizontal: space(3), paddingTop: space(1.5) },
});
