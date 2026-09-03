import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Modal,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  CATEGORIES,
  categoryLabelKey,
  cityCenter,
  distanceKm,
  type Professional,
  proCoords,
  type ProviderKind,
  CITIES,
} from '../src/data';
import type { MessageKey } from '@ayna/i18n';
import { useProfessionals, useProfessionalsLoading } from '../src/catalog';
import { useStore } from '../src/store';
import { servesSector } from '@ayna/domain';
import { HIZMET_IKON } from '../src/hizmet-ikon';
import { fillParams, useLocale } from '../src/locale';
import { type ColorTokens, radius, space, font } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import {
  Button,
  asPlanTier,
  PlanBadge,
  PressableScale,
  Screen,
  StackHeader,
  TAB_BAR_CLEARANCE,
  Text,
  ListSkeleton,
} from '../src/ui';

// Türkçe-duyarlı küçük harfe çevirme (İ/ı dahil)
const lower = (s: string) => s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLocaleLowerCase('tr-TR');

// §7 — sıralama seçenekleri
type SortKey = 'recommended' | 'rating' | 'distance' | 'popular';
const SORTS: { key: SortKey; label: MessageKey }[] = [
  { key: 'recommended', label: 'search.sort.recommended' },
  { key: 'rating', label: 'search.sort.rating' },
  { key: 'distance', label: 'search.sort.distance' },
  { key: 'popular', label: 'search.sort.popular' },
];

/**
 * DETAYLI ARAMA — kurucunun isteği.
 *
 * "arama kısmında detaylı bir arama fonksiyonu olmalı. değerlendirme notu,
 *  randevu sayısı ve benzeri şekilde kullanıcının arama kriteri olabilecek
 *  kırımlara göre olabilir. şehir de ayrıca burda kırımlardan birisi olsun"
 *
 * RANDEVU SAYISI HAKKINDA: liste modelinde (`Professional`) tamamlanan
 * randevu sayısı YOK; sunucu bu alanı listede döndürmüyor. En yakın gerçek
 * veri `reviewCount` — her randevu değerlendirmeye dönüşmediği için aynı şey
 * değil, o yüzden etiketi de "değerlendirme sayısı" diyor. Uydurma bir
 * "randevu sayısı" göstermektense sahip olduğumuz sayıyı doğru adıyla
 * göstermek doğru; gerçek randevu sayısı istenirse sunucu ucu genişlemeli.
 */
interface Filtre {
  /** null = tüm şehirler. Varsayılan kullanıcının şehri (mevcut davranış). */
  sehir: string | null;
  minPuan: number | null;
  /** TAMAMLANAN randevu sayısı — sunucudan gelen gerçek sayı. */
  minRandevu: number | null;
  minYorum: number | null;
  minDeneyim: number | null;
  /** Üst sınır: uzmanın başlangıç fiyatı bunun altında olmalı. */
  maxFiyat: number | null;
  tur: ProviderKind | null;
  onayliMi: boolean;
}

const bosFiltre = (sehir: string | null): Filtre => ({
  sehir,
  minPuan: null,
  minRandevu: null,
  minYorum: null,
  minDeneyim: null,
  maxFiyat: null,
  tur: null,
  onayliMi: false,
});

/** Kaç kırılım etkin — düğmedeki sayı ve "temizle" görünürlüğü için. */
function etkinSayisi(f: Filtre, varsayilanSehir: string): number {
  let n = 0;
  if (f.sehir !== varsayilanSehir) n += 1;
  if (f.minPuan !== null) n += 1;
  if (f.minRandevu !== null) n += 1;
  if (f.minYorum !== null) n += 1;
  if (f.minDeneyim !== null) n += 1;
  if (f.maxFiyat !== null) n += 1;
  if (f.tur !== null) n += 1;
  if (f.onayliMi) n += 1;
  return n;
}

const PUANLAR = [4, 4.5, 4.8] as const;
const RANDEVULAR = [50, 200, 500] as const;
const YORUMLAR = [50, 100, 300] as const;
const DENEYIMLER = [3, 5, 10] as const;
const FIYATLAR = [10000, 25000, 50000] as const;

/**
 * Bir kırılım: başlık + çipler.
 *
 * ÇİPLER SATIR ATLIYOR, yatay kaymıyor. İlk sürümde yatay şeritti ve
 * ekranın sağından taşan seçenekler KESİLİYORDU — "Almatı" yarım, "AYNA
 * Onaylı" yarım görünüyordu. Kullanıcı orada bir şey olduğunu anlamıyordu.
 * Sarmalı düzende her seçenek tam görünür.
 */
