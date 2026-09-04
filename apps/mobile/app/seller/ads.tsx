import { useEffect, useState } from 'react';
import { odemeReferansi } from '@ayna/domain';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { api, type AdOrder } from '../../src/api';
import { fillParams, useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { radius, shadow, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';
import { BELGE_GENISLIK, kucultVeB64, PAYLASIM_GENISLIK } from '../../src/gorsel-kucult';
import { sunucuHatasi } from '../../src/sunucu-hatasi';

/**
 * REKLAM VER — ücretli vitrin satın alma.
 *
 * Ödeme yolu depozitodakiyle AYNI: Kaspi açılır, uzman öder, dekontu yükler,
 * admin doğrulayınca reklam yayına girer. Farklı bir ödeme yolu icat etmek
 * hem kullanıcıya iki ayrı alışkanlık öğretir hem de admin tarafında ikinci
 * bir doğrulama kuyruğu gerektirirdi.
 *
 * Reklam SİPARİŞ ANINDA yayına GİRMEZ: ödeme doğrulanmadan yayınlamak,
 * ödenmemiş reklamı vitrine koymak olurdu.
 */
const HESAP_ADI = 'SES INVEST TOO';

const kaspiBaglantisi = (sablon: string, tutar: number, ref: string): string =>
  sablon.replace(/\{tutar\}/g, String(tutar)).replace(/\{ref\}/g, encodeURIComponent(ref));

const YERLESIMLER = [
  { id: 'one_cikanlar', ad: 'ads.place.one_cikanlar', not: 'ads.place.one_cikanlar_d' },
  { id: 'firsatlar', ad: 'ads.place.firsatlar', not: 'ads.place.firsatlar_d' },
] as const;

export default function SellerAdsScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const kaspiUrl = useStore((s) => s.config.kaspiPaymentUrl ?? null);
  const currentUser = useStore((s) => s.currentUser);

  const [aylik, setAylik] = useState<number | null>(null);
  const [siparisler, setSiparisler] = useState<AdOrder[]>([]);
  const [yerlesim, setYerlesim] = useState<'firsatlar' | 'one_cikanlar'>('one_cikanlar');
  const [ay, setAy] = useState(1);
  const [baslik, setBaslik] = useState('');
  const [altBaslik, setAltBaslik] = useState('');
  // Kurucu: "reklamın neyi anlattığını anlatan bir alan olmalı."
  const [aciklama, setAciklama] = useState('');
  const [gorsel, setGorsel] = useState<string | null>(null);
  const [dekont, setDekont] = useState<string | null>(null);
  const [siparis, setSiparis] = useState<AdOrder | null>(null);
  const [mesgul, setMesgul] = useState(false);

  const tazele = () => {
    void api
      .myAdOrders()
      .then(setSiparisler)
      .catch(() => undefined);
  };
  useEffect(() => {
    void api
      .adPricing()
      .then((p) => setAylik(p.monthly))
      .catch(() => undefined);
    tazele();
  }, []);

  const toplam = (aylik ?? 0) * ay;
  const hazir = baslik.trim().length >= 2 && !!gorsel;

  const secGorsel = async (hedef: 'reklam' | 'dekont') => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    /*
     * DEKONT belge gibi: tutar ve tarih okunur kalmalı, o yüzden reklam
     * görselinden daha geniş küçültülüyor.
     */
    const b64 = await kucultVeB64(
      a.uri,
      a.base64,
      hedef === 'reklam' ? PAYLASIM_GENISLIK : BELGE_GENISLIK,
    );
    if (!b64) return;
    const uri = `data:image/jpeg;base64,${b64}`;
    if (hedef === 'reklam') setGorsel(uri);
    else setDekont(uri);
  };

  /** Siparişi oluşturur ve Kaspi'yi açar. Tutar sipariş anında DONDURULUR. */
  const odemeyeGec = async () => {
    if (!hazir || mesgul) return;
    setMesgul(true);
    try {
      const o =
        siparis ??
        (await api.createAdOrder({
          /*
           * `proId` GÖNDERİLMİYOR: burada `currentUser.id` yollanıyordu,
           * yani KULLANICI kimliği. Reklam kartı olmayan bir uzmana
           * gidiyor, ekran sonsuza kadar "Yükleniyor"da kalıyordu.
           * Sunucu kimliği oturumdan kendi türetiyor.
           */
          proName: currentUser?.name ?? '',
          placement: yerlesim,
          title: baslik.trim(),
          ...(altBaslik.trim() ? { subtitle: altBaslik.trim() } : {}),
          ...(aciklama.trim() ? { description: aciklama.trim() } : {}),
          image: gorsel!,
          months: ay,
        }));
      setSiparis(o);
      if (!kaspiUrl) return;
      // Kaspi açılamıyorsa sessiz kalmıyoruz: hesap adı ve tutar aşağıda
      // kopyalanabilir duruyor, elle transfer yolu açık.
      try {
        await Linking.openURL(kaspiBaglantisi(kaspiUrl, Number(o.amount), odemeReferansi(o.id)));
      } catch {
        Alert.alert(t('deposit.kaspi_fail_t'), t('deposit.kaspi_fail_b'));
      }
    } catch (e) {
      Alert.alert(t('ads.fail_t'), sunucuHatasi(e, t));
    } finally {
      setMesgul(false);
    }
  };

  const dekontGonder = async () => {
    if (!siparis || !dekont || mesgul) return;
    setMesgul(true);
    try {
      await api.uploadAdReceipt(siparis.id, dekont);
      Alert.alert(t('ads.sent_t'), t('ads.sent_b'));
      setSiparis(null);
      setDekont(null);
      setGorsel(null);
      setBaslik('');
      setAltBaslik('');
      tazele();
    } catch (e) {
      // Sunucunun kendi gerekçesi gösteriliyor: "bir hata oluştu" kullanıcıya
      // neyi düzelteceğini söylemiyor.
      Alert.alert(t('ads.fail_t'), sunucuHatasi(e, t));
    } finally {
      setMesgul(false);
    }
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('ads.title')} />
      <ScrollView
        contentContainerStyle={styles.icerik}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── NEREDE YAYINLANSIN ── */}
        <View style={[styles.kart, shadow.card]}>
          <Text variant="bodyStrong" tone="ink">
            {t('ads.placement')}
          </Text>
          {YERLESIMLER.map((y) => (
            <Pressable
              key={y.id}
              style={styles.secim}
              onPress={() => setYerlesim(y.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: yerlesim === y.id }}
            >
              <Ionicons
                name={yerlesim === y.id ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={yerlesim === y.id ? colors.accent : colors.muted}
              />
              <View style={styles.flex}>
                <Text variant="bodyStrong" tone="ink">
                  {t(y.ad)}
                </Text>
                <Text variant="caption" tone="muted">
                  {t(y.not)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* ── SÜRE ── */}
        <View style={[styles.kart, shadow.card]}>
          <Text variant="bodyStrong" tone="ink">
            {t('ads.months')}
          </Text>
          <View style={styles.aySatir}>
            {[1, 3, 6].map((n) => (
              <Pressable
                key={n}
                style={[styles.ayKutu, ay === n && styles.ayKutuAktif]}
                onPress={() => setAy(n)}
                accessibilityRole="button"
              >
                <Text variant="bodyStrong" style={{ color: ay === n ? colors.accent : colors.ink }}>
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>
          {aylik != null ? (
            <Text variant="caption" tone="muted">
              {fillParams(t('ads.price_month'), { amount: aylik.toLocaleString('tr-TR') })}
            </Text>
          ) : null}
        </View>

        {/* ── REKLAMIN İÇERİĞİ ── */}
        <View style={[styles.kart, shadow.card]}>
          <Text variant="bodyStrong" tone="ink">
            {t('ads.creative')}
          </Text>
          <Text variant="caption" tone="muted">
            {t('ads.f.title')}
          </Text>
          <TextInput
            style={styles.girdi}
            value={baslik}
            onChangeText={setBaslik}
            placeholder={t('ads.f.title_ph')}
            placeholderTextColor={colors.muted}
            maxLength={80}
          />
          <Text variant="caption" tone="muted">
            {t('ads.f.subtitle')}
          </Text>
          <TextInput
            style={styles.girdi}
            value={altBaslik}
            onChangeText={setAltBaslik}
            placeholder={t('ads.f.subtitle_ph')}
            placeholderTextColor={colors.muted}
            maxLength={120}
          />
          <Text variant="caption" tone="muted">
            {t('ads.f.description')}
          </Text>
          {/* Çok satırlı: kartta değil reklamın kendi sayfasında görünüyor,
              o yüzden başlık gibi tek satıra sıkışması gerekmiyor. */}
          <TextInput
            style={[styles.girdi, styles.girdiCokSatir]}
            value={aciklama}
            onChangeText={setAciklama}
            placeholder={t('ads.f.description_ph')}
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={4}
            maxLength={600}
            textAlignVertical="top"
          />
          <Text variant="caption" tone="muted">
            {t('ads.f.image')}
          </Text>
          <Pressable style={styles.yukle} onPress={() => void secGorsel('reklam')}>
            {gorsel ? (
              <Image source={{ uri: gorsel }} style={styles.onizleme} resizeMode="cover" />
            ) : (
              <>
                <Ionicons name="image-outline" size={26} color={colors.muted} />
                <Text variant="body" tone="muted">
                  {t('ads.f.image_pick')}
                </Text>
              </>
            )}
          </Pressable>
          <Text variant="caption" tone="muted" style={styles.not}>
            {t('ads.note')}
          </Text>
        </View>

        {/* ── TUTAR + ÖDEME ── */}
        <View style={[styles.kart, shadow.card]}>
          <View style={styles.satir}>
            <Text variant="caption" tone="muted">
              {t('ads.total')}
            </Text>
            <Text variant="h2" tone="ink" selectable>
              {toplam.toLocaleString('tr-TR')} ₸
            </Text>
          </View>
          <Text variant="body" tone="ink" selectable>
            {HESAP_ADI}
          </Text>
          {siparis ? (
            <View style={styles.satir}>
              <Text variant="caption" tone="muted">
                {t('deposit.ref.code')}
              </Text>
              <Text variant="bodyStrong" tone="ink" selectable style={styles.kod}>
                {odemeReferansi(siparis.id)}
              </Text>
            </View>
          ) : null}
        </View>

        <Button
          label={t('ads.pay_kaspi')}
          disabled={!hazir || mesgul}
          variant={hazir ? 'primary' : 'secondary'}
          onPress={() => void odemeyeGec()}
        />

        {/* Dekont YALNIZ sipariş oluştuktan sonra: ödenecek tutar ve referans
            belli olmadan yüklenen dekont eşleştirilemez. */}
        {siparis ? (
          <>
            <Pressable
              style={[styles.kart, shadow.card, styles.yukle]}
              onPress={() => void secGorsel('dekont')}
            >
              {dekont ? (
                <Image source={{ uri: dekont }} style={styles.onizleme} resizeMode="cover" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={26} color={colors.muted} />
                  <Text variant="body" tone="muted">
                    {t('ads.receipt')}
                  </Text>
                </>
              )}
            </Pressable>
            <Button
              label={t('ads.submit')}
              disabled={!dekont || mesgul}
              variant={dekont ? 'primary' : 'secondary'}
              onPress={() => void dekontGonder()}
            />
          </>
        ) : null}

        {/* ── GEÇMİŞ ── */}
        <Text variant="bodyStrong" tone="ink" style={styles.bolumBasi}>
          {t('ads.mine')}
        </Text>
        {siparisler.length === 0 ? (
          <Text variant="caption" tone="muted">
            {t('ads.empty')}
          </Text>
        ) : (
          siparisler.map((o) => (
            <View key={o.id} style={[styles.kart, shadow.card, styles.gecmisSatir]}>
              <Image source={{ uri: o.image }} style={styles.kucukGorsel} resizeMode="cover" />
              <View style={styles.flex}>
                <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                  {o.title}
                </Text>
                <Text variant="caption" tone="muted">
                  {t(`ads.st.${o.status}`)}
                  {o.periodEnd
                    ? ` · ${fillParams(t('ads.until'), {
                        date: new Date(o.periodEnd).toLocaleDateString('tr-TR'),
                      })}`
                    : ''}
                </Text>
              </View>
              <Text variant="caption" tone="muted">
                {Number(o.amount).toLocaleString('tr-TR')} ₸
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    icerik: { padding: space(2), gap: space(1.5), paddingBottom: TAB_BAR_CLEARANCE },
    kart: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(0.75),
    },
    secim: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      paddingVertical: space(1),
    },
    flex: { flex: 1 },
    aySatir: { flexDirection: 'row', gap: space(1) },
    ayKutu: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: space(1.25),
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
    },
    ayKutuAktif: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    girdiCokSatir: { minHeight: 96, paddingTop: space(1.5) },
    girdi: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.md,
      paddingHorizontal: space(1.5),
      paddingVertical: space(1.25),
      color: colors.ink,
    },
    yukle: { alignItems: 'center', justifyContent: 'center', minHeight: 120, gap: space(1) },
    onizleme: { width: '100%', height: 150, borderRadius: radius.md },
    satir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    kod: { letterSpacing: 1 },
    not: { lineHeight: 18 },
    bolumBasi: { marginTop: space(1) },
    gecmisSatir: { flexDirection: 'row', alignItems: 'center', gap: space(1.25) },
    kucukGorsel: { width: 48, height: 48, borderRadius: radius.md },
  });
