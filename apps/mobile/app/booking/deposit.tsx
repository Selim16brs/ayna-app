import { useState } from 'react';
import { DEFAULT_SPEND_RULES, paymentSplit } from '@ayna/domain';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { fillParams, useLocale } from '../../src/locale';
import { localDeposit, useStore } from '../../src/store';
import { radius, shadow, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Sayac, Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

/**
 * DEPOZİTO ÖDEME — brief §4.4.
 *
 *   · Tutar: onay anındaki toplam hizmet bedelinin %10'u.
 *   · Süre: 10 DAKİKA, geri sayım ekranda görünür.
 *   · SES INVEST TOO hesabına transfer + dekont yükleme.
 *   · "Dekont yüklendiği an randevu KESINLESTI sayılır."
 *   · Puan kullanımı: bakiye ≥ 5.000 ise biriken puanın en fazla %25'i (§5).
 *
 * Ekranın tamamı tek bir soruya hizmet ediyor: "ne kadar, nereye, ne kadar
 * sürede?" Geri sayım en üstte çünkü brief §7 görünmez zaman sınırını yasaklıyor
 * ve buradaki sınır randevuyu düşürecek kadar sert.
 */

/** Ödemenin yapılacağı hesap (§4.4). */
const HESAP_ADI = 'SES INVEST TOO';

/**
 * §4.4 — KASPİ İLE TEK DOKUNUŞ.
 *
 * Bağlantı SES INVEST'in Kaspi QR'ının içeriğidir ve admin ayarından gelir;
 * koda gömülü değil (QR yenilenince sürüm çıkmak gerekmesin).
 *
 * `{tutar}` ve `{ref}` yer tutucuları VARSA doldurulur. Yoksa bağlantı olduğu
 * gibi açılır — sabit QR alıcıyı hazır getirir, tutarı müşteri girer ve ekran
 * onu kopyalanabilir biçimde gösterir. Yer tutucusu olmayan bir bağlantıya
 * kendiliğinden parametre EKLEMİYORUZ: uydurulmuş bir parametre Kaspi'de
 * sessizce yok sayılır ya da bağlantıyı tümden bozar.
 */
function kaspiBaglantisi(sablon: string, tutar: number, ref: string): string {
  return sablon.replace(/\{tutar\}/g, String(tutar)).replace(/\{ref\}/g, encodeURIComponent(ref));
}

/** Randevu referansı — ödemeyi bu randevuyla eşleştiren kod. */
function odemeReferansi(bookingId: string): string {
  return `AYNA-${bookingId
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-5)
    .toUpperCase()}`;
}

export default function DepositScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();

  const booking = useStore((s) => s.bookings.find((b) => b.id === id));
  const rates = useStore((s) => s.config.rates);
  const points = useStore((s) => s.points);
  // §5 — kilit: bir kez açıldıysa bakiye düşse de kapanmaz. Kararı SUNUCU
  // veriyor; ekran yalnız sonucunu okuyor.
  const puanKurallari = useStore((s) => s.pointsSpend);
  const hydrateBookings = useStore((s) => s.hydrateBookings);
  const randevuEylemi = useStore((s) => s.randevuEylemi);

  const [dekont, setDekont] = useState<string | null>(null);
  const [puanKullan, setPuanKullan] = useState(false);
  const [busy, setBusy] = useState(false);
  /**
   * Kaspi'ye gidildi mi? Dönüşte ekran "ne yaptın?" diye sormalı.
   *
   * Uygulama dışına çıkan kullanıcı geri geldiğinde ekranı bıraktığı gibi
   * bulursa ne yapacağını bilemez: ödedi mi, ödemedi mi, şimdi ne olacak?
   * Sayaç işlemeye devam ediyor ve randevusu düşebilir.
   */
  const [kaspiyeGidildi, setKaspiyeGidildi] = useState(false);

  const kaspiUrl = useStore((st) => st.config.kaspiPaymentUrl ?? null);
  const referans = odemeReferansi(booking?.id ?? '');

  if (!booking) {
    return (
      <Screen edges={[]}>
        <StackHeader title={t('deposit.title')} />
        <View style={styles.bos}>
          <Text variant="body" tone="muted">
            {t('booking.detail.missing')}
          </Text>
        </View>
      </Screen>
    );
  }

  const tutar = booking.depositAmount ?? localDeposit(booking.price, rates);
  /**
   * §5 — kullanılabilecek puan. Hesap `@ayna/domain`den: sunucu dekontu
   * alırken AYNI fonksiyonu çalıştırıyor, dolayısıyla ekranda yazan tutarla
   * sunucunun düştüğü puan ayrışamaz. Ekran eskiden kendi formülünü
   * yazıyordu ve sunucu tarafında düşen bir puan hiç yoktu.
   */
  const split = paymentSplit(
    tutar,
    points,
    points,
    puanKurallari?.unlocked ? new Date(0) : null,
    puanKurallari
      ? { unlockAt: puanKurallari.unlockAt, capPct: puanKurallari.capPct }
      : DEFAULT_SPEND_RULES,
  );
  const puanHakki = split.pointsUsed;
  const odenecek = puanKullan ? Math.max(0, tutar - puanHakki) : tutar;

  /**
   * Kaspi'yi aç. Açılamıyorsa (uygulama kurulu değil) SESSİZ KALMIYORUZ:
   * kullanıcı düğmeye bastı, bir şey olmadıysa sebebini bilmeli — ve elle
   * transfer yolu hemen altında duruyor.
   */
  const kaspiAc = async () => {
    if (!kaspiUrl) return;
    const hedef = kaspiBaglantisi(kaspiUrl, odenecek, referans);
    try {
      await Linking.openURL(hedef);
      setKaspiyeGidildi(true);
    } catch {
      Alert.alert(t('deposit.kaspi_fail_t'), t('deposit.kaspi_fail_b'));
    }
  };

  const secDekont = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.35,
      base64: true,
    });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    setDekont(a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri);
  };

  const gonder = async () => {
    if (!dekont || busy) return;
    setBusy(true);
    try {
      // Kalıcı kuyruktan geçiyor: 10 dakikalık pencerede ağ giderse dekont
      // KAYBOLMAZ, bağlantı gelince gönderilir. Doğrudan çağrıda kullanıcı
      // parayı göndermiş olmasına rağmen randevusu düşerdi.
      const sonuc = await randevuEylemi(booking.id, 'dekont', {
        receiptUri: dekont,
        // Ne kadar düşüleceğine SUNUCU karar veriyor; bu yalnız üst sınır.
        pointsRequested: puanKullan ? puanHakki : 0,
      });
      if (sonuc === 'kuyrukta') {
        Alert.alert(t('flow.queued_t'), t('flow.queued_b'), [
          { text: t('common.ok'), onPress: () => router.back() },
        ]);
        return;
      }
      await hydrateBookings();
      // §4.4 — dekont yüklendiği AN kesinleşti. Kullanıcı "onay bekliyorum"
      // sanmamalı; net söylenmeli.
      Alert.alert(t('deposit.done_t'), t('deposit.done_b'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('deposit.title')} />
      <ScrollView contentContainerStyle={styles.icerik} showsVerticalScrollIndicator={false}>
        {/* Geri sayım EN ÜSTTE: bu sınır randevuyu düşürüyor. */}
        {booking.depositDeadline ? (
          <View style={[styles.kart, styles.acil, shadow.card]}>
            <Sayac
              bitis={booking.depositDeadline}
              metin={t('flow.deposit.countdown_b')}
              renk={colors.danger}
            />
          </View>
        ) : null}

        <View style={[styles.kart, shadow.card]}>
          <View style={styles.satir}>
            <Text variant="caption" tone="muted">
              {t('deposit.amount')}
            </Text>
            <Text variant="h2" tone="ink">
              {odenecek.toLocaleString('tr-TR')} ₸
            </Text>
          </View>
          <Text variant="caption" tone="muted">
            {fillParams(t('deposit.of_total'), {
              total: booking.price.toLocaleString('tr-TR'),
            })}
          </Text>
        </View>

        {/* §5 — puan kullanımı. Hak yoksa seçenek HİÇ gösterilmiyor: kullanılamayan
            bir seçeneği göstermek, eşiği açıklamak zorunda bırakır ve ekranı şişirir. */}
        {puanHakki > 0 ? (
          <Pressable
            style={[styles.kart, shadow.card, styles.puanSatir]}
            onPress={() => setPuanKullan((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: puanKullan }}
          >
            <Ionicons
              name={puanKullan ? 'checkbox' : 'square-outline'}
              size={22}
              color={puanKullan ? colors.accent : colors.muted}
            />
            <View style={styles.flex}>
              <Text variant="bodyStrong" tone="ink">
                {fillParams(t('deposit.use_points'), {
                  points: puanHakki.toLocaleString('tr-TR'),
                })}
              </Text>
              <Text variant="caption" tone="muted">
                {t('deposit.points_rule')}
              </Text>
            </View>
          </Pressable>
        ) : null}

        {/* §4.4 — KASPİ İLE TEK DOKUNUŞ. Bağlantı tanımlıysa birincil yol budur:
            Kaspi açılır, alıcı hazır gelir, müşteri hesap numarası yazmaz.
            Basmadan ÖNCE ne gideceğini gösteriyoruz — uygulamadan çıkmadan
            önce ne olacağını bilmek, ödemeye güvenmenin ön şartı. */}
        {/* KASPİ'DEN DÖNÜŞ. Sayacın DURDUĞUNU söylemiyoruz: sunucu 10 dakikayı
            durdurmuyor, randevu yine düşebilir. Kullanıcıya doğru olanı
            söylüyoruz — dekontu yükle, randevu o an kesinleşsin. */}
        {kaspiyeGidildi ? (
          <View style={[styles.kart, shadow.card, styles.kaspiKart]}>
            <View style={styles.satir}>
              <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
              <Text variant="bodyStrong" tone="ink" style={styles.flex}>
                {t('deposit.kaspi_back_t')}
              </Text>
            </View>
            <Text variant="caption" tone="muted" style={styles.not}>
              {fillParams(t('deposit.kaspi_back_b'), { ref: referans })}
            </Text>
          </View>
        ) : null}

        {kaspiUrl && !kaspiyeGidildi ? (
          <View style={[styles.kart, shadow.card, styles.kaspiKart]}>
            <View style={styles.satir}>
              <Ionicons name="open-outline" size={16} color={colors.accent} />
              <Text variant="caption" tone="accentFg" style={styles.kaspiBaslik}>
                {t('deposit.kaspi_preview')}
              </Text>
            </View>
            <View style={styles.satir}>
              <Text variant="caption" tone="muted">
                {t('deposit.account')}
              </Text>
              <Text variant="bodyStrong" tone="ink">
                {HESAP_ADI}
              </Text>
            </View>
            <View style={styles.satir}>
              <Text variant="caption" tone="muted">
                {t('deposit.amount')}
              </Text>
              <Text variant="bodyStrong" tone="ink">
                {odenecek.toLocaleString('tr-TR')} ₸
              </Text>
            </View>
            <View style={styles.satir}>
              <Text variant="caption" tone="muted">
                {t('deposit.reference')}
              </Text>
              <Text variant="bodyStrong" tone="ink" selectable>
                {referans}
              </Text>
            </View>
          </View>
        ) : null}

        {kaspiUrl && !kaspiyeGidildi ? (
          <Button
            label={fillParams(t('deposit.pay_kaspi'), {
              amount: odenecek.toLocaleString('tr-TR'),
            })}
            onPress={() => void kaspiAc()}
          />
        ) : null}

        <View style={[styles.kart, shadow.card]}>
          <Text variant="bodyStrong" tone="ink">
            {kaspiUrl ? t('deposit.manual_title') : t('deposit.account')}
          </Text>
          <Text variant="body" tone="ink" selectable>
            {HESAP_ADI}
          </Text>
          <Text variant="caption" tone="muted" style={styles.not}>
            {fillParams(t('deposit.transfer_note_ref'), { ref: referans })}
          </Text>
        </View>

        <Pressable style={[styles.kart, shadow.card, styles.yukle]} onPress={secDekont}>
          {dekont ? (
            <Image source={{ uri: dekont }} style={styles.onizleme} resizeMode="cover" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={28} color={colors.muted} />
              <Text variant="body" tone="muted">
                {t('deposit.upload')}
              </Text>
            </>
          )}
        </Pressable>

        <Button
          label={t('deposit.submit')}
          disabled={!dekont || busy}
          variant={dekont ? 'primary' : 'secondary'}
          onPress={() => void gonder()}
        />
        <Text variant="caption" tone="muted" style={styles.not}>
          {t('deposit.verify_note')}
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
    acil: { borderWidth: 1, borderColor: colors.danger },
    kaspiKart: { backgroundColor: colors.accentSoft },
    kaspiBaslik: { letterSpacing: 0.6, textTransform: 'uppercase' },
    satir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    puanSatir: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
    flex: { flex: 1 },
    not: { lineHeight: 18 },
    yukle: { alignItems: 'center', justifyContent: 'center', minHeight: 140, gap: space(1) },
    onizleme: { width: '100%', height: 180, borderRadius: radius.md },
  });
