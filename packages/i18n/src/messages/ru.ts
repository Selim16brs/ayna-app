import type { MessageKey } from './tr.js';

// Rusça metinler. Pazar dili. tr.ts kaynak; eksik anahtarlar tr'ye düşer (alt küme olabilir).
export const ru: Partial<Record<MessageKey, string>> = {
  'common.ok': 'Хорошо',
  'common.cancel': 'Отмена',
  'common.continue': 'Продолжить',
  'app.tagline': 'Красота начинается с доверия',
  'slogan.l1a': 'У каждой ',
  'slogan.w1': 'женщины',
  'slogan.l2a': 'должно быть своё ',
  'slogan.w2': 'зеркало',
  'slogan.l2b': '...',
  'welcome.value': 'Опиши нужную услугу — мастера сами предложат тебе цену.',
  'auth.tab.register': 'Регистрация',
  'auth.tab.login': 'Войти',
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