function FiltreGrubu({ baslik, children }: { baslik: string; children: ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.grup}>
      <Text variant="micro" tone="muted" style={styles.grupBaslik}>
        {baslik}
      </Text>
      <View style={styles.grupCipler}>{children}</View>
    </View>
  );
}

/**
 * Filtre çipi — kategori çipleriyle AYNI dil (hap, seçilince dolu aksan).
 * Yeni bir görsel dil uydurulmadı; ekranda zaten olan kalıp kullanıldı.
 */
function FiltreCipi({ etiket, secili, bas }: { etiket: string; secili: boolean; bas: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={bas}
      style={[styles.chip, secili && styles.chipOn]}
      accessibilityRole="button"
      accessibilityState={{ selected: secili }}
      accessibilityLabel={etiket}
    >
      <Text
        variant="caption"
        tone={secili ? 'onAccent' : 'inkSoft'}
        style={secili ? styles.chipOnText : undefined}
      >
        {etiket}
      </Text>
    </Pressable>
  );
}

export default function SearchScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(typeof q === 'string' ? q : '');
  const inputRef = useRef<RNTextInput>(null);
  // Navigasyon animasyonu bitince klavyeyi güvenilir şekilde aç (autoFocus tek başına yetmiyor)
  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(id);
  }, []);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('recommended');
  const [showSort, setShowSort] = useState(false);
  const professionals = useProfessionals();
  const catalogLoading = useProfessionalsLoading();
  // §5.1.4 — arama da şehre göre filtreli
  const city = useStore((s) => s.currentUser?.city) ?? 'Almatı';
  // Filtre şehri kullanıcının şehriyle başlar — mevcut davranış korunuyor.
  const [filtre, setFiltre] = useState<Filtre>(() => bosFiltre(city));
  const etkin = etkinSayisi(filtre, city);
  const yama = (y: Partial<Filtre>) => setFiltre((f) => ({ ...f, ...y }));
  const recentSearches = useStore((s) => s.recentSearches);
  const addRecentSearch = useStore((s) => s.addRecentSearch);
  const isEmpty = query.trim().length === 0 && activeCat === null;

  const results = useMemo(() => {
    const q = lower(query.trim());
    const filtered = professionals.filter((p) => {
      // null şehir = tüm şehirler
      if (filtre.sehir !== null && p.city !== filtre.sehir) return false;
      if (activeCat && !servesSector(p, activeCat)) return false;
      if (filtre.minPuan !== null && p.rating < filtre.minPuan) return false;
      /*
       * Alan YOKSA elenmiyor. Eski sunucu sürümü `completedBookings`
       * döndürmezse o uzman listeden düşmemeli — filtre yüzünden görünmez
       * olmaktansa görünmesi doğru.
       */
      if (
        filtre.minRandevu !== null &&
        p.completedBookings !== undefined &&
        p.completedBookings < filtre.minRandevu
      )
        return false;
      if (filtre.minYorum !== null && p.reviewCount < filtre.minYorum) return false;
      if (filtre.minDeneyim !== null && p.experienceYears < filtre.minDeneyim) return false;
      if (filtre.maxFiyat !== null && p.priceFrom > filtre.maxFiyat) return false;
      if (filtre.tur !== null && p.kind !== filtre.tur) return false;
      if (filtre.onayliMi && !p.aynaVerified) return false;
      if (!q) return true;
      // Metin araması da TÜM alanlara bakar: "tırnak" yazan biri, ana alanı
      // saç olan ama tırnak da yapan uzmanı bulabilmeli.
      const alanlar = p.sectors?.length ? p.sectors : [p.sector];
      const alanEslesti = alanlar.some((a) => lower(t(categoryLabelKey(a))).includes(q));
      return lower(p.name).includes(q) || lower(p.specialty).includes(q) || alanEslesti;
    });
    // §7 — sıralama
    const sorted = [...filtered];
    if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating);
    else if (sort === 'popular') sorted.sort((a, b) => b.reviewCount - a.reviewCount);
    else if (sort === 'distance') {
      const c = cityCenter(filtre.sehir ?? city);
      sorted.sort((a, b) => distanceKm(c, proCoords(a.id)) - distanceKm(c, proCoords(b.id)));
    }
    return sorted;
  }, [professionals, query, activeCat, sort, city, filtre, t]);

  const submit = () => addRecentSearch(query);

  return (
    <Screen edges={[]}>
      <StackHeader title={t('search.title')} />
      <View style={styles.searchRow}>
        <View style={[styles.searchBar, shadow.soft]}>
          <Ionicons name="search" size={19} color={colors.muted} />
          <RNTextInput
            ref={inputRef}
            style={styles.input}
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submit}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
        {/* §7 — sıralama paneli aç/kapat */}
        <Pressable
          onPress={() => setShowSort((v) => !v)}
          style={[
            styles.tune,
            (showSort || sort !== 'recommended' || etkin > 0) && styles.tuneOn,
            shadow.soft,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('search.filters')}
          accessibilityState={{ expanded: showSort }}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={
              showSort || sort !== 'recommended' || etkin > 0 ? colors.onAccent : colors.inkSoft
            }
          />
          {/* Panel kapalıyken kaç kırılımın açık olduğu görünmeli. */}
          {etkin > 0 ? (
            <View style={styles.tuneRozet}>
              <Text style={styles.tuneRozetYazi}>{etkin}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* Kategori daraltma */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipBar}
        contentContainerStyle={styles.chips}
      >
        <Pressable
          onPress={() => setActiveCat(null)}
          style={[styles.chip, activeCat === null && styles.chipOn]}
        >
          <Text
            variant="caption"
            tone={activeCat === null ? 'onAccent' : 'inkSoft'}
            style={activeCat === null ? styles.chipOnText : undefined}
          >
            {t('search.all_categories')}
          </Text>
        </Pressable>
        {CATEGORIES.map((cat) => {
          const on = activeCat === cat.id;
          return (
            <Pressable
              key={cat.id}
              onPress={() => setActiveCat(on ? null : cat.id)}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text
                variant="caption"
                tone={on ? 'onAccent' : 'inkSoft'}
                style={on ? styles.chipOnText : undefined}
              >
                {t(cat.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {isEmpty ? (
          /* §5.1.2 — boş kutu: son aramalar + popüler kategoriler */
          <View style={styles.emptyBox}>
            {recentSearches.length > 0 ? (
              <>
                <Text variant="label" tone="accentFg" style={styles.blockLabel}>
                  {t('search.recent')}
                </Text>
                <View style={styles.wrapChips}>
                  {recentSearches.map((r) => (
                    <Pressable key={r} style={styles.recentChip} onPress={() => setQuery(r)}>
                      <Ionicons name="time-outline" size={13} color={colors.inkSoft} />
                      <Text variant="caption" tone="inkSoft">
                        {r}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
            <Text variant="label" tone="accentFg" style={styles.blockLabel}>
              {t('search.popular')}
            </Text>
            <View style={styles.wrapChips}>
              {CATEGORIES.map((cat) => (
                <Pressable key={cat.id} style={styles.popChip} onPress={() => setActiveCat(cat.id)}>
                  {HIZMET_IKON[cat.id] ? (
                    <Image source={HIZMET_IKON[cat.id]} style={styles.popIkon} />
                  ) : null}
                  <Text variant="caption" tone="ink">
                    {t(cat.labelKey)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <>
            <Text variant="caption" tone="muted" style={styles.count}>
              {results.length} {t('search.results')}
            </Text>
            {catalogLoading ? (
              <ListSkeleton rows={4} />
            ) : results.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="search-outline" size={30} color={colors.muted} />
                </View>
                <Text variant="bodyStrong" tone="ink" style={styles.emptyTitle}>
                  {t('search.empty')}
                </Text>
                <Text variant="caption" tone="muted">
                  {t('search.empty_sub')}
                </Text>
              </View>
            ) : (
              <View style={styles.list}>
                {results.map((p, i) => (
                  <ProRow
                    key={p.id}
                    pro={p}
                    index={i}
                    onPress={() => {
                      submit();
                      router.push('/professional/' + p.id);
                    }}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/*
       * DETAYLI ARAMA — ALT SAYFA.
       *
       * İlk sürüm sayfa içine gömülü bir paneldi ve yedi kırılım ekranın
       * TAMAMINI yiyordu: sonuçlar hiç görünmüyordu, sonuç sayısı katlanan
       * yerin altında kalıyordu ve paneli kapatıp sonuca dönmenin bir
       * düğmesi yoktu. Kurucu haklı olarak "arama yapacağın bir buton bile
       * görünmüyor" dedi.
       *
       * Alt sayfa bunu çözüyor: sonuçlar arkada duruyor, perde neyin
       * geçici olduğunu söylüyor, ve en altta SABİT bir düğme kaç sonuç
       * bulunduğunu yazıp listeye döndürüyor. Uygulamanın kendi alt sayfa
       * kalıbı kullanıldı (seller/promotions ile aynı) — yeni bir dil
       * uydurulmadı.
       */}
      <Modal
        visible={showSort}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSort(false)}
      >
        <Pressable style={styles.perde} onPress={() => setShowSort(false)}>
          {/* Perdeye dokunmak kapatır; sayfanın kendisine dokunmak kapatmamalı. */}
          <Pressable style={styles.sayfa} onPress={(e) => e.stopPropagation()}>
            <View style={styles.tutamak} />

            <View style={styles.sayfaBas}>
              <Text variant="h2" tone="ink">
                {t('search.filters')}
              </Text>
              <View style={styles.sayfaBasSag}>
                {etkin > 0 ? (
                  <Pressable onPress={() => setFiltre(bosFiltre(city))} hitSlop={8}>
                    <Text variant="captionStrong" style={styles.temizle}>
                      {t('search.filter.clear')}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => setShowSort(false)} hitSlop={10} style={styles.kapat}>
                  <Ionicons name="close" size={22} color={colors.ink} />
                </Pressable>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sayfaGovde}
            >
              <FiltreGrubu baslik={t('search.sort')}>
                {SORTS.map((o) => (
                  <FiltreCipi
                    key={o.key}
                    etiket={t(o.label)}
                    secili={o.key === sort}
                    bas={() => setSort(o.key)}
                  />
                ))}
              </FiltreGrubu>

              <FiltreGrubu baslik={t('search.filter.city')}>
                <FiltreCipi
                  etiket={t('search.filter.all_cities')}
                  secili={filtre.sehir === null}
                  bas={() => yama({ sehir: null })}
                />
                {CITIES.map((c) => (
                  <FiltreCipi
                    key={c}
                    etiket={c}
                    secili={filtre.sehir === c}
                    bas={() => yama({ sehir: c })}
                  />
                ))}
              </FiltreGrubu>

              <FiltreGrubu baslik={t('search.filter.rating')}>
                <FiltreCipi
                  etiket={t('search.filter.any')}
                  secili={filtre.minPuan === null}
                  bas={() => yama({ minPuan: null })}
                />
                {PUANLAR.map((v) => (
                  <FiltreCipi
                    key={v}
                    etiket={`${v.toLocaleString('tr-TR')}+`}
                    secili={filtre.minPuan === v}
                    bas={() => yama({ minPuan: filtre.minPuan === v ? null : v })}
                  />
                ))}
              </FiltreGrubu>

              <FiltreGrubu baslik={t('search.filter.bookings')}>
                <FiltreCipi
                  etiket={t('search.filter.any')}
                  secili={filtre.minRandevu === null}
                  bas={() => yama({ minRandevu: null })}
                />
                {RANDEVULAR.map((v) => (
                  <FiltreCipi
                    key={v}
                    etiket={`${v}+`}
                    secili={filtre.minRandevu === v}
                    bas={() => yama({ minRandevu: filtre.minRandevu === v ? null : v })}
                  />
                ))}
              </FiltreGrubu>

              <FiltreGrubu baslik={t('search.filter.reviews')}>
                <FiltreCipi
                  etiket={t('search.filter.any')}
                  secili={filtre.minYorum === null}
                  bas={() => yama({ minYorum: null })}
                />
                {YORUMLAR.map((v) => (
                  <FiltreCipi
                    key={v}
                    etiket={`${v}+`}
                    secili={filtre.minYorum === v}
                    bas={() => yama({ minYorum: filtre.minYorum === v ? null : v })}
                  />
                ))}
              </FiltreGrubu>

              <FiltreGrubu baslik={t('search.filter.experience')}>
                <FiltreCipi
                  etiket={t('search.filter.any')}
                  secili={filtre.minDeneyim === null}
                  bas={() => yama({ minDeneyim: null })}
                />
                {DENEYIMLER.map((v) => (
                  <FiltreCipi
                    key={v}
                    etiket={fillParams(t('search.filter.years'), { n: String(v) })}
                    secili={filtre.minDeneyim === v}
                    bas={() => yama({ minDeneyim: filtre.minDeneyim === v ? null : v })}
                  />
                ))}
              </FiltreGrubu>

              <FiltreGrubu baslik={t('search.filter.price')}>
                <FiltreCipi
                  etiket={t('search.filter.any')}
                  secili={filtre.maxFiyat === null}
                  bas={() => yama({ maxFiyat: null })}
                />
                {FIYATLAR.map((v) => (
                  <FiltreCipi
                    key={v}
                    etiket={fillParams(t('search.filter.upto'), {
                      n: v.toLocaleString('tr-TR'),
                    })}
                    secili={filtre.maxFiyat === v}
                    bas={() => yama({ maxFiyat: filtre.maxFiyat === v ? null : v })}
                  />
                ))}
              </FiltreGrubu>

              <FiltreGrubu baslik={t('search.filter.kind')}>
                <FiltreCipi
                  etiket={t('search.filter.any')}
                  secili={filtre.tur === null}
                  bas={() => yama({ tur: null })}
                />
                <FiltreCipi
                  etiket={t('search.kind.independent')}
                  secili={filtre.tur === 'independent'}
                  bas={() => yama({ tur: filtre.tur === 'independent' ? null : 'independent' })}
                />
                <FiltreCipi
                  etiket={t('search.kind.salon')}
                  secili={filtre.tur === 'salon'}
                  bas={() => yama({ tur: filtre.tur === 'salon' ? null : 'salon' })}
                />
                <FiltreCipi
                  etiket={t('search.filter.verified_only')}
                  secili={filtre.onayliMi}
                  bas={() => yama({ onayliMi: !filtre.onayliMi })}
                />
              </FiltreGrubu>
            </ScrollView>

            {/*
             * SABİT EYLEM. Kurucunun eksik dediği düğme bu: kaç sonuç
             * bulunduğunu yazıyor ve listeye döndürüyor. Kaydırmayla
             * kaybolmaması için ScrollView'in DIŞINDA.
             */}
            <View style={styles.sayfaEylem}>
              <Button
                label={
                  results.length === 0
                    ? t('search.filter.no_result')
                    : fillParams(t('search.filter.apply'), { n: String(results.length) })
                }
                onPress={() => setShowSort(false)}
                disabled={results.length === 0}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

/** Yeniden kullanılabilir dikey uzman satırı (search/category/favorites ortak). */
export function ProRow({
  pro,
  onPress,
  right,
  index = 0,
}: {
  pro: Professional;
  onPress: () => void;
  right?: React.ReactNode;
  index?: number;
}) {
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  // Kullanıcının şehir merkezinden gerçek mesafe (harita/SalonRow ile tutarlı)
  const city = useStore((s) => s.currentUser?.city);
  const km = distanceKm(cityCenter(city), proCoords(pro.id)).toFixed(1);
  return (
    <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 50)}>
      <PressableScale style={[styles.row, shadow.soft]} onPress={onPress}>
        <Image source={{ uri: pro.image }} style={styles.thumb} />
        <View style={styles.rowBody}>
          {/* §3.3 — GÜVEN İŞARETİ adın yanında.
              Rozet yalnız detay ucunda vardı: müşteri aramada, favorilerde,
              kategoride ve yakındakilerde kimin doğrulandığını göremiyor,
              öğrenmek için her profili tek tek açmak zorunda kalıyordu.
              Bu satır o dört ekranın da ortak satırı — tek yerde çözülüyor.

              Yalnız ONAYLIYA işaret konuyor. Doğrulanmamışa "değil" damgası
              basmak listeyi suçlayıcı bir tabloya çevirirdi; eksiği görmek
              isteyen profildeki katman şeridine bakar. */}
          <View style={styles.rowNameRow}>
            <Text variant="bodyStrong" tone="ink" numberOfLines={1} style={styles.rowName}>
              {pro.name}
            </Text>
            {pro.aynaVerified ? (
              <Ionicons name="shield-checkmark" size={14} color={colors.accentFg} />
            ) : null}
            {pro.membershipTier && pro.membershipTier !== 'free' ? (
              <PlanBadge tier={asPlanTier(pro.membershipTier)} size="sm" role="pro" />
            ) : null}
          </View>
          <View style={styles.rowRating}>
            <Ionicons name="star" size={13} color={colors.gold} />
            <Text variant="caption" tone="ink" style={styles.rowRatingText}>
              {pro.rating.toFixed(1)}
            </Text>
          </View>
          <View style={styles.rowMetaRow}>
            <Ionicons name="location-outline" size={12} color={colors.muted} />
            <Text variant="caption" tone="muted" numberOfLines={1} style={styles.rowMeta}>
              {km} km • {pro.specialty}
            </Text>
          </View>
        </View>
        {/* §10 gizlilik — uzmanın fiyat/para bilgisi kartlarda GÖSTERİLMEZ (yalnız kendisi görür) */}
        {right ?? (
          <View style={styles.rowRight}>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </View>
        )}
      </PressableScale>
    </Animated.View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      paddingHorizontal: space(3),
      paddingTop: space(2),
    },
    tune: {
      width: 52,
      height: 52,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tuneOn: { backgroundColor: colors.accent },
    searchBar: {
      flex: 1,
      height: 52,
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      paddingHorizontal: space(2.5),
    },
    input: { flex: 1, color: colors.ink, fontSize: 15 },
    // Yatay ScrollView dikey eksende büyümesin (dik kolon içinde doğrudan çocuk)
    chipBar: { flexGrow: 0, flexShrink: 0 },
    chips: {
      paddingHorizontal: space(3),
      gap: space(1),
      paddingVertical: space(1.5),
      alignItems: 'center',
    },
    chip: {
      alignSelf: 'center',
      paddingHorizontal: space(2),
      paddingVertical: space(1.1),
      borderRadius: radius.pill,
      // Yeni dil: seçilmemiş çip yüzey + ince çizgi. Dolu gri (`surfaceMuted`)
      // seçili erik çipin yanında ikinci bir "dolu" gibi okunuyordu.
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    chipOn: { backgroundColor: colors.accent },
    // ── detaylı arama alt sayfası ──
    perde: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sayfa: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingTop: space(1),
      // %85: arkadaki sonuçların bir kısmı hep görünür kalsın — kullanıcı
      // neyin üstünde çalıştığını unutmasın.
      maxHeight: '85%',
    },
    tutamak: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.lineStrong,
      marginBottom: space(1.5),
    },
    sayfaBas: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space(3),
      paddingBottom: space(1),
    },
    sayfaBasSag: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
    kapat: { padding: 2 },
    temizle: { color: colors.accentFg },
    sayfaGovde: { paddingHorizontal: space(3), paddingBottom: space(2) },
    sayfaEylem: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      paddingBottom: space(4),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
      backgroundColor: colors.bg,
    },
    grup: { paddingTop: space(2) },
    grupBaslik: { paddingBottom: space(1) },
    // Sarmalı: hiçbir seçenek ekran dışında kalmıyor.
    grupCipler: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    // Sayı rozeti: panel kapalıyken kaç kırılımın açık olduğunu gösterir.
    tuneRozet: {
      position: 'absolute',
      top: 4,
      right: 4,
      minWidth: 18,
      height: 18,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    tuneRozetYazi: {
      color: colors.accent,
      fontSize: 11,
      lineHeight: 18,
      textAlign: 'center',
      includeFontPadding: false,
      fontFamily: font.semibold,
    },
    chipOnText: { fontFamily: font.semibold },
    content: {
      paddingHorizontal: space(3),
      paddingTop: space(1),
      paddingBottom: TAB_BAR_CLEARANCE,
    },
    count: { marginBottom: space(1.5), marginLeft: space(0.5) },
    emptyBox: { gap: space(1), paddingTop: space(1) },
    blockLabel: { marginTop: space(2), marginBottom: space(0.5), marginLeft: space(0.5) },
    wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    recentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.5),
      paddingHorizontal: space(1.5),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    popChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.75),
      paddingHorizontal: space(1.5),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.accentSoft,
    },
    /** Kurucunun Figma ikonu — Ionicons vektörünün yerine. */
    popIkon: { width: 16, height: 16, resizeMode: 'contain' },
    list: { gap: space(1.5) },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.25),
    },
    thumb: { width: 84, height: 84, borderRadius: radius.md, backgroundColor: colors.bgSunken },
    rowBody: { flex: 1, gap: 4 },
    rowName: { fontSize: 16, fontFamily: font.semibold, letterSpacing: -0.2 },
    rowNameRow: { flexDirection: 'row', alignItems: 'center', gap: space(0.5) },
    rowRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    rowRatingText: { fontFamily: font.semibold },
    rowMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    rowMeta: { flex: 1 },
    rowRight: { alignItems: 'flex-end', justifyContent: 'center', paddingRight: space(0.5) },
    pricePill: {
      backgroundColor: colors.accent,
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
    },
    priceText: { fontFamily: font.semibold },
    empty: { alignItems: 'center', paddingTop: space(8), gap: space(1) },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(1),
    },
    emptyTitle: {},
  });
