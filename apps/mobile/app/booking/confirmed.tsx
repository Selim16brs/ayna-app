import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { formatPrice, getProfessionalDetail } from '../../src/data';
import { useLocale } from '../../src/locale';
import type { MessageKey } from '@ayna/i18n';
import { colors, radius, shadow, space } from '../../src/theme';
import { Button, Screen, Text } from '../../src/ui';

export default function ConfirmedScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const params = useLocalSearchParams<{ proId?: string; day?: string; time?: string }>();
  const pro = getProfessionalDetail(params.proId ?? '1');
  const price = pro.services[0]?.price ?? Number(pro.priceFrom);

  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.successCircle}>
          <Ionicons name="checkmark" size={40} color={colors.onColor} />
        </View>
        <Text variant="title" tone="ink" style={styles.title}>
          {t('booking.confirmed.title')}
        </Text>
        <Text variant="caption" tone="muted" style={styles.subtitle}>
          {t('booking.confirmed.subtitle')}
        </Text>

        <View style={[styles.card, shadow.card]}>
          <Field icon="cut-outline" labelKey="booking.field.service" value={pro.specialty} />
          <Field icon="person-outline" labelKey="booking.field.pro" value={pro.name} />
          <Field
            icon="time-outline"
            labelKey="booking.field.datetime"
            value={`${params.day ?? ''} · ${params.time ?? ''}`}
          />
          <Field
            icon="pricetag-outline"
            labelKey="booking.field.price"
            value={formatPrice(price)}
          />
          <Field
            icon="location-outline"
            labelKey="booking.field.address"
            value="Almatı, Dostyk 162"
          />
          <Field icon="call-outline" labelKey="booking.field.phone" value="+7 700 123 45 67" last />
        </View>

        <View style={styles.note}>
          <Ionicons name="lock-closed" size={13} color={colors.muted} />
          <Text variant="caption" tone="muted" style={styles.noteText}>
            {t('booking.address_note')}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('booking.confirmed.done')}
          variant="primary"
          onPress={() => router.replace('/bookings')}
        />
      </View>
    </Screen>
  );
}

function Field({
  icon,
  labelKey,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: MessageKey;
  value: string;
  last?: boolean;
}) {
  const { t } = useLocale();
  return (
    <View style={[styles.field, !last && styles.fieldBorder]}>
      <View style={styles.fieldIcon}>
        <Ionicons name={icon} size={17} color={colors.rose} />
      </View>
      <View style={styles.fieldText}>
        <Text variant="caption" tone="muted">
          {t(labelKey)}
        </Text>
        <Text variant="bodyStrong" tone="ink">
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space(3), alignItems: 'stretch' },
  successCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: space(2),
  },
  title: { textAlign: 'center', marginTop: space(2) },
  subtitle: { textAlign: 'center', marginTop: space(1), marginBottom: space(3) },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space(2),
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    paddingVertical: space(1.75),
  },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  fieldIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.roseSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldText: { flex: 1, gap: 2 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
    marginTop: space(2),
    paddingHorizontal: space(1),
  },
  noteText: { flex: 1 },
  footer: { paddingHorizontal: space(3), paddingTop: space(1.5) },
});
