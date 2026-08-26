import { useRef, useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import Svg, {
  ClipPath,
  Defs,
  G,
  Image as SvgImage,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import qrcode from 'qrcode-generator';
import { useLocale } from '../../src/locale';
import { selectPortrait, useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, TAB_BAR_CLEARANCE } from '../../src/ui';

// §growth — uzman/salon profilini sosyal medyada paylaşır; kart AYNA reklamı olarak da çalışır.
const PROFILE_URL = 'https://ayna.kz';

// Instagram story ölçüleri (9:16)
const W = 1080;
const H = 1920;

// ── YERLEŞİM ─────────────────────────────────────────────────────────────
// Tek sol hiza (M) ve ölçülebilir dikey ritim. Eskiden her öğe kendi
// koordinatındaydı (56, 64, 96, 112, 452…) ve hiçbiri hizalanmıyordu; kart
// "düzensiz" görünmesinin sebebi buydu.
const M = 88; // sol/sağ kenar — TÜM öğeler bu hizadan başlar
const CW = W - M * 2; // içerik genişliği
const PY = 268; // portre üstü
const PH = 820; // portre yüksekliği — QR paneli alt markaya çarpmasın (40pt pay)
const KY = PY + PH - 96; // kimlik kartı portrenin altına 96 BİNER
const KH = 400;
const QY = KY + KH + 56; // QR paneli

// Paylaşılan görsel sabit "aydınlık" markalı temada üretilir (cihaz temasından bağımsız).
const C = {
  bg: '#FBF8F6',
  lime: '#5A2A55',
  limeLight: '#F5E6EB',
  limeDeep: '#5A2A55',
  ink: '#261F25',
  body: '#564E56',
  white: '#FFFFFF',
  line: '#F0E7EC',
  soft: '#F5E6EB',
  goldSoft: '#FAF2E6',
  gold: '#C2A06A',
  muted: '#A69E92',
};

// QR modüllerini tek bir <Path> d string'ine çevirir (kutu içi, pad kadar sessiz alan bırakır).
function qrPath(text: string, size: number, pad: number): string {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const cell = (size - pad * 2) / n;
  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) {
        const x = pad + c * cell;
        const y = pad + r * cell;
        d += `M${x.toFixed(2)} ${y.toFixed(2)}h${cell.toFixed(2)}v${cell.toFixed(2)}h${(-cell).toFixed(2)}z`;
      }
    }
  }
  return d;
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const approxW = (s: string, fs: number) => s.length * fs * 0.55;

