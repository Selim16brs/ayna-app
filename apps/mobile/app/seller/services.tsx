import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import type { SellerServiceRow } from '../../src/store';
import { activeCategories, servicesOf, tri, type TaxService } from '../../src/taxonomy';
import { type ColorTokens, radius, space, font } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text, TextInput, TAB_BAR_CLEARANCE } from '../../src/ui';

/**
 * HİZMETLERİM — brief §4.1.
 *
 * "Seçilen her alt hizmet altında uzman KENDİ hizmetlerini manuel ekler:
 * serbest ad + fiyat + süre (şablon yok)."
 *
 * ── ŞABLON KALKTI ───────────────────────────────────────────────────────
 *
 * Eskiden alt hizmet başına TEK satır vardı ve adı katalogdan geliyordu.
 * "Boya" diyen bir uzman kök boyası ile tam boyayı ayrı fiyatlayamıyordu:
 * ikisini tek fiyata sıkıştırmak ya da müşteriye mesajla anlatmak
 * zorundaydı. Artık bir alt hizmetin altına istediği kadar satır
 * ekleyebiliyor.
 *
 * ── KATALOG BAĞI ZORUNLU ────────────────────────────────────────────────
 *
 * Her satır bir alt hizmete bağlı (`serviceId`). Bağ olmadan hizmet
 * aramada, talep eşleşmesinde ve "Yakında" hesabında görünmez — uzman
 * yazdığını sanır, müşteri hiç bulamaz.
 *
 * İlk satır katalog adıyla ve önerilen fiyatla açılıyor; uzman ikisini de
 * değiştirebiliyor. Boş bir ad kutusu vermek, ne yazacağını bilmeyen
 * uzmanı boş bırakırdı.
 */
const CATS = activeCategories();

let sayac = 0;
const yeniAnahtar = (serviceId: string) => `${serviceId}#${Date.now().toString(36)}${sayac++}`;

