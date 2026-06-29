import type { MessageKey } from './tr.js';

// Rusça metinler. Pazar dili. tr.ts kaynak; eksik anahtarlar tr'ye düşer (alt küme olabilir).
export const ru: Partial<Record<MessageKey, string>> = {
  'common.ok': 'Хорошо',
  'common.cancel': 'Отмена',
  'common.continue': 'Продолжить',
  'app.tagline': 'Красота начинается с доверия',
  'language.choose': 'Выберите язык',
  'language.tr': 'Турецкий',
  'language.kk': 'Казахский',
  'language.ru': 'Русский',
  'home.greeting': 'Добро пожаловать',
  'home.subtitle': 'Найдите мастера, которому доверяете',
  'auth.otp.sent': 'Код подтверждения отправлен',
  'auth.otp.invalid': 'Код недействителен или истёк',
  'booking.invalid_transition': 'Невозможно изменить статус записи',
  'review.not_eligible': 'Эту запись нельзя оценить',
  'safety.share.default_off': 'Передача геопозиции по умолчанию выключена',
};
