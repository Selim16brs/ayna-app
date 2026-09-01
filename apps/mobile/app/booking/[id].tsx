import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { esikGecti } from '@ayna/domain';
import {
  DURUM_TONU,
  akisAdimi,
  beklemeMetni,
  birincilAksiyon,
  durumEtiketi,
  ikincilAksiyonlar,
  iptalEdilebilir,
  karsiTarafBekleniyor,
  type Aksiyon,
  type Rol,
} from '../../src/booking-flow';
import { formatSlotTr } from '../../src/datetime';
import { fillParams, useLocale } from '../../src/locale';
import { randevuDepozitosu, useStore, type BookingEylem } from '../../src/store';
import { radius, shadow, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import {
  AkisCizelgesi,
  BeklemeNabzi,
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
  const randevuEylemi = useStore((s) => s.randevuEylemi);

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
  const pesinat = randevuDepozitosu(booking, rates);
  const kalan = Math.max(0, booking.price - pesinat);

  // §4.8 — "gelmedi" butonları randevu saatinden 15 DAKİKA sonra aktifleşir.
  const gelmediAcik = Date.now() >= booking.startMs + 15 * 60_000;
  // §4.6/§4.7 — erteleme ve ücretsiz iptal yalnız 3 saat eşiğinden ÖNCE.
  const esikOncesi = !esikGecti(booking.startMs);

  const baglam = {
    odemeBildirildi: booking.balanceDeclaredAt != null,
    gelmediAcik,
    esikOncesi,
    // §4.10 — iade edilecek bir tutar yoksa düğme hiç çıkmasın.
    iadeEdilecekVar: pesinat > 0,
    // §4.6 — öneren kendi önerisini yanıtlayamaz; düğme yalnız karşı tarafta.
    ...(booking.proposedBy
      ? { ertelemeyiOneren: (booking.proposedBy === 'customer' ? 'musteri' : 'uzman') as Rol }
      : {}),
  };
  const aksiyon = birincilAksiyon(booking.status, rol, baglam);
  // Bu rolün yapacağı bir şey yoksa ama randevu akıştaysa top KARŞI TARAFTA.
  const bekliyor = karsiTarafBekleniyor(booking.status, rol, baglam);
  /**
   * Kartın başlığındaki isim: uzmanda MÜŞTERİ, müşteride UZMAN.
   * Offline randevuda müşteri adı yoksa genel bir etiket — boş başlık, kartın
   * kime ait olduğunu belirsiz bırakırdı.
   */
  const karsiTaraf =
    rol === 'uzman' ? (booking.customerName ?? t('booking.detail.customer')) : booking.proName;

  /**
   * Eylemi SUNUCUYA yazar ve sonucu kullanıcıya dürüstçe söyler.
   *
   * Eskiden burada `api.x(...).catch(alert)` vardı: ağ yoksa uyarı çıkıyor,
   * eylem KAYBOLUYORDU. Artık store'un kalıcı kuyruğundan geçiyor — ağ yoksa
   * eylem cihazda duruyor, uygulama kapansa bile açılışta gönderiliyor ve
   * kullanıcı bunu görüyor.
   */
  const cagir = (eylem: BookingEylem, arg?: string | number) => {
    if (!booking) return;
    void randevuEylemi(booking.id, eylem, arg).then((sonuc) => {
      if (sonuc === 'kuyrukta') Alert.alert(t('flow.queued_t'), t('flow.queued_b'));
      else void hydrateBookings();
    });
  };

  function calistir(a: Aksiyon) {
    if (!booking) return;
    const bid = booking.id;
    switch (a.eylem) {
      case 'onayla':
        return cagir('onayla');
      case 'kabul':
        return cagir('kabul');
      case 'depozito_ode':
        return router.push(`/booking/deposit?id=${bid}` as never);
      // §4.3 — "Değiştir" ve "Karşı öner" AYNI takvim seçiciyi açar; ayrı ekran
      // yazmak iki farklı saat seçme deneyimi doğururdu.
      case 'ertele':
      case 'degistir':
      case 'karsi_oner':
        return router.push(`/booking/reschedule?id=${bid}` as never);
      case 'reddet':
        return iptalEt();
      // §4.2 — düşen talepte kullanıcıyı uzmanın sayfasına geri götür: yeni
      // saat seçebileceği tek yer orası.
      case 'yeni_saat':
        return router.replace(`/professional/${booking.proId}` as never);
      case 'erteleme_kabul':
        return cagir('erteleme_kabul');
      case 'islemi_bitirdim':
        return cagir('islemi_bitirdim');
      case 'odeme_yaptim':
        return cagir('odeme_yaptim');
      case 'odeme_aldim':
        return cagir('odeme_aldim');
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
            onPress: () => cagir(rol === 'uzman' ? 'musteri_gelmedi' : 'uzman_gelmedi'),
          },
        ]);
      default:
        return undefined;
    }
  }

  function iptalEt() {
    if (!booking) return;
    // §4.7 — 3 saat eşiğinden sonra depozito YANAR; kullanıcı bunu ÖNCEDEN bilmeli.
    const uyari = esikOncesi ? t('flow.cancel.free_b') : t('flow.cancel.forfeit_b');
    Alert.alert(t('flow.cancel.title'), uyari, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('flow.act.iptal'),
        style: 'destructive',
        onPress: () => cagir('iptal'),
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
        {/* ── Başlık: KARŞI TARAF, ne, ne zaman ──
            Kart her iki rolde de "kiminle" sorusunu cevaplamalı. Uzman kendi
            adını okuyordu; kendi randevusunda kendi adını görmek bilgi değil,
            gürültü. Uzmanda müşteri adı, müşteride uzman adı. */}
        <View style={[styles.kart, shadow.card]}>
          <View style={styles.basSatir}>
            <Text variant="h2" tone="ink" style={styles.flex}>
              {karsiTaraf}
            </Text>
            <View style={[styles.rozet, { backgroundColor: tonRengi + '22' }]}>
              <Text variant="caption" style={{ color: tonRengi }}>
                {t(durumEtiketi(booking.status, rol))}
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

        {/* ── §7 — kargo takibi tarzı zaman çizelgesi ──
            Kart YALNIZ içi doluysa çiziliyor. Kapanmış randevuda (iptal/düşme/
            no-show) `AkisCizelgesi` bilerek null dönüyor — yarıda kalmış bir
            süreci "3/7 adım" diye göstermek devam ediyormuş izlenimi verirdi —
            ama kart kabuğu yine çiziliyordu: ekranda BOŞ BEYAZ bir dikdörtgen
            kalıyordu. */}
        {akisAdimi(booking.status) >= 0 ? (
          <View style={[styles.kart, shadow.card]}>
            <AkisCizelgesi status={booking.status} />
            {/* KARŞILIKLI ONAY BEKLENİYORSA nabız. Durum rozeti durağan bir
              etiket; kullanıcı bir şeyin işlediğinden emin olamıyor. Nabız
              "sistem çalışıyor, sıra sende değil" diyor. */}
            {bekliyor ? (
              <View style={styles.nabizKap}>
                <BeklemeNabzi metin={t(beklemeMetni(booking.status, rol))} renk={tonRengi} />
              </View>
            ) : null}
          </View>
        ) : null}

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

        {/* §4.6 — erteleme önerisinde RED de gerekli: "Kabul / Red". Kabul
            birincil buton; red ikincil, çünkü red randevuyu bitirmiyor —
            eski saat geçerli kalıyor. */}
        {aksiyon?.eylem === 'erteleme_kabul' ? (
          <Button
            label={t('flow.act.reddet')}
            variant="secondary"
            onPress={() => cagir('erteleme_red')}
          />
        ) : null}

        {/* §4.3 — İKİNCİL AKSİYONLAR. Tek birincil buton ilkesi (§7) "tek
            seçenek" demek değil: uzman onaylayabilir, FARKLI SAAT ÖNEREBİLİR ya
            da reddedebilir. Yalnız "Onayla" göstermek MD'nin verdiği hakkı
            ekrandan silmekti. */}
        {ikincilAksiyonlar(booking.status, rol, baglam).map((a) => (
          <Button
            key={a.eylem}
            label={t(a.etiket)}
            variant="secondary"
            onPress={() => calistir(a)}
          />
        ))}

        {/* İkincil: iptal. Birincil butonla aynı ağırlıkta çizilmez. */}
        {iptalEdilebilir(booking.status) ? (
          <Pressable onPress={iptalEt} accessibilityRole="button" style={styles.iptal}>
            <Ionicons name="close-circle-outline" size={16} color={colors.muted} />
            <Text variant="caption" tone="muted">
              {t('flow.act.iptal')}
            </Text>
          </Pressable>
        ) : null}

        {/* §4.8 — "gelmedi" beyanı İKİ TARAFTA da sessiz ikincil.
            Geri alınamaz ve karşı tarafa 24 saatlik itiraz penceresi açan bir
            beyan, kartın ana çağrısı olamaz. */}
        {booking.status === 'hizmet_gunu' && gelmediAcik ? (
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
              onPress={() => cagir('itiraz')}
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
    nabizKap: { marginTop: space(1) },
    iptal: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space(0.75),
      paddingVertical: space(1.5),
    },
  });
