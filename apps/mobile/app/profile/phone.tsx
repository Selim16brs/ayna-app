import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { api } from '../../src/api';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, TAB_BAR_CLEARANCE, Text, TextInput } from '../../src/ui';

/**
 * TELEFON DEĞİŞİKLİĞİ.
 *
 * Kurucu: "kullanıcının telefon numarasını değiştirme özelliği komple
 * kapalı. kullanıcı değişiklik gönderebilmesi lazım ve adminden onay
 * alması gerekir."
 *
 * Daha önce profil ekranındaki telefon alanı SALT OKUNURDU ve "destek ile
 * iletişime geç" diyordu — yani pratikte hiç kimse numarasını
 * değiştiremiyordu. Numara değiştirmek sıradan bir olay: hat kaybolur,
 * operatör değişir, evlilikle numara devredilir.
 *
 * ── İKİ KAPI, İKİ FARKLI SORU ───────────────────────────────────────────
 *
 *   1. SMS kodu → numara GERÇEKTEN başvuranın mı?
 *   2. Admin    → bu değişiklik UYGUN mu?
 *
 * İkincisi tek başına yetmez: admin formda yazan numaranın kime ait
 * olduğunu göremez, başkasının numarasını yazan biri onayı geçerse o hesabı
 * ele geçirirdi (telefon giriş kimliği). Birincisi de tek başına yetmez:
 * numara değiştirerek değerlendirmelerden ya da yasaktan kaçmayı ancak
 * admin durdurur.
 */
export default function PhoneChangeScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const token = useStore((s) => s.token);
  const mevcut = useStore((s) => s.currentUser?.phone);

  const [adim, setAdim] = useState<'numara' | 'kod'>('numara');
  const [telefon, setTelefon] = useState('');
  const [kod, setKod] = useState('');
  const [mesgul, setMesgul] = useState(false);

  const kodIste = async () => {
    if (telefon.trim().length < 7 || mesgul) return;
    setMesgul(true);
    try {
      await api.otpRequest(telefon.trim());
      // Kod adımına YALNIZ gerçekten gönderildiyse geçiliyor — gitmemiş
      // bir kodu bekletmek kullanıcıyı çıkmaza sokardı.
      setAdim('kod');
    } catch {
      Alert.alert(t('profile.phone.title'), t('auth.otp.send_failed'));
    } finally {
      setMesgul(false);
    }
  };

  const gonder = async () => {
    if (kod.trim().length < 4 || !token || mesgul) return;
    setMesgul(true);
    try {
      await api.requestPhoneChange(telefon.trim(), kod.trim(), token);
      Alert.alert(t('profile.phone.title'), t('profile.phone.submitted'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch (e) {
      // Sunucunun gerçek sebebi anlatılıyor: "zaten kayıtlı" ile "kod
      // yanlış" farklı sorunlar, ikisine de aynı mesajı vermek kullanıcıyı
      // döngüde bırakırdı.
      const kodAdi = (e as { code?: string })?.code;
      const mesaj =
        kodAdi === 'PHONE_TAKEN'
          ? t('profile.phone.taken')
          : kodAdi === 'PHONE_SAME'
            ? t('profile.phone.same')
            : t('auth.otp.invalid');
      Alert.alert(t('profile.phone.title'), mesaj);
    } finally {
      setMesgul(false);
    }
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('profile.phone.title')} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        // Klavye açıkken düğmeye TEK dokunuş yetsin: yoksa ilk dokunuş
        // yalnız klavyeyi kapatır ve kullanıcı butona basmadığını sanır.
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.neden}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.accentFg} />
          <Text variant="caption" tone="inkSoft" style={styles.nedenYazi}>
            {t('profile.phone.why')}
          </Text>
        </View>

        {mevcut ? (
          <Text variant="caption" tone="muted">
            {t('profile.phone.current')}: {mevcut}
          </Text>
        ) : null}

        {adim === 'numara' ? (
          <>
            <Alan
              etiket={t('profile.phone.new')}
              deger={telefon}
              degisti={setTelefon}
              klavye="phone-pad"
              ipucu="+7 777 123 45 67"
            />
            <Button
              label={t('profile.phone.send_code')}
              onPress={() => void kodIste()}
              loading={mesgul}
              disabled={mesgul || telefon.trim().length < 7}
            />
          </>
        ) : (
          <>
            <Text variant="caption" tone="muted">
              {t('profile.phone.code_sent')} {telefon.trim()}
            </Text>
            <Alan
              etiket={t('verify.code_label')}
              deger={kod}
              degisti={setKod}
              klavye="number-pad"
              ipucu="000000"
            />
            <Button
              label={t('profile.phone.submit')}
              onPress={() => void gonder()}
              loading={mesgul}
              disabled={mesgul || kod.trim().length < 4}
            />
            <Button
              label={t('common.cancel')}
              variant="secondary"
              onPress={() => {
                setAdim('numara');
                setKod('');
              }}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

/** Etiketli metin alanı — `profile/edit` ekranındaki `Field` ile aynı görünüm. */
function Alan({
  etiket,
  deger,
  degisti,
  klavye,
  ipucu,
}: {
  etiket: string;
  deger: string;
  degisti: (v: string) => void;
  klavye?: 'phone-pad' | 'number-pad';
  ipucu?: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.alan}>
      <Text variant="bodyStrong" tone="ink">
        {etiket}
      </Text>
      <TextInput
        style={styles.girdi}
        value={deger}
        onChangeText={degisti}
        keyboardType={klavye}
        placeholder={ipucu}
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { padding: space(3), paddingBottom: TAB_BAR_CLEARANCE, gap: space(2) },
    neden: {
      flexDirection: 'row',
      gap: space(1.25),
      alignItems: 'flex-start',
      padding: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
    },
    nedenYazi: { flex: 1, lineHeight: 20 },
    alan: { gap: space(0.75) },
    girdi: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.lg,
      paddingHorizontal: space(2),
      paddingVertical: space(1.5),
      color: colors.ink,
    },
  });
