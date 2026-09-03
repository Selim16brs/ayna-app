import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { api, type ProCustomer, type ProPost } from '../../src/api';
import { fillParams, useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, font, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, TAB_BAR_CLEARANCE, Text, TextInput } from '../../src/ui';

/**
 * MÜŞTERİLERİMLE PAYLAŞ — öncesi/sonrası.
 *
 * Kurucu: "uzman öncesi/sonrası fotoğrafını müşterilerimle paylaş butonuna
 * basarak paylaştığında daha önce müşterisi olan müşterilere gösterilsin,
 * bildirim giderek müşteri haberdar edilsin. bu fotoğraflar 7 gün kalacak."
 *
 * ── KİME GİDİYOR, EKRANDA YAZIYOR ───────────────────────────────────────
 *
 * Uzman kaç kişiye gönderdiğini paylaşmadan ÖNCE görüyor. "Müşterilerimle
 * paylaş" soyut bir söz; sayı olmadan uzman kaç kişinin fotoğrafı
 * göreceğini bilmeden basardı.
 *
 * ── İZİN KUTUSU ─────────────────────────────────────────────────────────
 *
 * Öncesi/sonrası fotoğrafı KİŞİSEL VERİDİR. Kutu işaretlenmeden paylaş
 * düğmesi açılmıyor; sunucu da izinsiz gövdeyi reddediyor. İki kapı
 * bilerek: ekran atlanabilir (eski sürüm, başka istemci), sunucu atlanamaz.
 */
