import { StyleSheet, TextInput as RNTextInput, type TextInputProps, View } from 'react-native';
import { radius, space } from '../theme';
import { useTheme } from '../theme-context';
import { Text } from './Text';

interface Props extends TextInputProps {
  /**
   * Polish 2.4 — alan bazlı hata: kenarlık kızarır + altta kısa açıklama.
   * Hata Alert'te kaybolmaz; kullanıcı HANGİ alanın yanlış olduğunu görür.
   */
  error?: string;
}

// Girişler de SF sistem fontu — fontFamily VERİLMEZ. Sadece stil geçişi (passthrough).
export function TextInput({ error, style, ...props }: Props) {
  const { colors } = useTheme();
  if (!error) return <RNTextInput style={style} {...props} />;
  return (
    <View style={styles.wrap}>
      <RNTextInput
        style={[style, { borderWidth: 1, borderColor: colors.danger, borderRadius: radius.lg }]}
        aria-invalid
        {...props}
      />
      <Text variant="caption" style={{ color: colors.danger, marginLeft: space(0.5) }}>
        {error}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space(0.75) },
});
