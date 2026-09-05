import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useLocale } from '../../src/locale';
import { useSalonStaff } from '../../src/staff';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, SaglayiciFoto, Screen, Segmented, StackHeader, Text } from '../../src/ui';

type Schedule = 'standard' | 'flexible';

export default function StaffDetailScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const cikanUzmanRandevulari = useStore((s) => s.cikanUzmanRandevulari);
  const p = useLocalSearchParams<{
    /** Uzman kaydının kimliği — kadro işlemleri BUNA bakıyor, ada değil. */
    id?: string;
    name?: string;
    image?: string;
    bookings?: string;
    rating?: string;
  }>();

  // Uzmanı kadrodan çıkar → açık randevuları UZMAN İPTALİ olarak kapanır.
  // Devretme kaldırıldı: müşteriyi seçtiği kişiden başkasına habersiz
  // yönlendirmek brief'in akışında yok. Sessiz silme yine yasak.
  function removeFromTeam() {
    const kimlik = p.id ?? '';
    Alert.alert(t('seller.staff.remove_confirm'), t('seller.staff.remove_desc'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('seller.staff.remove'),
        style: 'destructive',
        onPress: () => {
          /*
           * KİMLİKLE. Eskiden adla çağrılıyordu ve aynı adlı bir başka
           * uzmanın randevuları da iptal ediliyordu.
           */
          const count = cikanUzmanRandevulari(kimlik);
          Alert.alert(count > 0 ? t('seller.staff.reassigned') : t('seller.staff.removed'));
          router.back();
        },
      },
    ]);
  }
  const bookings = Number(p.bookings ?? 0) || 0;
  /*
   * PUAN YOKSA "0,0" DEĞİL, "—".
   *
   * `Number(p.rating) || 0` hiç değerlendirilmemiş uzmanı yıldızın
   * yanında 0,0 puanlı gösteriyordu: en kötü puanı almış gibi.
   */
  const ratingHam = Number(p.rating);
  const rating = Number.isFinite(ratingHam) && ratingHam > 0 ? ratingHam : null;

  /*
   * UZMANIN HİZMETLERİ ARTIK UYDURULMUYOR.
   *
   * Burada `STAFF_SERVICES[p.name]` okunuyordu: koda gömülü bir
   * AD→HİZMET tablosu. Adı "Madina" olan HERHANGİ bir uzman, panelinde
   * ne tanımlamış olursa olsun, ekranda "Saç boyama · Röfle · Keratin"
   * görünüyordu. Üstelik bölümün başlığı "uzmanın KENDİ panelinden
   * otomatik gelir" diyor ve yanında kilit rozeti var — salon sahibi
   * uydurma listeyi doğrulanmış veri sanıyordu.
   *
   * Gerçek liste sunucudan geliyor; yoksa bölüm hiç çizilmiyor.
   */
  const { staff } = useSalonStaff();
  /*
   * Kadro üyesi KİMLİKLE bulunuyor. `u.name === p.name` idi: adı aynı
   * olan iki uzmandan HANGİSİ olduğu belirsizdi ve ekran ilk eşleşenin
   * hizmetlerini gösteriyordu.
   */
  const kadroda = staff.find((u) => u.id === (p.id ?? ''));
  const ownServices = kadroda?.services ?? [];
  const [schedule, setSchedule] = useState<Schedule>('standard');

  return (
    <Screen edges={[]}>
      <StackHeader title={t('seller.staff.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <SaglayiciFoto uri={p.image} ad={p.name} style={styles.avatar} />
          <View>
            <Text variant="h2" tone="ink">
              {p.name}
            </Text>
            <Text variant="caption" tone="muted">
              {t('seller.staff.period')}
            </Text>
          </View>
        </View>

        {/* §10 gizlilik — salon uzmanın GELİRİNİ görmez (uzmanın şahsi para alanı); yalnız performans */}
        <View style={styles.stats}>
          <Stat
            icon="calendar-outline"
            value={String(bookings)}
            label={t('seller.staff.bookings')}
          />
          <View style={styles.divider} />
          <Stat
            icon="star-outline"
            value={rating !== null ? rating.toFixed(1) : '—'}
            label={t('seller.staff.rating')}
          />
          {/* KALDIRILDI: doluluk yüzdesi `60 + (bookings % 38)` ile UYDURULUYORDU —
              gerçek veriye dayanmayan bir sayıyı yüzde diye göstermek, hiç
              göstermemekten kötüdür. Gerçek doluluk, uzmanın çalışma saatleri ile
              randevularının oranından hesaplanmalı; o veri bu ekranda yok. */}
        </View>

        {/* §5.1 — çalışma grafiği tipi */}
        <Text variant="label" tone="accentFg" style={styles.section}>
          {t('seller.staff.schedule')}
        </Text>
        <Segmented
          options={[
            { value: 'standard', label: t('seller.staff.schedule.standard') },
            { value: 'flexible', label: t('seller.staff.schedule.flexible') },
          ]}
          value={schedule}
          onChange={setSchedule}
        />
        <View style={styles.scheduleNote}>
          <Ionicons name="time-outline" size={14} color={colors.muted} />
          <Text variant="caption" tone="muted" style={styles.flex}>
            {t(
              schedule === 'standard'
                ? 'seller.staff.schedule.standard_desc'
                : 'seller.staff.schedule.flexible_desc',
            )}
          </Text>
        </View>

        {/* §5.1/§10 — uzmanın hizmetleri: uzmanın KENDİ panelinden otomatik gelir, salon değiştiremez (salt-okunur) */}
        <View style={styles.sectionRow}>
          <Text variant="label" tone="accentFg">
            {t('seller.staff.assign')}
          </Text>
          <View style={styles.roLock}>
            <Ionicons name="lock-closed" size={10} color={colors.muted} />
            <Text variant="caption" tone="muted" style={styles.roLockText}>
              {t('seller.staff.readonly')}
            </Text>
          </View>
        </View>
        <Text variant="caption" tone="muted" style={styles.assignHint}>
          {t('seller.staff.assign_hint')}
        </Text>
        {ownServices.length > 0 ? (
          <View style={styles.poolWrap}>
            {ownServices.map((s) => (
              <View key={s} style={styles.poolChip}>
                <Ionicons name="cut-outline" size={12} color={colors.accentFg} />
                <Text variant="caption" tone="inkSoft">
                  {s}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text variant="caption" tone="muted" style={styles.assignHint}>
            {t('seller.staff.no_services')}
          </Text>
        )}

        {/* §4.5 — kadrodan çıkar (randevular devredilir, sessiz silinmez) */}
        <View style={styles.removeWrap}>
          <Button label={t('seller.staff.remove')} variant="secondary" onPress={removeFromTeam} />
          <Text variant="caption" tone="muted" style={styles.removeHint}>
            {t('seller.staff.remove_hint')}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={colors.accentFg} />
      <Text variant="bodyStrong" tone="ink" style={styles.statValue}>
        {value}
      </Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { padding: space(2), paddingBottom: space(3) },
    removeWrap: { marginTop: space(3), gap: space(1) },
    removeHint: { textAlign: 'center', paddingHorizontal: space(2) },
    head: { flexDirection: 'row', alignItems: 'center', gap: space(1.5), marginBottom: space(2.5) },
    avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceMuted },
    stats: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      paddingVertical: space(2),
    },
    stat: { flex: 1, alignItems: 'center', gap: 4 },
    statValue: { marginTop: 2 },
    divider: { width: 1, backgroundColor: colors.line, marginVertical: space(1) },
    section: { paddingHorizontal: space(1), marginTop: space(3), marginBottom: space(1.5) },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space(1),
      marginTop: space(3),
      marginBottom: space(0.5),
    },
    roLock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: space(0.75),
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    roLockText: { fontSize: 10 },
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      overflow: 'hidden',
    },
    svc: { padding: space(2), gap: space(1) },
    svcBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
    svcHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    flex: { flex: 1 },
    scheduleNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.75),
      marginTop: space(1),
      paddingHorizontal: space(1),
    },
    assignHint: { paddingHorizontal: space(1), marginBottom: space(1.25) },
    poolWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    poolChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: space(1.5),
      paddingVertical: space(0.9),
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
  });
