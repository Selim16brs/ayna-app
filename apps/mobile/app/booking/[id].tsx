import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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
import { hizmetEtiketiCevir } from '../../src/hizmet-adi';
import { randevuDepozitosu, useStore, type BookingEylem } from '../../src/store';
import { font, type ColorTokens } from '../../src/theme';
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
  const { t, locale } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();

  const booking = useStore((s) => s.bookings.find((b) => b.id === id));
  /*
   * ── EKRAN AÇILINCA SUNUCUDAN TAZELENİYOR ────────────────────────────
   *
   * Bu ekran YEREL kopyayı çiziyor ve üzerinde eylem yapılıyor. Kopya
   * bayatsa iki şey birden bozuluyor: kullanıcı yanlış durumu görüyor
   * (uzman onayladı ama "yanıt bekleniyor" yazıyor) ve bastığı düğme
   * sunucuda geçersiz bir geçiş oluyor — anlamsız bir hata.
   *
   * Bildirimden doğrudan buraya gelinebiliyor; listeyi hiç açmadan.
   */
  const hydrateBookings = useStore((s) => s.hydrateBookings);
  useFocusEffect(
    useCallback(() => {
      void hydrateBookings();
    }, [hydrateBookings]),
  );
  const rates = useStore((s) => s.config.rates);
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

  /**
   * BU RANDEVUDAKİ rolüm — hesabımın türü değil.
   *
   * Burada `currentUser.role` okunuyordu: uzman hesabı olan biri BAŞKA bir
   * uzmandan randevu aldığında kendi müşteri randevusunda uzman ekranını
   * görüyordu — kendi aldığı randevuda "Onayla" düğmesi, başlıkta kendi
   * adı yerine "Müşteri". İki tarafın ekranları birbirine karışıyordu.
   *
   * `benimRolum` sunucudan geliyor (ayrı uçlar). Yerelde henüz eşitlenmemiş
   * yeni randevuda alan boş olabilir: o randevuyu KULLANICI oluşturmuştur,
   * yani müşteridir.
   */
  const rol: Rol = booking.benimRolum ?? 'musteri';

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
      if (sonuc.sonuc === 'kuyrukta') Alert.alert(t('flow.queued_t'), t('flow.queued_b'));
      // Sunucu reddettiyse SESSİZ KALMA: düğme bir şey yapmamış gibi
      // görünüyordu, kullanıcı tekrar tekrar basıyordu.
      else if (sonuc.sonuc === 'reddedildi') {
        if (sonuc.mesaj) Alert.alert(sonuc.mesaj);
        void hydrateBookings();
      }
      // BAŞARIDA TAZELEME YOK: sunucu güncel randevuyu yanıtında döndürüyor ve
      // store onu zaten yazdı. Buradaki `hydrateBookings()` üstüne iki istek
      // daha bindiriyor, üstelik bekleyen yazım kuyruğunun arkasında sıraya
      // giriyordu — "onayla"dan sonraki 15 saniyelik ölü bekleme buydu.
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
      case 'erteleme_red':
        return cagir('erteleme_red');
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
        {/* ── KİMLİK: karşı taraf, hizmet, durum, zaman ──
            Uzmanda MÜŞTERİ adı, müşteride uzman adı. Durum rozeti kendi
            satırında: ad ile aynı satıra sıkışınca ad kırpılıyordu. */}
        <View style={styles.kart}>
          <View style={styles.basSatir}>
            <View style={styles.foto} />
            <View style={styles.buyu}>
              <Text style={styles.ad} numberOfLines={1}>
                {karsiTaraf}
              </Text>
              <Text style={styles.hizmet} numberOfLines={1}>
                {hizmetEtiketiCevir(booking.service, locale)}
              </Text>
            </View>
          </View>
          <View style={[styles.rozet, { backgroundColor: tonRengi + '1F' }]}>
            <View style={[styles.rozetNokta, { backgroundColor: tonRengi }]} />
            <Text style={[styles.rozetYazi, { color: tonRengi }]}>
              {t(durumEtiketi(booking.status, rol))}
            </Text>
          </View>
          <View style={styles.ayrac} />
          <View style={styles.zamanSatir}>
            <Ionicons name="calendar-outline" size={16} color={colors.muted} />
            <Text style={styles.zaman}>{formatSlotTr(booking.startMs)}</Text>
          </View>
        </View>

        {/* ── AKIŞ ÇİZELGESİ — kapanmış randevuda hiç çizilmiyor ── */}
        {akisAdimi(booking.status) >= 0 ? (
          <View style={styles.kart}>
            <AkisCizelgesi status={booking.status} />
            {bekliyor ? (
              <View style={styles.nabizKap}>
                <BeklemeNabzi metin={t(beklemeMetni(booking.status, rol))} renk={tonRengi} />
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── PARA ── */}
        <View style={styles.kart}>
          <View style={styles.paraSatir}>
            <Text style={styles.paraEtiket}>{t('booking.money.deposit')}</Text>
            <Text style={styles.paraDeger}>{pesinat.toLocaleString('tr-TR')} ₸</Text>
          </View>
          <View style={styles.paraSatir}>
            <Text style={styles.paraEtiket}>
              {t(rol === 'uzman' ? 'booking.balance.remaining_pro' : 'booking.balance.remaining')}
            </Text>
            <Text style={styles.paraDeger}>{kalan.toLocaleString('tr-TR')} ₸</Text>
          </View>
        </View>

        {/* ── GERİ SAYIMLAR — aciliyet SIRASI GELEN tarafındır ── */}
        {booking.status === 'depozito_bekliyor' && booking.depositDeadline ? (
          rol === 'musteri' ? (
            <View style={styles.acilKart}>
              <View style={styles.acilBas}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.acilBaslik}>{t('flow.deposit.countdown_t')}</Text>
              </View>
              <Sayac
                bitis={booking.depositDeadline}
                metin={t('flow.deposit.countdown_b')}
                renk={colors.danger}
              />
            </View>
          ) : (
            <View style={styles.bilgiKart}>
              <Text style={styles.bilgiBaslik}>{t('flow.deposit.countdown_pro_t')}</Text>
              <Sayac
                bitis={booking.depositDeadline}
                metin={t('flow.deposit.countdown_pro_b')}
                renk={colors.gold}
              />
            </View>
          )
        ) : null}
        {booking.status === 'onay_bekliyor' && booking.responseDeadline ? (
          <View style={styles.bilgiKart}>
            <Sayac
              bitis={booking.responseDeadline}
              metin={t(rol === 'uzman' ? 'flow.approve.countdown_pro' : 'flow.approve.countdown')}
              renk={colors.gold}
            />
          </View>
        ) : null}

        {/* §4.9 — müşteri ödediğini bildirdi, uzman teyidi bekleniyor */}
        {booking.status === 'odeme_bekliyor' && booking.balanceDeclaredAt != null ? (
          <View style={styles.bilgiKart}>
            <Text style={styles.bilgiNot}>
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

        {/* §4.3 — ikincil aksiyonlar: kabul dışındaki yollar ekrandan silinmez */}
        {ikincilAksiyonlar(booking.status, rol, baglam).map((a) => (
          <Button
            key={a.eylem}
            label={t(a.etiket)}
            variant="secondary"
            onPress={() => calistir(a)}
          />
        ))}

        {iptalEdilebilir(booking.status) ? (
          <Pressable onPress={iptalEt} accessibilityRole="button" style={styles.iptal}>
            <Ionicons name="close-circle-outline" size={16} color={colors.muted} />
            <Text style={styles.iptalYazi}>{t('flow.act.iptal')}</Text>
          </Pressable>
        ) : null}

        {/* §4.8 — "gelmedi" beyanı İKİ TARAFTA da sessiz ikincil. */}
        {booking.status === 'hizmet_gunu' && gelmediAcik ? (
          <Pressable
            onPress={() =>
              calistir({ etiket: 'flow.act.gelmedi', eylem: 'gelmedi', tehlike: true })
            }
            accessibilityRole="button"
            style={styles.iptal}
          >
            <Ionicons name="person-remove-outline" size={16} color={colors.danger} />
            <Text style={[styles.iptalYazi, { color: colors.danger }]}>
              {t('flow.act.gelmedi')}
            </Text>
          </Pressable>
        ) : null}

        {/* §4.8 — itiraz penceresi. Beyan edilen tarafa 24 saat. */}
        {(booking.status === 'no_show_musteri' || booking.status === 'no_show_uzman') &&
        booking.finalizeDeadline ? (
          <View style={styles.kart}>
            <Text style={styles.bilgiNot}>
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
    icerik: { padding: 24, gap: 20, paddingBottom: TAB_BAR_CLEARANCE },
    bos: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    buyu: { flex: 1 },
    kart: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 20,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.line,
    },
    basSatir: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    foto: { width: 52, height: 52, borderRadius: 100, backgroundColor: colors.accentSoft },
    ad: { fontFamily: font.semibold, fontSize: 16, color: colors.ink },
    hizmet: { fontFamily: font.regular, fontSize: 11, color: colors.muted, marginTop: 2 },
    rozet: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 100,
    },
    rozetNokta: { width: 6, height: 6, borderRadius: 3 },
    rozetYazi: { fontFamily: font.medium, fontSize: 12 },
    ayrac: { height: 1, backgroundColor: colors.line },
    zamanSatir: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    zaman: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
    nabizKap: { marginTop: 4 },
    paraSatir: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    paraEtiket: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
    paraDeger: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
    acilKart: {
      borderRadius: 20,
      padding: 16,
      gap: 6,
      backgroundColor: colors.dangerSoft,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    acilBas: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    acilBaslik: { fontFamily: font.semibold, fontSize: 15, color: colors.danger },
    bilgiKart: {
      borderRadius: 20,
      padding: 16,
      gap: 6,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    bilgiBaslik: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
    bilgiNot: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
    iptal: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
    },
    iptalYazi: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  });
