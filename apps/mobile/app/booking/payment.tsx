import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { earnPoints } from '@ayna/domain';
import { fillParams, useLocale } from '../../src/locale';
import { randevuDepozitosu, useStore } from '../../src/store';
import { font, type ColorTokens } from '../../src/theme';
import { darkColors } from '../../src/theme.palette';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text } from '../../src/ui';

/**
 * ÖDEME BEYANI — kurucu, 05.09.2026.
 *
 *   "Müşteri ödeme yaptım butonuna bastığında ayna para kazanıyor. eğer bunu
 *    yapmazsa kazanamaz. ayrıca eğer kuaförde ilk rezervasyondaki fiyat
 *    değişmemişse direkt ödeme yaptım basabilir, eğer değişiklik olduysa ona
 *    göre tutarı girer ve ona göre ayna para kazanır."
 *
 * Ekran tam bunu yapıyor: tutar rezervasyon fiyatıyla DOLU geliyor, fiyat
 * değişmediyse tek dokunuş yeter; değiştiyse üzerine yazılır. İki ayrı düğme
 * ("aynı" / "farklı") koymadık — aynı kararı iki kez sormak olurdu.
 *
 * TUTARI SİSTEM UYDURMUYOR: beyan müşteriden geliyor, uzman karşı tarafta
 * onaylıyor (§4.9 iki aşamalı el sıkışma) ve itiraz edebiliyor.
 */
export default function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLocale();
  const { colors, gradients } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();

  const booking = useStore((s) => s.bookings.find((b) => b.id === id));
  const rates = useStore((s) => s.config.rates);
  const randevuEylemi = useStore((s) => s.randevuEylemi);
  const hydrateBookings = useStore((s) => s.hydrateBookings);

  // Rezervasyon fiyatı ALAN DEĞERİ olarak başlıyor: "değişmediyse direkt bas".
  const [metin, setMetin] = useState(() => String(booking?.price ?? ''));
  const [busy, setBusy] = useState(false);

  if (!booking) {
    return (
      <Screen edges={[]}>
        <StackHeader title={t('payment.title')} />
        <View style={styles.bos}>
          <Text variant="body" tone="muted">
            {t('booking.detail.missing')}
          </Text>
        </View>
      </Screen>
    );
  }

  const depozito = randevuDepozitosu(booking, rates);
  // Girdi HAM okunuyor: virgül de nokta da ondalık ayracı olarak yazılabiliyor
  // (kk/ru klavyelerde virgül standart). Boşluk binlik ayracı olarak eleniyor.
  const tutar = Number(metin.replace(/\s/g, '').replace(',', '.'));
  const gecerli = Number.isFinite(tutar) && tutar > 0;
  const degisti = gecerli && tutar !== booking.price;
  // Kalan = ödenen tutar − peşin verilen depozito. Negatife düşmez: depozito
  // hizmet bedelinden fazlaysa kasada ödenecek bir şey kalmamıştır.
  const kalan = gecerli ? Math.max(0, tutar - depozito) : 0;
  const puan = gecerli ? earnPoints(tutar, rates.pointsEarnPct) : 0;

  const gonder = () => {
    if (!gecerli || busy) return;
    setBusy(true);
    void randevuEylemi(booking.id, 'odeme_yaptim', tutar)
      .then((sonuc) => {
        if (sonuc.sonuc === 'reddedildi') {
          if (sonuc.mesaj) Alert.alert(sonuc.mesaj);
          void hydrateBookings();
          return;
        }
        if (sonuc.sonuc === 'kuyrukta') {
          Alert.alert(t('flow.queued_t'), t('flow.queued_b'));
        }
        router.back();
      })
      .finally(() => setBusy(false));
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('payment.title')} />
      <ScrollView
        contentContainerStyle={styles.icerik}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* KASADA ÖDENECEK — kararın merkezindeki sayı koyu kartta. */}
        <LinearGradient
          colors={gradients.deep}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tutarKart}
        >
          <Text style={styles.tutarEtiket}>{t('payment.due_now')}</Text>
          <Text style={styles.tutarBuyuk}>{kalan.toLocaleString('tr-TR')} ₸</Text>
          <Text style={styles.tutarNot}>
            {fillParams(t('payment.deposit_note'), { deposit: depozito.toLocaleString('tr-TR') })}
          </Text>
        </LinearGradient>

        <Text style={styles.bolumBaslik}>{t('payment.amount_label')}</Text>
        <View style={styles.kart}>
          <TextInput
            value={metin}
            onChangeText={setMetin}
            keyboardType="numeric"
            placeholder={String(booking.price)}
            placeholderTextColor={colors.muted}
            style={styles.girdi}
          />
          <Text style={styles.ipucu}>
            {degisti
              ? fillParams(t('payment.changed_note'), {
                  price: booking.price.toLocaleString('tr-TR'),
                })
              : t('payment.same_note')}
          </Text>
          {/* PUAN VAADİ ÖDENEN TUTARDAN: sunucu da aynı formülü kullanıyor
              (`earnPoints`), böylece ekranda yazan puan ile hesaba yatan puan
              birbirinden ayrılamıyor. */}
          <Text style={styles.puan}>
            {fillParams(t('payment.earn_note'), { points: String(puan) })}
          </Text>
        </View>

        <Button
          label={t('flow.act.odeme_yaptim')}
          disabled={!gecerli || busy}
          variant={gecerli ? 'primary' : 'secondary'}
          onPress={gonder}
        />
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    // Alt bar bu ekranda gizli (app/_layout.tsx: yalnız sekme köklerinde çizilir) —
    // barın yerini boş bırakmak sayfa sonunda kocaman bir boşluk demekti.
    icerik: { padding: 24, gap: 20, paddingBottom: 24 },
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
      fontFamily: font.semibold,
      fontSize: 20,
    },
    ipucu: { fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: colors.muted },
    puan: { fontFamily: font.semibold, fontSize: 12, color: colors.accent },
  });
