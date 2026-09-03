import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useLocale } from '../locale';
import { radius, space, type ColorTokens } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';
import { ULKELER, type Ulke } from '../telefon-bicim';

export * from '../telefon-bicim';

/**
 * TELEFON GİRDİSİ — ÜLKE KODU AYRI, NUMARA AYRI.
 *
 * Kurucu: "telefon numarası kaydedilirken ülke kodu ayrı numara ayrı
 * şekilde giriş yapılabilir."
 *
 * ── NEDEN GEREKLİ ───────────────────────────────────────────────────────
 *
 * Tek kutuya yazdırmak sessizce bozuluyordu. Kurucu kayıt sırasında
 * numarayı ülke kodsuz yazdı; sağlayıcı "uluslararası biçime uymuyor" diye
 * reddetti ve ekranda yalnız "kod gönderilemedi" göründü. Kullanıcının ne
 * yanlış yaptığını anlamasının yolu yoktu.
 *
 * Ülke kodu ayrı bir seçim olunca UNUTULAMIYOR: her zaman bir değeri var ve
 * varsayılanı Kazakistan. Kullanıcı yalnız kendi numarasını yazıyor.
 *
 * ── SIFIRI KENDİMİZ ATIYORUZ ────────────────────────────────────────────
 *
 * Kazakistan'da numara alışkanlıkla "8 777…" diye yazılıyor; baştaki 8
 * ulusal önek ve ülke kodunun yerine geçiyor. Ülke kodu ayrıca seçildiğinde
 * o 8 (ve Türkiye'deki 0) FAZLALIK olur — sessizce atılıyor, yoksa numara
 * bir hane kayar ve başka birine gider.
 */

export function TelefonGirdisi({
  ulke,
  ulkeDegisti,
  yerel,
  yerelDegisti,
  etiket,
  duzenlenebilir = true,
}: {
  ulke: Ulke;
  ulkeDegisti: (u: Ulke) => void;
  yerel: string;
  yerelDegisti: (v: string) => void;
  etiket?: string;
  duzenlenebilir?: boolean;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [acik, setAcik] = useState(false);
  const ipucu = useMemo(() => (ulke.kod === '+7' ? '777 123 45 67' : '555 123 45 67'), [ulke.kod]);

  return (
    <View style={styles.sar}>
      {etiket ? (
        <Text variant="bodyStrong" tone="ink">
          {etiket}
        </Text>
      ) : null}
      <View style={styles.satir}>
        <Pressable
          onPress={() => duzenlenebilir && setAcik(true)}
          style={[styles.kod, !duzenlenebilir && styles.pasif]}
          accessibilityRole="button"
          accessibilityLabel={t('phone.country')}
        >
          <Text variant="body" tone="ink">
            {ulke.bayrak} {ulke.kod}
          </Text>
          {duzenlenebilir ? <Ionicons name="chevron-down" size={14} color={colors.muted} /> : null}
        </Pressable>
        <TextInput
          style={[styles.numara, !duzenlenebilir && styles.pasif]}
          value={yerel}
          // Yerel önek burada değil, GÖNDERİRKEN temizleniyor: kullanıcı
          // yazarken karakterin kaybolması "tuş çalışmıyor" hissi verir.
          onChangeText={(v) => yerelDegisti(v.replace(/[^0-9 ]/g, ''))}
          keyboardType="phone-pad"
          placeholder={ipucu}
          placeholderTextColor={colors.muted}
          editable={duzenlenebilir}
        />
      </View>

      <Modal visible={acik} animationType="slide" transparent onRequestClose={() => setAcik(false)}>
        <Pressable style={styles.perde} onPress={() => setAcik(false)}>
          <Pressable style={styles.sayfa} onPress={(e) => e.stopPropagation()}>
            <Text variant="bodyStrong" tone="ink" style={styles.baslik}>
              {t('phone.country')}
            </Text>
            <FlatList
              data={ULKELER}
              keyExtractor={(u) => u.kod}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.oge}
                  onPress={() => {
                    ulkeDegisti(item);
                    setAcik(false);
                  }}
                >
                  <Text variant="body" tone="ink">
                    {item.bayrak} {item.ad}
                  </Text>
                  <Text variant="body" tone="muted">
                    {item.kod}
                  </Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    sar: { gap: space(0.75) },
    satir: { flexDirection: 'row', gap: space(1) },
    kod: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: space(1.5),
      paddingVertical: space(1.5),
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
    },
    numara: {
      flex: 1,
      paddingHorizontal: space(2),
      paddingVertical: space(1.5),
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      color: colors.ink,
    },
    pasif: { backgroundColor: colors.surfaceMuted, color: colors.muted },
    perde: { flex: 1, backgroundColor: '#0006', justifyContent: 'flex-end' },
    sayfa: {
      maxHeight: '70%',
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: space(2),
    },
    baslik: { marginBottom: space(1.5) },
    oge: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: space(1.75),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
  });
