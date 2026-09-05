import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { api, ApiError } from '../../src/api';
import { useStore } from '../../src/store';
import { fillParams, useLocale } from '../../src/locale';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text, TextInput } from '../../src/ui';

export default function VerifyScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{ next?: string; phone?: string }>();

  const storePhone = useStore((s) => s.currentUser?.phone);
  const markVerified = useStore((s) => s.markPhoneVerified);
  const token = useStore((s) => s.token);
  const phone = params.phone ?? storePhone ?? null;
  const next = typeof params.next === 'string' ? params.next : null;

  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Polish 5.3 — kod geçerlilik sayacı (5 dk) + yeniden gönderim soğuması (30 sn).
  // Sunucudaki OTP_TTL_SEC / OTP_RESEND_COOLDOWN_SEC ile aynı; kullanıcı 'kod neden
  // geçersiz?' sürprizi yaşamaz, boşuna 'yeniden gönder'e basıp hız limitine takılmaz.
  const [ttl, setTtl] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (ttl <= 0 && cooldown <= 0) return;
    const id = setInterval(() => {
      setTtl((v) => (v > 0 ? v - 1 : 0));
      setCooldown((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [ttl, cooldown]);
  const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  const requestCode = async () => {
    if (!phone || busy) return;
    setBusy(true);
    try {
      const res = await api.otpRequest(phone);
      setSent(true);
      setDevCode(res.devCode ?? null);
      setTtl(res.expiresInSec ?? 300);
      setCooldown(30);
    } catch (err) {
      /*
       * SEBEBİ NE İSE O YAZILIYOR.
       *
       * Üç ayrı durum tek mesajla anlatılıyordu: gönderim düştü, çok sık
       * istendi, günlük tavan doldu. "Birazdan tekrar dene" günlük tavanda
       * YANLIŞ — kullanıcı beş dakika sonra tekrar deneyip yine
       * alamıyordu.
       */
      const kod = err instanceof ApiError ? err.code : null;
      /*
       * GÖNDERİM DÜŞTÜ → KULLANICIYA SÖYLENİR.
       *
       * Burası eskiden `setSent(true); setDevCode('000000')` yapıyordu:
       * hiçbir SMS gitmemişken "kod gönderildi" diyor ve 000000 diye bir
       * kod UYDURUYORDU. Mock döneminde demo kolaylığıydı; SMSC gerçek
       * SMS göndermeye başlayınca canlı hataya döndü — kod hiç gelmezken
       * kullanıcı ekranda kodu beklerdi.
       *
       * Kurucu: "sistem hiçbir şeyi kendiliğinden uydurmamalı."
       */
      setSent(false);
      Alert.alert(
        t('verify.title'),
        t(
          kod === 'OTP_DAILY_LIMIT'
            ? 'auth.otp.daily_limit'
            : kod === 'OTP_RATE_LIMIT'
              ? 'auth.otp.too_soon'
              : 'auth.otp.send_failed',
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const proceed = () => {
    markVerified();
    if (next) router.replace(next as never);
    else router.back();
  };

  const confirm = async () => {
    if (!phone || code.length !== 6 || busy) return;
    setBusy(true);
    try {
      const res = await api.otpVerify(phone, code);
      /*
       * ── `verified` DEĞİL `phoneVerified` ─────────────────────────────
       *
       * İkisi FARKLI şey söylüyor:
       *   verified      → girilen kod doğruydu.
       *   phoneVerified → sunucu bunu HESABA YAZDI.
       *
       * Eskiden `verified` yetiyordu ve ekran kendini "doğrulandı"
       * işaretliyordu. Sunucuda hiçbir şey değişmiyordu: canlıda 97
       * kullanıcının 96'sı "doğrulanmamış" görünüyordu. Kullanıcı
       * doğruluyor, uygulama bir sonraki açılışta sunucuya sorup yine
       * "doğrulanmamış" öğreniyor ve şerit geri geliyordu.
       *
       * Giriş yapmamış kullanıcıda (kayıt öncesi) hesap HENÜZ YOK, o
       * yüzden sunucu yazamıyor; orada `verified` doğru ölçü ve kayıt
       * anında sunucu bu doğrulamayı devralıyor.
       */
      const yazildi = token ? res.phoneVerified : res.verified;
      if (yazildi) proceed();
      else if (res.verified) {
        // Kod doğruydu ama hesaba yazılamadı — "doğrulandı" demek yalan
        // olurdu; kullanıcı sonra şeridin geri geldiğini görürdü.
        Alert.alert(t('verify.title'), t('profile.edit.save_err'));
      } else Alert.alert(t('verify.title'), t('auth.otp.invalid'));
    } catch {
      // UYDURMA YOK: servise ulaşılamadıysa doğrulanmış sayılmıyor.
      // Eskiden `code === devCode` ile devam ediliyordu; sunucu bunu hiç
      // öğrenmediği için doğrulama bir sonraki açılışta kayboluyordu.
      Alert.alert(t('verify.title'), t('common.offline'));
    } finally {
      setBusy(false);
    }
  };

  if (!phone) {
    return (
      <Screen edges={[]}>
        <StackHeader title={t('verify.title')} />
        <View style={styles.empty}>
          <Text variant="body" tone="muted">
            {t('verify.no_phone')}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <StackHeader title={t('verify.title')} />
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={26} color={colors.accent} />
          </View>
          {/*
            Zemin AÇIK, yazı da açıktı — görünmüyordu.

            Kart bir ara "dolu koyu durmasının sebebi yok" diye `heroSoft`a
            çevrilmiş ama içindeki yazıların tonu `onAccent` kalmış: o ton
            KOYU zemin için, açık temada bembeyaz (#FFFFFF). Beyaz yazı
            #F6ECF4 üstünde 1.06:1 — okunmuyor. Koyu temada da ters yönden
            aynı hata: `onAccent` orada koyu (#1A0810) ve zemin de koyu.
            Aynı `heroSoft` zemini kullanan profil başlığı `ink` kullanıyor.
          */}
          <Text variant="h2" tone="ink">
            {t('verify.subtitle')}
          </Text>
          <Text variant="body" tone="inkSoft" style={styles.phone}>
            {phone}
          </Text>
        </View>

        {!sent ? (
          <Button label={t('verify.send')} loading={busy} onPress={requestCode} />
        ) : (
          <>
            <Text variant="caption" tone="inkSoft" style={styles.label}>
              {t('verify.code_label')}
            </Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder={t('verify.placeholder')}
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            {devCode ? (
              <View style={styles.devHint}>
                <Ionicons name="information-circle-outline" size={14} color={colors.muted} />
                <Text variant="caption" tone="muted">
                  {t('verify.dev_hint')}: {devCode}
                </Text>
              </View>
            ) : null}
            <View style={styles.actions}>
              <Button
                label={t('verify.confirm')}
                loading={busy}
                variant={code.length === 6 && !busy ? 'primary' : 'secondary'}
                disabled={code.length !== 6 || busy}
                onPress={confirm}
              />
            </View>
            <Text
              variant="caption"
              tone={cooldown > 0 ? 'muted' : 'accentFg'}
              style={styles.resend}
              onPress={cooldown > 0 ? undefined : requestCode}
            >
              {cooldown > 0
                ? fillParams(t('verify.resend_in'), { sec: String(cooldown) })
                : t('verify.resend')}
            </Text>
            {ttl > 0 ? (
              <Text variant="caption" tone="muted" style={styles.resend}>
                {fillParams(t('verify.code_valid'), { time: mmss(ttl) })}
              </Text>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), gap: space(2) },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space(4) },
    hero: {
      // Ekranın ASIL eylemi düğme; bu bilgi kartıydı ve dolu koyu
      // durmasının bir sebebi yoktu (Denge).
      backgroundColor: colors.heroSoft,
      borderRadius: radius.xl,
      padding: space(2.5),
      gap: space(1),
    },
    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: radius.md,
      // Zemin TEMADAN — sabit siyah %12, koyu temada koyu mor üstünde
      // neredeyse kayboluyordu. `surface` iki temada da ayrışıyor.
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(0.5),
    },
    phone: { opacity: 0.9, marginTop: 2 },
    label: { marginTop: space(1) },
    input: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.lg,
      paddingHorizontal: space(2),
      paddingVertical: space(1.75),
      color: colors.ink,
      fontSize: 22,
      letterSpacing: 8,
      textAlign: 'center',
    },
    devHint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space(0.5) },
    actions: { marginTop: space(0.5) },
    resend: { textAlign: 'center', textDecorationLine: 'underline', marginTop: space(0.5) },
  });
