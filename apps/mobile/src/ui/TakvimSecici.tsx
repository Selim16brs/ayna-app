import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocale } from '../locale';
import {
  AY_ADI,
  DAKIKALAR,
  GUN_KISA,
  SAATLER,
  ayEkle,
  ayIzgarasi,
  ayniGun,
  saatUygula,
  secilebilir,
  tarihYaz,
} from '../takvim';
import { radius, space, type ColorTokens } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * TAKVİM — SAF REACT NATIVE, NATIVE MODÜL YOK.
 *
 * Kurucu: "takvim asılı kalmış hiçbir değişiklik yapılamıyor... aynı hatalar
 * diğer takvimle giriş yapılan yerlerde de var."
 *
 * Tüm tarih ekranları `@react-native-community/datetimepicker` kullanıyordu.
 * O NATIVE bir modül; telefondaki yapı onu içermediğinde görünüm epoch
 * sıfırla (1 Oca 1970) boş çiziliyor ve dokunuşa yanıt vermiyor. `app.json`
 * `runtimeVersion: sdkVersion` olduğu için OTA eski yapılara da iniyor —
 * yani JS güncelleniyor ama native modül gelmiyor ve OTA bunu ÇÖZEMİYOR.
 *
 * Bu bileşen yalnız `View`/`Pressable`/`Text` kullanıyor. Kurucunun
 * elindeki yapıda OTA ile hemen çalışıyor ve bu sınıf hata bir daha
 * oluşamıyor.
 *
 * MANTIK AYRI (`src/takvim.ts`): ızgara, sınırlar ve ay geçişi JSX olmadan
 * test ediliyor.
 */
export function TakvimSecici({
  acik,
  deger,
  kapat,
  secildi,
  saatli = false,
  enAz,
  enCok,
}: {
  acik: boolean;
  /** Açılışta gösterilecek tarih. */
  deger: Date;
  kapat: () => void;
  secildi: (d: Date) => void;
  /** Saat de seçilsin mi? */
  saatli?: boolean;
  enAz?: Date;
  enCok?: Date;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  // Görünen ay ve seçili gün ayrı: kullanıcı seçim yapmadan aylarda gezebilir.
  const [gorunen, setGorunen] = useState(deger);
  const [secili, setSecili] = useState(deger);

  const izgara = useMemo(() => ayIzgarasi(gorunen.getFullYear(), gorunen.getMonth()), [gorunen]);

  const onayla = () => {
    secildi(secili);
    kapat();
  };

  return (
    <Modal visible={acik} transparent animationType="slide" onRequestClose={kapat}>
      <Pressable style={styles.perde} onPress={kapat}>
        {/* Kutunun içine dokunmak kapatmamalı: gün seçerken kapanırdı. */}
        <Pressable style={styles.sayfa} onPress={(e) => e.stopPropagation()}>
          <View style={styles.ayBar}>
            <Pressable
              onPress={() => setGorunen((g) => ayEkle(g, -1))}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('takvim.onceki_ay')}
            >
              <Ionicons name="chevron-back" size={20} color={colors.ink} />
            </Pressable>
            <Text variant="bodyStrong" tone="ink">
              {AY_ADI[gorunen.getMonth()]} {gorunen.getFullYear()}
            </Text>
            <Pressable
              onPress={() => setGorunen((g) => ayEkle(g, 1))}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('takvim.sonraki_ay')}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.ink} />
            </Pressable>
          </View>

          <View style={styles.gunBasliklari}>
            {GUN_KISA.map((g) => (
              <Text key={g} variant="micro" tone="muted" style={styles.gunBasligi}>
                {g}
              </Text>
            ))}
          </View>

          <View style={styles.izgara}>
            {izgara.map(({ tarih, ayIcinde }) => {
              const acikMi = secilebilir(tarih, enAz, enCok);
              const secilenMi = ayniGun(tarih, secili);
              return (
                <Pressable
                  key={tarih.toISOString()}
                  disabled={!acikMi}
                  onPress={() => setSecili((s) => saatUygula(tarih, s.getHours(), s.getMinutes()))}
                  style={[styles.hucre, secilenMi && styles.hucreSecili]}
                >
                  <Text
                    variant="caption"
                    tone={secilenMi ? 'onAccent' : !acikMi || !ayIcinde ? 'muted' : 'ink'}
                  >
                    {tarih.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {saatli ? (
            <View style={styles.saatBolum}>
              <Text variant="caption" tone="muted" style={styles.saatBaslik}>
                {t('takvim.saat')}
              </Text>
              <View style={styles.saatSatir}>
                <ScrollView
                  style={styles.serit}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.seritIc}
                >
                  {SAATLER.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setSecili((d) => saatUygula(d, s, d.getMinutes()))}
                      style={[styles.saatOge, secili.getHours() === s && styles.saatSecili]}
                    >
                      <Text variant="caption" tone={secili.getHours() === s ? 'onAccent' : 'ink'}>
                        {String(s).padStart(2, '0')}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <ScrollView
                  style={styles.serit}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.seritIc}
                >
                  {DAKIKALAR.map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => setSecili((d) => saatUygula(d, d.getHours(), m))}
                      style={[styles.saatOge, secili.getMinutes() === m && styles.saatSecili]}
                    >
                      <Text variant="caption" tone={secili.getMinutes() === m ? 'onAccent' : 'ink'}>
                        {String(m).padStart(2, '0')}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          ) : null}

          <View style={styles.altBar}>
            <Text variant="caption" tone="inkSoft" style={styles.ozet}>
              {tarihYaz(secili, saatli)}
            </Text>
            <View style={styles.altDugmeler}>
              <Pressable onPress={kapat} hitSlop={8}>
                <Text variant="caption" tone="muted">
                  {t('common.cancel')}
                </Text>
              </Pressable>
              <Pressable onPress={onayla} hitSlop={8}>
                <Text variant="captionStrong" tone="accentFg">
                  {t('common.ok')}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    perde: { flex: 1, backgroundColor: '#0007', justifyContent: 'flex-end' },
    sayfa: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: space(2),
      paddingBottom: space(3),
    },
    ayBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space(1),
      paddingBottom: space(1.5),
    },
    gunBasliklari: { flexDirection: 'row' },
    gunBasligi: { width: `${100 / 7}%`, textAlign: 'center' },
    izgara: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space(0.5) },
    hucre: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
    },
    hucreSecili: { backgroundColor: colors.accent },
    saatBolum: { marginTop: space(1.5) },
    saatBaslik: { marginBottom: space(0.75) },
    saatSatir: { flexDirection: 'row', gap: space(1.5), height: 132 },
    serit: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
    },
    seritIc: { paddingVertical: space(0.5) },
    saatOge: { paddingVertical: space(1), alignItems: 'center', borderRadius: radius.sm },
    saatSecili: { backgroundColor: colors.accent },
    altBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: space(2),
    },
    ozet: { flex: 1 },
    altDugmeler: { flexDirection: 'row', gap: space(3) },
  });
