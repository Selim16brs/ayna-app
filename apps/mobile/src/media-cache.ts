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
  /** Portrenin türetildiği fotoğrafın anahtarı (bkz. medyaAnahtari). */
  cutoutFor?: string | null;
}

export async function loadMediaCache(userId: string): Promise<MediaCache | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MediaCache;
    return {
      avatar: parsed.avatar ?? null,
      cutout: parsed.cutout ?? null,
      cutoutFor: parsed.cutoutFor ?? null,
    };
  } catch {
    return null;
  }
}

export function saveMediaCache(userId: string, media: MediaCache): void {
  AsyncStorage.setItem(keyFor(userId), JSON.stringify(media)).catch(() => undefined);
}

/**
 * Bir görselin KİMLİK ANAHTARI — kesik portrenin hangi fotoğraftan üretildiğini
 * işaretlemek için.
 *
 * NEDEN: ana ekran `cutoutUri ?? avatarUri` gösteriyor. Portre ile fotoğrafı
 * birbirine bağlayan hiçbir şey YOKTU; fotoğraf değişse bile eski yüz ekranda
 * kalabiliyordu ve bayatlığı ANLAMANIN bir yolu da yoktu. Anahtar eşleşmezse
 * portre kullanılmaz — eski kayıtlarda anahtar hiç yoktur, onlar da (doğru
 * biçimde) bayat sayılır ve gerçek fotoğraf gösterilir.
 *
 * Kriptografik değil: amaç çakışmaya karşı güvenlik değil, "aynı görsel mi"
 * sorusuna ucuz cevap. Tam veri üzerinden gezmek yerine uzunluk + örneklenmiş
 * karakterler kullanılır (data URL'ler megabaytlarca olabiliyor).
 */
export function medyaAnahtari(veri: string | null | undefined): string | null {
  if (!veri) return null;
  const govde = veri.startsWith('data:') ? veri.slice(veri.indexOf(',') + 1) : veri;
  if (govde.length === 0) return null;
  let h = 2166136261;
  const adim = Math.max(1, Math.floor(govde.length / 512));
  for (let i = 0; i < govde.length; i += adim) {
    h ^= govde.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${govde.length}.${(h >>> 0).toString(36)}`;
}
