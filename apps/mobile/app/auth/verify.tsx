import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput as HamGirdi, View } from 'react-native';
import { api, ApiError } from '../../src/api';
import { useStore } from '../../src/store';
import { fillParams, useLocale } from '../../src/locale';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text } from '../../src/ui';

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
  const [odakli, setOdakli] = useState(false);
  const girdiRef = useRef<HamGirdi>(null);
  /*
   * OTOMATİK ONAY — altıncı hane girilince kendiliğinden doğruluyor.
   *
   * Kod zaten altı hane; kullanıcıdan ayrıca "Onayla"ya basmasını istemek
   * fazladan bir adım. `denenenKod` aynı kodun tekrar tekrar gönderilmesini
   * engelliyor: kod yanlışsa kullanıcı bir hane silip yeniden yazana kadar
   * ikinci istek gitmiyor.
   */
  const denenenKod = useRef<string | null>(null);
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

  /*
   * Altıncı hane girilince kendiliğinden doğrulanıyor — bkz. `denenenKod`.
   * Kod yanlışsa aynı diziyle ikinci istek gitmiyor; kullanıcı bir hane
   * değiştirdiğinde yeniden deneniyor.
   */
  useEffect(() => {
    if (code.length !== 6 || busy || denenenKod.current === code) return;
    denenenKod.current = code;
    void confirm();
    // `confirm` her render'da yeniden kuruluyor; bağımlılığa alınsaydı etki
    // her render'da tetiklenirdi. Kapı yukarıdaki üç koşul.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, busy]);

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
            {/*
              KOD ALTI AYRI KUTUDA — tek uzun kutuydu.

              Bitişik altı rakam hem okunmuyor hem de kullanıcı kaçıncı haneyi
              yazdığını göremiyordu. Kutular ilerlemeyi görünür kılıyor.

              Kutular ÇİZİM, giriş tek bir görünmez alanda: altı ayrı input
              olsaydı silme tuşu, yapıştırma ve SMS otomatik doldurma
              bölünürdü. Metin saydam, imleç gizli — görüneni kutular yazıyor.
            */}
            <Pressable
              style={styles.kodSatir}
              onPress={() => girdiRef.current?.focus()}
              accessibilityRole="none"
            >
              {Array.from({ length: 6 }, (_, i) => {
                const dolu = i < code.length;
                // Sıradaki kutu yalnız alan odaktayken vurgulanıyor.
                const sirada = i === code.length && odakli;
                return (
                  <View
                    key={i}
                    style={[styles.hane, dolu && styles.haneDolu, sirada && styles.haneSirada]}
                  >
                    <Text style={styles.haneYazi}>{code[i] ?? ''}</Text>
                  </View>
                );
              })}
              <HamGirdi
                ref={girdiRef}
                style={styles.gizliGirdi}
                value={code}
                onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
                onFocus={() => setOdakli(true)}
                onBlur={() => setOdakli(false)}
                keyboardType="number-pad"
                /*
                 * SMS OTOMATİK DOLDURMA — hiç yoktu.
                 * iOS `oneTimeCode` ile kodu klavye üstünde önerir, Android
                 * `sms-otp` ile doğrudan doldurur. Kullanıcı mesaja gidip
                 * kodu ezberleyip geri dönmek zorunda kalmıyor.
                 */
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={6}
                autoFocus
                caretHidden
                accessibilityLabel={t('verify.placeholder')}
              />
            </Pressable>
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
            {/*
              Sayaç ve "yeniden gönder" AYNI SATIRDA — alt alta iki ortalı
              satırdı ve ikisi de düz yazı gibi duruyordu.

              "Yeniden gönder" artık bir düğme: `hitSlop` ile dokunma alanı
              44pt'ye çıkıyor (yazının kendisi 16pt yüksekliğinde).
              `numeric` rakamları eşit genişlikte yazıyor, yoksa geri sayım
              her saniye bir piksel oynuyordu.
            */}
            <View style={styles.altSatir}>
              {ttl > 0 ? (
                <Text variant="caption" tone="muted" numeric>
                  {fillParams(t('verify.code_valid'), { time: mmss(ttl) })}
                </Text>
              ) : (
                <View />
              )}
              <Pressable
                onPress={cooldown > 0 ? undefined : requestCode}
                disabled={cooldown > 0}
                hitSlop={{ top: 14, bottom: 14, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityState={{ disabled: cooldown > 0 }}
              >
                <Text
                  variant="caption"
                  tone={cooldown > 0 ? 'muted' : 'accentFg'}
                  style={cooldown > 0 ? undefined : styles.resend}
                  numeric
                >
                  {cooldown > 0
                    ? fillParams(t('verify.resend_in'), { sec: String(cooldown) })
                    : t('verify.resend')}
                </Text>
              </Pressable>
            </View>
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
    // Altı kutu satırı; kutular esneyerek satırı paylaşıyor (dar ekranda taşmaz).
    kodSatir: { flexDirection: 'row', gap: space(1) },
    hane: {
      flex: 1,
      height: 56,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.line,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    haneDolu: { borderColor: colors.accent, backgroundColor: colors.surface },
    // Sıradaki kutu daha kalın kenarla belli oluyor — imleç gizli olduğu için
    // kullanıcının nerede olduğunu gösteren tek işaret bu.
    haneSirada: { borderColor: colors.accent, borderWidth: 2 },
    haneYazi: {
      fontSize: 24,
      // Satır yüksekliği puntoyla birlikte veriliyor: `Text` varsayılan
      // gövde ölçeğini (16/24) uyguluyor ve 24pt harf o kutuya sığmıyordu.
      lineHeight: 28,
      color: colors.ink,
      textAlign: 'center',
      includeFontPadding: false,
    },
    /*
     * Giriş alanı kutuların ÜSTÜNDE, görünmez.
     *
     * `opacity: 0` yerine saydam metin: alan ağaçta gerçekten duruyor, yoksa
     * iOS ona SMS kodu önerisi sunmuyor. Dokunma da buraya düşüyor.
     */
    gizliGirdi: {
      ...StyleSheet.absoluteFillObject,
      color: 'transparent',
      backgroundColor: 'transparent',
      fontSize: 24,
      textAlign: 'center',
    },
    altSatir: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: space(0.5),
    },
    devHint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space(0.5) },
    actions: { marginTop: space(0.5) },
    resend: { textDecorationLine: 'underline' },
  });
