import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Profil medyası (avatar + kesik portre) için CİHAZ ÖNBELLEĞİ.
 *
 * Neden ayrı: MB'lık data URL'leri zustand persist'e koymak her state değişiminde
 * tüm store'u diske yazdırıp uygulamayı yavaşlatıyordu (yaşandı). Burada medya
 * YALNIZ değiştiğinde, kullanıcıya özel tek bir anahtara yazılır.
 *
 * Gerçek kaynak HESAP (User.avatarUrl/cutoutUrl). Önbellek iki işe yarar:
 * 1) Açılışta ağ gelmeden foto anında görünür (kaybolma hissi biter).
 * 2) Hesaba yükleme bir ara düşmüşse refreshMembership self-heal ile geri yükler —
 *    arka plan temizliği İKİNCİ KEZ yapılmaz, kredi yanmaz.
 */
const keyFor = (userId: string) => `ayna.media.${userId}`;

export interface MediaCache {
  avatar: string | null;
  cutout: string | null;
}

export async function loadMediaCache(userId: string): Promise<MediaCache | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MediaCache;
    return { avatar: parsed.avatar ?? null, cutout: parsed.cutout ?? null };
  } catch {
    return null;
  }
}

export function saveMediaCache(userId: string, media: MediaCache): void {
  AsyncStorage.setItem(keyFor(userId), JSON.stringify(media)).catch(() => undefined);
}
