import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { formatPrice } from '../../src/data';
import { useProfessionalDetail } from '../../src/catalog';
import { useLocale } from '../../src/locale';
import type { MessageKey } from '@ayna/i18n';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, Text } from '../../src/ui';

export default function ConfirmedScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{
    proId?: string;
    slot?: string;
    uzmanName?: string;
  }>();
  const pro = useProfessionalDetail(params.proId ?? '1');
  const isSalon = pro.kind === 'salon' && pro.staff.length > 0;
  const price = pro.services[0]?.price ?? Number(pro.priceFrom);

  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.successCircle}>
          <Ionicons name="checkmark" size={42} color={colors.onAccent} />
        </View>
        <Text variant="title" tone="ink" style={styles.title}>
          {t('quote.sent.title')}
        </Text>
        <Text variant="caption" tone="muted" style={styles.subtitle}>
          {t('booking.confirmed.awaiting')}
        </Text>

        <View style={[styles.card, shadow.card]}>
          <Field icon="cut-outline" labelKey="booking.field.service" value={pro.specialty} />
          {isSalon ? (
            <>
              <Field icon="business-outline" labelKey="booking.field.salon" value={pro.name} />
              <Field
                icon="person-outline"
                labelKey="booking.field.pro"
                value={params.uzmanName || pro.staff[0]?.name || pro.name}
              />
            </>
          ) : (
            <Field icon="person-outline" labelKey="booking.field.pro" value={pro.name} />
          )}
          <Field icon="time-outline" labelKey="booking.field.datetime" value={params.slot ?? ''} />
          <Field
            icon="pricetag-outline"
            labelKey="booking.field.price"
            value={formatPrice(price)}
            last
          />
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
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.field, !last && styles.fieldBorder]}>
      <View style={styles.fieldIcon}>
        <Ionicons name={icon} size={17} color={colors.ink} />
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

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { padding: space(3), alignItems: 'stretch' },
    successCircle: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: colors.accent,
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
      width: 38,
      height: 38,
      borderRadius: radius.md,
      backgroundColor: colors.accentSoft,
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
