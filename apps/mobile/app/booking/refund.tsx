import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api, ApiError } from '../../src/api';
import { fillParams, useLocale } from '../../src/locale';
import { randevuDepozitosu, useStore } from '../../src/store';
import { font, space, type ColorTokens } from '../../src/theme';
import { darkColors } from '../../src/theme.palette';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text } from '../../src/ui';

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
  // Derin kart gradyanı artık SEÇİLEN RENKTEN geliyor (`gradients.deep`).
  // Eskiden `[lightColors.accent, '#2D0A2E']` sabitiydi: kullanıcı Zümrüt
  // seçse bile bu kart pembe kalıyordu.
  const { colors, gradients } = useTheme();
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
    } catch (err) {
      // KUYRUĞA ALINMIYOR — bilinçli. Talep, kullanıcının Kaspi/banka bilgisini
      // taşıyor; başarısız bir isteği cihaz diskinde saklamak bu PII'yi
      // gereksiz yere kalıcı hâle getirirdi. Kullanıcı ekranda ve tek dokunuşla
      // tekrar deneyebilir; iade hakkı da randevuda duruyor, kaybolmuyor.
      //
      // SUNUCUNUN SEBEBİ GÖSTERİLİYOR. Burada düz "bir hata oluştu" yazıyordu:
      // sunucu "İade edilecek depozito yok" dediğinde bile kullanıcı girdiği
      // telefon numarasının reddedildiğini sanıyor, aynı şeyi tekrar tekrar
      // deniyordu. Sebebi bilmeden düzeltebileceği bir şey yok.
      Alert.alert(
        t('refund.err_t'),
        err instanceof ApiError && err.message ? err.message : t('common.error'),
      );
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
        {/* İADE TUTARI — koyu mürdüm kart. Tasarım dilinde para,
            kararın merkezindeyse koyu kartta ve büyük gösteriliyor. */}
        <LinearGradient
          colors={gradients.deep}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tutarKart}
        >
          <Text style={styles.tutarEtiket}>{t('refund.amount')}</Text>
          <Text style={styles.tutarBuyuk}>{tutar.toLocaleString('tr-TR')} ₸</Text>
          <Text style={styles.tutarNot}>{fillParams(t('refund.eta'), { gun: '1' })}</Text>
        </LinearGradient>

        <Text style={styles.bolumBaslik}>{t('refund.account_label')}</Text>
        <View style={styles.kart}>
          <TextInput
            value={hesap}
            onChangeText={setHesap}
            placeholder={t('refund.account_ph')}
            placeholderTextColor={colors.muted}
            style={styles.girdi}
            autoCapitalize="none"
          />
          {/* PII uyarısı forma BİTİŞİK: kullanıcı hesap bilgisini girerken
              nereye gittiğini o anda bilmeli, ekranın altında değil. */}
          <View style={styles.gizlilik}>
            <Ionicons name="lock-closed-outline" size={15} color={colors.muted} />
            <Text style={styles.gizlilikYazi}>{t('refund.privacy')}</Text>
          </View>
        </View>

        <Button
          label={t('refund.submit')}
          disabled={hesap.trim().length < 3 || busy}
          variant={hesap.trim().length >= 3 ? 'primary' : 'secondary'}
          onPress={() => void gonder()}
        />
      </ScrollView>
    </Screen>
  );
}

/** Koyu mürdüm kart — Figma `canli-ozet-card` degradesi, iki temada da sabit. */

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    // Figma: kenar boşluğu 24, bölüm arası 20.
    icerik: { padding: 24, gap: 20, paddingBottom: space(3) },
    bos: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    tutarKart: { borderRadius: 24, padding: 20, gap: 6 },
    tutarEtiket: {
      fontFamily: font.semibold,
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: 'rgba(255,240,245,0.62)',
    },
    tutarBuyuk: { fontFamily: font.semibold, fontSize: 34, lineHeight: 40, color: darkColors.ink },
    tutarNot: { fontFamily: font.regular, fontSize: 11, color: darkColors.accent },
    bolumBaslik: { fontFamily: font.semibold, fontSize: 18, color: colors.ink, marginBottom: -8 },
    kart: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.line,
    },
    girdi: {
      borderWidth: 1,
      borderColor: colors.lineStrong,
      borderRadius: 16,
      paddingHorizontal: 14,
      minHeight: 52,
      color: colors.ink,
      fontFamily: font.regular,
      fontSize: 15,
    },
    gizlilik: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    gizlilikYazi: {
      flex: 1,
      fontFamily: font.regular,
      fontSize: 11,
      lineHeight: 15,
      color: colors.muted,
    },
  });
