import type { MessageKey } from './tr.js';

// Kazakça metinler. Pazar dili. tr.ts kaynak; eksik anahtarlar tr'ye düşer (alt küme olabilir).
export const kk: Partial<Record<MessageKey, string>> = {
  'common.ok': 'Жарайды',
  'common.cancel': 'Болдырмау',
  'common.continue': 'Жалғастыру',
  'app.tagline': 'Сұлулық сенімнен басталады',
  'slogan.l1a': 'Әр ',
  'slogan.w1': 'әйелдің',
  'slogan.l2a': 'өз ',
  'slogan.w2': 'айнасы',
  'slogan.l2b': ' болуы керек...',
  'welcome.value': 'Қалаған қызметіңді сипатта — мамандар саған баға ұсынсын.',
  'auth.tab.register': 'Тіркелу',
  'auth.tab.login': 'Кіру',
  'language.choose': 'Тілді таңдаңыз',
  'language.tr': 'Түрікше',
  'language.kk': 'Қазақша',
  'language.ru': 'Орысша',
  'home.greeting': 'Қош келдіңіз',
  'home.subtitle': 'Сенетін шеберіңізді табыңыз',
  'auth.otp.sent': 'Растау коды жіберілді',
  'auth.otp.invalid': 'Код жарамсыз немесе мерзімі өтті',
  'booking.invalid_transition': 'Жазылу күйін өзгерту мүмкін емес',
  'review.not_eligible': 'Бұл жазылуды бағалау мүмкін емес',
  'safety.share.default_off': 'Орналасқан жерді бөлісу әдепкі бойынша өшірулі',
};
