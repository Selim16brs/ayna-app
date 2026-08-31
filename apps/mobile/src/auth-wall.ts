import { router } from 'expo-router';
import { Alert } from 'react-native';
import { getCurrentLocale } from './locale';
import { t } from '@ayna/i18n';
import { useStore } from './store';

/**
 * GİRİŞ KAPISI — yalnız gerçekten gerekli aksiyonda.
 *
 * Uygulama açılır açılmaz kayıt duvarı çıkıyordu: karşılama ekranında yalnız
 * "Giriş yap" ve "Kayıt ol" vardı, Keşfet'e giden hiçbir yol yoktu. Oysa
 * katalog uçları zaten korumasız — misafir gezinti teknik olarak mümkündü,
 * sadece kapı açılmamıştı.
 *
 * Artık gezinti serbest; giriş YALNIZ para/kimlik/iletişim gerektiren
 * aksiyonda isteniyor: randevu, teklif, mesaj, favori, talep, profil.
 *
 * `next` KRİTİK: kullanıcı bir uzmanı beğenip "Randevu al" dediğinde giriş
 * sonrası Keşfet'e atılırsa niyetini kaybeder — aradığı uzmanı baştan
 * bulması gerekir. Kaldığı yol taşınıyor ve giriş oraya geri döndürüyor.
 */
export function girisGerekli(nereye: string): boolean {
  if (useStore.getState().token) return false;
  const dil = getCurrentLocale();
  Alert.alert(t(dil, 'auth.wall_t'), t(dil, 'auth.wall_b'), [
    { text: t(dil, 'common.cancel'), style: 'cancel' },
    {
      text: t(dil, 'auth.wall_register'),
      onPress: () => router.push({ pathname: '/auth', params: { next: nereye } } as never),
    },
    {
      text: t(dil, 'auth.wall_login'),
      onPress: () => router.push({ pathname: '/auth/login', params: { next: nereye } } as never),
    },
  ]);
  return true;
}
