/**
 * Faz 6 (§29) — PUSH ŞABLON SÖZLÜĞÜ: kullanıcı diline göre başlık/gövde.
 * Eksik dilde TÜRKÇE'ye kontrollü fallback. Yeni şablon eklerken üç dili
 * birden doldur; {param} yer tutucuları fill() ile değiştirilir.
 * (Not: en sık kritik push'lar burada; kalan noktalar TR sabit metinle
 * sendToUser kullanmaya devam eder ve kademeli taşınır.)
 */
export type PushTemplateKey =
  | 'quote.new_request'
  | 'booking.receipt_arrived'
  | 'booking.request_expired'
  | 'booking.deposit_expired'
  | 'booking.completed_confirm';

type Tpl = { title: string; body: string };
const T: Record<string, Record<PushTemplateKey, Tpl>> = {
  tr: {
    'quote.new_request': {
      title: 'Yeni talep var ✨',
      body: 'Şehrinde yeni bir {cat} talebi açıldı — teklifini gönder.',
    },
    'booking.receipt_arrived': {
      title: 'Depozito dekontu geldi 🧾',
      body: 'Müşteri dekont yükledi — kontrol edip onayla, randevu kesinleşsin.',
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
  },
  kk: {
    'quote.new_request': {
      title: 'Жаңа сұраныс бар ✨',
      body: 'Қалаңызда жаңа {cat} сұранысы ашылды — ұсынысыңызды жіберіңіз.',
    },
    'booking.receipt_arrived': {
      title: 'Кепілпұл түбіртегі келді 🧾',
      body: 'Клиент түбіртек жүктеді — тексеріп растаңыз, жазылу бекітілсін.',
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
  },
  ru: {
    'quote.new_request': {
      title: 'Новая заявка ✨',
      body: 'В вашем городе открыта новая заявка {cat} — отправьте предложение.',
    },
    'booking.receipt_arrived': {
      title: 'Пришёл чек депозита 🧾',
      body: 'Клиент загрузил чек — проверьте и подтвердите, запись зафиксируется.',
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