export default function PaylasScreen() {
  const { t, locale } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const token = useStore((s) => s.token);

  const [musteriler, setMusteriler] = useState<ProCustomer[] | null>(null);
  const [gonderiler, setGonderiler] = useState<ProPost[]>([]);
  const [once, setOnce] = useState<string | null>(null);
  const [sonra, setSonra] = useState<string | null>(null);
  const [not, setNot] = useState('');
  const [izin, setIzin] = useState(false);
  const [mesgul, setMesgul] = useState(false);

  const yukle = () => {
    if (!token) return;
    void api
      .proCustomers(token)
      .then((r) => setMusteriler(r.customers))
      .catch(() => setMusteriler([]));
    void api
      .myProPosts(token)
      .then((r) => setGonderiler(r.posts))
      .catch(() => undefined);
  };
  useEffect(yukle, [token]);

  /** Galeriden fotoğraf — küçültülüp data URL'e çevriliyor (yükleme küçük kalsın). */
  const sec = async (hedef: 'once' | 'sonra') => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    const asset = !res.canceled ? res.assets[0] : null;
    if (!asset) return;
    let b64 = asset.base64 ?? null;
    try {
      const kucuk = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      if (kucuk.base64) b64 = kucuk.base64;
    } catch {
      /* küçültme başarısızsa orijinalle devam */
    }
    if (!b64) return;
    const uri = `data:image/jpeg;base64,${b64}`;
    if (hedef === 'once') setOnce(uri);
    else setSonra(uri);
  };

  const hazir = !!once && !!sonra && izin && (musteriler?.length ?? 0) > 0;

  const paylas = async () => {
    if (!token || !once || !sonra || !izin || mesgul) return;
    setMesgul(true);
    try {
      await api.createProPost(token, {
        beforeDataUrl: once,
        afterDataUrl: sonra,
        ...(not.trim() ? { note: not.trim() } : {}),
        consent: true,
      });
      setOnce(null);
      setSonra(null);
      setNot('');
      setIzin(false);
      yukle();
      Alert.alert(t('propost.sent_t'), t('propost.sent_b'));
    } catch {
      Alert.alert(t('propost.title'), t('propost.error'));
    } finally {
      setMesgul(false);
    }
  };

  const kaldir = (id: string) => {
    if (!token) return;
    Alert.alert(t('propost.remove_t'), t('propost.remove_b'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          void api
            .deleteProPost(token, id)
            .then(yukle)
            .catch(() => undefined);
        },
      },
    ]);
  };

  const kalanGun = (bitis: number) =>
    Math.max(0, Math.ceil((bitis - Date.now()) / (24 * 60 * 60 * 1000)));

  return (
    <Screen edges={[]}>
      <StackHeader title={t('propost.title')} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/*
         * KİME GİDECEK — paylaşmadan önce, sayıyla.
         *
         * Müşterisi olmayan uzman paylaşamıyor: alıcısı olmayan bir
         * gönderi kimseye ulaşmaz. Sebebi burada yazıyor, düğme sessizce
         * çalışmıyor değil.
         */}
        <View style={styles.kimeKart}>
          <Ionicons name="people-outline" size={18} color={colors.accentFg} />
          <Text variant="caption" tone="inkSoft" style={styles.kimeYazi}>
            {musteriler === null
              ? t('common.loading_a11y')
              : musteriler.length === 0
                ? t('propost.no_customers')
                : fillParams(t('propost.audience'), { adet: String(musteriler.length) })}
          </Text>
        </View>

        {/* ÖNCESİ / SONRASI — iki kare yan yana */}
        <View style={styles.fotoSatir}>
          {(
            [
              ['once', once, t('propost.before')],
              ['sonra', sonra, t('propost.after')],
            ] as const
          ).map(([anahtar, uri, etiket]) => (
            <Pressable
              key={anahtar}
              style={[styles.fotoKutu, shadow.soft]}
              onPress={() => void sec(anahtar)}
              accessibilityRole="button"
              accessibilityLabel={etiket}
            >
              {uri ? (
                <Image source={{ uri }} style={styles.foto} resizeMode="cover" />
              ) : (
                <View style={styles.fotoBos}>
                  <Ionicons name="camera-outline" size={22} color={colors.muted} />
                  <Text variant="caption" tone="muted">
                    {etiket}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <TextInput
          value={not}
          onChangeText={setNot}
          placeholder={t('propost.note_ph')}
          placeholderTextColor={colors.muted}
          style={styles.not}
          multiline
          maxLength={300}
        />

        {/*
         * İZİN — kişisel veri. Kutu işaretlenmeden paylaş açılmıyor.
         * Sunucu da izinsiz gövdeyi reddediyor; bu ekran yalnız ilk kapı.
         */}
        <Pressable style={styles.izinSatir} onPress={() => setIzin((x) => !x)}>
          <View style={[styles.kutu, izin && styles.kutuIsaretli]}>
            {izin ? <Ionicons name="checkmark" size={14} color={colors.onAccent} /> : null}
          </View>
          <Text variant="caption" tone="inkSoft" style={styles.izinYazi}>
            {t('propost.consent')}
          </Text>
        </Pressable>

        <Button
          label={t('propost.share')}
          variant="primary"
          onPress={() => void paylas()}
          disabled={!hazir || mesgul}
          loading={mesgul}
        />
        <Text variant="micro" tone="muted" style={styles.sureNot}>
          {t('propost.expiry_hint')}
        </Text>

        {/* YAYINDAKİ PAYLAŞIMLARIM */}
        {gonderiler.length > 0 ? (
          <>
            <Text variant="bodyStrong" tone="ink" style={styles.bolum}>
              {t('propost.mine')}
            </Text>
            {gonderiler.map((g) => (
              <View key={g.id} style={[styles.gonderi, shadow.soft]}>
                <Image source={{ uri: g.beforeUrl }} style={styles.kucukFoto} />
                <Image source={{ uri: g.afterUrl }} style={styles.kucukFoto} />
                <View style={styles.gonderiBilgi}>
                  {g.note ? (
                    <Text variant="caption" tone="ink" numberOfLines={2}>
                      {g.note}
                    </Text>
                  ) : null}
                  <Text variant="micro" tone="muted">
                    {fillParams(t('propost.meta'), {
                      adet: String(g.recipientCount ?? 0),
                      gun: String(kalanGun(g.expiresAt)),
                    })}
                  </Text>
                </View>
                <Pressable onPress={() => kaldir(g.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={colors.muted} />
                </Pressable>
              </View>
            ))}
          </>
        ) : null}

        {/* MÜŞTERİLERİM — CRM */}
        {musteriler && musteriler.length > 0 ? (
          <>
            <Text variant="bodyStrong" tone="ink" style={styles.bolum}>
              {t('propost.customers')}
            </Text>
            {musteriler.map((m) => (
              <View key={m.id} style={styles.musteri}>
                <View style={styles.musteriHarf}>
                  <Text variant="caption" tone="accentFg">
                    {m.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.grow}>
                  <Text variant="body" tone="ink" numberOfLines={1}>
                    {m.name}
                  </Text>
                  <Text variant="micro" tone="muted" numberOfLines={1}>
                    {m.lastService}
                    {m.lastServiceAt
                      ? ` · ${new Date(m.lastServiceAt).toLocaleDateString(locale)}`
                      : ''}
                  </Text>
                </View>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { padding: space(3), paddingBottom: TAB_BAR_CLEARANCE, gap: space(1.5) },
    grow: { flex: 1, minWidth: 0 },
    kimeKart: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      padding: space(1.75),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
    },
    kimeYazi: { flex: 1, lineHeight: 18 },
    fotoSatir: { flexDirection: 'row', gap: space(1.5) },
    fotoKutu: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: radius.lg,
      overflow: 'hidden',
      backgroundColor: colors.surface,
    },
    foto: { width: '100%', height: '100%' },
    fotoBos: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1.25,
      borderStyle: 'dashed',
      borderColor: colors.lineStrong,
      borderRadius: radius.lg,
    },
    not: { minHeight: 76, textAlignVertical: 'top' },
    izinSatir: { flexDirection: 'row', alignItems: 'flex-start', gap: space(1.25) },
    kutu: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.lineStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kutuIsaretli: { backgroundColor: colors.accent, borderColor: colors.accent },
    izinYazi: { flex: 1, lineHeight: 18 },
    sureNot: { textAlign: 'center' },
    bolum: { marginTop: space(2), fontFamily: font.semibold },
    gonderi: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      padding: space(1.25),
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
    },
    kucukFoto: { width: 44, height: 44, borderRadius: radius.md },
    gonderiBilgi: { flex: 1, minWidth: 0, gap: 2 },
    musteri: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      paddingVertical: space(1),
    },
    musteriHarf: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentSoft,
    },
  });
