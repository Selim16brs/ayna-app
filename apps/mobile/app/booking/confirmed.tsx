import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { formatPrice } from '../../src/data';
import { useProfessionalDetail } from '../../src/catalog';
import { useLocale } from '../../src/locale';
import { font, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, TAB_BAR_CLEARANCE, Text } from '../../src/ui';
import { uzmanlikYazisi } from '../../src/uzmanlik';

export default function ConfirmedScreen() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{
    proId?: string;
    slot?: string;
    uzmanName?: string;
    service?: string;
    price?: string;
  }>();
  const pro = useProfessionalDetail(params.proId ?? '');
  const isSalon = pro.kind === 'salon' && pro.staff.length > 0;
  // Polish 1.1 — SEÇİLEN hizmet ve GERÇEK toplam parametreyle gelir; eski derin
  // linkler için profil verisi yalnız yedek (ilk hizmet/uzmanlık tahmini değil).
  const serviceLabel = params.service || uzmanlikYazisi(pro, locale);
  const price = params.price
    ? Number(params.price)
    : (pro.services[0]?.price ?? Number(pro.priceFrom));

  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.successCircle}>
          <Ionicons name="checkmark" size={42} color={colors.success} />
        </View>
        <Text style={styles.title}>{t('quote.sent.title')}</Text>
        <Text style={styles.subtitle}>{t('booking.confirmed.awaiting')}</Text>

        <View style={styles.card}>
          <View style={styles.proSatir}>
            <View style={styles.proFoto} />
            <View style={styles.buyu}>
              <Text style={styles.proAd} numberOfLines={1}>
                {isSalon ? pro.name : pro.name}
              </Text>
              <Text style={styles.proHizmet} numberOfLines={1}>
                {isSalon ? t('booking.field.salon') : t('booking.field.pro')}
              </Text>
            </View>
          </View>
          <View style={styles.ayrac} />
          <Ozet label={t('booking.field.service')} value={serviceLabel} />
          <Ozet label={t('booking.field.datetime')} value={params.slot ?? ''} />
          <Ozet label={t('booking.field.price')} value={formatPrice(price)} />
          {isSalon ? (
            <>
              <Ozet label={t('booking.field.salon')} value={pro.name} />
              <Ozet
                label={t('booking.field.pro')}
                value={params.uzmanName || pro.staff[0]?.name || pro.name}
              />
            </>
          ) : null}
        </View>

        {/* GİZLİLİK — Figma dilinde accent %7 zeminli bilgi kutusu.
            Adresin ne zaman açıldığını ve numaranın paylaşılmadığını
            kullanıcı burada, beklemeye başlarken bilmeli. */}
        <View style={styles.note}>
          <Ionicons name="lock-closed" size={16} color={colors.accent} />
          <Text style={styles.noteText}>{t('booking.address_note')}</Text>
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

/** Özet satırı — solda etiket, sağda değer (Figma `fin-row`). */
function Ozet({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.ozetSatir}>
      <Text style={styles.ozetEtiket}>{label}</Text>
      <Text style={styles.ozetDeger}>{value}</Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: {
      padding: 24,
      gap: 16,
      alignItems: 'center',
      flexGrow: 1,
      justifyContent: 'center',
      paddingBottom: TAB_BAR_CLEARANCE,
    },
    buyu: { flex: 1 },
    successCircle: {
      width: 96,
      height: 96,
      borderRadius: 100,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.successSoft,
    },
    title: {
      fontFamily: font.semibold,
      fontSize: 20,
      lineHeight: 26,
      color: colors.ink,
      textAlign: 'center',
    },
    subtitle: {
      fontFamily: font.regular,
      fontSize: 13,
      lineHeight: 18,
      color: colors.muted,
      textAlign: 'center',
      marginTop: -8,
    },
    card: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 20,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.line,
    },
    proSatir: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    proFoto: { width: 48, height: 48, borderRadius: 100, backgroundColor: colors.accentSoft },
    proAd: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
    proHizmet: { fontFamily: font.regular, fontSize: 11, color: colors.muted, marginTop: 2 },
    ayrac: { height: 1, backgroundColor: colors.line },
    ozetSatir: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    ozetEtiket: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
    ozetDeger: { fontFamily: font.semibold, fontSize: 13, color: colors.ink },
    note: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: colors.accentSoft,
      borderRadius: 20,
      padding: 16,
    },
    noteText: {
      flex: 1,
      fontFamily: font.regular,
      fontSize: 11,
      lineHeight: 15,
      color: colors.accent,
    },
    footer: { padding: 24, paddingTop: 0, paddingBottom: TAB_BAR_CLEARANCE },
  });
