import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sehirGoster } from '@ayna/domain';
import { api } from '../../src/api';
import { CATEGORIES, COLLECT_DEFAULT, COLLECT_OPTIONS, formatPrice } from '../../src/data';
import type { MessageKey } from '@ayna/i18n';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { bildirimIzniIste } from '../../src/notifications';
import { type ColorTokens, radius, space, font } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { findServiceWithCategory, tri } from '../../src/taxonomy';
import { useKategoriYakinda } from '../../src/yakinda';
import {
  BudgetGauge,
  HizmetIkonu,
  PressableScale,
  RulesCard,
  Screen,
  ServiceChips,
  TAB_BAR_CLEARANCE,
  TarihSecici,
  Text,
  TextInput,
  YakindaRozeti,
} from '../../src/ui';

export default function NewDemandScreen() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const kategoriYakinda = useKategoriYakinda();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const city = useStore((s) => s.currentUser?.city) ?? 'Almatı';
  const addresses = useStore((s) => s.addresses);
  const createDemand = useStore((s) => s.createDemand);
  // §12.3 — kısıtlı hesap yeni talep açamaz
  const restricted = useStore((s) => s.currentUser?.restricted ?? false);
  // §12.6 — CTA'dan gelen kategori + alt hizmet ön-seçimi
  const {
    category: catParam,
    service: svcParam,
    note: noteParam,
  } = useLocalSearchParams<{
    category?: string;
    service?: string;
    // Boni'nin "talebe dönüştür" kartı kullanıcının sorusunu buraya taşır.
    note?: string;
  }>();
  const initialCat = CATEGORIES.some((c) => c.id === catParam) ? catParam! : CATEGORIES[0]!.id;
  const [desc, setDesc] = useState(typeof noteParam === 'string' ? noteParam : '');
  const [photos, setPhotos] = useState<{ uri: string; base64?: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState<string>(initialCat);
  /*
   * Brief §4.5 — ÇOKLU hizmet talebi.
   *
   * Tek seçimdi ve gelin paketi isteyen müşteri üç ayrı talep açmak
   * zorundaydı: üç teklif turu, üç pazarlık, aynı gün için birbirinden
   * habersiz üç randevu. Liste TÜM kategorileri kapsıyor; kullanıcı
   * kategoriler arasında gezerken seçimleri korunuyor.
   */
  const [serviceIds, setServiceIds] = useState<string[]>(
    typeof svcParam === 'string' ? [svcParam] : [],
  );
  const [budget, setBudget] = useState('');
  const [collectMin, setCollectMin] = useState<number>(COLLECT_DEFAULT);
  const [preferred, setPreferred] = useState<number[]>([]);

  const [market, setMarket] = useState<{
    average: number;
    floor: number;
    samples: number;
    dynamic: boolean;
  } | null>(null);
  // §privacy — yakın salon sıralaması için adres seçimi (varsayılan: ilk kayıtlı adres)
  const [addressId, setAddressId] = useState<string | undefined>(() => addresses[0]?.id);

  async function addPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.4, // foto data URL olarak buluta gider — küçük tut
      base64: true,
    });
    if (!result.canceled && result.assets[0])
      setPhotos((p) => [
        ...p,
        {
          uri: result.assets[0]!.uri,
          ...(result.assets[0]!.base64 ? { base64: result.assets[0]!.base64 } : {}),
        },
      ]);
  }

  useEffect(() => {
    let alive = true;
    api
      .marketAverage(category, city)
      .then(
        (m) =>
          alive &&
          setMarket({
            average: m.average,
            floor: m.floor,
            samples: m.samples,
            dynamic: m.source === 'dynamic',
          }),
      )
      .catch(() => alive && setMarket(null));
    return () => {
      alive = false;
    };
  }, [category, city]);

  const budgetNum = Number(budget);
  const tooLow = market !== null && budgetNum > 0 && budgetNum < market.floor;
  // §5.2 — bütçe taban fiyatın altındaysa teklif alınamaz (gönderim bloklanır)
  const canSubmit = desc.trim().length > 0 && budgetNum > 0 && !tooLow;

  async function submit() {
    // §12.3 — kısıtlı modda yeni talep engellenir (ör. komisyon gecikmesi)
    if (restricted) {
      Alert.alert(t('restricted.title'), t('restricted.body'));
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      // §5.2 Faz A — talep BULUTA açılır; şehirdeki uzmanlara gerçek push gider.
      const id = await createDemand({
        mode: 'describe',
        category,
        note: desc.trim(),
        budget: budgetNum,
        collectMin,
        ...(preferred.length ? { preferredSlots: preferred } : {}),
        ...(serviceIds.length ? { serviceIds } : {}),
        ...(addressId ? { addressId } : {}),
        ...(photos[0]?.base64
          ? { photoDataUrl: `data:image/jpeg;base64,${photos[0].base64}` }
          : {}),
      });
      if (!id) {
        Alert.alert(t('common.error'), t('quote.new.submit_err'));
        return;
      }
      // §5.2 — doğrudan sonuçlara DÜŞME; önce "talep uzmanlara gitti" onay ekranı.
      // §16 — BİLDİRİM İZNİ TAM BURADA. Kullanıcı ilk talebini yayınladı;
      // "teklif gelince haber verelim mi?" sorusunun değeri artık belli.
      // Eskiden izin kayıt olur olmaz isteniyordu — hiçbir bildirimin ne
      // işe yarayacağı görülmeden.
      void bildirimIzniIste(useStore.getState().token);
      router.replace(`/quote/sent?id=${id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen edges={[]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Lime üst şerit ── */}
        {/* ═══ BAŞLIK — kanvas Dilek.dc.html §başlık ═══
            Kanvas: AÇIK zemin, 44'lük beyaz geri düğmesi, 24px koyu başlık.
            Önceki sürümde üstte mor bir logo bandı vardı; kanvasta yok ve
            zemin porselen. Şehir çipi bandın içindeydi — işlev kaybolmasın
            diye başlık satırının sağına alındı. */}
        <View style={[styles.sheet, { paddingTop: insets.top + space(2) }]}>
          <View style={styles.titleRow}>
            <PressableScale style={styles.back} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={colors.ink} />
            </PressableScale>
            <View style={styles.titleText}>
              <Text variant="display" tone="ink" style={styles.title}>
                {t('demand.new.title')}
              </Text>
              <Text variant="caption" tone="muted" style={styles.subtitle}>
                {t('demand.new.subtitle')}
              </Text>
            </View>
            <PressableScale style={styles.locChip} onPress={() => router.push('/city')}>
              <Ionicons name="location" size={13} color={colors.sage} />
              <Text variant="caption" tone="ink" style={styles.locText}>
                {sehirGoster(city, locale)}
              </Text>
            </PressableScale>
          </View>

          {/* Kategori seç */}
          <Text variant="bodyStrong" tone="ink" style={styles.label}>
            {t('demand.new.category')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catRow}
          >
            {CATEGORIES.map((cat) => {
              const active = cat.id === category;
              return (
                <Pressable
                  key={cat.id}
                  style={styles.cat}
                  onPress={() => {
                    setCategory(cat.id);
                  }}
                >
                  {/*
                   * Eskiden 64'lük kutunun ortasında 30'luk ikon yüzüyordu ve
                   * seçilince zemin aksanla doluyordu — ana sayfadaki hâlinden
                   * bambaşka görünüyordu. Artık aynı bileşen; seçim yalnız
                   * çerçeveden belli oluyor.
                   */}
                  <HizmetIkonu id={cat.id} tarz="kutu" secili={active} />
                  <Text variant="caption" tone={active ? 'ink' : 'inkSoft'} numberOfLines={1}>
                    {tri(cat.ad, locale)}
                  </Text>
                  {kategoriYakinda(cat.id) ? <YakindaRozeti tarz="kutu" /> : null}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Alt hizmet (opsiyonel) — talebi spesifikleştir (MERKEZİ taksonomi) */}
          <Text variant="bodyStrong" tone="ink" style={styles.label}>
            {t('demand.new.service')}
          </Text>
          <ServiceChips categoryId={category} secilenler={serviceIds} degistir={setServiceIds} />

          {/*
           * SEÇİLENLERİN TAMAMI — kullanıcı kategori değiştirince önceki
           * seçimleri ekrandan kayboluyordu ve neyi istediğini
           * göremiyordu. Paket talebinin bütünü tek bakışta görünmeli.
           */}
          {serviceIds.length > 1 ? (
            <View style={styles.paket}>
              {serviceIds.map((id) => {
                const bulunan = findServiceWithCategory(id);
                if (!bulunan) return null;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setServiceIds((cur) => cur.filter((x) => x !== id))}
                    style={styles.paketCip}
                    accessibilityRole="button"
                  >
                    <Text variant="caption" tone="onAccent">
                      {tri(bulunan.service.label, locale)}
                    </Text>
                    <Ionicons name="close" size={13} color={colors.onAccent} />
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {/* Konum — yakın salon sıralaması için adres seçimi. Adres uzmana ASLA gösterilmez;
              talepte tarih YOK (uygun saati uzmanlar teklifleriyle önerir §5.2). */}
          <Text variant="bodyStrong" tone="ink" style={styles.label}>
            {t('demand.new.address')}
          </Text>
          {addresses.length > 0 ? (
            <View style={styles.addrList}>
              {addresses.map((a) => {
                const active = a.id === addressId;
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => setAddressId(a.id)}
                    style={[styles.addrRow, shadow.soft, active && styles.addrRowActive]}
                  >
                    <View
                      style={[styles.rowIcon, styles.addrIcon, active && styles.addrIconActive]}
                    >
                      <Ionicons
                        name={a.label === 'home' ? 'home' : 'briefcase'}
                        size={17}
                        color={active ? colors.onAccent : colors.inkSoft}
                      />
                    </View>
                    <View style={styles.addrText}>
                      <Text variant="bodyStrong" tone="ink">
                        {t(a.label === 'home' ? 'auth.address.home' : 'auth.address.work')}
                      </Text>
                      <Text variant="caption" tone="muted" numberOfLines={1}>
                        {a.detail}
                      </Text>
                    </View>
                    <View style={[styles.radio, active && styles.radioOn]}>
                      {active ? (
                        <Ionicons name="checkmark" size={14} color={colors.onAccent} />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
              <Pressable style={styles.addrAdd} onPress={() => router.push('/profile/addresses')}>
                <Ionicons name="add" size={16} color={colors.accentFg} />
                <Text variant="caption" tone="accentFg" style={styles.addrAddText}>
                  {t('addresses.add')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.selectRow, shadow.soft]}
              onPress={() => router.push('/profile/addresses')}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="location-outline" size={20} color={colors.inkSoft} />
              </View>
              <Text variant="bodyStrong" tone="ink" style={styles.rowLabel}>
                {sehirGoster(city, locale)}
              </Text>
              <Text variant="caption" tone="accentFg" numberOfLines={1}>
                {t('addresses.add')}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.muted}
                style={styles.rowChevron}
              />
            </Pressable>
          )}
          <View style={styles.privacyRow}>
            <Ionicons name="lock-closed" size={13} color={colors.muted} />
            <Text variant="caption" tone="muted" style={styles.flexText}>
              {t('demand.new.address_privacy')}
            </Text>
          </View>

          {/* Bütçe (gerçek input) */}
          <View style={[styles.budgetRow, shadow.soft]}>
            <View style={styles.rowIcon}>
              <Ionicons name="wallet-outline" size={20} color={colors.inkSoft} />
            </View>
            <Text variant="bodyStrong" tone="ink" style={styles.rowLabel}>
              {t('demand.new.budget_row')}
            </Text>
            <View style={styles.budgetInputWrap}>
              <Text variant="bodyStrong" tone="muted">
                ₸
              </Text>
              <TextInput
                value={budget}
                onChangeText={(v) => setBudget(v.replace(/[^0-9]/g, ''))}
                placeholder={t('demand.new.budget_row_ph')}
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                style={styles.budgetInput}
              />
            </View>
          </View>
          {/* BÜTÇE GÖSTERGESİ — hayal kırıklığı teklif beklerken değil, tutarı
              yazarken yaşansın ki kullanıcı düzeltebilsin. Taban/ortalama gerçek
              veriden; ortalamanın neye dayandığı da yazılı. */}
          {market ? (
            <BudgetGauge
              budget={budgetNum}
              average={market.average}
              floor={market.floor}
              samples={market.samples}
              dynamic={market.dynamic}
              format={formatPrice}
            />
          ) : null}

          {/* Not ekle */}
          <View style={[styles.noteBox, shadow.soft]}>
            <View style={styles.noteHead}>
              <Ionicons name="create-outline" size={18} color={colors.inkSoft} />
              <Text variant="bodyStrong" tone="ink">
                {t('demand.new.note')}
              </Text>
            </View>
            <TextInput
              value={desc}
              onChangeText={setDesc}
              placeholder={t('demand.new.note_ph')}
              placeholderTextColor={colors.muted}
              multiline
              style={styles.noteInput}
            />
          </View>

          {/* Fotoğraf ekle */}
          <Text variant="bodyStrong" tone="ink" style={styles.label}>
            {t('demand.new.photos')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoRow}
          >
            <Pressable style={styles.photoAdd} onPress={addPhoto}>
              <Ionicons name="add" size={26} color={colors.inkSoft} />
              <Text variant="caption" tone="muted" style={styles.photoAddText}>
                {t('demand.new.photo_add')}
              </Text>
            </Pressable>
            {photos.map((p, i) => (
              <Image key={`${p.uri}-${i}`} source={{ uri: p.uri }} style={styles.photoThumb} />
            ))}
          </ScrollView>
          <View style={styles.privacyRow}>
            <Ionicons name="lock-closed" size={13} color={colors.muted} />
            <Text variant="caption" tone="muted">
              {t('demand.new.photo_privacy')}
            </Text>
          </View>
          {/* İstenen tarih & saat (ops.) — uzman okeyler ya da alternatif önerir (§4.1) */}
          <Text variant="bodyStrong" tone="ink" style={styles.label}>
            {t('demand.pref.title')}
          </Text>
          <Text variant="caption" tone="muted" style={{ marginBottom: 8 }}>
            {t('demand.pref.hint')}
          </Text>
          {/*
           * GERÇEK TAKVİM. Eskiden burada SABİT DOKUZ ÇİP vardı: yalnız üç
           * gün (yarın/öbür gün/üç gün sonra) ve yalnız üç saat (11/15/18).
           * Cumartesi 10:00 isteyen kullanıcının ekranda karşılığı yoktu.
           * Kurucu: "bir takvim çıkmalı, tarih seçenekleri kısıtlanmamalı."
           */}
          <TarihSecici secilenler={preferred} degisti={setPreferred} />

          {/* Teklif toplama süresi (§5.2) */}
          <Text variant="bodyStrong" tone="ink" style={styles.label}>
            {t('quote.duration')}
          </Text>
          <View style={styles.durRow}>
            {COLLECT_OPTIONS.map((m) => {
              const active = m === collectMin;
              return (
                <Pressable
                  key={m}
                  onPress={() => setCollectMin(m)}
                  style={[styles.durChip, active && styles.durChipActive]}
                >
                  <Text
                    variant="caption"
                    tone={active ? 'onAccent' : 'inkSoft'}
                    style={styles.durText}
                  >
                    {t(`dur.${m}` as MessageKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* §B5 — kurallar kartı */}
        <RulesCard />
      </ScrollView>

      {/* ── CTA ── */}
      <View
        style={[
          styles.footer,
          { paddingBottom: (insets.bottom || space(1.5)) + TAB_BAR_CLEARANCE },
        ]}
      >
        <Pressable
          style={[styles.cta, !canSubmit && styles.ctaOff]}
          disabled={!canSubmit}
          onPress={submit}
        >
          <Text
            variant="bodyStrong"
            tone={canSubmit ? 'onAccent' : 'muted'}
            style={styles.ctaText}
            numberOfLines={1}
          >
            {t('demand.new.send')}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingBottom: space(3) },
    // Paket özeti — seçilenlerin tamamı, kategoriden bağımsız.
    paket: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1), marginTop: space(1.5) },
    paketCip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: space(1.5),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
    },

    locChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      height: 34,
      paddingHorizontal: space(1.25),
      borderRadius: 17,
      backgroundColor: colors.surface,
    },
    locText: { fontFamily: font.semibold },

    sheet: {
      backgroundColor: colors.bg,
      paddingHorizontal: space(3),
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
    back: {
      width: 44,
      height: 44,
      borderRadius: 15,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleText: { flex: 1 },
    title: { fontSize: 30, lineHeight: 34, fontFamily: font.semibold, letterSpacing: -0.6 },
    subtitle: { marginTop: 2 },

    label: { marginTop: space(3), marginBottom: space(1.5) },
    durRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    durChip: {
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    durChipActive: { backgroundColor: colors.accent },
    durText: { fontFamily: font.semibold },

    catRow: { gap: space(1.5), paddingRight: space(2) },
    cat: { alignItems: 'center', width: 72, gap: space(0.75) },
    /**
     * Seçili erik dolu, seçilmemiş yüzey + ince çizgi.
     *
     * Eskiden 5 renkli bir ROTASYON vardı (adaçayı/lavanta/altın/mavi) ve
     * kategoriye anlam katmıyordu — sırf sıradaki renk geliyordu. Yeni dil
     * tek vurgu rengi kullanıyor; renk artık "seçili misin" demek.
     */
    /** Kurucunun Figma ikonu. */

    selectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingHorizontal: space(2),
      height: 60,
      marginTop: space(1.5),
    },
    rowIcon: { width: 24, alignItems: 'center' },
    rowLabel: { flex: 1 },
    rowChevron: { marginLeft: space(0.5) },

    // Adres seçici (yakın salon sıralaması için)
    addrList: { gap: space(1.25) },
    addrRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingHorizontal: space(2),
      paddingVertical: space(1.5),
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    addrRowActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    addrIcon: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addrIconActive: { backgroundColor: colors.accent },
    addrText: { flex: 1, gap: 1 },
    radio: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    addrAdd: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: space(1),
    },
    addrAddText: { fontFamily: font.semibold },
    flexText: { flex: 1 },

    budgetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingHorizontal: space(2),
      height: 60,
      marginTop: space(1.5),
    },
    budgetInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    budgetInput: {
      minWidth: 130,
      textAlign: 'right',
      fontSize: 16,
      fontFamily: font.semibold,
      color: colors.ink,
    },

    noteBox: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      marginTop: space(1.5),
    },
    noteHead: { flexDirection: 'row', alignItems: 'center', gap: space(1), marginBottom: space(1) },
    noteInput: {
      minHeight: 72,
      textAlignVertical: 'top',
      fontSize: 15,
      fontFamily: font.regular,
      color: colors.ink,
    },

    photoRow: { gap: space(1.25), paddingRight: space(2) },
    photoAdd: {
      width: 96,
      height: 96,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: colors.accentSoft,
    },
    photoAddText: { textAlign: 'center' },
    photoThumb: {
      width: 96,
      height: 96,
      borderRadius: radius.md,
      backgroundColor: colors.bgSunken,
    },
    privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space(1.25) },

    footer: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      backgroundColor: colors.bg,
    },
    cta: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 56,
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
    },
    ctaOff: { backgroundColor: colors.surfaceMuted },
    ctaText: { fontFamily: font.semibold, fontSize: 16 },
  });
