import type { MessageKey } from './tr.js';

// Rusça metinler. Pazar dili. tr.ts kaynak alınarak doldurulacak (şimdilik temel set).
export const ru: Record<MessageKey, string> = {
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
  'home.section.today': 'AYNA Сегодня',
  'home.upcoming.title': 'Ближайшая запись',
  'home.upcoming.subtitle': 'Пятница 14:00 · Окрашивание',
  'home.upcoming.badge': 'Подтверждено',
  'home.care.title': 'Время ухода',
  'home.care.subtitle': 'Скоро обновление маникюра',
  'home.friend.title': 'Совет подруги',
  'home.friend.subtitle': '3 ваши подруги ходили к этому мастеру',
  'home.next_note': 'Это первый экран. Далее: вход по телефону (OTP).',
  'auth.otp.sent': 'Код подтверждения отправлен',
  'auth.otp.invalid': 'Код недействителен или истёк',
  'booking.invalid_transition': 'Невозможно изменить статус записи',
  'review.not_eligible': 'Эту запись нельзя оценить',
  'safety.share.default_off': 'Передача геопозиции по умолчанию выключена',
};
