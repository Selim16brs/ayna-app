import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useLocale } from '../locale';
import { radius, space, type ColorTokens } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';
import {
  bicimliYaz,
  gecerliMi,
  isoBul,
  smsDestekleniyorMu,
  tumUlkeler,
  ulkeAra,
  type Ulke,
  type UlkeTam,
} from '../telefon-bicim';

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
  hataGoster = false,
}: {
  ulke: Ulke;
  ulkeDegisti: (u: Ulke) => void;
  yerel: string;
  yerelDegisti: (v: string) => void;
  etiket?: string;
  duzenlenebilir?: boolean;
  /**
   * Numara geçersizken uyarı gösterilsin mi?
   *
   * Varsayılan KAPALI: kullanıcı daha ilk haneyi yazarken "geçersiz" demek
   * yazmayı bitirmesini beklemeden suçlamak olur. Çağıran ekran alandan
   * çıkıldığında ya da gönder'e basıldığında açıyor.
   */
  hataGoster?: boolean;
}) {
  const { t, locale } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [acik, setAcik] = useState(false);
  const [arama, setArama] = useState('');
  const ipucu = useMemo(() => (ulke.kod === '+7' ? '777 123 45 67' : '555 123 45 67'), [ulke.kod]);
  // 245 ülke; liste her tuşta değil, dil değişince yeniden kuruluyor.
  const liste = useMemo(() => tumUlkeler(locale), [locale]);
  const suzulmus = useMemo(() => ulkeAra(liste, arama), [liste, arama]);
  const iso = (ulke as UlkeTam).iso || isoBul(ulke.kod);
  const gecerli = gecerliMi(ulke.kod, yerel, iso || undefined);
  const bosDegil = yerel.replace(/[^0-9]/g, '').length > 0;
  const hatali = hataGoster && bosDegil && !gecerli;
  // Ülke seçilir seçilmez uyarılıyor — numara yazılmasını beklemeye gerek yok.
  const smsYok = !smsDestekleniyorMu(ulke.kod);

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
          style={[styles.numara, !duzenlenebilir && styles.pasif, hatali && styles.numaraHatali]}
          value={yerel}
          /*
           * YAZARKEN GRUPLANIYOR — "777 123 45 67".
           *
           * Bitişik on hane hem okunmuyor hem de kullanıcı yanlış yazdığını
           * fark edemiyordu. Gruplama yalnız GÖRÜNÜM: `tamNumara` boşlukları
           * zaten atıyor, gönderilen değer değişmiyor.
           *
           * Yerel önek (KZ'de 8, TR'de 0) burada SİLİNMİYOR, gönderirken
           * temizleniyor: yazarken karakterin gözden kaybolması "tuş
           * çalışmıyor" hissi verir.
           */
          onChangeText={(v) => yerelDegisti(bicimliYaz(ulke.kod, v, iso || undefined))}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          placeholder={ipucu}
          placeholderTextColor={colors.muted}
          editable={duzenlenebilir}
        />
      </View>
      {hatali ? (
        <Text variant="caption" tone="danger">
          {t('phone.invalid')}
        </Text>
      ) : null}
      {/*
        SMS hattı olmayan ülke — engelleme değil, UYARI.
        Kullanıcı kod gelmeyince hatayı kendinde arıyor ve numarasını
        tekrar tekrar yazıyordu; sebebi baştan söylüyoruz.
      */}
      {smsYok ? (
        <View style={styles.uyariSatir}>
          <Ionicons name="information-circle-outline" size={14} color={colors.gold} />
          <Text variant="caption" tone="gold" style={styles.uyariYazi}>
            {t('phone.sms_unsupported')}
          </Text>
        </View>
      ) : null}

      <Modal visible={acik} animationType="slide" transparent onRequestClose={() => setAcik(false)}>
        <Pressable style={styles.perde} onPress={() => setAcik(false)}>
          <Pressable style={styles.sayfa} onPress={(e) => e.stopPropagation()}>
            <Text variant="bodyStrong" tone="ink" style={styles.baslik}>
              {t('phone.country')}
            </Text>
            {/*
              ARAMA KUTUSU — liste 11 ülkeden 245'e çıktı.
              Kaydırarak bulmak artık mümkün değil; ad, ISO kodu ve çevirme
              kodu üzerinden aranıyor ("germany", "de", "+49" hepsi bulur).
            */}
            <TextInput
              style={styles.arama}
              value={arama}
              onChangeText={setArama}
              placeholder={t('phone.search')}
              placeholderTextColor={colors.muted}
              autoCorrect={false}
              autoCapitalize="none"
            />
            <FlatList
              data={suzulmus}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(u) => `${u.iso}${u.kod}`}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.oge}
                  onPress={() => {
                    ulkeDegisti(item);
                    setArama('');
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
    numaraHatali: { borderColor: colors.danger },
    uyariSatir: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 2 },
    uyariYazi: { flex: 1 },
    arama: {
      paddingHorizontal: space(2),
      paddingVertical: space(1.25),
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      color: colors.ink,
      marginBottom: space(1),
    },
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