export default function SellerShareScreen() {
  const { t } = useLocale();
  const styles = useThemedStyles(makeStyles);
  const rawName = useStore((s) => s.currentUser?.name) ?? 'AYNA';
  const portre = useStore(selectPortrait);
  // Karttaki portre GERÇEK: cut-out > yüklenen foto > nötr çizim (stok model DEĞİL)
  // Sıfır-demo: foto yoksa sahte model YOK — portre alanı boş kalır
  const portrait = portre ? { uri: portre } : null;
  const isSalon = useStore((s) => s.currentUser?.role === 'salon');
  const businessName = useStore((s) => s.currentUser?.businessName);
  const svgRef = useRef<Svg>(null);
  const [busy, setBusy] = useState<null | 'save' | 'share'>(null);

  const name = clip(rawName, 18);
  const subtitle = clip(
    isSalon ? t('reports.identity.salon') : (businessName ?? t('reports.identity.independent')),
    22,
  );

  // Önizleme ölçüsü (ekrana sığacak genişlik), oran 9:16
  const screenW = Dimensions.get('window').width;
  const previewW = screenW - space(3) * 2;
  const previewH = (previewW * H) / W;

  // Alt bilgi rozetleri (subtitle + puan) — SVG'de otomatik genişlik yok, JS ile hesaplanır.
  // Rozet genişliği JS'te hesaplanır (SVG'de otomatik genişlik yok).
  const subW = Math.min(520, 72 + approxW(subtitle, 30));
  const qrD = qrPath(PROFILE_URL, 300, 40);

  // <Svg> → PNG base64 → JPG dosyası (indirilebilir).
  const toJpg = async (): Promise<string> => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const ref = svgRef.current as unknown as {
        toDataURL?: (cb: (b: string) => void, opts?: { width: number; height: number }) => void;
      } | null;
      if (!ref?.toDataURL) {
        reject(new Error('no-capture'));
        return;
      }
      // NOT: {width,height} opsiyonu SVG'yi önizleme boyutunda çizip dev tuvalin köşesine
      // yapıştırıyordu (kart minicik görünüyordu). Boyutsuz yakala → 1080'e ölçekle.
      ref.toDataURL((b) => (b ? resolve(b) : reject(new Error('empty'))));
    });
    const out = await ImageManipulator.manipulateAsync(
      `data:image/png;base64,${base64}`,
      [{ resize: { width: W } }],
      { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG },
    );
    return out.uri;
  };

  const onSave = async () => {
    setBusy('save');
    try {
      const uri = await toJpg();
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (!perm.granted) {
        Alert.alert(t('share.save_denied'));
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert(t('share.saved'));
    } catch {
      Alert.alert(t('share.err'));
    } finally {
      setBusy(null);
    }
  };

  const onShare = async () => {
    setBusy('share');
    try {
      const uri = await toJpg();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/jpeg',
          dialogTitle: t('share.title'),
          UTI: 'public.jpeg',
        });
      }
    } catch {
      Alert.alert(t('share.err'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('share.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.cardWrap, { width: previewW, height: previewH }]}>
          <Svg ref={svgRef} width={previewW} height={previewH} viewBox={`0 0 ${W} ${H}`}>
            <Defs>
              {/* Fotoğrafın ALTINA inen perde: beyaz kimlik kartına geçiş
                  kazara değil, tasarlanmış görünsün. */}
              <LinearGradient id="perde" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={C.ink} stopOpacity="0" />
                <Stop offset="1" stopColor={C.ink} stopOpacity="0.55" />
              </LinearGradient>
              {/* Fotoğraf ÇERÇEVEYE maskelenir. Eskiden ham dikdörtgen olarak
                  panelin üstüne yapıştırılıyordu: kendi arka planıyla birlikte
                  duruyor ve "sonradan eklenmiş" görünüyordu. */}
              <ClipPath id="foto">
                <Rect x={M} y={PY} width={CW} height={PH} rx={72} />
              </ClipPath>
            </Defs>

            <Rect x={0} y={0} width={W} height={H} fill={C.bg} />

            {/* ── MARKA — küçük ve kendinden emin, dev blok değil ── */}
            <SvgText x={M} y={132} fontSize={54} fontWeight="800" fill={C.ink} letterSpacing={10}>
              AYNA
            </SvgText>
            <Rect x={M} y={158} width={64} height={5} rx={2.5} fill={C.limeDeep} />
            <SvgText x={M} y={214} fontSize={26} fontWeight="600" fill={C.muted} letterSpacing={5}>
              GÜZELLİK & BAKIM
            </SvgText>

            {/* ── PORTRE ── */}
            <Rect x={M} y={PY} width={CW} height={PH} rx={72} fill={C.soft} />
            {portrait ? (
              <G clipPath="url(#foto)">
                <SvgImage
                  href={portrait}
                  x={M}
                  y={PY}
                  width={CW}
                  height={PH}
                  preserveAspectRatio="xMidYMid slice"
                />
                <Rect x={M} y={PY + PH * 0.55} width={CW} height={PH * 0.45} fill="url(#perde)" />
              </G>
            ) : null}

            {/* ── KİMLİK — portrenin altına BİNER, aynı sol hizada ── */}
            <Rect
              x={M}
              y={KY}
              width={CW}
              height={KH}
              rx={64}
              fill={C.white}
              stroke={C.line}
              strokeWidth={2}
            />
            <SvgText x={M + 56} y={KY + 108} fontSize={58} fontWeight="800" fill={C.ink}>
              {name}
            </SvgText>

            <Rect x={M + 56} y={KY + 148} width={subW} height={64} rx={32} fill={C.soft} />
            <SvgText
              x={M + 56 + subW / 2}
              y={KY + 190}
              fontSize={30}
              fontWeight="700"
              fill={C.limeDeep}
              textAnchor="middle"
            >
              {subtitle}
            </SvgText>
            {/* Gerçek puan birikene kadar dürüst 'Yeni' — uydurma yıldız yok. */}
            <Rect
              x={M + 76 + subW}
              y={KY + 148}
              width={176}
              height={64}
              rx={32}
              fill={C.goldSoft}
            />
            <SvgText
              x={M + 76 + subW + 88}
              y={KY + 190}
              fontSize={28}
              fontWeight="700"
              fill={C.gold}
              textAnchor="middle"
            >
              ✨ Yeni
            </SvgText>

            <Rect x={M + 56} y={KY + 254} width={CW - 112} height={104} rx={52} fill={C.limeDeep} />
            <SvgText
              x={W / 2}
              y={KY + 320}
              fontSize={40}
              fontWeight="700"
              fill={C.white}
              textAnchor="middle"
            >
              {t('share.card_cta')}
            </SvgText>

            {/* ── QR + MAĞAZALAR — tek panel, kart ile AYNI hizada ── */}
            <Rect
              x={M}
              y={QY}
              width={CW}
              height={332}
              rx={56}
              fill={C.white}
              stroke={C.line}
              strokeWidth={2}
            />
            <G transform={`translate(${M + 40},${QY + 40})`}>
              <Rect x={0} y={0} width={252} height={252} rx={28} fill={C.white} />
              <Path d={qrD} fill={C.ink} transform="scale(0.84)" />
            </G>
            <SvgText x={M + 336} y={QY + 92} fontSize={32} fontWeight="700" fill={C.ink}>
              {t('share.scan')}
            </SvgText>
            <Rect x={M + 336} y={QY + 122} width={272} height={84} rx={42} fill={C.ink} />
            <G transform={`translate(${M + 372},${QY + 146}) scale(1.7)`}>
              <Path
                d="M12.3 3.6c.9 0 2-.6 2.6-1.4.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.7 1.3-.6.7-1 1.7-.8 2.8zM15.8 9.8c0-2 1.6-2.9 1.7-3-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.2 2-1.4 2.4-.4 6 1 8 .7 1 1.4 2 2.4 2 .9 0 1.3-.6 2.4-.6 1.1 0 1.4.6 2.4.6 1 0 1.6-.9 2.3-1.9.7-1.1 1-2.1 1-2.2-.1 0-1.9-.7-1.9-2.6z"
                fill={C.white}
              />
            </G>
            <SvgText x={M + 424} y={QY + 174} fontSize={32} fontWeight="700" fill={C.white}>
              {t('share.ios')}
            </SvgText>
            <Rect x={M + 336} y={QY + 222} width={272} height={84} rx={42} fill={C.ink} />
            <G transform={`translate(${M + 376},${QY + 244})`}>
              <Polygon points="0,0 0,38 30,19" fill={C.white} />
            </G>
            <SvgText x={M + 424} y={QY + 274} fontSize={32} fontWeight="700" fill={C.white}>
              {t('share.android')}
            </SvgText>

            <SvgText
              x={W / 2}
              y={H - 72}
              fontSize={32}
              fontWeight="700"
              fill={C.muted}
              textAnchor="middle"
              letterSpacing={3}
            >
              ayna.kz
            </SvgText>
          </Svg>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Button
          label={busy === 'share' ? t('share.preparing') : t('share.cta')}
          variant="primary"
          onPress={onShare}
          disabled={busy !== null}
        />
        <Button
          label={busy === 'save' ? t('share.preparing') : t('share.save')}
          variant="secondary"
          onPress={onSave}
          disabled={busy !== null}
        />
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: {
      alignItems: 'center',
      paddingHorizontal: space(3),
      paddingVertical: space(2.5),
      // Boşluk BURADA DEĞİL: altta sabit eylem şeridi var, alt menüyü o aşmalı.
      // Buraya konunca kaydırma içeriği gereksiz yer bırakıyor, DÜĞME ise
      // yine barın altında kalıyordu.
    },
    cardWrap: {
      borderRadius: radius.xl,
      overflow: 'hidden',
      backgroundColor: colors.bg,
      shadowColor: '#000',
      shadowOpacity: 0.14,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    actions: {
      paddingHorizontal: space(3),
      paddingBottom: TAB_BAR_CLEARANCE,
      paddingTop: space(1.5),
      gap: space(1.25),
    },
  });
