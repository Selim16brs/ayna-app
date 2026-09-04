import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { sifreDurumu } from '@ayna/domain';
import { useLocale } from '../locale';
import { space, type ColorTokens } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * ŞİFRE KURALI ŞERİDİ — alanın hemen altında.
 *
 * Kurucu: "şifre oluştururken en az 1 büyük harf, rakam isteyelim. bunu
 * şifre altında belirtelim kullanıcıya."
 *
 * Kural yalnız yazılmıyor, KARŞILANDIKÇA işaretleniyor: "şifre geçersiz"
 * demek kullanıcıya neyi eklemesi gerektiğini söylemiyor.
 *
 * Kullanıcı ALANA DOKUNMADAN üç madde de gri: boş bir formu kırmızı
 * uyarılarla karşılamak, henüz hata yapmamış birini azarlamak olurdu.
 */
export function SifreKurali({ sifre }: { sifre: string }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const d = sifreDurumu(sifre);
  const bos = sifre.length === 0;

  const madde = (ok: boolean, etiket: string) => (
    <View key={etiket} style={styles.madde}>
      <Ionicons
        name={bos ? 'ellipse-outline' : ok ? 'checkmark-circle' : 'close-circle'}
        size={13}
        color={bos ? colors.muted : ok ? colors.success : colors.danger}
      />
      <Text variant="micro" tone={bos ? 'muted' : ok ? 'inkSoft' : 'muted'}>
        {etiket}
      </Text>
    </View>
  );

  return (
    <View style={styles.satir}>
      {madde(d.uzunlukTamam, t('auth.f.pw_len'))}
      {madde(d.buyukHarfVar, t('auth.f.pw_upper'))}
      {madde(d.rakamVar, t('auth.f.pw_digit'))}
    </View>
  );
}

const makeStyles = (_colors: ColorTokens) =>
  StyleSheet.create({
    // Sarmalı: üç madde dar ekranda tek satıra sığmıyor ve kırpılırdı.
    satir: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1.5), marginTop: space(0.75) },
    madde: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  });
