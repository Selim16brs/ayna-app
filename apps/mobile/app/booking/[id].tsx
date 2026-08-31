import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { esikGecti } from '@ayna/domain';
import { api } from '../../src/api';
import {
  DURUM_ETIKETI,
  DURUM_TONU,
  birincilAksiyon,
  iptalEdilebilir,
  type Aksiyon,
  type Rol,
} from '../../src/booking-flow';
import { formatSlotTr } from '../../src/datetime';
import { fillParams, useLocale } from '../../src/locale';
import { localDeposit, useStore } from '../../src/store';
import { radius, shadow, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import {
  AkisCizelgesi,
  Button,
  Sayac,
  Screen,
  StackHeader,
  TAB_BAR_CLEARANCE,
  Text,
} from '../../src/ui';

/**
 * RANDEVU KARTI — brief §7 Faz B.
 *
 * Kart baştan yazıldı. Eski dosya 1320 satırdı ve her durum için ayrı bir
 * `status === '...'` bloğu taşıyordu; aynı ekranda birden fazla birincil buton
 * çıkabiliyor, yeni bir durum eklendiğinde bazı bloklar sessizce ölüyordu.
 *
 * Brief'in üç ilkesi burada uygulanıyor:
 *   · "Tek birincil buton" — hangi butonun çıkacağına `booking-flow` karar
 *     verir; ekran yalnız çizer. Karar tek yerde olduğu için müşteri ve uzman
 *     ekranı çelişemez.
 *   · "Kargo takibi tarzı zaman çizelgesi" — `AkisCizelgesi`.
 *   · "Tüm süre sınırları ekranda görünür geri sayımla; görünmez zaman sınırı
 *     yasak" — depozito 10 dk ve uzman yanıtı 3 saat sayaçla gösteriliyor.
 */
export default function BookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();

  const booking = useStore((s) => s.bookings.find((b) => b.id === id));
  const currentUser = useStore((s) => s.currentUser);
  const rates = useStore((s) => s.config.rates);
  const hydrateBookings = useStore((s) => s.hydrateBookings);

  if (!booking) {
    return (
      <Screen edges={[]}>
        <StackHeader title={t('booking.detail.title')} />
        <View style={styles.bos}>
          <Text variant="body" tone="muted">
            {t('booking.detail.missing')}
          </Text>
        </View>
      </Screen>
    );
  }

  const rol: Rol =
    currentUser?.role === 'professional' || currentUser?.role === 'salon' ? 'uzman' : 'musteri';

  // §4.4 — peşin %10; kalan bakiye hizmetten sonra doğrudan uzmana ödenir.
  const pesinat = booking.depositAmount ?? localDeposit(booking.price, rates);
  const kalan = Math.max(0, booking.price - pesinat);

  // §4.8 — "gelmedi" butonları randevu saatinden 15 DAKİKA sonra aktifleşir.
  const gelmediAcik = Date.now() >= booking.startMs + 15 * 60_000;
  // §4.6/§4.7 — erteleme ve ücretsiz iptal yalnız 3 saat eşiğinden ÖNCE.
  const esikOncesi = !esikGecti(booking.startMs);

  const aksiyon = birincilAksiyon(booking.status, rol, {
    odemeBildirildi: booking.balanceDeclaredAt != null,
    gelmediAcik,
    esikOncesi,
  });

  const yenile = () => void hydrateBookings();
  const cagir = (p: Promise<unknown>) => {
    void p.then(yenile).catch(() => Alert.alert(t('common.error')));
  };

  function calistir(a: Aksiyon) {
    if (!booking) return;
    const bid = booking.id;
    switch (a.eylem) {
      case 'onayla':
        return cagir(api.approveBooking(bid));
      case 'kabul':
        return cagir(api.acceptBooking(bid));
      case 'depozito_ode':
        return router.push(`/booking/deposit?id=${bid}` as never);
      case 'ertele':
        return router.push(`/booking/reschedule?id=${bid}` as never);
      case 'islemi_bitirdim':
        return cagir(api.completeBookingApi(bid));
      case 'odeme_yaptim':
        return cagir(api.balancePaid(bid));
      case 'odeme_aldim':
        return cagir(api.balanceReceived(bid));
      case 'degerlendir':
        return router.push(`/review/new?id=${bid}` as never);
      case 'iade_iste':
        return router.push(`/booking/refund?id=${bid}` as never);
      case 'gelmedi':
        // §4.8 — beyan geri alınamaz ve karşı tarafa 24 saatlik itiraz penceresi
        // açar; onay istemek şart.
        return Alert.alert(t('flow.noshow.confirm_t'), t('flow.noshow.confirm_b'), [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('flow.act.gelmedi'),
            style: 'destructive',
            onPress: () => cagir(rol === 'uzman' ? api.noShowApi(bid) : api.providerNoShowApi(bid)),
          },
        ]);
      default:
        return undefined;
    }
  }

  function iptalEt() {
    if (!booking) return;
    const bid = booking.id;
    // §4.7 — 3 saat eşiğinden sonra depozito YANAR; kullanıcı bunu ÖNCEDEN bilmeli.
    const uyari = esikOncesi ? t('flow.cancel.free_b') : t('flow.cancel.forfeit_b');
    Alert.alert(t('flow.cancel.title'), uyari, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('flow.act.iptal'),
        style: 'destructive',
        onPress: () => cagir(api.cancelBooking(bid)),
      },
    ]);
  }

  const ton = DURUM_TONU[booking.status];
  const tonRengi =
    ton === 'olumlu'
      ? colors.success
      : ton === 'tehlike'
        ? colors.danger
        : ton === 'bekleme'
          ? colors.gold
          : colors.muted;

  return (
    <Screen edges={[]}>
      <StackHeader title={t('booking.detail.title')} />
      <ScrollView contentContainerStyle={styles.icerik} showsVerticalScrollIndicator={false}>
        {/* ── Başlık: kim, ne, ne zaman ── */}
        <View style={[styles.kart, shadow.card]}>
          <View style={styles.basSatir}>
            <Text variant="h2" tone="ink" style={styles.flex}>
              {booking.proName}
            </Text>
            <View style={[styles.rozet, { backgroundColor: tonRengi + '22' }]}>
              <Text variant="caption" style={{ color: tonRengi }}>
                {t(DURUM_ETIKETI[booking.status])}
              </Text>
            </View>
          </View>
          <Text variant="body" tone="muted">
            {booking.service}
          </Text>
          <Text variant="bodyStrong" tone="ink">
            {formatSlotTr(booking.startMs)}
          </Text>
        </View>

        {/* ── §7 — kargo takibi tarzı zaman çizelgesi ── */}
        <View style={[styles.kart, shadow.card]}>
          <AkisCizelgesi status={booking.status} />
        </View>

        {/* ── Para: %10 peşin + %90 sonra (§4.4, §4.9) ── */}
        <View style={[styles.kart, shadow.card]}>
          <View style={styles.paraSatir}>
            <Text variant="caption" tone="muted">
              {t('booking.money.deposit')}
            </Text>
            <Text variant="bodyStrong" tone="ink">
              {pesinat.toLocaleString('tr-TR')} ₸
            </Text>
          </View>
          <View style={styles.paraSatir}>
            <Text variant="caption" tone="muted">
              {t('booking.balance.remaining')}
            </Text>
            <Text variant="bodyStrong" tone="ink">
              {kalan.toLocaleString('tr-TR')} ₸
            </Text>
          </View>
          <Text variant="caption" tone="muted" style={styles.paraNot}>
            {t('booking.money.note')}
          </Text>
        </View>

        {/* ── Görünür geri sayımlar. Brief §7: "görünmez zaman sınırı yasak." ── */}
        {booking.status === 'depozito_bekliyor' && booking.depositDeadline ? (
          <View style={[styles.kart, styles.acilKart, shadow.card]}>
            <Text variant="bodyStrong" style={{ color: colors.danger }}>
              {t('flow.deposit.countdown_t')}
            </Text>
            <Sayac
              bitis={booking.depositDeadline}
              metin={t('flow.deposit.countdown_b')}
              renk={colors.danger}
            />
          </View>
        ) : null}
        {booking.status === 'onay_bekliyor' && booking.responseDeadline ? (
          <View style={[styles.kart, shadow.card]}>
            <Sayac
              bitis={booking.responseDeadline}
              metin={t('flow.approve.countdown')}
              renk={colors.gold}
            />
          </View>
        ) : null}

        {/* ── §4.9 — müşteri ödediğini bildirdi, uzman teyidi bekleniyor ── */}
        {booking.status === 'odeme_bekliyor' && booking.balanceDeclaredAt != null ? (
          <View style={[styles.kart, shadow.card]}>
            <Text variant="caption" tone="muted">
              {rol === 'musteri'
                ? t('booking.balance.wait_b')
                : t('booking.balance.provider_confirm_b')}
            </Text>
          </View>
        ) : null}

        {/* ── TEK BİRİNCİL BUTON (§7) ── */}
        {aksiyon ? (
          <Button
            label={t(aksiyon.etiket)}
            variant={aksiyon.tehlike ? 'secondary' : 'primary'}
            onPress={() => calistir(aksiyon)}
          />
        ) : null}

        {/* İkincil: iptal. Birincil butonla aynı ağırlıkta çizilmez. */}
        {iptalEdilebilir(booking.status) ? (
          <Pressable onPress={iptalEt} accessibilityRole="button" style={styles.iptal}>
            <Ionicons name="close-circle-outline" size={16} color={colors.muted} />
            <Text variant="caption" tone="muted">
              {t('flow.act.iptal')}
            </Text>
          </Pressable>
        ) : null}

        {/* Uzmanın "gelmedi" beyanı — birincil buton başka bir şeyse ikincil kalır. */}
        {rol === 'uzman' && booking.status === 'hizmet_gunu' && gelmediAcik ? (
          <Pressable
            onPress={() =>
              calistir({ etiket: 'flow.act.gelmedi', eylem: 'gelmedi', tehlike: true })
            }
            accessibilityRole="button"
            style={styles.iptal}
          >
            <Ionicons name="person-remove-outline" size={16} color={colors.danger} />
            <Text variant="caption" style={{ color: colors.danger }}>
              {t('flow.act.gelmedi')}
            </Text>
          </Pressable>
        ) : null}

        {/* §4.8 — itiraz penceresi. Beyan edilen tarafa 24 saat. */}
        {(booking.status === 'no_show_musteri' || booking.status === 'no_show_uzman') &&
        booking.finalizeDeadline ? (
          <View style={[styles.kart, shadow.card]}>
            <Text variant="caption" tone="muted" style={styles.paraNot}>
              {fillParams(t('flow.noshow.objection'), { saat: '24' })}
            </Text>
            <Button
              label={t('flow.act.itiraz')}
              variant="secondary"
              onPress={() => cagir(api.disputeBookingApi(booking.id))}
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    // Alt menü içeriği örtmesin — testin zorladığı kural.
    icerik: { padding: space(2), gap: space(1.5), paddingBottom: TAB_BAR_CLEARANCE },
    bos: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space(3) },
    kart: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(0.75),
    },
    // Süre biten kart tehlike kenarlığıyla ayrışır; sayaç tek başına yeterince
    // dikkat çekmiyordu.
    acilKart: { borderWidth: 1, borderColor: colors.danger },
    basSatir: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    flex: { flex: 1 },
    rozet: { paddingHorizontal: space(1), paddingVertical: 3, borderRadius: radius.pill },
    paraSatir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    paraNot: { lineHeight: 18 },
    iptal: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space(0.75),
      paddingVertical: space(1.5),
    },
  });
