import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { api } from '../../src/api';
import { fillParams, useLocale } from '../../src/locale';
import { randevuDepozitosu, useStore } from '../../src/store';
import { font, radius, shadow, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

/**
 * DEPOZİTO İADE TALEBİ — brief §4.10.
 *
 *   "Butona basınca müşteriden iade yapılacak Kaspi/hesap bilgisi istenir.
 *    Talep, admin panelinde 'İadeler' kuyruğuna düşer. İç hedef: 24 saat
 *    içinde işlem; kullanıcıya 'iade 1 iş günü içinde yapılır' gösterilir."
 *
 * Süre vaadi ekranda AÇIKÇA yazıyor: iade talebi gönderip sessizlikte
 * beklemek, para söz konusuyken en çok güven kıran şey.
 */
export default function RefundScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();

  const booking = useStore((s) => s.bookings.find((b) => b.id === id));
  const rates = useStore((s) => s.config.rates);
  const iadeTalebiDamgala = useStore((s) => s.iadeTalebiDamgala);
  const [hesap, setHesap] = useState('');
  const [busy, setBusy] = useState(false);

  if (!booking) {
    return (
      <Screen edges={[]}>
        <StackHeader title={t('refund.title')} />
        <View style={styles.bos}>
          <Text variant="body" tone="muted">
            {t('booking.detail.missing')}
          </Text>
        </View>
      </Screen>
    );
  }

  const tutar = randevuDepozitosu(booking, rates);

  const gonder = async () => {
    if (hesap.trim().length < 3 || busy) return;
    setBusy(true);
    try {
      await api.iadeTalep(booking.id, hesap.trim());
      // Talep gönderildi: ana sayfadaki "iadeni iste" kartı artık çıkmasın.
      iadeTalebiDamgala(booking.id);
      Alert.alert(t('refund.sent_t'), t('refund.sent_b'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch {
      // KUYRUĞA ALINMIYOR — bilinçli. Talep, kullanıcının Kaspi/banka bilgisini
      // taşıyor; başarısız bir isteği cihaz diskinde saklamak bu PII'yi
      // gereksiz yere kalıcı hâle getirirdi. Kullanıcı ekranda ve tek dokunuşla
      // tekrar deneyebilir; iade hakkı da randevuda duruyor, kaybolmuyor.
      Alert.alert(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('refund.title')} />
      <ScrollView
        contentContainerStyle={styles.icerik}
        showsVerticalScrollIndicator={false}
        // Klavye açıkken düğmeye TEK dokunuş yetsin; "handled" olmadan ilk
        // dokunuş yalnız klavyeyi kapatıyor.
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.kart, shadow.card]}>
          <Text variant="caption" tone="muted">
            {t('refund.amount')}
          </Text>
          <Text variant="h2" tone="ink">
            {tutar.toLocaleString('tr-TR')} ₸
          </Text>
        </View>

        <View style={[styles.kart, shadow.card]}>
          <Text variant="bodyStrong" tone="ink">
            {t('refund.account_label')}
          </Text>
          <TextInput
            value={hesap}
            onChangeText={setHesap}
            placeholder={t('refund.account_ph')}
            placeholderTextColor={colors.muted}
            style={styles.girdi}
            autoCapitalize="none"
          />
          {/* PII uyarısı: bilgi yalnız iadeyi ödeyen admine gider. */}
          <Text variant="caption" tone="muted" style={styles.not}>
            {t('refund.privacy')}
          </Text>
        </View>

        <Button
          label={t('refund.submit')}
          disabled={hesap.trim().length < 3 || busy}
          variant={hesap.trim().length >= 3 ? 'primary' : 'secondary'}
          onPress={() => void gonder()}
        />
        <Text variant="caption" tone="muted" style={styles.not}>
          {fillParams(t('refund.eta'), { gun: '1' })}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    icerik: { padding: space(2), gap: space(1.5), paddingBottom: TAB_BAR_CLEARANCE },
    bos: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space(3) },
    kart: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(0.75),
    },
    girdi: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.md,
      paddingHorizontal: space(1.5),
      minHeight: 44,
      color: colors.ink,
      fontFamily: font.regular,
    },
    not: { lineHeight: 18 },
  });
