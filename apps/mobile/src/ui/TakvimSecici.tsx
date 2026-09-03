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
              {/*
               * ── SAAT SEÇİMİ YENİDEN ───────────────────────────────────
               *
               * Kurucu: "saat seçimleri çok saçma olmuş."
               *
               * İlk hâli iki DAR DİKEY ŞERİTTİ (saat ve dakika). 24 saat
               * 132 piksellik bir kutuda kayıyordu: seçtiğin değer görünmüyor,
               * nereye geldiğini bilmiyor, kaydırmayı takvim hareketiyle
               * karıştırıyordun.
               *
               * Yeni hâli: saat TEK SATIRDA yatay şerit — parmağın doğal
               * yönü ve seçili olan hep ortada okunuyor. Dakika dört çipe
               * indi (00/15/30/45); randevu ve hatırlatmada bundan ince
               * ayar gerekmiyor, beşer beşer 12 seçenek gereksiz kalabalıktı.
               */}
              <View style={styles.saatBaslikSatir}>
                <Text variant="caption" tone="muted">
                  {t('takvim.saat')}
                </Text>
                {/* Seçili değer BÜYÜK ve sabit yerde: şeritte kaybolmasın. */}
                <Text variant="bodyStrong" tone="ink">
                  {String(secili.getHours()).padStart(2, '0')}:
                  {String(secili.getMinutes()).padStart(2, '0')}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.saatSerit}
              >
                {SAATLER.map((h) => {
                  const on = secili.getHours() === h;
                  return (
                    <Pressable
                      key={h}
                      onPress={() => setSecili((d) => saatUygula(d, h, d.getMinutes()))}
                      style={[styles.saatCip, on && styles.saatCipSecili]}
                    >
                      <Text variant="caption" tone={on ? 'onAccent' : 'ink'}>
                        {String(h).padStart(2, '0')}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View style={styles.dakikaSatir}>
                {DAKIKALAR.map((m) => {
                  const on = secili.getMinutes() === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => setSecili((d) => saatUygula(d, d.getHours(), m))}
                      style={[styles.dakikaCip, on && styles.saatCipSecili]}
                    >
                      <Text variant="caption" tone={on ? 'onAccent' : 'ink'}>
                        :{String(m).padStart(2, '0')}
                      </Text>
                    </Pressable>
                  );
                })}
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
    saatBolum: { marginTop: space(2) },
    saatBaslikSatir: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: space(1),
    },
    saatSerit: { gap: space(1), paddingRight: space(2) },
    saatCip: {
      minWidth: 44,
      paddingVertical: space(1),
      paddingHorizontal: space(1.25),
      alignItems: 'center',
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    dakikaSatir: { flexDirection: 'row', gap: space(1), marginTop: space(1) },
    dakikaCip: {
      flex: 1,
      paddingVertical: space(1),
      alignItems: 'center',
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    saatCipSecili: { backgroundColor: colors.accent, borderColor: colors.accent },
    altBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: space(2),
    },
    ozet: { flex: 1 },
    altDugmeler: { flexDirection: 'row', gap: space(3) },
  });
