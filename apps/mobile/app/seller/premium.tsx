import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

/**
 * ESKİ YOL — /membership'e yönlendirir.
 *
 * Ekran her iki role de hizmet verdiği hâlde `/seller/` altında duruyordu:
 * müşteri kendi paketine bakarken "seller" yoluna giriyordu. Yol taşındı.
 *
 * Bu dosya SİLİNMEDİ çünkü yol yalnız kod içinde geçmiyor: gönderilmiş
 * bildirimlerin derin bağlantıları ve kullanıcının cihazındaki eski OTA
 * sürümü hâlâ buraya gelebilir. Yönlendirme olmadan boş ekran açılırdı.
 *
 * `tier` parametresi korunuyor — Platinum yükseltme bağlantıları onu taşıyor.
 */
export default function SellerPremiumRedirect() {
  const router = useRouter();
  const { tier } = useLocalSearchParams<{ tier?: string }>();
  useEffect(() => {
    router.replace(tier ? { pathname: '/membership', params: { tier } } : '/membership');
  }, [router, tier]);
  return <View />;
}
