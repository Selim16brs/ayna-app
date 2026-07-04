import type { MessageKey } from '@ayna/i18n';

// Saate göre karşılama — kullanıcı, uzman ve işletme panellerinde ORTAK.
// Cihazın yerel saati (kullanıcı Almatı; demo için yeterli).
export function greetingKey(now: Date = new Date()): MessageKey {
  const h = now.getHours();
  if (h < 5) return 'benim.hello.night'; // gece
  if (h < 12) return 'benim.hello.morning'; // günaydın
  if (h < 18) return 'benim.hello.day'; // iyi günler
  if (h < 22) return 'benim.hello.evening'; // iyi akşamlar
  return 'benim.hello.night'; // iyi geceler
}
