/**
 * Faz 6 (§29) — PUSH ŞABLON SÖZLÜĞÜ: kullanıcı diline göre başlık/gövde.
 * Eksik dilde TÜRKÇE'ye kontrollü fallback. Yeni şablon eklerken üç dili
 * birden doldur; {param} yer tutucuları fill() ile değiştirilir.
 * (Not: en sık kritik push'lar burada; kalan noktalar TR sabit metinle
 * sendToUser kullanmaya devam eder ve kademeli taşınır.)
 */
export type PushTemplateKey =
  | 'quote.new_request'
  | 'booking.request_expired'
  | 'booking.deposit_expired'
  | 'booking.completed_confirm'
  | 'propost.new';

type Tpl = { title: string; body: string };
const T: Record<string, Record<PushTemplateKey, Tpl>> = {
  tr: {
    'quote.new_request': {
      title: 'Yeni talep var ✨',
      body: 'Şehrinde yeni bir {cat} talebi açıldı — teklifini gönder.',
    },
    'booking.request_expired': {
      title: 'Talebin yanıtsız kaldı ⌛',
      body: '{pro} yanıt veremedi — dilersen başka bir uzman seç.',
    },
    'booking.deposit_expired': {
      title: 'Randevu süresi doldu',
      body: 'Kapora dekontu yüklenmediği için randevu iptal oldu.',
    },
    'booking.completed_confirm': {
      title: 'Hizmetin tamamlandı mı? ✨',
      body: 'Uzman tamamlandı olarak işaretledi — onayla ya da itiraz et.',
    },
    'propost.new': {
      title: 'Yeni paylaşım ✨',
      body: '{pro} müşterileriyle yeni bir çalışma paylaştı — 7 gün görünür.',
    },
  },
  kk: {
    'quote.new_request': {
      title: 'Жаңа сұраныс бар ✨',
      body: 'Қалаңызда жаңа {cat} сұранысы ашылды — ұсынысыңызды жіберіңіз.',
    },
    'booking.request_expired': {
      title: 'Сұранысыңыз жауапсыз қалды ⌛',
      body: '{pro} жауап бере алмады — қаласаңыз басқа маман таңдаңыз.',
    },
    'booking.deposit_expired': {
      title: 'Жазылу мерзімі өтті',
      body: 'Кепілпұл түбіртегі жүктелмегендіктен жазылу тоқтатылды.',
    },
    'booking.completed_confirm': {
      title: 'Қызмет аяқталды ма? ✨',
      body: 'Маман аяқталды деп белгіледі — растаңыз немесе шағым жасаңыз.',
    },
    'propost.new': {
      title: 'Жаңа жарияланым ✨',
      body: '{pro} жаңа жұмысын бөлісті — 7 күн көрінеді.',
    },
  },
  ru: {
    'quote.new_request': {
      title: 'Новая заявка ✨',
      body: 'В вашем городе открыта новая заявка {cat} — отправьте предложение.',
    },
    'booking.request_expired': {
      title: 'Заявка осталась без ответа ⌛',
      body: '{pro} не ответил(а) — при желании выберите другого мастера.',
    },
    'booking.deposit_expired': {
      title: 'Срок записи истёк',
      body: 'Чек депозита не был загружен — запись отменена.',
    },
    'booking.completed_confirm': {
      title: 'Услуга выполнена? ✨',
      body: 'Мастер отметил услугу выполненной — подтвердите или откройте спор.',
    },
    'propost.new': {
      title: 'Новая публикация ✨',
      body: '{pro} поделился новой работой — видно 7 дней.',
    },
  },
};

function fill(s: string, params?: Record<string, string>): string {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (_, k: string) => params[k] ?? '');
}

export function renderPush(
  locale: string | null | undefined,
  key: PushTemplateKey,
  params?: Record<string, string>,
): Tpl {
  const lang = locale === 'kk' || locale === 'ru' ? locale : 'tr'; // kontrollü fallback
  const tpl = T[lang]?.[key] ?? T.tr![key];
  return { title: fill(tpl.title, params), body: fill(tpl.body, params) };
}
