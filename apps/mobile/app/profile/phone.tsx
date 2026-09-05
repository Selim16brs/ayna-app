import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { api } from '../../src/api';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import {
  Button,
  Screen,
  StackHeader,
  TelefonGirdisi,
  Text,
  VARSAYILAN_ULKE,
  tamNumara,
} from '../../src/ui';

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
 * ── SMS DOĞRULAMASI YOK ─────────────────────────────────────────────────
 *
 * Kurucu: "biz neden telefon değişikliği yaparken Mobizon'u araya
 * sokuyoruz ki? o tamamen admin işi."
 *
 * İlk sürüm yeni numaraya kod gönderiyordu ve akışı TIKADI: numara ülke
 * kodsuz yazılınca sağlayıcı reddediyor, kullanıcı yalnız "kod
 * gönderilemedi" görüyordu. Ayrıca her deneme para harcıyordu.
 *
 * Numara doğrulaması kayıt/doğrulama ekranında yapılıyor; burada
 * tekrarlanmıyor. Bu akışın hakemi admin.
 */
export default function PhoneChangeScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const token = useStore((s) => s.token);
  const mevcut = useStore((s) => s.currentUser?.phone);

  const [ulke, setUlke] = useState(VARSAYILAN_ULKE);
  const [yerel, setYerel] = useState('');
  const telefon = tamNumara(ulke.kod, yerel);
  const [mesgul, setMesgul] = useState(false);

  const gonder = async () => {
    if (telefon.trim().length < 7 || !token || mesgul) return;
    setMesgul(true);
    try {
      await api.requestPhoneChange(telefon.trim(), token);
      Alert.alert(t('profile.phone.title'), t('profile.phone.submitted'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch (e) {
      // Sunucunun GERÇEK sebebi anlatılıyor: "zaten kayıtlı" ile "bu senin
      // numaran" farklı sorunlar; ikisine aynı mesajı vermek kullanıcıyı
      // döngüde bırakırdı.
      const kodAdi = (e as { code?: string })?.code;
      const mesaj =
        kodAdi === 'PHONE_TAKEN'
          ? t('profile.phone.taken')
          : kodAdi === 'PHONE_SAME'
            ? t('profile.phone.same')
            : t('profile.edit.save_err');
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

        <TelefonGirdisi
          etiket={t('profile.phone.new')}
          ulke={ulke}
          ulkeDegisti={setUlke}
          yerel={yerel}
          yerelDegisti={setYerel}
        />
        <Button
          label={t('profile.phone.submit')}
          onPress={() => void gonder()}
          loading={mesgul}
          disabled={mesgul || telefon.trim().length < 7}
        />
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { padding: space(3), paddingBottom: space(3), gap: space(2) },
    neden: {
      flexDirection: 'row',
      gap: space(1.25),
      alignItems: 'flex-start',
      padding: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
    },
    nedenYazi: { flex: 1, lineHeight: 20 },
  });
