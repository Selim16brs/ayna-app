import * as Updates from 'expo-updates';
import * as Application from 'expo-application';
import surumBilgi from '../surum-bilgi.json';
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
  let ozet = '';
  try {
    // NATIVE yapı — GERÇEK binary'den. Önce `Constants.expoConfig` okunuyordu
    // ama o, OTA ile GELEN JS yapılandırmasını gösteriyor: TestFlight "114"
    // derken ekranda "115" yazıyordu (app.json'da bir sonraki yapı için
    // hazırladığım numara). İki farklı şeyi tek numara gibi göstermek, tam da
    // bu satırın çözmesi gereken karışıklığı büyütüyordu.
    const native = Application.nativeApplicationVersion ?? '?';
    const build = Application.nativeBuildVersion ?? '?';
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
    // "yapı" = TestFlight'taki native sürüm · "güncelleme" = üstüne düşen JS.
    satir = `yapı ${native} (${build}) · güncelleme ${guncelleme} · ${tarih}`;
    // OKUNUR ÖZET: kimlik ve tarih "bu ulaştı mı" sorusunu cevaplıyor ama "NE
    // ulaştı" sorusunu cevaplamıyordu. `01a0587f` kimsenin bir şey anlamadığı
    // bir dize. Yayın anında yazılan commit özeti, kurucunun "şunu yaptım"
    // cümlemle ekrandakini KARŞILAŞTIRABİLMESİNİ sağlıyor.
    ozet = surumBilgi.ozet || '';
  } catch {
    // Teşhis satırı asla ekranı düşürmez.
    satir = 'sürüm okunamadı';
  }

  return (
    <View style={styles.kap}>
      <Text variant="caption" tone="muted" style={styles.metin} selectable>
        {satir}
      </Text>
      {ozet ? (
        <Text variant="caption" tone="muted" style={styles.metin} selectable>
          {ozet}
        </Text>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    kap: { paddingTop: space(2), paddingBottom: space(1), alignItems: 'center' },
    metin: { color: colors.muted, textAlign: 'center' },
  });
