import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { type ColorTokens, radius, space } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

export function StackHeader({ title }: { title: string }) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const goBack = () => {
    // Geri gidilecek ekran yoksa (ör. deep link ile direkt açılış) ana sayfaya dön
    if (router.canGoBack()) router.back();
    else router.replace('/discover');
  };
  return (
    <View style={styles.header}>
      <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={colors.ink} />
      </Pressable>
      <Text variant="h2" tone="ink" numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      <View style={styles.back} />
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: space(2),
      paddingBottom: space(1.5),
      gap: space(1),
    },
    back: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    title: { flex: 1 },
  });
