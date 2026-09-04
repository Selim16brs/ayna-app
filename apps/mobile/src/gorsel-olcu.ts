/**
 * GÖNDERİLECEK GÖRSELİN ÖLÇÜLERİ — saf sayılar, React Native bağımlılığı YOK.
 *
 * Küçültmenin kendisi `gorsel-kucult` içinde ve expo-image-manipulator
 * çekiyor; ölçüler burada olduğu için birim testi onları React Native
 * kurmadan okuyabiliyor.
 */
/**
 * KİMLİK BELGESİ genişliği — avatardan büyük.
 *
 * Belgedeki yazı OKUNABİLİR kalmalı: 1000 px'e indirilen bir pasaport
 * sayfasında seri numarası bulanıklaşıyor ve doğrulayan kişi okuyamıyor.
 * 1600 px hem okunur hem sınırın çok altında.
 */
export const BELGE_GENISLIK = 1600;

/** Profil fotoğrafı: daire içinde küçük gösteriliyor. */
export const AVATAR_GENISLIK = 1000;

/** Öncesi/sonrası paylaşımı: tam genişlikte gösteriliyor. */
export const PAYLASIM_GENISLIK = 1200;

/**
 * Gönderilecek base64 yığınının sunucu sınırına sığıp sığmadığı.
 *
 * Sınır 15 MB; JSON zarfı, alan adları ve `data:image/jpeg;base64,` önekleri
 * için pay bırakılıyor. Sığmıyorsa kullanıcıya SÖYLENİYOR — istek gönderilip
 * anlamsız bir sunucu hatası almasındansa.
 */
export const GOVDE_SINIRI_BAYT = 12 * 1024 * 1024;

export function siniriAsiyorMu(parcalar: readonly string[]): boolean {
  return parcalar.reduce((n, p) => n + p.length, 0) > GOVDE_SINIRI_BAYT;
}
