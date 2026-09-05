import { useMemo, useState } from 'react';
import { sehirEslesir, sehirGoster } from '@ayna/domain';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import {
  formatPrice,
  CATEGORIES,
  cityCenter,
  distanceKm,
  priceLabel,
  type Professional,
  proCoords,
  konumuVar,
} from '../src/data';
import { bolgeAdi } from '../src/bolge-adi';
import { useProfessionals } from '../src/catalog';
import { useStore } from '../src/store';
import { fillParams, useLocale } from '../src/locale';
import { type ColorTokens, radius, space, font } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import { haritaKumeleri } from '../src/harita-kumeleme';
import { useProfessionalDetail } from '../src/catalog';
import { tri } from '../src/taxonomy';
import {
  Button,
  asPlanTier,
  PlanBadge,
  PressableScale,
  Screen,
  StackHeader,
  Text,
  SaglayiciFoto,
} from '../src/ui';
import { uzmanlikYazisi } from '../src/uzmanlik';

export default function MapScreen() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const all = useProfessionals();
  // §5.1.4 — harita da şehre göre filtreli (salona bağlı uzmanlar zaten listede tek başına yok)
  const varsayilanSehir = useStore((s) => s.currentUser?.city) ?? 'Almatı';
  /*
   * ŞEHİR ARTIK HARİTADAN SEÇİLİYOR.
   *
   * Eskiden kullanıcının kayıtlı şehrine KİLİTLİYDİ: Almatı'da kayıtlı biri
   * Astana'ya bakamıyordu, haritanın üstünde bunu değiştirecek bir şey de
   * yoktu. Kurucu: "harita üzerinde şehir seçimi ile lokasyonu oraya
   * çekmek."
   */
  const [city, setCity] = useState(varsayilanSehir);
  /** Seçilen şehir içinde daraltma — gerçek `district` alanına göre. */
  const [bolge, setBolge] = useState<string | null>(null);
  const [yerAcik, setYerAcik] = useState(false);
  const [cat, setCat] = useState<string | null>(null);
  const [selected, setSelected] = useState<Professional | null>(null);
  // §5.1.3 — karta dokun → POPUP profil (kapatınca haritaya dönülür)
  const [profileOpen, setProfileOpen] = useState(false);
  const detail = useProfessionalDetail(selected?.id ?? '');
  /**
   * PROFİLİ BOŞ UZMAN.
   *
   * Kurucu: "haritada uzman seçildiğinde açılan ekran bu şekilde boş, yani
   * kalitesiz çıkıyor."
   *
   * Sebep yerleşim değil VERİ: canlıda 25 uzmanın 24'ünde hizmet listesi,
   * 22'sinde tanıtım, 23'ünde galeri YOK. Karttaki her blok koşullu olduğu
   * için hiçbiri çizilmiyor ve ekranda kocaman bir boşluk kalıyor.
   *
   * Boşluğu dolgu içerikle kapatmak yanlış olurdu — olmayan bilgiyi varmış
   * gibi göstermek. Bunun yerine DURUM SÖYLENİYOR ve işe yarar bir yol
   * açılıyor: AYNA ters pazar yeri, kullanıcı fiyat listesi olmadan da ne
   * istediğini anlatıp teklif isteyebilir.
   */
  const profilBos =
    !!selected && detail.services.length === 0 && !detail.about && detail.portfolio.length === 0;

  // Harita seçili ŞEHRİN merkezine odaklanır (Almatı seçince Almatı, Astana seçince Astana).
  const center = cityCenter(city);
  const region: Region = { ...center, latitudeDelta: 0.14, longitudeDelta: 0.14 };

  // Bölge adı normalizasyonu `src/bolge-adi.ts`te — saf mantık, gerçek
  // girdilerle test ediliyor (ekran içindeyken bekçi metne bakmak zorunda
  // kalıyordu ve mutasyonu yakalayamamıştı).
  const bolgeAdiOf = (p: { district: string }) => bolgeAdi(p.district, city);

  /**
   * Seçilebilir şehirler — BOŞ ŞEHİR GÖSTERİLMİYOR.
   *
   * Tüm ülke listesini sunmak, dokunulunca bomboş bir harita açan
   * seçenekler üretirdi. Yalnız gerçekten sağlayıcısı olan şehirler.
   */
  const sehirler = useMemo(() => {
    const sayac = new Map<string, number>();
    for (const p of all) if (p.city) sayac.set(p.city, (sayac.get(p.city) ?? 0) + 1);
    return [...sayac.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr'));
  }, [all]);

  /** Seçili şehirdeki bölgeler — yine yalnız gerçekten dolu olanlar. */
  const bolgeler = useMemo(() => {
    const sayac = new Map<string, number>();
    for (const p of all) {
      if (!sehirEslesir(p.city, city)) continue;
      const ad = bolgeAdiOf(p);
      if (ad && ad !== city) sayac.set(ad, (sayac.get(ad) ?? 0) + 1);
    }
    return [...sayac.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr'));
  }, [all, city]);

  const pros = useMemo(
    () =>
      all.filter(
        (p) =>
          sehirEslesir(p.city, city) &&
          (!cat || p.sector === cat) &&
          (!bolge || bolgeAdiOf(p) === bolge),
      ),
    [all, city, cat, bolge],
  );

  /**
   * HARİTADA YALNIZ GERÇEK KONUMLAR.
   *
   * Kurucu: "sistem hiçbir şekilde... hiçbir şeyi kendiliğinden
   * uydurmamalı."
   *
   * `proCoords` koordinat yoksa şehir merkezi etrafına DAĞITIYOR. O pinler
   * gerçek adres değil; kullanıcı haritaya bakıp "şurada bir salon var"
   * diye yola çıkabilir. Uydurma nokta göstermektense göstermemek doğru.
   *
   * Kaybolmuyorlar: kaç tanesi olduğu yazılıyor ve liste görünümünde
   * duruyorlar.
   */
  const konumlu = useMemo(() => pros.filter((p) => konumuVar(p)), [pros]);
  const konumsuzSayisi = pros.length - konumlu.length;
  /*
   * AYNI ADRESTEKİLER TEK İĞNE.
   *
   * Aynı salonda çalışan beş uzman beş iğneydi: hepsi üst üste, üstteki
   * diğerlerini örtüyor ve kullanıcı alttakine basamıyordu. Artık adres
   * başına tek iğne — salon varsa iğne salonun — ve karta basınca o
   * adresteki diğerleri listeleniyor.
   */
  const kumeler = useMemo(() => haritaKumeleri(konumlu), [konumlu]);
  const seciliKume = useMemo(
    () => (selected ? (kumeler.find((k) => k.bas.id === selected.id) ?? null) : null),
    [kumeler, selected],
  );

  return (
    <Screen edges={[]}>
      {/*
       * DÜĞMELER `StackHeader`IN KENDİ SAĞ YUVASINDA.
       *
       * Önce başlığın YANINA kardeş olarak konmuştu ve GÖRÜNMÜYORLARDI:
       * `StackHeader` zaten tam genişlik bir satır (`texts` flexGrow:1), onu
       * bir satıra daha sarıp yanına bir şey koymak ekran dışına taşıyor.
       * Eski liste düğmesi de aynı sebeple görünmüyordu — hata benden
       * öncesine ait, ben üstüne bir tane daha eklemişim.
       */}
      <StackHeader
        title={t('map.title')}
        right={
          <View style={styles.headerSag}>
            <PressableScale style={styles.yerBtn} onPress={() => setYerAcik(true)}>
              <Ionicons name="location-outline" size={15} color={colors.accentFg} />
              <Text variant="caption" tone="ink" numberOfLines={1} style={styles.yerYazi}>
                {bolge ? `${sehirGoster(city, locale)} · ${bolge}` : sehirGoster(city, locale)}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.muted} />
            </PressableScale>
            <PressableScale
              style={styles.listBtn}
              /*
               * SEÇİLİ YER LİSTEYE TAŞINIYOR.
               *
               * Kurucunun senaryosu: Almatı'daki kullanıcı 5 Eylül'de
               * gideceği Astana'ya bakıyor. Liste görünümüne geçince
               * parametresiz gidiliyordu ve arama KULLANICININ şehrine
               * sıfırlanıyordu — Astana bağlamı kayboluyor, kullanıcı her
               * şeyi baştan seçiyordu.
               */
              onPress={() =>
                router.replace(
                  `/search?sehir=${encodeURIComponent(city)}` +
                    (bolge ? `&bolge=${encodeURIComponent(bolge)}` : ''),
                )
              }
              accessibilityRole="button"
              accessibilityLabel={t('map.list')}
            >
              <Ionicons name="list" size={16} color={colors.ink} />
            </PressableScale>
          </View>
        }
      />

      {/* Kategori filtresi */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsWrap}
      >
        <Chip label={t('map.all')} active={cat === null} onPress={() => setCat(null)} />
        {CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            label={tri(c.ad, locale)}
            active={cat === c.id}
            onPress={() => setCat(cat === c.id ? null : c.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.mapWrap}>
        {/* Anahtar bölgeyi de içeriyor: bölge değişince harita yeni odağa
            sıçrasın, eski konumda kalmasın. */}
        <MapView
          key={`${city}:${bolge ?? ''}`}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          showsUserLocation
          showsMyLocationButton
        >
          {kumeler.map((k) => (
            <Marker
              key={k.bas.id}
              coordinate={{ latitude: k.lat, longitude: k.lng }}
              // §5.1.3 — salon vs bağımsız uzman pinleri görsel ayrı
              pinColor={k.bas.kind === 'salon' ? colors.accentFg : colors.blue}
              onPress={() => setSelected(k.bas)}
            />
          ))}
        </MapView>

        {/* Konumu olmayanlar SESSİZCE kaybolmuyor: sayısı yazılıyor. */}
        {konumsuzSayisi > 0 && !selected ? (
          <View style={styles.konumsuzBant}>
            <Ionicons name="information-circle-outline" size={15} color={colors.inkSoft} />
            <Text variant="caption" tone="inkSoft" style={styles.konumsuzYazi} numberOfLines={2}>
              {fillParams(t('map.no_pin'), { n: String(konumsuzSayisi) })}
            </Text>
          </View>
        ) : null}

        {/* Teklif motoru köprüsü (denge kuralı §7.4) */}
        {!selected ? (
          <PressableScale style={styles.bridge} onPress={() => router.push('/quote/new')}>
            <Ionicons name="sparkles" size={15} color={colors.onAccent} />
            <Text variant="caption" tone="onAccent" style={styles.bridgeText} numberOfLines={2}>
              {t('map.bridge')}
            </Text>
          </PressableScale>
        ) : null}

        {/* Seçili sağlayıcı mini kartı — kenarlıksız gölgeli SalonRow dili */}
        {selected ? (
          <>
            {/* Polish 3.4 — kart DIŞINA dokunma kapatır (küçük X'e nişan almak gerekmez) */}
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSelected(null)}
              accessibilityRole="button"
              accessibilityLabel={t('common.close_card')}
            />
            <View style={[styles.card, styles.cardShadow]}>
              <Pressable
                style={styles.cardClose}
                hitSlop={16}
                onPress={() => setSelected(null)}
                accessibilityRole="button"
                accessibilityLabel="Kapat"
              >
                <Ionicons name="close" size={16} color={colors.muted} />
              </Pressable>
              <Pressable style={styles.cardRow} onPress={() => setProfileOpen(true)}>
                <SaglayiciFoto uri={selected.image} ad={selected.name} style={styles.cardImage} />
                <View style={styles.cardBody}>
                  <Text variant="bodyStrong" tone="ink" style={styles.cardName} numberOfLines={1}>
                    {selected.name}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {uzmanlikYazisi(selected, locale)}
                  </Text>
                  <View style={styles.cardMeta}>
                    {/*
                      Puanı olmayan "0,0" değil "Yeni" — aşağıdaki detay
                      sayfası zaten böyle yapıyordu, iğne kartı yapmıyordu.
                    */}
                    {selected.reviewCount > 0 ? (
                      <>
                        <Ionicons name="star" size={12} color={colors.gold} />
                        <Text variant="caption" tone="inkSoft">
                          {selected.rating.toFixed(1)}
                        </Text>
                      </>
                    ) : (
                      <Text variant="caption" tone="muted">
                        ✨ {t('pro.new')}
                      </Text>
                    )}
                    <Text variant="caption" tone="muted">
                      · {distanceKm(center, proCoords(selected.id, selected.lat, selected.lng))}{' '}
                      {t('map.distance')}
                    </Text>
                    <Text variant="caption" tone="muted">
                      · {priceLabel(selected)}
                    </Text>
                  </View>
                </View>
              </Pressable>
              {/*
                AYNI ADRESTEKİ DİĞERLERİ. Salon iğnesine basınca orada
                çalışan uzmanlar burada; her biri kendi profiline gidiyor.
              */}
              {seciliKume && seciliKume.digerleri.length > 0 ? (
                <View style={styles.kumeListe}>
                  <Text variant="micro" tone="muted">
                    {fillParams(t('map.same_address'), {
                      n: String(seciliKume.digerleri.length),
                    })}
                  </Text>
                  {seciliKume.digerleri.map((u) => (
                    <Pressable key={u.id} style={styles.kumeSatir} onPress={() => setSelected(u)}>
                      <SaglayiciFoto uri={u.image} ad={u.name} style={styles.kumeFoto} />
                      <View style={styles.kumeGovde}>
                        <Text variant="caption" tone="ink" numberOfLines={1}>
                          {u.name}
                        </Text>
                        <Text variant="micro" tone="muted" numberOfLines={1}>
                          {u.specialty}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={colors.muted} />
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <PressableScale style={styles.cardBtn} onPress={() => setProfileOpen(true)}>
                <Text variant="bodyStrong" tone="onAccent">
                  {t('map.open')}
                </Text>
              </PressableScale>
            </View>
          </>
        ) : null}

        {/* §5.1.3 — POPUP profil: bilgiler modal'da; kapatınca harita aynen kalır */}
        <Modal
          visible={profileOpen && !!selected}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setProfileOpen(false)}
        >
          <View style={styles.sheetRoot}>
            <View style={styles.sheetHead}>
              <Text variant="h2" tone="ink" numberOfLines={1} style={styles.sheetTitle}>
                {selected?.name ?? ''}
              </Text>
              <Pressable
                style={styles.sheetClose}
                hitSlop={8}
                onPress={() => setProfileOpen(false)}
              >
                <Ionicons name="close" size={22} color={colors.ink} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.sheetBody}
              showsVerticalScrollIndicator={false}
            >
              {selected?.image || detail.image ? (
                <Image
                  source={{ uri: detail.image || selected?.image }}
                  style={styles.sheetPhoto}
                  resizeMode="cover"
                />
              ) : null}
              <Text variant="bodyStrong" tone="ink">
                {uzmanlikYazisi(detail, locale) || uzmanlikYazisi(selected ?? {}, locale)}
              </Text>

              {/* GÜVEN ŞERİDİ — sayfanın en üstünde, adın hemen altında.
                  Haritadan bakan kişi "buna güvenir miyim, ne kadar tutar,
                  ne kadar deneyimli" sorularına cevap arıyor; eskiden sayfa
                  bunların HİÇBİRİNİ vermiyordu: fotoğraf, mesafe, puan ve
                  hizmet listesiyle bitiyordu. Doğrulama ve paket ancak tam
                  profile geçince görünüyordu. */}
              {detail.aynaVerified ||
              (detail.membershipTier && detail.membershipTier !== 'free') ? (
                <View style={styles.sheetBadges}>
                  {detail.aynaVerified ? (
                    <View style={styles.sheetVerified}>
                      <Ionicons name="shield-checkmark" size={13} color={colors.onAccent} />
                      <Text variant="caption" tone="onAccent" style={styles.sheetVerifiedText}>
                        {t('verify.ayna')}
                      </Text>
                    </View>
                  ) : null}
                  {detail.membershipTier && detail.membershipTier !== 'free' ? (
                    <PlanBadge tier={asPlanTier(detail.membershipTier)} size="sm" role="pro" />
                  ) : null}
                </View>
              ) : null}
              <View style={styles.sheetMeta}>
                <Ionicons name="location-outline" size={14} color={colors.inkSoft} />
                <Text variant="caption" tone="inkSoft">
                  {selected
                    ? `${selected.city || city} · ${distanceKm(center, proCoords(selected.id, selected.lat, selected.lng))} ${t('map.distance')}`
                    : ''}
                </Text>
                {detail.reviewCount > 0 ? (
                  <>
                    <Ionicons name="star" size={14} color={colors.gold} />
                    <Text variant="caption" tone="inkSoft">
                      {detail.rating.toFixed(1)} ({detail.reviewCount})
                    </Text>
                  </>
                ) : (
                  <Text variant="caption" tone="muted">
                    ✨ {t('pro.new')}
                  </Text>
                )}
              </View>
              {/* KÜNYE — deneyim ve başlangıç fiyatı. Fiyat özellikle önemli:
                  hizmet listesi aşağıda ama kullanıcı oraya inmeden önce
                  "bu benim bütçemde mi" sorusunun cevabını görmeli. */}
              <View style={styles.sheetFacts}>
                {detail.experienceYears > 0 ? (
                  <View style={styles.sheetFact}>
                    <Ionicons name="ribbon-outline" size={14} color={colors.accentFg} />
                    <Text variant="caption" tone="inkSoft">
                      {detail.experienceYears} {t('pro.experience')}
                    </Text>
                  </View>
                ) : null}
                {Number(detail.priceFrom) > 0 ? (
                  <View style={styles.sheetFact}>
                    <Ionicons name="pricetag-outline" size={14} color={colors.accentFg} />
                    <Text variant="caption" tone="inkSoft">
                      {formatPrice(Number(detail.priceFrom))} {t('map.from')}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* W2W sinyali — AYNA'nın çekirdeği. Tanıdığının gittiği yer,
                  yıldız ortalamasından daha çok karar verdiriyor. */}
              {detail.friends ? (
                <View style={styles.sheetFriends}>
                  <Ionicons name="people" size={13} color={colors.ink} />
                  <Text variant="caption" tone="ink" style={styles.sheetFriendsText}>
                    {detail.friends} {t('pro.friends_here')}
                  </Text>
                </View>
              ) : null}

              {detail.about ? (
                <>
                  <Text variant="label" tone="accentFg" style={styles.sheetSection}>
                    {t('pro.about')}
                  </Text>
                  <Text variant="caption" tone="inkSoft" style={styles.sheetAbout}>
                    {detail.about}
                  </Text>
                </>
              ) : null}
              {profilBos ? (
                <View style={styles.eksikKutu}>
                  <Ionicons name="document-text-outline" size={26} color={colors.muted} />
                  <Text variant="bodyStrong" tone="ink" style={styles.eksikBaslik}>
                    {t('pro.incomplete.title')}
                  </Text>
                  <Text variant="caption" tone="muted" style={styles.eksikAlt}>
                    {t('pro.incomplete.body')}
                  </Text>
                </View>
              ) : null}
              {detail.services.length > 0 ? (
                <>
                  <Text variant="label" tone="accentFg" style={styles.sheetSection}>
                    {t('pro.services')}
                  </Text>
                  {detail.services.slice(0, 6).map((sv) => (
                    <View key={sv.id} style={styles.sheetSvcRow}>
                      <Text
                        variant="caption"
                        tone="ink"
                        style={styles.sheetSvcName}
                        numberOfLines={1}
                      >
                        {sv.name}
                      </Text>
                      <Text variant="caption" tone="inkSoft">
                        {formatPrice(sv.price)}
                      </Text>
                    </View>
                  ))}
                </>
              ) : null}
            </ScrollView>
            {/*
             * EYLEM PROFİLE GÖRE DEĞİŞİYOR.
             *
             * Hizmet listesi olmayan uzmanda "Randevu al" kullanıcıyı seçecek
             * hiçbir şeyin olmadığı bir ekrana götürüyordu. Teklif yolu
             * çalışıyor: kullanıcı ne istediğini anlatıyor, uzman fiyat
             * veriyor. Profili açma yolu ikincil olarak duruyor.
             */}
            <View style={styles.sheetFoot}>
              {profilBos ? (
                <View style={styles.footIkili}>
                  <PressableScale
                    style={styles.footIkincil}
                    onPress={() => {
                      setProfileOpen(false);
                      if (selected) router.push('/professional/' + selected.id);
                    }}
                  >
                    <Text variant="bodyStrong" tone="ink">
                      {t('pro.incomplete.open')}
                    </Text>
                  </PressableScale>
                  <PressableScale
                    style={[styles.cardBtn, styles.footBirincil]}
                    onPress={() => {
                      setProfileOpen(false);
                      router.push('/quote');
                    }}
                  >
                    <Text variant="bodyStrong" tone="onAccent">
                      {t('pro.incomplete.cta')}
                    </Text>
                  </PressableScale>
                </View>
              ) : (
                <PressableScale
                  style={styles.cardBtn}
                  onPress={() => {
                    setProfileOpen(false);
                    if (selected) router.push('/professional/' + selected.id);
                  }}
                >
                  <Text variant="bodyStrong" tone="onAccent">
                    {t('map.book')}
                  </Text>
                </PressableScale>
              )}
            </View>
          </View>
        </Modal>
      </View>

      {/* ══ YER SEÇİCİ ══ */}
      <Modal
        visible={yerAcik}
        transparent
        animationType="slide"
        onRequestClose={() => setYerAcik(false)}
      >
        <Pressable style={styles.perde} onPress={() => setYerAcik(false)}>
          <Pressable style={styles.sayfa} onPress={(e) => e.stopPropagation()}>
            <View style={styles.tutamak} />
            <View style={styles.sayfaBas}>
              <Text variant="h2" tone="ink">
                {t('map.where.title')}
              </Text>
              <Pressable onPress={() => setYerAcik(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.ink} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sayfaGovde}
            >
              <Text variant="micro" tone="muted" style={styles.grupBaslik}>
                {t('map.where.city')}
              </Text>
              <View style={styles.sarmal}>
                {sehirler.map(([ad, adet]) => (
                  <Chip
                    key={ad}
                    label={`${ad} (${adet})`}
                    active={city === ad}
                    onPress={() => {
                      // Şehir değişince bölge sıfırlanır: Almatı'nın Medeu'su
                      // Astana'da yok, eski seçim listeyi boşaltırdı.
                      setCity(ad);
                      setBolge(null);
                    }}
                  />
                ))}
              </View>

              <Text variant="micro" tone="muted" style={styles.grupBaslik}>
                {t('map.where.area')}
              </Text>
              {bolgeler.length > 0 ? (
                <View style={styles.sarmal}>
                  <Chip
                    label={t('map.all')}
                    active={bolge === null}
                    onPress={() => setBolge(null)}
                  />
                  {bolgeler.map(([ad, adet]) => (
                    <Chip
                      key={ad}
                      label={`${ad} (${adet})`}
                      active={bolge === ad}
                      onPress={() => setBolge(bolge === ad ? null : ad)}
                    />
                  ))}
                </View>
              ) : (
                /* Bölge kaydı olmayan şehirde boş bir şerit bırakmak yerine
                   nedenini yazıyoruz. */
                <Text variant="caption" tone="muted">
                  {t('map.where.no_area')}
                </Text>
              )}
            </ScrollView>

            <View style={styles.sayfaEylem}>
              <Button
                label={
                  pros.length === 0
                    ? t('map.where.empty')
                    : fillParams(t('map.where.apply'), { n: String(pros.length) })
                }
                onPress={() => setYerAcik(false)}
                disabled={pros.length === 0}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text variant="caption" tone={active ? 'onAccent' : 'inkSoft'} style={styles.chipText}>
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    konumsuzBant: {
      position: 'absolute',
      left: space(2),
      right: space(2),
      bottom: space(2),
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      paddingHorizontal: space(2),
      paddingVertical: space(1.5),
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    konumsuzYazi: { flex: 1 },

    // ── profili boş uzman ──
    eksikKutu: {
      alignItems: 'center',
      gap: space(1),
      paddingVertical: space(4),
      paddingHorizontal: space(2),
    },
    eksikBaslik: { textAlign: 'center' },
    eksikAlt: { textAlign: 'center', lineHeight: 20 },
    footIkili: { flexDirection: 'row', gap: space(1.25) },
    footIkincil: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: space(2),
      borderRadius: radius.pill,
      borderWidth: 1.25,
      borderColor: colors.lineStrong,
      backgroundColor: colors.surface,
    },
    footBirincil: { flex: 1.4 },

    // ── yer seçici (şehir + bölge) ──
    // `StackHeader`ın sağ yuvası — kendi kenar boşluğu var, ek marj yok.
    headerSag: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    yerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      // Şehir adı uzun olabilir ("Öskemen", "Taldıkorgan"); düğme büyüsün
      // ama başlığı ezmesin.
      maxWidth: 190,
      paddingHorizontal: space(1.5),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    yerYazi: { flexShrink: 1 },
    perde: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sayfa: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingTop: space(1),
      // Harita arkada görünür kalsın: kullanıcı neyi daralttığını unutmasın.
      maxHeight: '80%',
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
    sayfaGovde: { paddingHorizontal: space(3), paddingBottom: space(2) },
    grupBaslik: { paddingTop: space(2), paddingBottom: space(1) },
    sarmal: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    sayfaEylem: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      paddingBottom: space(4),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
      backgroundColor: colors.bg,
    },

    sheetRoot: { flex: 1, backgroundColor: colors.bg },
    sheetHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space(3),
      paddingTop: space(2.5),
      paddingBottom: space(1),
    },
    sheetTitle: { flex: 1, marginRight: space(1) },
    sheetClose: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetBody: { paddingHorizontal: space(3), paddingBottom: space(3), gap: space(1) },
    sheetPhoto: {
      width: '100%',
      height: 220,
      borderRadius: radius.xl,
      backgroundColor: colors.surfaceMuted,
    },
    sheetMeta: { flexDirection: 'row', alignItems: 'center', gap: space(0.75), flexWrap: 'wrap' },
    sheetBadges: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: space(0.75),
      marginTop: space(0.75),
    },
    sheetVerified: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.5),
      paddingHorizontal: space(1),
      paddingVertical: space(0.375),
      borderRadius: radius.pill,
      backgroundColor: colors.accentFg,
    },
    sheetVerifiedText: { fontFamily: font.semibold },
    sheetFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1.5), marginTop: space(1) },
    sheetFact: { flexDirection: 'row', alignItems: 'center', gap: space(0.5) },
    sheetFriends: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.5),
      alignSelf: 'flex-start',
      marginTop: space(1),
      paddingHorizontal: space(1),
      paddingVertical: space(0.5),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    sheetFriendsText: { fontFamily: font.semibold },
    sheetSection: { marginTop: space(1.5) },
    sheetAbout: { lineHeight: 19 },
    sheetSvcRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: space(1),
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    sheetSvcName: { flex: 1, marginRight: space(1) },
    sheetFoot: { padding: space(3), paddingTop: space(1) },
    listBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginRight: space(3),
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    chipsWrap: { maxHeight: 58 },
    chips: { paddingHorizontal: space(3), gap: space(1), paddingVertical: space(1) },
    chip: {
      paddingHorizontal: space(2),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    chipActive: { backgroundColor: colors.accent },
    chipText: { fontFamily: font.semibold },
    mapWrap: { flex: 1, overflow: 'hidden' },
    bridge: {
      position: 'absolute',
      top: space(1.5),
      left: space(2),
      right: space(2),
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      backgroundColor: colors.accent,
      borderRadius: radius.pill,
      paddingHorizontal: space(2),
      paddingVertical: space(1.25),
    },
    bridgeText: { flex: 1 },
    card: {
      position: 'absolute',
      left: space(3),
      right: space(3),
      bottom: space(3),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(1.75),
    },
    cardShadow: {
      shadowColor: colors.ink,
      shadowOpacity: 0.16,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
    },
    cardClose: {
      position: 'absolute',
      top: space(1.25),
      right: space(1.25),
      zIndex: 2,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardRow: { flexDirection: 'row', gap: space(1.5), alignItems: 'center' },
    cardImage: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.bgSunken },
    cardName: { fontSize: 16, fontFamily: font.semibold, letterSpacing: -0.2 },
    cardBody: { flex: 1, gap: 3 },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
      flexWrap: 'wrap',
    },
    // Aynı adresteki diğerleri — kart içinde, ana düğmenin ÜSTÜNDE.
    kumeListe: { gap: space(0.75), marginTop: space(1) },
    kumeSatir: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    kumeFoto: { width: 28, height: 28, borderRadius: 14 },
    kumeGovde: { flex: 1 },
    cardBtn: {
      backgroundColor: colors.accent,
      borderRadius: radius.pill,
      paddingVertical: space(1.5),
      alignItems: 'center',
    },
  });
