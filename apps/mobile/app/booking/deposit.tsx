import { useState } from 'react';
import { DEFAULT_SPEND_RULES, odemeReferansi, paymentSplit } from '@ayna/domain';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { fillParams, useLocale } from '../../src/locale';
import { randevuDepozitosu, useStore } from '../../src/store';
import { font, type ColorTokens } from '../../src/theme';
import { darkColors } from '../../src/theme.palette';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Sayac, Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';
import { BELGE_GENISLIK, kucultVeB64 } from '../../src/gorsel-kucult';

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

export default function DepositScreen() {
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

  const tutar = randevuDepozitosu(booking, rates);
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
    /*
     * DEKONT: tutar ve tarih okunur kalmalı — uzman parayı buna bakarak
     * onaylıyor. Ham fotoğraf ise sunucunun gövde sınırını aşıp gönderimi
     * düşürüyordu; randevu depozito aşamasında ölüyordu.
     */
    const b64 = await kucultVeB64(a.uri, a.base64, BELGE_GENISLIK);
    if (b64) setDekont(`data:image/jpeg;base64,${b64}`);
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
      if (sonuc.sonuc === 'kuyrukta') {
        Alert.alert(t('flow.queued_t'), t('flow.queued_b'), [
          { text: t('common.ok'), onPress: () => router.back() },
        ]);
        return;
      }
      // SUNUCU REDDETTİYSE BAŞARI DEME. Eskiden yalnız 'kuyrukta' kontrol
      // ediliyor, red aşağıdaki "randevu kesinleşti" ekranına düşüyordu:
      // müşteri dekontu gönderdiğini sanıyor, sunucuda hiçbir kayıt yok,
      // admin panelindeki dekont kuyruğu boş kalıyordu. Ekranda kal ki
      // müşteri yeniden denesin — süre işliyor.
      if (sonuc.sonuc === 'reddedildi') {
        Alert.alert(t('deposit.fail_t'), sonuc.mesaj ?? t('deposit.fail_b'));
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
      <ScrollView
        contentContainerStyle={styles.icerik}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* GERİ SAYIM EN ÜSTTE — bu sınır randevuyu düşürüyor. */}
        {booking.depositDeadline ? (
          <View style={styles.acilSerit}>
            <Ionicons name="time-outline" size={18} color={colors.danger} />
            <Sayac
              bitis={booking.depositDeadline}
              metin={t('flow.deposit.countdown_b')}
              renk={colors.danger}
            />
          </View>
        ) : null}

        {/* TUTAR — koyu mürdüm kart. Kararın merkezindeki sayı büyük. */}
        <LinearGradient
          colors={gradients.deep}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tutarKart}
        >
          <Text style={styles.tutarEtiket}>{t('deposit.amount')}</Text>
          <Text style={styles.tutarBuyuk} selectable>
            {odenecek.toLocaleString('tr-TR')} ₸
          </Text>
          <Text style={styles.tutarNot}>
            {fillParams(t('deposit.of_total'), { total: booking.price.toLocaleString('tr-TR') })}
          </Text>
        </LinearGradient>

        {/* §5 — puan kullanımı. Hak yoksa seçenek HİÇ gösterilmiyor. */}
        {puanHakki > 0 ? (
          <Pressable
            style={styles.puanKart}
            onPress={() => setPuanKullan((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: puanKullan }}
          >
            <View style={[styles.kutucuk, puanKullan && styles.kutucukAcik]}>
              {puanKullan ? <Ionicons name="checkmark" size={14} color={colors.onAccent} /> : null}
            </View>
            <View style={styles.buyu}>
              <Text style={styles.puanBaslik}>
                {fillParams(t('deposit.use_points'), {
                  points: puanHakki.toLocaleString('tr-TR'),
                })}
              </Text>
              <Text style={styles.puanNot}>{t('deposit.points_rule')}</Text>
            </View>
            {puanKullan ? (
              <Text style={styles.puanDusum}>−{puanHakki.toLocaleString('tr-TR')} ₸</Text>
            ) : null}
          </Pressable>
        ) : null}

        {/* ── KASPİ — üç adım, sonra düğme ── */}
        {kaspiUrl && !kaspiyeGidildi ? (
          <>
            <Text style={styles.bolumBaslik}>{t('deposit.kaspi_preview')}</Text>
            <View style={styles.kart}>
              {(
                [
                  ['1', t('deposit.kaspi_step1')],
                  [
                    '2',
                    fillParams(t('deposit.kaspi_step2'), {
                      amount: odenecek.toLocaleString('tr-TR'),
                    }),
                  ],
                  ['3', t('deposit.kaspi_step3')],
                ] as const
              ).map(([n, metin]) => (
                <View key={n} style={styles.adim}>
                  <View style={styles.adimNo}>
                    <Text style={styles.adimNoYazi}>{n}</Text>
                  </View>
                  <Text style={styles.adimYazi}>{metin}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
        {kaspiUrl && !kaspiyeGidildi ? (
          <Button label={t('deposit.pay_kaspi')} onPress={() => void kaspiAc()} />
        ) : null}

        {/* KASPİ'DEN DÖNÜŞ — sayacın DURMADIĞINI söylüyoruz. */}
        {kaspiyeGidildi ? (
          <View style={styles.donusKart}>
            <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
            <View style={styles.buyu}>
              <Text style={styles.donusBaslik}>{t('deposit.kaspi_back_t')}</Text>
              <Text style={styles.donusNot}>
                {/* Metinde '{ref}' yer tutucusu yok; ödeme kodu bu ekranda
                    zaten ayrı ve kopyalanabilir biçimde duruyor. Doldurma
                    çağrısı hiçbir şey yapmıyordu. */}
                {t('deposit.kaspi_back_b')}
              </Text>
            </View>
          </View>
        ) : null}

        {/* HESAP — Kaspi yoksa tek yol, varsa yedek. */}
        <View style={styles.kart}>
          <Text style={styles.etiket}>
            {kaspiUrl ? t('deposit.manual_title') : t('deposit.account')}
          </Text>
          <Text style={styles.hesapAd} selectable>
            {HESAP_ADI}
          </Text>
          <Text style={styles.hesapNot}>
            {fillParams(t('deposit.transfer_note_ref'), { ref: referans })}
          </Text>
        </View>

        {/* ÖDEME KODU — dekontun hemen üstünde, ikisi de kopyalanabilir. */}
        <View style={styles.kodKart}>
          <Text style={[styles.etiket, styles.etiketAccent]}>{t('deposit.ref.title')}</Text>
          <View style={styles.kodSatir}>
            <Text style={styles.kodEtiket}>{t('deposit.ref.code')}</Text>
            <Text style={styles.kodDeger} selectable>
              {referans}
            </Text>
          </View>
          <View style={styles.kodSatir}>
            <Text style={styles.kodEtiket}>{t('deposit.ref.booking')}</Text>
            <Text style={styles.kodDegerKucuk} selectable>
              {booking.id}
            </Text>
          </View>
          <Text style={styles.kodNot}>{t('deposit.ref.note')}</Text>
        </View>

        <Pressable style={styles.yukleKart} onPress={secDekont}>
          {dekont ? (
            <Image source={{ uri: dekont }} style={styles.onizleme} resizeMode="cover" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={26} color={colors.muted} />
              <Text style={styles.yukleYazi}>{t('deposit.upload')}</Text>
            </>
          )}
        </Pressable>

        <Button
          label={t('deposit.submit')}
          disabled={!dekont || busy}
          variant={dekont ? 'primary' : 'secondary'}
          onPress={() => void gonder()}
        />
        <Text style={styles.altNot}>{t('deposit.verify_note')}</Text>
      </ScrollView>
    </Screen>
  );
}

/** Koyu mürdüm kart — Figma `canli-ozet-card` degradesi, iki temada da sabit. */

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    icerik: { padding: 24, gap: 20, paddingBottom: TAB_BAR_CLEARANCE },
    bos: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    buyu: { flex: 1 },
    acilSerit: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 20,
      padding: 14,
      backgroundColor: colors.dangerSoft,
      borderWidth: 1,
      borderColor: colors.danger,
    },
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
    puanKart: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.line,
    },
    kutucuk: {
      width: 22,
      height: 22,
      borderRadius: 7,
      borderWidth: 1.5,
      borderColor: colors.lineStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kutucukAcik: { backgroundColor: colors.accent, borderColor: colors.accent },
    puanBaslik: { fontFamily: font.semibold, fontSize: 13, color: colors.ink },
    puanNot: { fontFamily: font.regular, fontSize: 11, color: colors.muted, marginTop: 2 },
    puanDusum: { fontFamily: font.semibold, fontSize: 15, color: colors.success },
    bolumBaslik: { fontFamily: font.semibold, fontSize: 18, color: colors.ink, marginBottom: -8 },
    kart: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.line,
    },
    adim: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    adimNo: {
      width: 20,
      height: 20,
      borderRadius: 100,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    adimNoYazi: { fontFamily: font.semibold, fontSize: 11, color: colors.accent },
    adimYazi: {
      flex: 1,
      fontFamily: font.regular,
      fontSize: 13,
      lineHeight: 18,
      color: colors.ink,
    },
    donusKart: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: colors.accentSoft,
      borderRadius: 20,
      padding: 16,
    },
    donusBaslik: { fontFamily: font.semibold, fontSize: 13, color: colors.accent },
    donusNot: {
      fontFamily: font.regular,
      fontSize: 11,
      lineHeight: 15,
      color: colors.muted,
      marginTop: 2,
    },
    etiket: {
      fontFamily: font.semibold,
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.muted,
    },
    etiketAccent: { color: colors.accent },
    hesapAd: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
    hesapNot: { fontFamily: font.regular, fontSize: 11, lineHeight: 15, color: colors.muted },
    kodKart: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.accentSoft,
    },
    kodSatir: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    kodEtiket: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
    kodDeger: { fontFamily: font.semibold, fontSize: 16, letterSpacing: 1.5, color: colors.ink },
    kodDegerKucuk: { fontFamily: font.semibold, fontSize: 13, letterSpacing: 1, color: colors.ink },
    kodNot: { fontFamily: font.regular, fontSize: 11, lineHeight: 15, color: colors.muted },
    yukleKart: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      minHeight: 132,
      borderRadius: 20,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.lineStrong,
    },
    yukleYazi: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
    onizleme: { width: '100%', height: 180, borderRadius: 20 },
    altNot: {
      fontFamily: font.regular,
      fontSize: 11,
      lineHeight: 15,
      color: colors.muted,
      textAlign: 'center',
    },
  });
