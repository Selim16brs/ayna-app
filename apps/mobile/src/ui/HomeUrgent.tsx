import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import type { Appointment } from '../data';
import { useLocale } from '../locale';
import { useStore } from '../store';
import { control, font, radius, space, type ColorTokens } from '../theme';
import { useThemedStyles } from '../theme-context';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

/**
 * ANA EKRAN · ACİL — süresi işleyen TEK iş.
 *
 * Tasarım kanvası kararı: kullanıcıların ana ekranı açma sebeplerinin ilk ikisi
 * "randevum ne zaman?" ve "bekleyen işim var mı?" idi; ikisi de ekranda yoktu.
 * Kapora süresi sessizce doluyordu — kaybedilen randevu ve paranın ana sebebi.
 *
 * Kural: SÜRE İŞLİYORSA SAYAÇ GÖRÜNÜR. Bekleyen iş yoksa kart HİÇ render edilmez
 * (boş yer tutucu yok — ana ekran sessiz kalır).
 */

type Urgency = {
  booking: Appointment;
  titleKey: MessageKey;
  subKey: MessageKey;
  ctaKey: MessageKey;
  deadline?: number;
  route: string;
  /** Sayaç kırmızıya döner: para kaybı riski var. */
  critical: boolean;
};

/** Öncelik sırası: para riski → karar bekleyen → bilgilendirme. */
function pickUrgent(bookings: Appointment[], now: number): Urgency | null {
  const alive = (b: Appointment) => !b.receiptUri || b.status !== 'depozito_bekliyor';

  const deposit = bookings.find(
    (b) => b.status === 'depozito_bekliyor' && alive(b) && (b.depositDeadline ?? 0) > now,
  );
  if (deposit)
    return {
      booking: deposit,
      titleKey: 'home.urgent.deposit',
      subKey: 'home.urgent.deposit_sub',
      ctaKey: 'home.urgent.deposit_cta',
      deadline: deposit.depositDeadline,
      route: `/booking/${deposit.id}`,
      critical: true,
    };

  const conflict = bookings.find((b) => b.status === 'sync_conflict');
  if (conflict)
    return {
      booking: conflict,
      titleKey: 'home.urgent.conflict',
      subKey: 'home.urgent.conflict_sub',
      ctaKey: 'home.urgent.conflict_cta',
      route: `/booking/${conflict.id}`,
      critical: true,
    };

  const alt = bookings.find((b) => b.status === 'degisiklik_onerildi');
  if (alt)
    return {
      booking: alt,
      titleKey: 'home.urgent.alt',
      subKey: 'home.urgent.alt_sub',
      ctaKey: 'home.urgent.alt_cta',
      route: `/booking/${alt.id}`,
      critical: false,
    };

  const confirm = bookings.find((b) => b.status === 'odeme_bekliyor');
  if (confirm)
    return {
      booking: confirm,
      titleKey: 'home.urgent.confirm',
      subKey: 'home.urgent.confirm_sub',
      ctaKey: 'home.urgent.confirm_cta',
      route: `/booking/${confirm.id}`,
      critical: false,
    };

  const refund = bookings.find((b) => b.status === 'iptal_musteri');
  if (refund)
    return {
      booking: refund,
      titleKey: 'home.urgent.refund',
      subKey: 'home.urgent.refund_sub',
      ctaKey: 'home.urgent.refund_cta',
      route: `/booking/${refund.id}`,
      critical: false,
    };

  const waiting = bookings.find(
    (b) => b.status === 'onay_bekliyor' && (b.responseDeadline ?? 0) > now,
  );
  if (waiting)
    return {
      booking: waiting,
      titleKey: 'home.urgent.waiting',
      subKey: 'home.urgent.waiting_sub',
      ctaKey: 'home.urgent.waiting_cta',
      deadline: waiting.responseDeadline,
      route: `/booking/${waiting.id}`,
      critical: false,
    };

  return null;
}

