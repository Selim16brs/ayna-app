import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatSlotTr } from '../datetime';
import { fillParams, useLocale } from '../locale';
import { radius, space, type ColorTokens, font } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { TakvimSecici } from './TakvimSecici';
import { Text } from './Text';

/**
 * TERCİH EDİLEN TARİH & SAAT — gerçek takvim.
 *
 * Kurucu: "fiyat belirterek teklif alırken bir takvim çıkmalı. tarih
 * seçenekleri kısıtlanmamalı."
 *
 * Eskiden ekranda SABİT DOKUZ ÇİP vardı: yalnız yarın/öbür gün/üç gün
 * sonra ve yalnız 11:00, 15:00, 18:00. Kullanıcının aklındaki gün ya da
 * saat listede yoksa hiçbir tercih belirtemiyordu — cumartesi 10:00
 * isteyen biri için ekranda karşılığı yoktu.
 *
 * Artık cihazın kendi takvimi açılıyor: istediği günü ve saati seçiyor.
 *
 * TEK SINIR GEÇMİŞ ZAMAN. Bu bir kısıtlama değil geçerlilik kuralı:
 * dün için randevu tercihi göndermek anlamsız, uzman da yanıtlayamaz.
 * İleriye doğru sınır YOK.
 *
 * EN FAZLA İKİ TERCİH: kural zaten vardı (§4.1 — uzman ikisinden birini
 * onaylar ya da alternatif önerir). Üç ve fazlası uzmanın kararını
 * zorlaştırıyor, seçim de bağlayıcı olmaktan çıkıyor.
 */

const EN_FAZLA = 2;

export function TarihSecici({
  secilenler,
  degisti,
}: {
  /** Seçili anlar (UTC ms). */
  secilenler: number[];
  degisti: (yeni: number[]) => void;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [acik, setAcik] = useState(false);
  // Takvim, YARIN'ın aynı saatinde açılıyor: bugünün geçmiş saatlerinde
  // başlayıp kullanıcıyı ileri kaydırmaya zorlamak gereksiz.
  const [taslak, setTaslak] = useState(() => new Date(Date.now() + 24 * 60 * 60 * 1000));

  const dolu = secilenler.length >= EN_FAZLA;

  const ekle = (d: Date) => {
    const ms = d.getTime();
    // Geçmişe düşen seçim sessizce yutulmaz — kullanıcı ne olduğunu
    // anlamalı; bu yüzden seçici en az "şimdi"den başlıyor.
    if (ms <= Date.now()) return;
    if (secilenler.includes(ms) || dolu) return;
    degisti([...secilenler, ms].sort((a, b) => a - b));
  };

  const sil = (ms: number) => degisti(secilenler.filter((x) => x !== ms));

  return (
    <View>
      <View style={styles.cipler}>
        {secilenler.map((ms) => (
          <Pressable
            key={ms}
            onPress={() => sil(ms)}
            style={styles.cip}
            accessibilityRole="button"
            accessibilityLabel={fillParams(t('date.remove_a11y'), { tarih: formatSlotTr(ms) })}
          >
            <Text variant="caption" tone="onAccent">
              {formatSlotTr(ms)}
            </Text>
            <Ionicons name="close" size={14} color={colors.onAccent} />
          </Pressable>
        ))}

        {!dolu ? (
          <Pressable
            onPress={() => setAcik(true)}
            style={styles.ekle}
            accessibilityRole="button"
            accessibilityLabel={t('date.add_a11y')}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.accentFg} />
            <Text variant="caption" tone="accentFg">
              {t('date.pick')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/*
       * TAKVİM ARTIK SAF JS. Burada `@react-native-community/datetimepicker`
       * vardı ve telefondaki yapı o native modülü içermediğinde 1 Oca
       * 1970'te donup dokunuşa yanıt vermiyordu — OTA bunu çözemiyordu.
       */}
      <TakvimSecici
        acik={acik}
        deger={taslak}
        kapat={() => setAcik(false)}
        secildi={(d) => {
          setTaslak(d);
          ekle(d);
        }}
        saatli
        enAz={new Date()}
      />
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    cipler: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1), marginBottom: space(1) },
    cip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: space(1.5),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
    },
    ekle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: space(1.5),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      borderWidth: 1.25,
      // Kesikli çerçeve: "burada bir şey YOK, ekleyebilirsin" demenin
      // uygulamadaki mevcut dili (dekont yükleme kutusu da böyle).
      borderStyle: 'dashed',
      borderColor: colors.lineStrong,
      backgroundColor: colors.surface,
    },
    secici: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.5),
      marginBottom: space(1),
    },
    iosEylem: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: space(3),
      paddingTop: space(1),
      paddingRight: space(1),
    },
    yazi: { fontFamily: font.semibold },
  });