export default function SellerServicesScreen() {
  const { t, locale } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const storeServices = useStore((s) => s.sellerServices);
  const setSellerServices = useStore((s) => s.setSellerServices);
  const [cat, setCat] = useState<string>(CATS[0]!.id);
  const [rows, setRows] = useState<SellerServiceRow[]>(storeServices);
  /*
   * ── EKLENDİ Mİ, EKLENMEDİ Mİ ───────────────────────────────────────
   *
   * Kurucu: "uzmanda hizmetlerim kısmında hizmet ekleniyor mu eklenmiyor
   * mu belli değil. uzman kendine göre fiyat süre belirlediğinde ekle
   * demesi lazım ve o hizmet eklenmiş olarak kabul edilmeli ve penceresi
   * kapanmalı sonra diğer hizmete geçip o şekilde devam etmeli."
   *
   * Önceden HER satır sürekli açık bir formdu ve tek bir "Kaydet" en
   * altta duruyordu: uzman fiyatı yazıyor, hiçbir şey olmuyor, eklenip
   * eklenmediğini anlamıyordu.
   *
   * Artık yeni satır bir TASLAK: kendi "Ekle" düğmesi var, basınca
   * hizmet KAYDEDİLİYOR ve kutu kapanıyor. Eklenmiş hizmetler kapalı
   * bir özet satırı olarak duruyor; düzenlemek için dokunuluyor.
   */
  const [acikSatirlar, setAcikSatirlar] = useState<string[]>([]);
  const acikMi = (key: string) => acikSatirlar.includes(key);
  const kapat = (key: string) => setAcikSatirlar((c) => c.filter((k) => k !== key));
  const ac = (key: string) => setAcikSatirlar((c) => (c.includes(key) ? c : [...c, key]));

  /** Taslak geçerli mi — adsız ya da fiyatsız hizmet eklenmiyor. */
  const satirGecerli = (r: SellerServiceRow) => !!r.name.trim() && Number(r.price) > 0;

  /**
   * Tek satırı EKLE: hemen kaydediliyor ve kutusu kapanıyor.
   *
   * Tamamı için ayrıca "Kaydet" var (düzenlemeler için); ama uzman bir
   * hizmeti ekledikten sonra o hizmet ARTIK EKLENMİŞ sayılıyor — alttaki
   * düğmeye basmayı unutması hizmeti kaybettirmiyor.
   */
  const satiriEkle = (key: string) => {
    const guncel = rows.filter((r) => satirGecerli(r) || r.key !== key);
    const hedef = rows.find((r) => r.key === key);
    if (!hedef || !satirGecerli(hedef)) return;
    setRows(guncel);
    setSellerServices(guncel.filter(satirGecerli));
    kapat(key);
  };

  const rowsByService = useMemo(() => {
    const m: Record<string, SellerServiceRow[]> = {};
    for (const r of rows) (m[r.serviceId] ??= []).push(r);
    return m;
  }, [rows]);

  const activeCount = rows.length;
  const services = servicesOf(cat);

  /** Alt hizmete yeni satır — ilk satır katalog adı + önerilen fiyatla. */
  const ekle = (s: TaxService) => {
    const key = yeniAnahtar(s.id);
    setRows((cur) => [
      ...cur,
      {
        key,
        serviceId: s.id,
        name: tri(s.label, locale),
        price: String(s.price),
        dur: String(s.durationMin),
      },
    ]);
    // Yeni satır AÇIK doğuyor: uzman fiyatını hemen yazsın.
    ac(key);
  };

  const sil = (key: string) => {
    const kalan = rows.filter((r) => r.key !== key);
    setRows(kalan);
    // Silme de HEMEN kalıcı: "Kaydet"e basmayı unutan uzman sildiğini
    // sanıp listede görmeye devam ederdi.
    setSellerServices(kalan.filter(satirGecerli));
    kapat(key);
  };

  const edit = (key: string, field: 'name' | 'price' | 'dur', val: string) =>
    setRows((cur) =>
      cur.map((r) =>
        r.key === key ? { ...r, [field]: field === 'name' ? val : val.replace(/[^0-9]/g, '') } : r,
      ),
    );

  const save = () => {
    /*
     * ADSIZ ya da FİYATSIZ satır KAYDEDİLMİYOR. Müşteriye adsız bir
     * hizmet ya da 0 ₸ göstermek, uzmanın yarım bıraktığı bir kaydı
     * gerçek bir teklif gibi sunmak olurdu.
     */
    const gecerli = rows.filter((r) => r.name.trim() && Number(r.price) > 0);
    setSellerServices(gecerli);
    setRows(gecerli);
    Alert.alert(t('seller.services.title'), t('seller.services.saved'));
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('seller.services.title')} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Text variant="caption" tone="muted" style={styles.subtitle}>
            {t('seller.services.subtitle')}
          </Text>
          <View style={styles.countPill}>
            <Ionicons name="pricetags" size={13} color={colors.accentFg} />
            <Text variant="caption" tone="accentFg" style={styles.countText}>
              {activeCount} {t('seller.services.active_unit')}
            </Text>
          </View>
        </View>

        {/* Kategori seçici */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {CATS.map((c) => {
            const on = c.id === cat;
            const n = servicesOf(c.id).reduce(
              (sum, s) => sum + (rowsByService[s.id]?.length ?? 0),
              0,
            );
            return (
              <Pressable
                key={c.id}
                onPress={() => setCat(c.id)}
                style={[styles.chip, on && styles.chipActive]}
              >
                <Text variant="caption" tone={on ? 'onAccent' : 'inkSoft'}>
                  {tri(c.ad, locale)}
                </Text>
                {n > 0 ? (
                  <View style={[styles.badge, on && styles.badgeOn]}>
                    <Text variant="caption" style={on ? styles.badgeTextOn : styles.badgeText}>
                      {n}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        {services.length === 0 ? (
          <Text variant="caption" tone="muted" style={styles.empty}>
            {t('seller.services.empty')}
          </Text>
        ) : (
          services.map((s) => {
            const kendi = rowsByService[s.id] ?? [];
            return (
              <View key={s.id} style={[styles.card, kendi.length > 0 && styles.cardOn]}>
                {/* Alt hizmet başlığı — katalog adı, DEĞİŞMEZ. Uzmanın kendi
                    adları bunun ALTINDA duruyor; hangi başlığa bağlı
                    olduğunu görmesi gerekiyor. */}
                <Pressable style={styles.cardTop} onPress={() => ekle(s)}>
                  <View style={styles.plus}>
                    <Ionicons name="add" size={16} color={colors.accentFg} />
                  </View>
                  <Text variant="bodyStrong" tone="ink" style={styles.name} numberOfLines={1}>
                    {tri(s.label, locale)}
                  </Text>
                  {kendi.length > 0 ? (
                    <Text variant="caption" tone="muted">
                      {kendi.length}
                    </Text>
                  ) : null}
                </Pressable>

                {kendi.map((r) =>
                  !acikMi(r.key) ? (
                    /*
                      EKLENMİŞ HİZMET — kapalı özet satırı. Uzman ne
                      eklediğini tek bakışta görüyor; dokununca açılıyor.
                    */
                    <Pressable key={r.key} style={styles.eklenmis} onPress={() => ac(r.key)}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                      <Text variant="body" tone="ink" style={styles.eklenmisAd} numberOfLines={1}>
                        {r.name}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {Number(r.price).toLocaleString('tr-TR')} ₸ · {r.dur} {t('common.min')}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.muted} />
                    </Pressable>
                  ) : (
                    <View key={r.key} style={styles.satir}>
                      <View style={styles.satirBas}>
                        <TextInput
                          value={r.name}
                          onChangeText={(v) => edit(r.key, 'name', v)}
                          placeholder={tri(s.label, locale)}
                          placeholderTextColor={colors.muted}
                          style={[styles.input, styles.adInput]}
                        />
                        <Pressable
                          onPress={() => sil(r.key)}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel={t('common.delete')}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.muted} />
                        </Pressable>
                      </View>
                      <View style={styles.fieldRow}>
                        <View style={styles.field}>
                          <Text variant="caption" tone="muted">
                            {t('expert.reg.service_price')}
                          </Text>
                          <TextInput
                            value={r.price}
                            onChangeText={(v) => edit(r.key, 'price', v)}
                            keyboardType="number-pad"
                            placeholderTextColor={colors.muted}
                            style={styles.input}
                          />
                        </View>
                        <View style={styles.field}>
                          <Text variant="caption" tone="muted">
                            {t('expert.reg.service_dur')}
                          </Text>
                          <TextInput
                            value={r.dur}
                            onChangeText={(v) => edit(r.key, 'dur', v)}
                            keyboardType="number-pad"
                            placeholderTextColor={colors.muted}
                            style={styles.input}
                          />
                        </View>
                      </View>
                      {/*
                      EKLE — bu hizmeti tek başına kaydediyor ve kutuyu
                      kapatıyor. Alttaki "Kaydet"e basmayı unutmak artık
                      hizmeti kaybettirmiyor.
                    */}
                      <View style={styles.satirDugmeler}>
                        <Button
                          label={t('seller.services.add_row')}
                          variant={satirGecerli(r) ? 'primary' : 'secondary'}
                          disabled={!satirGecerli(r)}
                          onPress={() => satiriEkle(r.key)}
                        />
                        {!satirGecerli(r) ? (
                          <Text variant="micro" tone="muted">
                            {t('seller.services.need_name_price')}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ),
                )}
              </View>
            );
          })
        )}

        <View style={styles.save}>
          <Button label={t('common.save')} variant="primary" onPress={save} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: TAB_BAR_CLEARANCE },
    intro: { marginBottom: space(2), gap: space(1.25) },
    subtitle: { lineHeight: 18 },
    countPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 5,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: space(1.5),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
    },
    countText: { fontFamily: font.semibold },
    // Uzmanın kendi satırı — alt hizmet başlığının ALTINDA, girintili.
    satir: {
      gap: space(1),
      paddingTop: space(1.25),
      marginTop: space(1.25),
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
    // Eklenmiş hizmet: kapalı, tek satır, yeşil onay işaretiyle.
    eklenmis: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      paddingVertical: space(1.25),
      paddingHorizontal: space(1),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
    eklenmisAd: { flex: 1 },
    satirDugmeler: { gap: space(0.75), marginTop: space(1) },
    satirBas: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    adInput: { flex: 1 },
    // "Ekle" işareti: başlığa dokunmak satır açıyor.
    plus: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentSoft,
    },
    chips: { gap: space(1), paddingRight: space(3), paddingBottom: space(2) },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1.25,
      borderColor: colors.line,
    },
    chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    badge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeOn: { backgroundColor: 'rgba(255,255,255,0.35)' },
    badgeText: { color: colors.accentFg, fontFamily: font.semibold, fontSize: 11 },
    badgeTextOn: { color: colors.onAccent, fontFamily: font.semibold, fontSize: 11 },
    empty: { textAlign: 'center', paddingVertical: space(6) },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(1.75),
      marginBottom: space(1.5),
    },
    cardOn: { borderColor: colors.accent },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: space(1.25) },
    check: {
      width: 24,
      height: 24,
      borderRadius: 7,
      borderWidth: 1.5,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    name: { flex: 1 },
    fieldRow: { flexDirection: 'row', gap: space(1.5), marginTop: space(1.5) },
    field: { flex: 1, gap: 4 },
    input: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingHorizontal: space(1.5),
      paddingVertical: space(1.25),
      color: colors.ink,
      fontSize: 15,
    },
    save: { marginTop: space(2) },
  });
