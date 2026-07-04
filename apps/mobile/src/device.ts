// §4.4 — cihaz parmak izi: platformun İZİN VERDİĞİ tanımlayıcı (iOS idForVendor / Android androidId).
// Ham değer sunucuya gider, orada HMAC'lenir (düz saklanmaz). Yüz eşleşme (biyometrik) burada YOKTUR — ileri faz.
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export async function getDeviceFingerprint(): Promise<string | undefined> {
  try {
    if (Platform.OS === 'ios') {
      const id = await Application.getIosIdForVendorAsync();
      if (id) return `ios:${id}`;
    } else if (Platform.OS === 'android') {
      const id = Application.getAndroidId();
      if (id) return `android:${id}`;
    }
    // Yedek: benzersiz değilse cihaz özelliklerinden zayıf parmak izi (yine de bir katman)
    const parts = [Device.osName, Device.modelName, Device.osVersion, Device.totalMemory].filter(
      Boolean,
    );
    return parts.length ? `dev:${parts.join('|')}` : undefined;
  } catch {
    return undefined;
  }
}
