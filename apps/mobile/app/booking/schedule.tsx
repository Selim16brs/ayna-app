import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { cakisiyor, doluAraliklar } from '../../src/booking-flow';
import type { BookingSource } from '../../src/data';
import { almatyDayStart, formatSlotTr, slotTime } from '../../src/datetime';
import { api, type ApiOffer } from '../../src/api';
import { useProfessionalDetail } from '../../src/catalog';
import { useLocale } from '../../src/locale';
import { bildirimIzniIste } from '../../src/notifications';
import { useStore } from '../../src/store';
import { type ColorTokens, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { uzmanlikYazisi } from '../../src/uzmanlik';
import {
  Button,
  DateField,
  RulesCard,
  Screen,
  StackHeader,
  TAB_BAR_CLEARANCE,
  Text,
  SaglayiciFoto,
} from '../../src/ui';

const LEAD_H = 2; // en erken 2 saat sonrası

export default function ScheduleScreen() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{
    proId?: string;
    source?: string;
    uzmanId?: string;
    service?: string;
    offerId?: string;
  }>();
  // §keşif Modül 2 — kampanyadan gelindi: fiyat/hizmet kampanyadan, saat penceresi kısıtlı
  const [offer, setOffer] = useState<ApiOffer | null>(null);
  useEffect(() => {
    if (!params.offerId) return;
    let alive = true;
    api
      .offers()
      .then((rows) => alive && setOffer(rows.find((o) => o.id === params.offerId) ?? null))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [params.offerId]);
  const addBooking = useStore((s) => s.addBooking);
  const pro = useProfessionalDetail(params.proId ?? '1');
  const isSalon = pro.kind === 'salon' && pro.staff.length > 0;
  const [uzmanId, setUzmanId] = useState<string>(params.uzmanId ?? pro.staff[0]?.id ?? '');
  // En erken randevu = şimdi + 2 saat (dakikayı 0'a yuvarla); Benim İçin ile aynı native seçici.
  const minDate = new Date(Date.now() + LEAD_H * 3_600_000);
  minDate.setMinutes(0, 0, 0);
  const [when, setWhen] = useState<Date>(() => new Date(minDate));

  const uzman = pro.staff.find((u) => u.id === uzmanId);

  /**
   * §4.1.1 — "Uzmanın hizmet listesinden 1 VEYA BİRDEN FAZLA hizmet. Toplam
   * süre = seçilen hizmetlerin süre toplamı."
   *
   * Ekran tek hizmetle açılıyor (kullanıcı bir hizmete dokunup geldi); listeden
   * ekleyip çıkarabiliyor. Kampanya randevusunda seçim KAPALI: kampanya
   * fiyatı tek bir hizmete bağlı, üstüne hizmet eklemek fiyatı belirsizleştirirdi.
   */
  const gelenHizmet = pro.services.find((sv) => sv.name === params.service);
  const [secili, setSecili] = useState<string[]>(() =>
    gelenHizmet ? [gelenHizmet.name] : pro.services[0] ? [pro.services[0].name] : [],
  );
  // Uzman değiştiğinde ya da profil geç yüklendiğinde ilk hizmeti tohumla.
  useEffect(() => {
    if (secili.length === 0 && pro.services[0]) setSecili([pro.services[0].name]);
  }, [pro.services, secili.length]);
  const seciliHizmetler = pro.services.filter((sv) => secili.includes(sv.name));
  const cokluAcik = !offer && pro.services.length > 1;
  const toplamSure = seciliHizmetler.reduce((t, sv) => t + (sv.durationMin ?? 60), 0);
  const toplamTutar = seciliHizmetler.reduce((t, sv) => t + (sv.price ?? 0), 0);
  const durationMin = toplamSure || (gelenHizmet?.durationMin ?? 60);
  const hizmetSec = (ad: string) =>
    setSecili((onceki) => {
      // Son hizmet çıkarılamaz: hizmetsiz randevu diye bir şey yok.
      if (onceki.includes(ad)) return onceki.length > 1 ? onceki.filter((x) => x !== ad) : onceki;
      return [...onceki, ad];
    });

  // §4.2 — uzmanın DOLU aralıkları (önümüzdeki 14 gün): müşteri dolu saati seçemesin,
  // karşılıklı öneri turu (çifte iş) olmasın. Sunucu yalnız zaman aralığı döner (gizlilik).
  const [uzakDolu, setUzakDolu] = useState<{ startMs: number; endMs: number }[]>([]);
  const yerelRandevular = useStore((st) => st.bookings);
  // §4.2 — sunucudakiler + bu cihazdaki bekleyenler (bkz. doluAraliklar).
  const busyRanges = useMemo(
    () => doluAraliklar(pro.id, uzakDolu, yerelRandevular),
    [pro.id, uzakDolu, yerelRandevular],
  );
  useEffect(() => {
    if (!pro.id) return;
    let alive = true;
    void api
      .proBusy(pro.id, Date.now(), Date.now() + 14 * 86_400_000)
      .then((rows) => alive && setUzakDolu(Array.isArray(rows) ? rows : []))
      .catch(() => undefined); // erişilemezse gösterge yok — akış engellenmez
    return () => {
      alive = false;
    };
  }, [pro.id]);
  const chosenStartMs = when.getTime();
  const chosenEndMs = chosenStartMs + durationMin * 60_000;
  const slotBusy = busyRanges.some((b) =>
    cakisiyor({ startMs: chosenStartMs, endMs: chosenEndMs }, b),
  );
  const dayBusy = busyRanges.filter(
    (b) => almatyDayStart(b.startMs, 0) === almatyDayStart(chosenStartMs, 0),
  );

  // Kampanya gün/saat penceresi (Almatı UTC+5) — sunucu ayrıca doğrular
  function inOfferWindow(ms: number): boolean {
    if (!offer) return true;
    const local = new Date(ms + 5 * 3600 * 1000);
    const wd = local.getUTCDay();
    if (offer.validDays.length > 0 && !offer.validDays.includes(wd)) return false;
    if (offer.timeFrom && offer.timeTo) {
      const hm = `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`;
      if (hm < offer.timeFrom || hm >= offer.timeTo) return false;
    }
    return true;
  }
  const offerWindowOk = inOfferWindow(when.getTime());

  function confirm() {
    const startMs = when.getTime();
    const source = (params.source as BookingSource) ?? 'direct';
    const serviceName = offer
      ? offer.title
      : seciliHizmetler.length
        ? seciliHizmetler.map((sv) => sv.name).join(' + ')
        : (params.service ?? uzmanlikYazisi(pro, locale));
    const price = offer ? offer.finalPrice : toplamTutar;

    const id = addBooking({
      source,
      service: serviceName,
      proId: pro.id,
      proName: pro.name,
      proImage: pro.image,
      ...(uzman?.name ? { uzmanName: uzman.name } : {}),
      ...(offer ? { offerId: offer.id } : {}),
      startMs,
      durationMin,
      price,
      // Sunucu bu adlardan fiyat ve süreyi KENDİ hizmet listesinden okuyup
      // toplamı yeniden hesaplıyor; buradaki tutar yalnız iyimser gösterim.
      ...(offer ? {} : { serviceNames: seciliHizmetler.map((sv) => sv.name) }),
    });

    // BİLDİRİM İZNİ — kullanıcı randevuya yeni bağlandı; 24s/2s hatırlatmasının
    // değeri burada apaçık. İzin YALNIZ talep yayınlama ekranında isteniyordu:
    // hiç talep açmayan kullanıcıdan izin hiç istenmiyor, dolayısıyla ne yerel
    // hatırlatma ne uzak push düşüyordu — "uygulama kapalıyken bildirim
    // gelmiyor"un sebebi buydu. `bildirimIzniIste` zaten idempotent: izin varsa
    // ya da daha önce reddedildiyse sessizce geçer.
    void bildirimIzniIste(useStore.getState().token);

    router.replace({
      pathname: '/booking/confirmed',
      params: {
        id,
        proId: pro.id,
        source,
        slot: formatSlotTr(startMs),
        uzmanName: uzman?.name ?? '',
        service: serviceName,
        price: String(price),
      },
    });
  }

  // BEKLEME LİSTESİ KALDIRILDI (brief §4.2): slot talep gönderildiği an
  // kilitleniyor, dolayısıyla aynı saate ikinci bir talep hiç oluşamıyor.
  // Bekleyecek kimse olmadığı için buton da kaldırıldı.

  return (
    <Screen edges={['bottom']}>
      <StackHeader title={t('booking.schedule.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.proCard, shadow.soft]}>
          <SaglayiciFoto uri={pro.image} ad={pro.name} style={styles.proImage} />
          <View style={styles.proBody}>
            <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
              {pro.name}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {isSalon && uzman
                ? `${uzmanlikYazisi(pro, locale)} · ${uzman.name}`
                : uzmanlikYazisi(pro, locale)}
            </Text>
          </View>
        </View>

        {/* Uzman seçimi (salonlarda) */}
        {isSalon ? (
          <>
            <Text variant="h2" tone="ink" style={styles.label}>
              {t('booking.schedule.uzman')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.staffRow}
            >
              {pro.staff.map((u) => {
                const on = u.id === uzmanId;
                return (
                  <Pressable
                    key={u.id}
                    onPress={() => setUzmanId(u.id)}
                    style={[styles.staffCard, shadow.soft, on && styles.staffActive]}
                  >
                    <View style={[styles.staffAvatarWrap, on && styles.staffAvatarOn]}>
                      <Image source={{ uri: u.image }} style={styles.staffAvatar} />
                    </View>
                    <Text variant="caption" tone="ink" numberOfLines={1}>
                      {u.name}
                    </Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {u.role}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        {/* §keşif Modül 2 — kampanya bilgisi + fiyat (sunucu fiyatı ayrıca sabitler) */}
        {offer ? (
          <View style={styles.offerBox}>
            <Text variant="bodyStrong" tone="onAccent" numberOfLines={2}>
              {offer.title}
            </Text>
            <View style={styles.offerPriceRow}>
              <Text variant="caption" tone="onAccent" style={styles.offerOld}>
                {offer.basePrice.toLocaleString('tr-TR')} ₸
              </Text>
              <Text variant="bodyStrong" tone="onAccent">
                {offer.finalPrice.toLocaleString('tr-TR')} ₸
              </Text>
            </View>
            {offer.timeFrom || offer.validDays.length > 0 ? (
              <Text variant="caption" tone="onAccent">
                {t('offers.window_hint')}
                {offer.timeFrom ? ` · ${offer.timeFrom}–${offer.timeTo}` : ''}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* §4.1.1 — hizmet seçimi. Tek hizmeti olan uzmanda liste gösterilmiyor:
            seçenek sunmayan bir seçim ekranı gürültüdür. */}
        {cokluAcik ? (
          <>
            <Text variant="h2" tone="ink" style={styles.label}>
              {t('booking.schedule.services')}
            </Text>
            <View style={[styles.hizmetKart, shadow.soft]}>
              {pro.services.map((sv, i) => {
                const on = secili.includes(sv.name);
                return (
                  <Pressable
                    key={sv.id ?? sv.name}
                    onPress={() => hizmetSec(sv.name)}
                    style={[styles.hizmetSatir, i > 0 && styles.hizmetAyrac]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={sv.name}
                  >
                    <Ionicons
                      name={on ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={on ? colors.accent : colors.muted}
                    />
                    <View style={styles.hizmetGovde}>
                      <Text variant="body" tone="ink" numberOfLines={1}>
                        {sv.name}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {sv.durationMin ?? 60} {t('common.min')}
                      </Text>
                    </View>
                    <Text variant="bodyStrong" tone="ink">
                      {(sv.price ?? 0).toLocaleString('tr-TR')} ₸
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        <Text variant="h2" tone="ink" style={styles.label}>
          {t('booking.schedule.time')}
        </Text>
        {/* Benim İçin kayıt eklemeleriyle AYNI native tarih/saat modeli */}
        <View style={[styles.pickerCard, shadow.soft]}>
          <DateField
            label={t('booking.schedule.datetime')}
            value={when}
            onChange={setWhen}
            mode="datetime"
            minimumDate={minDate}
            last
          />
        </View>

        {/* §4.2 — seçilen günün doluluk haritası: dolu aralıklar kırmızı çip, kalan saatler boş */}
        {dayBusy.length > 0 ? (
          <View style={[styles.busyCard, shadow.soft]}>
            <Text variant="caption" tone="muted">
              {t('booking.schedule.busy_title')}
            </Text>
            <View style={styles.busyChips}>
              {dayBusy.map((b) => (
                <View key={b.startMs} style={styles.busyChip}>
                  <Text variant="caption" style={styles.busyChipText}>
                    {slotTime(b.startMs)}–{slotTime(b.endMs)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Text variant="caption" tone="muted" style={styles.busyFreeHint}>
            {t('booking.schedule.busy_none')}
          </Text>
        )}

        {/* §4.1.3 — ÖZET: "Göndermeden önce açıkça gösterilir: hizmetler,
            toplam süre, toplam tutar, depozito tutarı (%10), iptal kuralı."
            Kullanıcı neyi kabul ettiğini göndermeden ÖNCE görmeli. */}
        {/*
          ── AKSAN ZEMİNDE SAYFA RENGİ YOK ────────────────────────────
          Kurucu: "okunurluluk sorunu var."

          Kartın zemini AKSAN; yazıları ise sayfa tonlarıydı (`ink`,
          `muted`). Koyu mürekkep ve gri, doygun bir zeminde okunmuyor —
          "Özet" ve "Toplam süre" satırları neredeyse görünmezdi.
          Aksan zemininde YAZI DA aksanın karşıtı olmalı (`onAccent`);
          ikisi paletde birlikte tanımlı ve birlikte değişiyor.
        */}
        <View style={[styles.ozetKart, shadow.soft]}>
          <Text variant="caption" style={styles.ozetIkincil}>
            {t('booking.schedule.summary')}
          </Text>
          {(offer ? [{ name: offer.title, price: offer.finalPrice }] : seciliHizmetler).map(
            (sv) => (
              <View key={sv.name} style={styles.ozetSatir}>
                <Text variant="body" numberOfLines={1} style={[styles.ozetAd, styles.ozetYazi]}>
                  {sv.name}
                </Text>
                <Text variant="body" style={styles.ozetYazi}>
                  {(sv.price ?? 0).toLocaleString('tr-TR')} ₸
                </Text>
              </View>
            ),
          )}
          <View style={styles.ozetAyrac} />
          <View style={styles.ozetSatir}>
            <Text variant="caption" style={styles.ozetIkincil}>
              {t('booking.schedule.total_time')}
            </Text>
            <Text variant="body" style={styles.ozetYazi}>
              {durationMin} {t('common.min')}
            </Text>
          </View>
          <View style={styles.ozetSatir}>
            <Text variant="bodyStrong" style={styles.ozetYazi}>
              {t('booking.schedule.total')}
            </Text>
            <Text variant="h2" style={styles.ozetYazi}>
              {(offer ? offer.finalPrice : toplamTutar).toLocaleString('tr-TR')} ₸
            </Text>
          </View>
        </View>

        {/* §B5 — kurallar kartı: depozito/iptal/no-show her zaman görünür.
            §4.4 — depozito TOPLAM tutarın %10'u; kart gerçek tutarı yazıyor. */}
        <RulesCard price={offer ? offer.finalPrice : toplamTutar} />
      </ScrollView>

      <View style={styles.footer}>
        {offer && !offerWindowOk ? (
          <Text variant="caption" style={styles.windowWarn}>
            {t('offers.window_invalid')}
          </Text>
        ) : null}
        {slotBusy ? (
          <Text variant="caption" style={styles.windowWarn}>
            {t('booking.schedule.busy_conflict')}
          </Text>
        ) : null}
        <Button
          label={t('booking.schedule.confirm')}
          variant={offerWindowOk && !slotBusy ? 'primary' : 'secondary'}
          disabled={!offerWindowOk || slotBusy}
          onPress={confirm}
        />
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    hizmetKart: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 20,
      paddingHorizontal: 16,
    },
    hizmetSatir: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      minHeight: 44,
    },
    hizmetAyrac: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
    hizmetGovde: { flex: 1 },
    /*
     * ÖZET KARTI — kararın merkezindeki para büyük ve dolu kartta.
     *
     * Zemin SEÇİLEN AKSANDAN. `lightColors.accent` sabitiydi: kullanıcı
     * hangi rengi seçerse seçsin kart hep aynı kırmızı kalıyordu.
     *
     * Yazılar `onAccent` — paletde aksanın karşıtı olarak tanımlı ve
     * onunla birlikte değişiyor. Sayfa tonları (`ink`/`muted`) doygun
     * zeminde okunmuyordu.
     */
    ozetKart: {
      backgroundColor: colors.accent,
      borderRadius: 24,
      padding: 20,
      gap: 12,
    },
    ozetYazi: { color: colors.onAccent },
    // İkincil satırlar: aynı renk, düşük opaklık. Ayrı bir gri kullanmak
    // yine kontrastı kaybettirirdi.
    ozetIkincil: { color: colors.onAccent, opacity: 0.75 },
    ozetSatir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    ozetAd: { flex: 1, marginRight: space(1) },
    // Ayraç da kartın kendi yazı renginden: `colors.line` sayfa çizgisi,
    // doygun zeminde görünmüyordu.
    ozetAyrac: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.onAccent,
      opacity: 0.35,
      marginVertical: space(0.5),
    },
    content: { paddingHorizontal: 24, paddingBottom: 32 },
    pickerCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 20,
      padding: 16,
    },
    proCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 20,
      padding: space(1.75),
    },
    proImage: {
      width: 60,
      height: 60,
      borderRadius: 16,
      backgroundColor: colors.bgSunken,
    },
    proBody: { flex: 1, gap: 3 },
    busyCard: {
      marginTop: space(1.5),
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 20,
      padding: 16,
      gap: space(1),
    },
    busyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    busyChip: {
      backgroundColor: colors.dangerSoft,
      borderRadius: 16,
      paddingHorizontal: space(1.25),
      paddingVertical: space(0.5),
    },
    busyChipText: { color: colors.danger },
    busyFreeHint: { marginTop: space(1.5), marginLeft: space(0.5) },
    label: { marginTop: space(3), marginBottom: space(1.5) },
    staffRow: { gap: 12, paddingRight: space(3), paddingVertical: space(0.5) },
    staffCard: {
      width: 112,
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: space(1.75),
    },
    staffActive: { backgroundColor: colors.accentSoft },
    staffAvatarWrap: {
      width: 60,
      height: 60,
      borderRadius: 30,
      padding: 3,
      marginBottom: space(0.75),
      borderWidth: 2,
      borderColor: 'transparent',
    },
    staffAvatarOn: { borderColor: colors.accent },
    staffAvatar: {
      width: '100%',
      height: '100%',
      borderRadius: 27,
      backgroundColor: colors.bgSunken,
    },
    row: { flexDirection: 'row', gap: space(1), flexWrap: 'wrap' },
    dayChip: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 100,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    times: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1.25) },
    timeChip: {
      width: '31%',
      alignItems: 'center',
      paddingVertical: space(1.75),
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    active: { backgroundColor: colors.accent },
    offerBox: {
      backgroundColor: colors.accentFg,
      borderRadius: 20,
      padding: 16,
      gap: 4,
      marginTop: space(2),
    },
    offerPriceRow: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    offerOld: { textDecorationLine: 'line-through', opacity: 0.7 },
    windowWarn: { color: colors.danger, textAlign: 'center', marginBottom: space(1) },
    waitlistBtn: { alignItems: 'center', paddingTop: space(1.25) },
    waitlistText: { textDecorationLine: 'underline' },
    footer: {
      paddingHorizontal: 24,
      paddingTop: space(1.5),
      paddingBottom: TAB_BAR_CLEARANCE,
    },
  });
