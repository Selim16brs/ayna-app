import { useRef, useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import Svg, {
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
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader } from '../../src/ui';

// §growth — uzman/salon profilini sosyal medyada paylaşır; kart AYNA reklamı olarak da çalışır.
const PROFILE_URL = 'https://ayna.kz';

// Instagram story ölçüleri (9:16)
const W = 1080;
const H = 1920;

// Paylaşılan görsel sabit "aydınlık" markalı temada üretilir (cihaz temasından bağımsız).
const C = {
  bg: '#F4F1EC',
  lime: '#C6E24B',
  limeLight: '#DDEE8A',
  limeDeep: '#6F8C1B',
  ink: '#1A1A1A',
  body: '#332E29',
  white: '#FFFFFF',
  line: '#ECE6DE',
  soft: '#EEF7C8',
  goldSoft: '#F6EEDD',
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
  const isSalon = useStore((s) => s.currentUser?.role === 'salon');
  const businessName = useStore((s) => s.currentUser?.businessName);
  const svgRef = useRef<Svg>(null);
  const [busy, setBusy] = useState<null | 'save' | 'share'>(null);

  const name = clip(rawName, 18);
  const subtitle = clip(
    isSalon ? t('reports.identity.salon') : businessName ?? t('reports.identity.independent'),
    22,
  );

  // Önizleme ölçüsü (ekrana sığacak genişlik), oran 9:16
  const screenW = Dimensions.get('window').width;
  const previewW = screenW - space(3) * 2;
  const previewH = (previewW * H) / W;

  // Alt bilgi rozetleri (subtitle + puan) — SVG'de otomatik genişlik yok, JS ile hesaplanır.
  const subW = Math.min(560, 92 + approxW(subtitle, 32));
  const ratingX = 112 + subW + 20;
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
      ref.toDataURL((b) => (b ? resolve(b) : reject(new Error('empty'))), { width: W, height: H });
    });
    const out = await ImageManipulator.manipulateAsync(
      `data:image/png;base64,${base64}`,
      [],
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
              <LinearGradient id="lime" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={C.limeLight} />
                <Stop offset="1" stopColor={C.lime} />
              </LinearGradient>
            </Defs>

            {/* zemin */}
            <Rect x={0} y={0} width={W} height={H} fill={C.bg} />

            {/* lime hero panel */}
            <Rect x={56} y={56} width={968} height={940} rx={64} fill="url(#lime)" />
            <SvgText
              x={112}
              y={196}
              fontSize={78}
              fontWeight="800"
              fill={C.ink}
              letterSpacing={8}
            >
              AYNA
            </SvgText>
            <SvgText x={116} y={250} fontSize={30} fontWeight="600" fill={C.limeDeep} letterSpacing={4}>
              GÜZELLİK & BAKIM
            </SvgText>

            {/* uzman cut-out fotoğrafı (panel bandında) */}
            <SvgImage
              href={require('../../assets/hero-expert.png')}
              x={470}
              y={176}
              width={546}
              height={820}
              preserveAspectRatio="xMidYMax meet"
            />

            {/* beyaz kimlik kartı (paneli örter) */}
            <Rect
              x={64}
              y={884}
              width={952}
              height={556}
              rx={56}
              fill={C.white}
              stroke={C.line}
              strokeWidth={2}
            />
            <SvgText x={112} y={1006} fontSize={62} fontWeight="800" fill={C.ink}>
              {name}
            </SvgText>

            {/* subtitle rozeti */}
            <Rect x={112} y={1042} width={subW} height={66} rx={33} fill={C.soft} />
            <SvgText x={148} y={1085} fontSize={32} fontWeight="700" fill={C.limeDeep}>
              {subtitle}
            </SvgText>
            {/* puan rozeti */}
            <Rect x={ratingX} y={1042} width={168} height={66} rx={33} fill={C.goldSoft} />
            <SvgText x={ratingX + 32} y={1085} fontSize={32} fontWeight="700" fill={C.gold}>
              ★
            </SvgText>
            <SvgText x={ratingX + 70} y={1085} fontSize={32} fontWeight="700" fill={C.body}>
              4.9
            </SvgText>

            {/* CTA pill */}
            <Rect x={112} y={1210} width={856} height={110} rx={55} fill={C.limeDeep} />
            <SvgText
              x={540}
              y={1280}
              fontSize={42}
              fontWeight="700"
              fill={C.white}
              textAnchor="middle"
            >
              {t('share.card_cta')}
            </SvgText>

            {/* QR + market rozetleri */}
            <G transform="translate(96,1496)">
              <Rect x={0} y={0} width={300} height={300} rx={36} fill={C.white} stroke={C.line} strokeWidth={2} />
              <Path d={qrD} fill={C.ink} />
            </G>

            <SvgText x={452} y={1556} fontSize={36} fontWeight="700" fill={C.ink}>
              {t('share.scan')}
            </SvgText>

            {/* App Store */}
            <Rect x={452} y={1596} width={296} height={94} rx={47} fill={C.ink} />
            <G transform="translate(492,1622) scale(1.9)">
              <Path
                d="M12.3 3.6c.9 0 2-.6 2.6-1.4.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.7 1.3-.6.7-1 1.7-.8 2.8zM15.8 9.8c0-2 1.6-2.9 1.7-3-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.2 2-1.4 2.4-.4 6 1 8 .7 1 1.4 2 2.4 2 .9 0 1.3-.6 2.4-.6 1.1 0 1.4.6 2.4.6 1 0 1.6-.9 2.3-1.9.7-1.1 1-2.1 1-2.2-.1 0-1.9-.7-1.9-2.6z"
                fill={C.white}
              />
            </G>
            <SvgText x={548} y={1656} fontSize={36} fontWeight="700" fill={C.white}>
              {t('share.ios')}
            </SvgText>

            {/* Google Play */}
            <Rect x={452} y={1706} width={296} height={94} rx={47} fill={C.ink} />
            <G transform="translate(492,1732)">
              <Polygon points="0,0 0,42 34,21" fill={C.white} />
            </G>
            <SvgText x={548} y={1766} fontSize={36} fontWeight="700" fill={C.white}>
              {t('share.android')}
            </SvgText>

            {/* alt marka */}
            <SvgText x={540} y={1876} fontSize={36} fontWeight="700" fill={C.limeDeep} textAnchor="middle">
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
    content: { alignItems: 'center', paddingHorizontal: space(3), paddingVertical: space(2.5) },
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
    actions: { paddingHorizontal: space(3), paddingBottom: space(3), paddingTop: space(1.5), gap: space(1.25) },
  });
