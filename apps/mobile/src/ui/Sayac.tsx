import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from '../theme';
import { Text } from './Text';

/**
 * GERİ SAYIM — brief §7: "Tüm süre sınırları ekranda görünür geri sayımla
 * gösterilir; görünmez zaman sınırı yasak."
 *
 * Neden ayrı bileşen: aynı sayaç depozito (10 dk), uzman yanıtı (3 saat),
 * no-show itirazı (24 saat) ve iptal eşiği (3 saat) için gerekiyor. Her ekranda
 * yeniden yazmak, birinin saniye diğerinin dakika göstermesiyle bitiyordu.
 *
 * Saniyede bir tikler ama YALNIZ görünürken: bileşen kalkınca interval
 * temizlenir, aksi hâlde her açılan kart arkada bir zamanlayıcı bırakırdı.
 */
export function Sayac({
  bitis,
  metin,
  renk,
}: {
  /** Bitiş anı (UTC ms). */
  bitis: number;
  /** Sayacın yanında görünecek açıklama. */
  metin: string;
  renk: string;
}) {
  const [kalan, setKalan] = useState(() => Math.max(0, bitis - Date.now()));

  useEffect(() => {
    setKalan(Math.max(0, bitis - Date.now()));
    const t = setInterval(() => setKalan(Math.max(0, bitis - Date.now())), 1000);
    return () => clearInterval(t);
  }, [bitis]);

  const bitti = kalan <= 0;
  const saniye = Math.floor(kalan / 1000);
  const s = Math.floor(saniye / 3600);
  const d = Math.floor((saniye % 3600) / 60);
  const sn = saniye % 60;
  // 1 saatin altında dk:sn (aciliyet hissi), üstünde sa:dk (okunabilirlik).
  const gosterim = bitti
    ? '00:00'
    : s > 0
      ? `${s}:${String(d).padStart(2, '0')}`
      : `${String(d).padStart(2, '0')}:${String(sn).padStart(2, '0')}`;

  return (
    <View style={styles.kap} accessibilityRole="timer">
      <Text variant="bodyStrong" style={{ color: renk }}>
        {gosterim}
      </Text>
      <Text variant="caption" tone="muted" style={styles.metin}>
        {metin}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kap: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
  metin: { flex: 1 },
});
