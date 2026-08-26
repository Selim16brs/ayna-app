import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MessageKey } from '@ayna/i18n';
import { useLocale } from '../locale';
import { font, space } from '../theme';
import { useTheme } from '../theme-context';

type IoniconName = keyof typeof Ionicons.glyphMap;

export type TabDef = {
  route: string;
  name: string;
  icon: IoniconName;
  labelKey: MessageKey;
  /** Gerçek bir sinyal varsa nokta yanar. Anlamsız rozet gösterme. */
  badge?: boolean;
};

// Kanvas ölçüleri (Main.dc.html §"kademeli bulanıklık + yüzen nav")
const PILL_H = 68;
const PILL_SIDE = 16;
const PILL_BOTTOM = 26;
const FADE_H = 130;

/** İçeriğin yüzen barın altında kalmaması için ekranların ayırması gereken boşluk. */
export const TAB_BAR_CLEARANCE = PILL_BOTTOM + PILL_H + 20;

/**
 * Uygulamanın TEK alt menü bileşeni — kanvas Main.dc.html §"yüzen nav".
 *
 * Üç ayrı bar vardı (müşteri, uzman, salon) ve üçü de yorumunda "aynı tasarım"
 * diyordu; gerçekte ayrı ayrı yazılmışlardı ve biri değişince diğerleri geride
 * kalıyordu. Görünüm artık burada, tek yerde; barlar yalnız sekme listesi verir.
 *
 * Kanvas: koyu YÜZEN hap; aktif sekme gül rengi hap içinde ikon + etiket,
 * pasifler yalnız ikon. Üstünde içeriğin eridiği kademeli geçiş.
 */
export function FloatingTabBar({ tabs, active }: { tabs: TabDef[]; active: string }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const bottom = Math.max(insets.bottom, PILL_BOTTOM - 10) + 10;

  return (
    <View
      style={[styles.wrap, { height: bottom + PILL_H + FADE_H * 0.4 }]}
      pointerEvents="box-none"
    >
      {/* Kademeli geçiş: içerik bara doğru eriyor, altında kesilmiş gibi durmuyor */}
      <View style={styles.fade} pointerEvents="none">
        <BlurView intensity={18} tint="light" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={['rgba(251,248,246,0)', 'rgba(251,248,246,0.72)', colors.bg]}
          locations={[0, 0.62, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={[styles.pill, { backgroundColor: colors.ink, bottom }]}>
        {tabs.map((tab) => {
          const focused = tab.name === active;
          const icon = (focused ? tab.icon : `${tab.icon}-outline`) as IoniconName;
          return (
            <Pressable
              key={tab.name}
              onPress={() => router.navigate(tab.route as never)}
              style={focused ? styles.itemOn : styles.item}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={t(tab.labelKey)}
            >
              {focused ? (
                <View style={[styles.activePill, { backgroundColor: colors.rose }]}>
                  <Ionicons
                    name={icon}
                    size={19}
                    color={colors.onAccent}
                    style={styles.activeIcon}
                  />
                  {/* Etiket KIRPILABİLİR olmalı: "Randevularım"/"Benim İçin" gibi
                      uzun adlarda hap sabit genişlikte kalırsa satırı taşırıp
                      son sekmeleri ekran dışına itiyordu. */}
                  <Text
                    numberOfLines={1}
                    allowFontScaling={false}
                    style={[styles.activeLabel, { color: colors.onAccent }]}
                  >
                    {t(tab.labelKey)}
                  </Text>
                </View>
              ) : (
                <>
                  <Ionicons name={icon} size={22} color="rgba(251,248,246,0.66)" />
                  {tab.badge ? (
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: colors.rose, borderColor: colors.ink },
                      ]}
                    />
                  ) : null}
                </>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: FADE_H },
  pill: {
    position: 'absolute',
    left: PILL_SIDE,
    right: PILL_SIDE,
    height: PILL_H,
    borderRadius: 36,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space(1),
    shadowColor: '#262219',
    shadowOpacity: 0.32,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  // Pasif sekmeler ikon genişliğine kadar sıkışabilir; aktif hap kalan yeri alır
  // ama TAŞMAZ. minWidth:0 olmadan RN flex çocukları içeriklerinden küçülmez.
  // Pasif sekme ikonu ASLA ezilmez: 40pt dokunma hedefi altına inmez.
  // (minWidth:0 idi — hap büyüyünce ikonlar sıfıra sıkışıp kayboluyordu.)
  item: {
    flex: 1,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
    height: PILL_H,
  },
  // Aktif sekme KÜÇÜLMEZ. flexShrink:1 iken pasif sekmeler (flex:1) büyüyüp
  // hapı sıkıştırıyor, içindeki ikon ve etiket eziliyordu — ekranda boş bir
  // pembe oval kalıyordu. Hap doğal genişliğini alır, üst sınırı maxWidth verir.
  itemOn: {
    flexGrow: 0,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: PILL_H,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(0.875),
    height: 50,
    paddingHorizontal: space(1.75),
    borderRadius: 25,
    flexShrink: 0,
    // ÜST SINIR ŞART: 5 sekme + uzun Türkçe etiket ("Randevularım") 390pt
    // ekrana sığmıyor. Sınır olmadan hap büyüyüp son iki sekmeyi dışarı
    // itiyordu; overflow:hidden ise onları GİZLİYORDU — belirti kapanmış ama
    // sekmeler erişilemez kalmıştı.
    //
    // Hesap: bar içi ≈ 342pt. 4 pasif ikon × 44 = 176 → hapa 166 kalıyor.
    maxWidth: 164,
  },
  activeIcon: { flexShrink: 0 },
  activeLabel: { fontSize: 15, fontFamily: font.semibold, flexShrink: 1 },
  dot: {
    position: 'absolute',
    top: 16,
    right: '30%',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
});
