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
  | 'propost.new'
  | 'ad.live'
  | 'ad.payment_failed'
  | 'booking.cancelled_receipt'
  | 'refund.sent'
  | 'always.request'
  | 'booking.pending_reminder'
  | 'booking.completed_rate'
  | 'booking.dropped_no_answer'
  | 'booking.dropped_no_deposit'
  | 'booking.remind_30m'
  | 'booking.remind_1h'
  | 'booking.free_cancel_last'
  | 'booking.deposit_last_minutes'
  | 'booking.new_request'
  | 'booking.no_show_marked'
  | 'booking.payment_declared'
  | 'loyalty.points_earned'
  | 'booking.reschedule_offer'
  | 'booking.expert_proposed'
  | 'booking.customer_proposed'
  | 'booking.cancelled'
  | 'booking.cancelled_reason'
  | 'dispute.approved'
  | 'dispute.rejected'
  | 'message.new'
  | 'quote.new_offer'
  | 'quote.selected'
  | 'quote.closed'
  | 'reengage.pre'
  | 'reengage.due'
  | 'staff.joined'
  | 'calendar.permission_changed'
  | 'birthday'
  | 'membership.upgraded'
  | 'membership.receipt_rejected'
  | 'support.replied'
  | 'always.accepted'
  | 'booking.confirmed';

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
    'ad.live': {
      title: 'Reklamın yayında',
      body: '{yer} bölümünde {ay} ay boyunca görüneceksin.',
    },
    'ad.payment_failed': {
      title: 'Reklam ödemen doğrulanamadı',
      body: 'Dekontu kontrol edip yeniden gönderebilirsin.',
    },
    'booking.cancelled_receipt': {
      title: 'Randevun iptal edildi',
      body: 'Yüklenen dekont doğrulanamadı.',
    },
    'refund.sent': {
      title: 'İaden yapıldı',
      body: '{tutar} ₸ hesabına gönderildi.',
    },
    'always.request': {
      title: 'Always isteği',
      body: '{musteri} sana Always bağı kurmak istiyor.',
    },
    'booking.pending_reminder': {
      title: 'Bekleyen randevu talebin var',
      body: 'Yanıtlamazsan talep düşer ve slot açılır.',
    },
    'booking.completed_rate': {
      title: 'Hizmetin tamamlandı ✨',
      body: 'Deneyimini değerlendir — 30 saniye sürer',
    },
    'booking.dropped_no_answer': {
      title: 'Randevu talebin düştü',
      body: 'Uzman zamanında yanıt vermedi — başka bir saat seçebilirsin',
    },
    'booking.dropped_no_deposit': {
      title: 'Randevu talebin düştü',
      body: 'Depozito ödenmediği için randevu düştü — dilersen yeniden dene',
    },
    'booking.remind_30m': {
      title: 'Randevuna 30 dakika kaldı',
      body: 'Yola çıkma vakti',
    },
    'booking.remind_1h': {
      title: 'Randevuna 1 saat kaldı',
      body: 'Hazırlanmaya başlayabilirsin',
    },
    'booking.free_cancel_last': {
      title: 'Depozitonu kaybetmeden iptal için son şans',
      body: 'Bu saatten sonra iptal edersen depozito iade edilmez',
    },
    'booking.deposit_last_minutes': {
      title: 'Depozito için son dakikalar',
      body: 'Randevun düşmeden önce dekontu yükle',
    },
    'booking.new_request': {
      title: 'Yeni randevu talebi 📅',
      body: '{hizmet} · {tarih} — yanıt süresi sınırlı, hemen bak.',
    },
    'booking.no_show_marked': {
      title: 'Uzman "gelmedin" olarak işaretledi',
      body: 'Katılmadığını düşünüyorsan 24 saat içinde itiraz edebilirsin',
    },
    'booking.payment_declared': {
      title: 'Müşteri ödemeyi yaptığını bildirdi',
      body: 'Parayı aldıysan onayla — komisyon süren o an başlar.',
    },
    'loyalty.points_earned': {
      title: '{n} puan kazandın 💛',
      body: 'Deneyimini değerlendir — 30 saniye sürer',
    },
    'booking.reschedule_offer': {
      title: 'Erteleme önerisi',
      body: 'Yeni saat: {slot} — Kabul / Red',
    },
    'booking.expert_proposed': {
      title: 'Uzman farklı bir saat önerdi',
      body: 'Kabul et ya da kendi saatini öner',
    },
    'booking.customer_proposed': {
      title: 'Müşteri farklı bir saat önerdi',
      body: 'Kabul et ya da reddet',
    },
    'booking.cancelled': {
      title: 'Randevu iptal edildi',
      body: 'Detay için randevuya dokun',
    },
    'booking.cancelled_reason': {
      title: 'Randevu iptal edildi',
      body: 'Sebep: {sebep}',
    },
    'dispute.approved': {
      title: 'İtirazın kabul edildi',
      body: 'Detay için uygulamadaki kaydına bak',
    },
    'dispute.rejected': {
      title: 'İtirazın reddedildi',
      body: 'Detay için uygulamadaki kaydına bak',
    },
    'message.new': {
      title: 'Yeni mesaj',
      body: 'Sohbeti aç',
    },
    'quote.new_offer': {
      title: 'Yeni teklifin var 💌',
      body: 'Talebine bir uzman teklif gönderdi. Teklifleri incele.',
    },
    'quote.selected': {
      title: 'Teklifin seçildi 🎉',
      body: '{slot} için randevu oluştu. Takvimini kontrol et.',
    },
    'quote.closed': {
      title: 'Talep kapandı',
      body: 'Bu talepte başka bir teklif seçildi — ilgin için teşekkürler 💛',
    },
    'reengage.pre': {
      title: 'Bakım zamanın yaklaşıyor',
      body: '{pro} ile son randevunun üzerinden neredeyse {gun} gün geçti.',
    },
    'reengage.due': {
      title: 'Bakım zamanın geldi',
      body: '{pro} ile son randevunun üzerinden {gun} gün geçti.',
    },
    'staff.joined': {
      title: 'Yeni kadro üyesi',
      body: 'Bir uzman salonuna katıldı',
    },
    'calendar.permission_changed': {
      title: 'Takvim yetkisi güncellendi',
      body: 'Salonunun takvimindeki yetkin değişti.',
    },
    birthday: {
      title: 'İyi ki doğdun! 🎂',
      body: '{pro} doğum gününü kutluyor — nice mutlu, güzel yıllara! ✨',
    },
    'membership.upgraded': {
      title: 'Üyeliğin yükseltildi 🎉',
      body: '{katman} üyeliğin aktif — tüm ayrıcalıkların açıldı.',
    },
    'membership.receipt_rejected': {
      title: 'Üyelik dekontu onaylanmadı',
      body: 'Dekont doğrulanamadı — kontrol edip yeniden yükleyebilirsin.',
    },
    'support.replied': {
      title: 'Destek yanıtladı',
      body: 'Talebine yanıt geldi.',
    },
    'always.accepted': {
      title: 'Always bağın kuruldu',
      body: 'İsteğin kabul edildi 💫',
    },
    'booking.confirmed': {
      title: 'Randevu kesinleşti ✓',
      body: 'Depozito alındı — randevun garanti altında.',
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
      body: 'Депозит түбіртегі жүктелмегендіктен жазылу тоқтатылды.',
    },
    'booking.completed_confirm': {
      title: 'Қызмет аяқталды ма? ✨',
      body: 'Маман аяқталды деп белгіледі — растаңыз немесе шағым жасаңыз.',
    },
    'propost.new': {
      title: 'Жаңа жарияланым ✨',
      body: '{pro} жаңа жұмысын бөлісті — 7 күн көрінеді.',
    },
    'ad.live': {
      title: 'Жарнамаң эфирде',
      body: '{yer} бөлімінде {ay} ай көрінесің.',
    },
    'ad.payment_failed': {
      title: 'Жарнама төлемің расталмады',
      body: 'Түбіртекті тексеріп қайта жібере аласың.',
    },
    'booking.cancelled_receipt': {
      title: 'Жазылуың тоқтатылды',
      body: 'Жүктелген түбіртек расталмады.',
    },
    'refund.sent': {
      title: 'Қаражатың қайтарылды',
      body: '{tutar} ₸ шотыңа жіберілді.',
    },
    'always.request': {
      title: 'Always сұранысы',
      body: '{musteri} сенімен Always байланысын құрғысы келеді.',
    },
    'booking.pending_reminder': {
      title: 'Жауап күтіп тұрған сұраныс бар',
      body: 'Жауап бермесең сұраныс жойылады, уақыт босайды.',
    },
    'booking.completed_rate': {
      title: 'Қызмет аяқталды ✨',
      body: 'Тәжірибеңді бағала — 30 секунд алады',
    },
    'booking.dropped_no_answer': {
      title: 'Сұранысың жойылды',
      body: 'Маман уақытында жауап бермеді — басқа уақыт таңдай аласың',
    },
    'booking.dropped_no_deposit': {
      title: 'Сұранысың жойылды',
      body: 'Депозит төленбегендіктен жазылу тоқтады — қаласаң қайта көр',
    },
    'booking.remind_30m': {
      title: 'Жазылуыңа 30 минут қалды',
      body: 'Жолға шығатын уақыт',
    },
    'booking.remind_1h': {
      title: 'Жазылуыңа 1 сағат қалды',
      body: 'Дайындала бастауыңа болады',
    },
    'booking.free_cancel_last': {
      title: 'Депозитды жоғалтпай тоқтатудың соңғы мүмкіндігі',
      body: 'Бұдан кейін тоқтатсаң депозит қайтарылмайды',
    },
    'booking.deposit_last_minutes': {
      title: 'Депозит үшін соңғы минуттар',
      body: 'Жазылуың жойылмай тұрып түбіртекті жүкте',
    },
    'booking.new_request': {
      title: 'Жаңа жазылу сұранысы 📅',
      body: '{hizmet} · {tarih} — жауап уақыты шектеулі, қазір қара.',
    },
    'booking.no_show_marked': {
      title: 'Маман «келмедің» деп белгіледі',
      body: 'Келіспесең 24 сағат ішінде шағым жаза аласың',
    },
    'booking.payment_declared': {
      title: 'Клиент төледім деп білдірді',
      body: 'Ақшаны алсаң растa — комиссия мерзімі сол сәтте басталады.',
    },
    'loyalty.points_earned': {
      title: '{n} ұпай жинадың 💛',
      body: 'Тәжірибеңді бағала — 30 секунд алады',
    },
    'booking.reschedule_offer': {
      title: 'Кейінге қалдыру ұсынысы',
      body: 'Жаңа уақыт: {slot} — Қабылдау / Бас тарту',
    },
    'booking.expert_proposed': {
      title: 'Маман басқа уақыт ұсынды',
      body: 'Қабылда немесе өз уақытыңды ұсын',
    },
    'booking.customer_proposed': {
      title: 'Клиент басқа уақыт ұсынды',
      body: 'Қабылда немесе бас тарт',
    },
    'booking.cancelled': {
      title: 'Жазылу тоқтатылды',
      body: 'Толығырақ үшін жазылуға түрт',
    },
    'booking.cancelled_reason': {
      title: 'Жазылу тоқтатылды',
      body: 'Себебі: {sebep}',
    },
    'dispute.approved': {
      title: 'Шағымың қабылданды',
      body: 'Толығырақ қолданбадағы жазбаңнан қара',
    },
    'dispute.rejected': {
      title: 'Шағымың қабылданбады',
      body: 'Толығырақ қолданбадағы жазбаңнан қара',
    },
    'message.new': {
      title: 'Жаңа хабарлама',
      body: 'Чатты аш',
    },
    'quote.new_offer': {
      title: 'Жаңа ұсынысың бар 💌',
      body: 'Сұранысыңа маман ұсыныс жіберді. Ұсыныстарды қара.',
    },
    'quote.selected': {
      title: 'Ұсынысың таңдалды 🎉',
      body: '{slot} үшін жазылу құрылды. Күнтізбеңді тексер.',
    },
    'quote.closed': {
      title: 'Сұраныс жабылды',
      body: 'Бұл сұранысқа басқа ұсыныс таңдалды — қызығушылығың үшін рақмет 💛',
    },
    'reengage.pre': {
      title: 'Күтім уақытың жақындады',
      body: '{pro} маманындағы соңғы жазылуыңнан бері шамамен {gun} күн өтті.',
    },
    'reengage.due': {
      title: 'Күтім уақытың келді',
      body: '{pro} маманындағы соңғы жазылуыңнан бері {gun} күн өтті.',
    },
    'staff.joined': {
      title: 'Жаңа құрам мүшесі',
      body: 'Салоныңа маман қосылды',
    },
    'calendar.permission_changed': {
      title: 'Күнтізбе рұқсаты жаңарды',
      body: 'Салон күнтізбесіндегі рұқсатың өзгерді.',
    },
    birthday: {
      title: 'Туған күнің құтты болсын! 🎂',
      body: '{pro} туған күніңмен құттықтайды — көп жаса! ✨',
    },
    'membership.upgraded': {
      title: 'Мүшелігің жоғарылады 🎉',
      body: '{katman} мүшелігің белсенді — барлық артықшылық ашылды.',
    },
    'membership.receipt_rejected': {
      title: 'Мүшелік түбіртегі расталмады',
      body: 'Түбіртек расталмады — тексеріп қайта жүктей аласың.',
    },
    'support.replied': {
      title: 'Қолдау жауап берді',
      body: 'Сұранысыңа жауап келді.',
    },
    'always.accepted': {
      title: 'Always байланысың құрылды',
      body: 'Сұранысың қабылданды 💫',
    },
    'booking.confirmed': {
      title: 'Жазылу расталды ✓',
      body: 'Депозит алынды — жазылуың кепілдікте.',
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
    'ad.live': {
      title: 'Ваша реклама в эфире',
      body: 'Будет показываться в разделе «{yer}» {ay} мес.',
    },
    'ad.payment_failed': {
      title: 'Оплата рекламы не подтверждена',
      body: 'Проверьте квитанцию и отправьте снова.',
    },
    'booking.cancelled_receipt': {
      title: 'Запись отменена',
      body: 'Загруженная квитанция не подтверждена.',
    },
    'refund.sent': {
      title: 'Возврат выполнен',
      body: '{tutar} ₸ отправлены на ваш счёт.',
    },
    'always.request': {
      title: 'Запрос Always',
      body: '{musteri} хочет установить связь Always.',
    },
    'booking.pending_reminder': {
      title: 'Есть запрос без ответа',
      body: 'Без ответа запрос отменится и время освободится.',
    },
    'booking.completed_rate': {
      title: 'Услуга завершена ✨',
      body: 'Оцените визит — займёт 30 секунд',
    },
    'booking.dropped_no_answer': {
      title: 'Запрос отменён',
      body: 'Мастер не ответил вовремя — выберите другое время',
    },
    'booking.dropped_no_deposit': {
      title: 'Запрос отменён',
      body: 'Запись отменена из-за неоплаченного депозита — можно попробовать снова',
    },
    'booking.remind_30m': {
      title: 'До записи 30 минут',
      body: 'Пора выезжать',
    },
    'booking.remind_1h': {
      title: 'До записи 1 час',
      body: 'Можно собираться',
    },
    'booking.free_cancel_last': {
      title: 'Последний шанс отменить без потери депозита',
      body: 'После этого времени депозит не возвращается',
    },
    'booking.deposit_last_minutes': {
      title: 'Последние минуты для депозита',
      body: 'Загрузите квитанцию, пока запись не отменилась',
    },
    'booking.new_request': {
      title: 'Новый запрос на запись 📅',
      body: '{hizmet} · {tarih} — время на ответ ограничено.',
    },
    'booking.no_show_marked': {
      title: 'Мастер отметил «не пришли»',
      body: 'Если не согласны, можно оспорить в течение 24 часов',
    },
    'booking.payment_declared': {
      title: 'Клиент сообщил об оплате',
      body: 'Подтвердите получение — тогда начнётся срок комиссии.',
    },
    'loyalty.points_earned': {
      title: 'Вы получили {n} баллов 💛',
      body: 'Оцените визит — займёт 30 секунд',
    },
    'booking.reschedule_offer': {
      title: 'Предложение переноса',
      body: 'Новое время: {slot} — принять или отклонить',
    },
    'booking.expert_proposed': {
      title: 'Мастер предложил другое время',
      body: 'Примите или предложите своё',
    },
    'booking.customer_proposed': {
      title: 'Клиент предложил другое время',
      body: 'Примите или отклоните',
    },
    'booking.cancelled': {
      title: 'Запись отменена',
      body: 'Нажмите на запись, чтобы посмотреть детали',
    },
    'booking.cancelled_reason': {
      title: 'Запись отменена',
      body: 'Причина: {sebep}',
    },
    'dispute.approved': {
      title: 'Ваш спор удовлетворён',
      body: 'Подробности — в записи в приложении',
    },
    'dispute.rejected': {
      title: 'Ваш спор отклонён',
      body: 'Подробности — в записи в приложении',
    },
    'message.new': {
      title: 'Новое сообщение',
      body: 'Откройте чат',
    },
    'quote.new_offer': {
      title: 'Новое предложение 💌',
      body: 'Мастер прислал предложение по вашему запросу.',
    },
    'quote.selected': {
      title: 'Ваше предложение выбрано 🎉',
      body: 'Запись на {slot} создана. Проверьте календарь.',
    },
    'quote.closed': {
      title: 'Запрос закрыт',
      body: 'Выбрано другое предложение — спасибо за участие 💛',
    },
    'reengage.pre': {
      title: 'Скоро время ухода',
      body: 'С последнего визита к {pro} прошло почти {gun} дн.',
    },
    'reengage.due': {
      title: 'Пора на уход',
      body: 'С последнего визита к {pro} прошло {gun} дн.',
    },
    'staff.joined': {
      title: 'Новый сотрудник',
      body: 'Мастер присоединился к вашему салону',
    },
    'calendar.permission_changed': {
      title: 'Права в календаре изменены',
      body: 'Ваши права в календаре салона обновлены.',
    },
    birthday: {
      title: 'С днём рождения! 🎂',
      body: '{pro} поздравляет вас — счастья и красоты! ✨',
    },
    'membership.upgraded': {
      title: 'Подписка повышена 🎉',
      body: 'Подписка {katman} активна — все привилегии открыты.',
    },
    'membership.receipt_rejected': {
      title: 'Квитанция не подтверждена',
      body: 'Проверьте квитанцию и загрузите снова.',
    },
    'support.replied': {
      title: 'Поддержка ответила',
      body: 'На ваш запрос пришёл ответ.',
    },
    'always.accepted': {
      title: 'Связь Always создана',
      body: 'Ваш запрос принят 💫',
    },
    'booking.confirmed': {
      title: 'Запись подтверждена ✓',
      body: 'Депозит получен — запись закреплена.',
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
