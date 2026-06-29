import type { MessageKey } from './tr.js';

// Kazakça metinler. Pazar dili. tr.ts kaynak alınarak doldurulacak (şimdilik temel set).
export const kk: Record<MessageKey, string> = {
  'common.ok': 'Жарайды',
  'common.cancel': 'Болдырмау',
  'common.continue': 'Жалғастыру',
  'app.tagline': 'Сұлулық сенімнен басталады',
  'language.choose': 'Тілді таңдаңыз',
  'language.tr': 'Түрікше',
  'language.kk': 'Қазақша',
  'language.ru': 'Орысша',
  'home.greeting': 'Қош келдіңіз',
  'home.subtitle': 'Сенетін шеберіңізді табыңыз',
  'home.section.today': 'AYNA Бүгін',
  'home.upcoming.title': 'Жақын жазылу',
  'home.upcoming.subtitle': 'Жұма 14:00 · Шаш бояу',
  'home.upcoming.badge': 'Расталды',
  'home.care.title': 'Күтім уақыты',
  'home.care.subtitle': 'Маникюр жаңарту уақыты жақындады',
  'home.friend.title': 'Дос ұсынысы',
  'home.friend.subtitle': '3 досыңыз осы шеберге барды',
  'home.next_note': 'Бұл — алғашқы экран. Келесі: телефонмен кіру (OTP).',
  'auth.otp.sent': 'Растау коды жіберілді',
  'auth.otp.invalid': 'Код жарамсыз немесе мерзімі өтті',
  'booking.invalid_transition': 'Жазылу күйін өзгерту мүмкін емес',
  'review.not_eligible': 'Бұл жазылуды бағалау мүмкін емес',
  'safety.share.default_off': 'Орналасқан жерді бөлісу әдепкі бойынша өшірулі',
};
