/**
 * SOHBET KORUMASI — uygulama dışına para çıkarma girişimini yakalar.
 *
 * Pazaryerlerinde en büyük iki kayıp sohbette olur: kullanıcı başka bir
 * uygulamaya çıkarılır (aracılık ve koruma biter) ve para uygulama dışında
 * el değiştirir (dolandırıcılık başlar).
 *
 * Tespit CİHAZDA yapılır — mesaj içeriği bu iş için hiçbir yere gönderilmez.
 * Yanlış pozitif kabul edilir: bir uyarı fazla göstermek, bir dolandırıcılığı
 * kaçırmaktan iyidir. Uyarı SUÇLAMAZ, kullanıcıyı bilgilendirir.
 */

// Kart/IBAN benzeri uzun sayı dizileri (boşluk, tire veya nokta ayraçlı olabilir)
const LONG_NUMBER = /(?:\d[\s.-]?){12,}/;

// Uygulama dışına çıkarma ve kişisel havale isteği — tr + ru + kk yazımları
const OFF_PLATFORM = [
  'whatsapp',
  'whats app',
  'watsap',
  'vatsap',
  'telegram',
  'telegramdan',
  'ватсап',
  'вотсап',
  'вацап',
  'телеграм',
  'телега',
  'kaspi',
  'каспи',
  'kaspi gold',
  'karta at',
  'kartima',
  'kartıma',
  'hesabima',
  'hesabıma',
  'iban',
  'на карту',
  'переведи',
  'перевод на',
  'картаға',
  'аудар',
];

/**
 * Türkçe küçültme tuzağı: 'IBAN'.toLocaleLowerCase('tr-TR') → 'ıban' (noktasız ı),
 * 'KARTIMA'.toLowerCase() → 'kartima' (noktalı i). İkisi de anahtarla eşleşmez.
 * Bu yüzden i/ı ayrımını KATLIYORUZ — arama için, gösterim için değil.
 */
function fold(s: string): string {
  return s.toLowerCase().replace(/[ıİ]/g, 'i');
}

const FOLDED_KEYS = OFF_PLATFORM.map(fold);

/** Mesaj metni riskli bir istek içeriyor mu? Yalnız KARŞI TARAFIN mesajlarında kullan. */
export function isRiskyMessage(text: string): boolean {
  if (LONG_NUMBER.test(text)) return true;
  const t = fold(text);
  return FOLDED_KEYS.some((k) => t.includes(k));
}
