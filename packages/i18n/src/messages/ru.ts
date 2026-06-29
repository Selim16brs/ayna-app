import type { kk } from './kk.js';

// Rusça metinler. Anahtar kümesi kk.ts ile birebir aynı olmalı (tip ile zorlanır).
export const ru: Record<keyof typeof kk, string> = {
  'common.ok': 'Хорошо',
  'common.cancel': 'Отмена',
  'common.continue': 'Продолжить',
  'app.tagline': 'Красота начинается с доверия',
  'language.choose': 'Выберите язык',
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
