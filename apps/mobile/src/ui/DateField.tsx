import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatTrDate } from '../date-label';
import { tarihYaz } from '../takvim';

// Geriye dönük: bu ad barrel'dan dışa aktarılıyordu ve çağıranları var.
export { formatTrDate };
import { radius, space, type ColorTokens } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { TakvimSecici } from './TakvimSecici';
import { Text } from './Text';

/**
 * TARİH ALANI — artık NATIVE MODÜLSÜZ.
 *
 * Kurucu: "takvim asılı kalmış hiçbir değişiklik yapılamıyor... aynı hatalar
 * diğer takvimle giriş yapılan yerlerde de var."
 *
 * Burası `@react-native-community/datetimepicker` kullanıyordu. O NATIVE bir
 * modül; telefondaki yapı onu içermediğinde iOS'taki `compact` görünüm epoch
 * sıfırla (1 Oca 1970) çiziliyor ve dokunuşa yanıt vermiyordu. `app.json`
 * `runtimeVersion: sdkVersion` olduğu için OTA eski yapılara da iniyor: JS
 * güncelleniyor ama native modül gelmiyor, dolayısıyla OTA bunu çözemiyordu.
 *
 * Artık tek bir dokunma hedefi + saf JS takvim. Hem eski yapıda çalışıyor
 * hem de her platformda AYNI görünüyor — `compact` yalnız iOS'ta vardı ve
 * iki platform iki farklı arayüz gösteriyordu.
 */
export function DateField({
  label,
  value,
  onChange,
  mode,
  minimumDate,
  maximumDate,
  last,
}: {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
  mode: 'date' | 'datetime';
  minimumDate?: Date;
  maximumDate?: Date;
  last?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [acik, setAcik] = useState(false);
  return (
    <View style={[styles.field, !last && styles.fieldGap]}>
      <Text variant="bodyStrong" tone="ink" style={styles.label}>
        {label}
      </Text>
      <Pressable style={styles.input} onPress={() => setAcik(true)} accessibilityRole="button">
        <Ionicons name="calendar-outline" size={18} color={colors.accentFg} />
        <Text variant="bodyStrong" tone="ink" style={styles.dateText}>
          {tarihYaz(value, mode === 'datetime')}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.muted} />
      </Pressable>
      <TakvimSecici
        acik={acik}
        deger={value}
        kapat={() => setAcik(false)}
        secildi={onChange}
        saatli={mode === 'datetime'}
        {...(minimumDate ? { enAz: minimumDate } : {})}
        {...(maximumDate ? { enCok: maximumDate } : {})}
      />
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    field: {},
    fieldGap: { marginBottom: space(2) },
    label: { marginBottom: space(0.75) },
    input: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      paddingHorizontal: space(2),
      paddingVertical: space(1.5),
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    dateText: { flex: 1 },
  });
