import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocale } from '../locale';
import {
  AY_ADI,
  DAKIKALAR,
  carkSecimi,
  carkSirasi,
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
/** Çarkta bir satırın yüksekliği. Sabit: kaydırma matematiği buna dayanıyor. */
const OGE_Y = 44;
/** Görünen satır sayısı — tek sayı ki seçili olan tam ortada dursun. */
const GORUNEN = 5;

/**
 * KLASİK ÇEVİRMELİ SEÇİCİ (wheel).
 *
 * Kurucu: "saat için klasik sistem bir şey yapsan."
 *
 * Telefonun kendi çarkı NATIVE bir modülden geliyor ve o modül kurucunun
 * yapısında yok (bkz. `takvim.ts`) — bu yüzden aynı davranış saf JS ile
 * kuruldu: kaydırınca satırlara OTURUYOR, seçili satır ortada duruyor ve
 * ortadaki şerit hangi değerin seçili olduğunu gösteriyor.
 *
 * `snapToInterval` + `decelerationRate="fast"` çarkın "tık tık" oturma
 * hissini veriyor; onlarsız liste serbest kayıyor ve hangi değerin seçili
 * olduğu belirsizleşiyor.
 */
function Cark({
  liste,
  deger,
  degisti,
  etiket,
}: {
  liste: readonly number[];
  deger: number;
  degisti: (v: number) => void;
  etiket: string;
}) {
  const styles = useThemedStyles(makeStyles);
  /*
   * ── BAŞLANGIÇ KONUMU YALNIZ BİR KEZ ─────────────────────────────────
   *
   * Kurucu: "saat hareket etmiyor seçemiyorum."
   *
   * `contentOffset` DOĞRUDAN `deger`den hesaplanıyordu. Kullanıcı çarkı
   * çevirince seçim değişiyor, bileşen yeniden çiziliyor ve DEĞİŞEN
   * `contentOffset` kaydırmayı geri çekiyordu. Yani çark her hareket
   * denemesinde kendini toparlıyor ve "hiç oynamıyor" gibi görünüyordu.
   *
   * Konum artık ilk çizimde donduruluyor; sonrasını kullanıcı yönetiyor.
   */
  const [baslangic] = useState(() => carkSirasi(liste, deger) * OGE_Y);
  return (
    <View style={styles.cark} accessibilityLabel={etiket}>
      {/*
       * Şerit ScrollView'DAN ÖNCE çiziliyor: sonra çizilip `zIndex: -1` ile
       * arkaya itilmeye çalışılıyordu ve negatif zIndex bazı platformlarda
       * kapsayıcının arkasına düşüp görünmez oluyordu. Çizim sırası daha
       * güvenilir.
       */}
      <View pointerEvents="none" style={styles.carkSerit} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        snapToInterval={OGE_Y}
        decelerationRate="fast"
        // Açılışta seçili değer ortada olsun; kullanıcı aramasın.
        contentOffset={{ x: 0, y: baslangic }}
        contentContainerStyle={styles.carkIc}
        onMomentumScrollEnd={(e) =>
          degisti(liste[carkSecimi(e.nativeEvent.contentOffset.y, OGE_Y, liste.length)]!)
        }
        // Tek dokunuşla da bitebilsin: parmak kalkınca sürüklenme olmazsa
        // `onMomentumScrollEnd` HİÇ tetiklenmiyor ve seçim kaydedilmiyordu.
        onScrollEndDrag={(e) =>
          degisti(liste[carkSecimi(e.nativeEvent.contentOffset.y, OGE_Y, liste.length)]!)
        }
      >
        {liste.map((v) => (
          <View key={v} style={styles.carkOge}>
            <Text variant="bodyStrong" tone={v === deger ? 'ink' : 'muted'}>
              {String(v).padStart(2, '0')}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

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
              <View style={styles.saatBaslikSatir}>
                <Text variant="caption" tone="muted">
                  {t('takvim.saat')}
                </Text>
                {/* Seçili değer ayrıca yazılı: çarkta gözden kaçmasın. */}
                <Text variant="bodyStrong" tone="ink">
                  {String(secili.getHours()).padStart(2, '0')}:
                  {String(secili.getMinutes()).padStart(2, '0')}
                </Text>
              </View>
              <View style={styles.carkSatir}>
                <Cark
                  liste={SAATLER}
                  deger={secili.getHours()}
                  degisti={(h) => setSecili((d) => saatUygula(d, h, d.getMinutes()))}
                  etiket={t('takvim.saat')}
                />
                <Text variant="bodyStrong" tone="ink">
                  :
                </Text>
                <Cark
                  liste={DAKIKALAR}
                  deger={secili.getMinutes()}
                  degisti={(m) => setSecili((d) => saatUygula(d, d.getHours(), m))}
                  etiket={t('takvim.saat')}
                />
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
    carkSatir: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space(1),
    },
    cark: { width: 92, height: OGE_Y * GORUNEN },
    // Üstte/altta boşluk: ilk ve son değer de ORTAYA gelebilsin.
    carkIc: { paddingVertical: OGE_Y * ((GORUNEN - 1) / 2) },
    carkOge: { height: OGE_Y, alignItems: 'center', justifyContent: 'center' },
    carkSerit: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: OGE_Y * ((GORUNEN - 1) / 2),
      height: OGE_Y,
      borderRadius: radius.md,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    altBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: space(2),
    },
    ozet: { flex: 1 },
    altDugmeler: { flexDirection: 'row', gap: space(3) },
  });
