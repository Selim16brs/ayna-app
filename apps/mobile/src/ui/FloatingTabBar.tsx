import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
const HAP_MAX = 176; // aktif hapın üst sınırı
const PASIF_MIN = 40; // pasif sekmenin dokunma hedefi

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
  const { width: ekran } = useWindowDimensions();

  const bottom = Math.max(insets.bottom, PILL_BOTTOM - 10) + 10;

  // GENİŞLİKLER ELLE HESAPLANIR — flex dağıtımına bırakılmaz.
  //
  // Bu bar üç kez flex ile kuruldu ve üçünde de sekme kayboldu: bir seferinde
  // aktif hap taştı, bir seferinde overflow:hidden son iki sekmeyi gizledi, bir
  // seferinde hap ezilip boş ovale döndü. Sebep hep aynıydı: grow/shrink'in
  // hangi çocuğa ne kadar vereceğini gözle kestirmek.
  //
  // Artık kestirme yok. Her çocuğun genişliği burada belirlenir; toplamı
  // matematiksel olarak bar içine EŞİTTİR. Sekme sayısı ya da etiket uzunluğu
  // ne olursa olsun hiçbiri dışarı taşamaz.
  const barIci = ekran - 2 * PILL_SIDE - 2 * space(1);
  const pasifSayisi = Math.max(1, tabs.length - 1);
  const aktifGenislik = Math.min(HAP_MAX, Math.max(0, barIci - pasifSayisi * PASIF_MIN));
  const pasifGenislik = (barIci - aktifGenislik) / pasifSayisi;

  return (
    <View
      style={[styles.wrap, { height: bottom + PILL_H + FADE_H * 0.4 }]}
      pointerEvents="box-none"
    >
      {/* Kademeli geçiş: içerik bara doğru eriyor, altında kesilmiş gibi durmuyor */}
      <View style={styles.fade} pointerEvents="none">
        <BlurView intensity={18} tint="light" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={[colors.fadeFrom, colors.fadeMid, colors.bg]}
          locations={[0, 0.62, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={[styles.pill, { backgroundColor: colors.inverse, bottom }]}>
        {tabs.map((tab) => {
          const focused = tab.name === active;
          const icon = (focused ? tab.icon : `${tab.icon}-outline`) as IoniconName;
          return (
            <Pressable
              key={tab.name}
              onPress={() => router.navigate(tab.route as never)}
              style={[styles.item, { width: focused ? aktifGenislik : pasifGenislik }]}
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
                  <Ionicons name={icon} size={22} color={colors.onInverseMuted} />
                  {tab.badge ? (
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: colors.rose, borderColor: colors.inverse },
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
  // Genişlik satır içinde veriliyor (hesap yukarıda). Burada flex YOK —
  // grow/shrink olmadığı için hiçbir çocuk beklenmedik boyuta gidemez.
  item: { alignItems: 'center', justifyContent: 'center', height: PILL_H },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(0.875),
    height: 50,
    paddingHorizontal: space(1.75),
    borderRadius: 25,
    // Hap İÇERİĞİNE GÖRE daralır ve kutunun ortasına oturur.
    //
    // Eskiden `alignSelf: 'stretch'` ile kutunun tamamını kaplıyordu; etiket
    // de daralabilir olduğu için "Keşfet" gibi KISA bir ad bile "Keşf…" diye
    // kırpılıyordu — hapta bol yer olmasına rağmen. Hap içeriğini sarınca
    // etiket doğal genişliğini alır ve daralma hiç devreye girmez.
    alignSelf: 'center',
    maxWidth: '100%',
    justifyContent: 'center',
  },
  activeIcon: { flexShrink: 0 },
  // flexShrink 0: etiket ASLA ezilmez. Sığmayan durum kutu hesabıyla
  // (HAP_MAX) engellenir, kırpmayla değil.
  activeLabel: { fontSize: 15, fontFamily: font.semibold, flexShrink: 0 },
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
