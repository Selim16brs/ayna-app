import { useEffect, useRef } from 'react';
import { BackHandler, ToastAndroid, Platform } from 'react-native';
import { t } from '@ayna/i18n';
import { getCurrentLocale } from './locale';

/** Çift dokunuş penceresi. Kısa olursa kaza sayılır, uzun olursa kilitlenmiş hissi verir. */
const PENCERE_MS = 2000;

/**
 * SEKME KÖKÜNDE GERİ TUŞU — çift dokunuşla çıkış.
 *
 * Denetim #14: _"Alt sekme kökünde geri → Android'de çift-dokunuşla çıkış
 * veya Keşfet'e dön; asla 'hiçbir şey olmaz' değil."_
 *
 * Uygulamada `BackHandler` HİÇ kullanılmıyordu. Sekme kökünde geçmiş boş
 * olduğunda Android geri tuşu uygulamayı UYARISIZ kapatıyordu: kullanıcı
 * yanlışlıkla bir kez basınca uygulamadan atılıyordu.
 *
 * Yalnız ANDROID: iOS'ta donanım geri tuşu yok ve uygulamayı programla
 * kapatmak App Store kuralına aykırı.
 */
export function useBackExit(aktif: boolean): void {
  const sonBasma = useRef(0);
  useEffect(() => {
    if (Platform.OS !== 'android' || !aktif) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const simdi = Date.now();
      if (simdi - sonBasma.current < PENCERE_MS) return false; // ikinci basma → sistem çıksın
      sonBasma.current = simdi;
      ToastAndroid.show(t(getCurrentLocale(), 'common.exit_confirm'), ToastAndroid.SHORT);
      return true; // ilk basmayı YUT: kaza ile çıkış olmasın
    });
    return () => sub.remove();
  }, [aktif]);
}