/** "2:14" (bir saatten az) veya "4 sa 12 dk". Süre bittiyse null. */
function formatLeft(ms: number): string | null {
  if (ms <= 0) return null;
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}`;
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function HomeUrgent() {
  const { t } = useLocale();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const bookings = useStore((s) => s.bookings);

  // Sayaç: son bir saatte saniye saniye, öncesinde dakikada bir.
  const [now, setNow] = useState(() => Date.now());
  const urgent = useMemo(() => pickUrgent(bookings, now), [bookings, now]);
  const remaining = urgent?.deadline ? urgent.deadline - now : undefined;
  const fast = remaining !== undefined && remaining < 60 * 60_000;

  useEffect(() => {
    if (!urgent?.deadline) return;
    const id = setInterval(() => setNow(Date.now()), fast ? 1000 : 60_000);
    return () => clearInterval(id);
  }, [urgent?.deadline, fast]);

  if (!urgent) return null;
  const left = remaining === undefined ? null : formatLeft(remaining);
  // Süre dolduysa kartı göstermeyi bırak — sunucu işi durumu zaten düşürecek.
  if (urgent.deadline && !left) return null;

  return (
    <PressableScale
      style={[styles.card, urgent.critical ? styles.cardCritical : styles.cardCalm]}
      onPress={() => router.push(urgent.route as never)}
      accessibilityRole="button"
      accessibilityLabel={`${t(urgent.titleKey)} · ${t(urgent.ctaKey)}`}
    >
      <View style={styles.top}>
        <View style={styles.iconWrap}>
          <Ionicons name="time-outline" size={20} color="#FFFFFF" />
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {t(urgent.titleKey)}
        </Text>
      </View>

      <View style={styles.bottom}>
        <View style={styles.meta}>
          {left ? (
            <Text numeric style={styles.count}>
              {t('home.urgent.left')} {left}
            </Text>
          ) : null}
          <Text numeric style={styles.sub} numberOfLines={2}>
            {urgent.booking.depositAmount && urgent.critical
              ? `${urgent.booking.depositAmount.toLocaleString('tr-TR')} ₸ · ${t(urgent.subKey)}`
              : t(urgent.subKey)}
          </Text>
        </View>
        <View style={styles.cta}>
          <Text
            // §15 — CTA yazısı BEYAZ düğme üstünde. Tema token'ları burada
            // da bozuluyordu: koyu temada rose 2,27 · accent 2,98 (eşik 4,5).
            // Kart yüzeyi sabitlendiğine göre CTA de sabit — aynı iki renk.
            style={[styles.ctaText, { color: urgent.critical ? ACIL_KRITIK : ACIL_SAKIN }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {t(urgent.ctaKey)}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
}

// Bu bileşenin TÜM yüzeyleri artık temadan bağımsız (acil kart amblem gibi
// davranıyor, gerekçe aşağıda), o yüzden palet parametresi kullanılmıyor.
/**
 * Acil kart yüzeyi — TEMADAN BAĞIMSIZ (gerekçe `cardCritical` yanında).
 * Beyaz yazı kontrastı: kritik 4,99:1 · sakin 10,47:1.
 * Aynı renkler beyaz düğme üstünde CTA yazısı olarak da kullanılıyor
 * (orada 4,99 ve 11,07).
 */
const ACIL_KRITIK = '#A25972';
const ACIL_SAKIN = '#5A2A55';

const makeStyles = (_colors: ColorTokens) =>
  StyleSheet.create({
    card: {
      marginHorizontal: space(2.5),
      marginTop: space(2),
      borderRadius: radius.xl,
      paddingVertical: space(2),
      paddingHorizontal: space(2.25),
      gap: space(1.625),
    },
    // Para kaybı riski: Gül. Bilgilendirme: mürdüm.
    /**
     * §15 — ACİL KART YÜZEYİ TEMADAN BAĞIMSIZ.
     *
     * Zemin `colors.rose` / `colors.accent` idi ve yazı sabit beyazdı. Bu
     * ikisi koyu temada AÇIK renge dönüyor: ölçtüm, beyaz yazı 2,27:1'e
     * düşüyordu — 20pt başlık (eşik 3,0) ve 15pt sayaç (eşik 4,5) ikisi de
     * altında, kart okunmuyordu. Açık temada da kritik varyant sınırdaydı
     * (2,98).
     *
     * Token'ı değiştirmek çözmüyordu: `onAccent` koyuyu düzeltip AÇIĞI
     * bozuyordu (2,82). Sorun yazıda değil, ZEMİNDE — `rose` yazı taşıyacak
     * kadar koyu değil.
     *
     * Yüzey artık sabit ve iki temada da aynı: aciliyet ışığa göre değişen
     * bir şey değil. Ölçülen: kritik 4,99:1 · sakin 10,47:1 (beyaz yazı).
     */
    cardCritical: { backgroundColor: ACIL_KRITIK },
    cardCalm: { backgroundColor: ACIL_SAKIN },
    top: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
    iconWrap: {
      width: control.icon,
      height: control.icon,
      borderRadius: radius.xs,
      backgroundColor: 'rgba(255,255,255,0.24)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { flex: 1, fontFamily: font.semibold, fontSize: 20, lineHeight: 25, color: '#FFFFFF' },
    bottom: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
    meta: { flex: 1, gap: 2 },
    count: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20, color: '#FFFFFF' },
    sub: {
      fontFamily: font.regular,
      fontSize: 14,
      lineHeight: 19,
      color: 'rgba(255,255,255,0.86)',
    },
    cta: {
      height: control.chip + 6,
      paddingHorizontal: space(2.5),
      borderRadius: (control.chip + 6) / 2,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaText: { fontFamily: font.semibold, fontSize: 16, lineHeight: 20 },
  });
