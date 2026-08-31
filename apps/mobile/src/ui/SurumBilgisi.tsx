import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { StyleSheet, View } from 'react-native';
import { space, type ColorTokens } from '../theme';
import { useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * HANGİ SÜRÜM ÇALIŞIYOR? — teşhis için görünür kayıt.
 *
 * 31.08.2026'da bir gün boyunca düzeltme gönderildi ama kurucunun telefonunda
 * göründüğünden emin olunamadı: test edilen TestFlight yapısı (1.0.0/114,
 * `com.yemreeke.template`) BİZİM projemizden üretilmemiş ve OTA'larımızın oraya
 * ulaşıp ulaşmadığı belirsizdi. Çökme kayıtları da yalnız native sürümü
 * gösteriyor, hangi JS paketinin çalıştığını göstermiyor.
 *
 * Bu satır o belirsizliği kalıcı olarak kapatır: ekranda görünen güncelleme
 * kimliği doğrudan `eas update:list` çıktısıyla karşılaştırılabilir.
 *
 * HİÇBİR KOŞULDA FIRLATMAZ: burası profil ekranının içinde çiziliyor; bir
 * teşhis satırı uygulamayı düşüremez. `expo-updates` gömülü yapıda ya da
 * geliştirme modunda boş değer döndürebilir.
 */
export function SurumBilgisi() {
  const styles = useThemedStyles(makeStyles);

  let satir = '—';
  try {
    const native = Constants.expoConfig?.version ?? '?';
    const build =
      Constants.expoConfig?.ios?.buildNumber ??
      String(Constants.expoConfig?.android?.versionCode ?? '?');
    // Geliştirme/Expo Go ya da hiç güncelleme uygulanmamış gömülü yapı → null.
    const guncelleme = Updates.isEmbeddedLaunch
      ? 'gömülü'
      : (Updates.updateId?.slice(0, 8) ?? 'yok');
    const tarih = Updates.createdAt
      ? new Date(Updates.createdAt).toLocaleString('tr-TR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';
    satir = `v${native} (${build}) · güncelleme ${guncelleme} · ${tarih}`;
  } catch {
    // Teşhis satırı asla ekranı düşürmez.
    satir = 'sürüm okunamadı';
  }

  return (
    <View style={styles.kap}>
      <Text variant="caption" tone="muted" style={styles.metin} selectable>
        {satir}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    kap: { paddingTop: space(2), paddingBottom: space(1), alignItems: 'center' },
    metin: { color: colors.muted, textAlign: 'center' },
  });
