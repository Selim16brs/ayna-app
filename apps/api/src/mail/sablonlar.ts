import {
  adimlar,
  baglanti,
  baslik,
  dugme,
  duzen,
  kunye,
  kutu,
  madde,
  paragraf,
  rakamBant,
  ustEtiket,
} from './duzen';

/**
 * AYNA E-POSTA ŞABLONLARI.
 *
 * AIVIO'nun şablonlarından UYARLANDI, birebir çevrilmedi: iki ürünün yaşam
 * döngüsü farklı. AIVIO'da "dersini kaçırma / seriyi bozma" vardı; AYNA'da
 * karşılığı yok — burada randevu, depozito ve değerlendirme var.
 *
 * ÇEŞİTLİLİK BİLİNÇLİ. On iki şablonun hepsi aynı iskelette olsaydı gelen
 * kutusunda tek bir postaya benzerdi. Her biri işine göre farklı bir yapı
 * kullanıyor:
 *   · rakam bandı  → para söz konusuysa (iade, depozito)
 *   · künye        → yapılandırılmış bilgi (randevu detayı)
 *   · adımlar      → sıra bilgi taşıyorsa (ödeme akışı)
 *   · maddeler     → eşdeğer seçenekler
 *   · sade metin   → kısa ve tek işli postalar
 *
 * ÜÇ DİL zorunlu (tr kaynak, kk + ru). Konu satırı da gövde de dile göre
 * yazıldı; makine çevirisi değil.
 *
 * TON: AYNA kadın odaklı bir güven platformu. Acele ettirmiyor, suçlamıyor,
 * "son şansın" demiyor. Bir şey bekliyorsa neyi ve neden beklediğini söylüyor.
 */

export type Dil = 'tr' | 'kk' | 'ru';

export interface SablonGirdi {
  ad: string;
  site: string;
  cikisUrl?: string | undefined;
  veri?: Record<string, string> | undefined;
}

export interface Sablon {
  konu: string;
  html: string;
  metin: string;
}

/** İsim boş gelebilir (AYNA'da ad zorunlu değil); o zaman selamlama isimsiz. */
const selam = (ad: string, dil: Dil): string => {
  const bos = { tr: 'Merhaba', kk: 'Сәлем', ru: 'Здравствуйте' }[dil];
  return ad.trim() ? `${bos}, ${ad.trim()}` : bos;
};

/** HTML'i düz metne indirger — yedek gövde için. */
const duz = (s: string): string =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

type Uretici = (g: SablonGirdi, dil: Dil) => Sablon;

/* ═══════════════  1 · KARŞILAMA  ═══════════════ */

const hosgeldin: Uretici = ({ ad, site, cikisUrl }, dil) => {
  const M = {
    tr: {
      konu: "AYNA'ya hoş geldin",
      on: 'Randevunu güvenceye alan üç şey',
      et: 'Başlangıç',
      h: 'Güvenle randevu al',
      p: 'AYNA, Kazakistan’da güzellik ve kişisel bakım için randevu aldığın yer. Aradaki güveni biz kuruyoruz.',
      m: [
        '<strong>Depozito bizde durur</strong> — uzman gelmezse iaden hazır.',
        '<strong>Konumun izinsiz paylaşılmaz</strong>; uzman numaranı görmez.',
        '<strong>Yorumlar anonim yazılabilir</strong>, salon kimin yazdığını göremez.',
      ],
      d: 'Uzmanları keşfet',
      son: 'İlk randevun birkaç dokunuş uzağında.',
    },
    kk: {
      konu: 'AYNA-ға қош келдің',
      on: 'Жазылуыңды қорғайтын үш нәрсе',
      et: 'Бастау',
      h: 'Сеніммен жазыл',
      p: 'AYNA — Қазақстанда сұлулық пен жеке күтімге жазылатын орның. Арадағы сенімді біз құрамыз.',
      m: [
        '<strong>Депозит бізде тұрады</strong> — маман келмесе қайтарымың дайын.',
        '<strong>Орналасуың рұқсатсыз бөлісілмейді</strong>; маман нөміріңді көрмейді.',
        '<strong>Пікірлерді анонимді жазуға болады</strong>, салон кім жазғанын көрмейді.',
      ],
      d: 'Мамандарды ашу',
      son: 'Алғашқы жазылуың бірнеше түртуде.',
    },
    ru: {
      konu: 'Добро пожаловать в AYNA',
      on: 'Три вещи, которые защищают вашу запись',
      et: 'Начало',
      h: 'Записывайтесь спокойно',
      p: 'AYNA — место, где в Казахстане записываются на красоту и уход за собой. Доверие между сторонами обеспечиваем мы.',
      m: [
        '<strong>Депозит хранится у нас</strong> — если мастер не пришёл, возврат готов.',
        '<strong>Геолокация не передаётся без разрешения</strong>; мастер не видит ваш номер.',
        '<strong>Отзывы можно писать анонимно</strong>, салон не увидит автора.',
      ],
      d: 'Найти мастера',
      son: 'Первая запись — в несколько касаний.',
    },
  }[dil];
  return {
    konu: M.konu,
    html: duzen({
      dil,
      onizleme: M.on,
      cikisUrl,
      govde: `${ustEtiket(M.et)}${baslik(M.h)}${paragraf(`${selam(ad, dil)}. ${M.p}`)}${madde(M.m)}${dugme(site, M.d)}${paragraf(M.son)}`,
    }),
    metin: `${selam(ad, dil)}. ${M.p}\n\n${M.m.map((x) => `- ${duz(x)}`).join('\n')}\n\n${M.d}: ${site}`,
  };
};

/* ═══════════════  2 · İLK RANDEVU DAVETİ  ═══════════════ */

const ilkRandevu: Uretici = ({ ad, site, cikisUrl }, dil) => {
  const M = {
    tr: {
      konu: 'Aradığın uzmanı bulalım',
      on: 'İki yol var, ikisi de kolay',
      et: 'İpucu',
      h: 'Ne yaptırmak istiyorsun?',
      p: 'Uzman aramak zorunda değilsin. İki yol var:',
      a: [
        '<strong>Dileğini anlat</strong> — fotoğrafını ve bütçeni paylaş, uzmanlar sana teklif göndersin.',
        '<strong>Doğrudan seç</strong> — takvimden boş bir saat al; dolu saatler zaten görünmüyor.',
      ],
      d: 'Dileğini anlat',
      b: 'Ya da haritadan yakınındakilere bak',
    },
    kk: {
      konu: 'Іздеген маманыңды табайық',
      on: 'Екі жол бар, екеуі де оңай',
      et: 'Кеңес',
      h: 'Не жасатқың келеді?',
      p: 'Маман іздеудің қажеті жоқ. Екі жол бар:',
      a: [
        '<strong>Тілегіңді айт</strong> — фотоңды және бюджетіңді бөліс, мамандар ұсыныс жіберсін.',
        '<strong>Тікелей таңда</strong> — күнтізбеден бос уақыт ал; бос емес сағаттар көрінбейді.',
      ],
      d: 'Тілегіңді айт',
      b: 'Немесе картадан жақын жердегілерді қара',
    },
    ru: {
      konu: 'Найдём вашего мастера',
      on: 'Два пути, оба простые',
      et: 'Подсказка',
      h: 'Что хотите сделать?',
      p: 'Искать мастера необязательно. Есть два пути:',
      a: [
        '<strong>Расскажите о желании</strong> — поделитесь фото и бюджетом, мастера пришлют предложения.',
        '<strong>Выберите сами</strong> — свободное время в календаре; занятые часы там не показываются.',
      ],
      d: 'Рассказать о желании',
      b: 'Или посмотрите на карте, кто рядом',
    },
  }[dil];
  return {
    konu: M.konu,
    html: duzen({
      dil,
      onizleme: M.on,
      cikisUrl,
      govde: `${ustEtiket(M.et)}${baslik(M.h)}${paragraf(`${selam(ad, dil)}. ${M.p}`)}${adimlar(M.a)}${dugme(`${site}/quote`, M.d)}${baglanti(`${site}/map`, M.b)}`,
    }),
    metin: `${selam(ad, dil)}. ${M.p}\n\n${M.a.map((x, i) => `${i + 1}. ${duz(x)}`).join('\n')}\n\n${M.d}: ${site}/quote`,
  };
};

/* ═══════════════  3 · RANDEVU ONAYLANDI  ═══════════════ */

const randevuOnaylandi: Uretici = ({ ad, site, veri }, dil) => {
  const u = veri?.uzman ?? '',
    z = veri?.zaman ?? '',
    h = veri?.hizmet ?? '',
    t = veri?.tutar ?? '';
  const M = {
    tr: {
      konu: 'Randevun kesinleşti',
      on: `${u} · ${z}`,
      et: 'Onaylandı',
      h: 'Randevun kesinleşti',
      k: ['Uzman', 'Hizmet', 'Zaman', 'Toplam'],
      p: 'Kalan tutarı hizmetten sonra doğrudan uzmana ödeyeceksin.',
      d: 'Randevuyu gör',
      b: 'Planın değişirse 3 saat öncesine kadar ücretsiz iptal',
    },
    kk: {
      konu: 'Жазылуың бекітілді',
      on: `${u} · ${z}`,
      et: 'Бекітілді',
      h: 'Жазылуың бекітілді',
      k: ['Маман', 'Қызмет', 'Уақыт', 'Барлығы'],
      p: 'Қалған соманы қызметтен кейін тікелей маманға төлейсің.',
      d: 'Жазылуды көру',
      b: 'Жоспарың өзгерсе 3 сағат бұрын тегін бас тарту',
    },
    ru: {
      konu: 'Запись подтверждена',
      on: `${u} · ${z}`,
      et: 'Подтверждено',
      h: 'Запись подтверждена',
      k: ['Мастер', 'Услуга', 'Время', 'Итого'],
      p: 'Остаток оплатите мастеру напрямую после услуги.',
      d: 'Открыть запись',
      b: 'Если планы изменятся — бесплатная отмена за 3 часа',
    },
  }[dil];
  return {
    konu: M.konu,
    html: duzen({
      dil,
      onizleme: M.on,
      govde: `${ustEtiket(M.et, '#2F7A4A')}${baslik(M.h)}${paragraf(selam(ad, dil))}${kunye([
        [M.k[0]!, u],
        [M.k[1]!, h],
        [M.k[2]!, z],
        [M.k[3]!, t],
      ])}${paragraf(M.p)}${dugme(`${site}/bookings`, M.d)}${paragraf(M.b)}`,
    }),
    metin: `${selam(ad, dil)}\n\n${M.k[0]}: ${u}\n${M.k[1]}: ${h}\n${M.k[2]}: ${z}\n${M.k[3]}: ${t}\n\n${M.p}\n${site}/bookings`,
  };
};

/* ═══════════════  4 · DEPOZİTO BEKLİYOR  ═══════════════ */

const depozitoBekliyor: Uretici = ({ ad, site, veri }, dil) => {
  const t = veri?.tutar ?? '',
    k = veri?.kod ?? '';
  const M = {
    tr: {
      konu: 'Randevun depozito bekliyor',
      on: `${t} · ödeme kodu ${k}`,
      et: 'Ödeme bekleniyor',
      h: 'Son adım: depozito',
      kb: 'Depozito tutarı',
      ka: 'Hizmet bedelinin %10’u',
      a: [
        'Kaspi’yi aç, alıcı hazır gelir.',
        `Açıklamaya <strong>${k}</strong> kodunu yaz — ödemeni randevunla bu kod eşleştiriyor.`,
        'Dekontu uygulamaya yükle; randevun o an kesinleşir.',
      ],
      d: 'Ödemeyi tamamla',
      p: 'Süre dolarsa randevu düşer ve saat başkasına açılır.',
    },
    kk: {
      konu: 'Жазылуың депозит күтуде',
      on: `${t} · төлем коды ${k}`,
      et: 'Төлем күтілуде',
      h: 'Соңғы қадам: депозит',
      kb: 'Депозит сомасы',
      ka: 'Қызмет құнының 10%-ы',
      a: [
        'Kaspi-ді аш, алушы дайын келеді.',
        `Түсініктемеге <strong>${k}</strong> кодын жаз — төлеміңді жазылуыңмен осы код байланыстырады.`,
        'Түбіртекті қолданбаға жүкте; жазылуың сол сәтте бекітіледі.',
      ],
      d: 'Төлемді аяқтау',
      p: 'Уақыт бітсе жазылу түседі және сағат басқаға ашылады.',
    },
    ru: {
      konu: 'Запись ждёт депозит',
      on: `${t} · код платежа ${k}`,
      et: 'Ожидается оплата',
      h: 'Последний шаг: депозит',
      kb: 'Сумма депозита',
      ka: '10% от стоимости услуги',
      a: [
        'Откройте Kaspi — получатель подставится сам.',
        `В комментарии укажите код <strong>${k}</strong> — он связывает платёж с записью.`,
        'Загрузите чек в приложение; запись подтвердится сразу.',
      ],
      d: 'Завершить оплату',
      p: 'Если время выйдет, запись снимется и слот освободится.',
    },
  }[dil];
  return {
    konu: M.konu,
    html: duzen({
      dil,
      onizleme: M.on,
      govde: `${ustEtiket(M.et, '#9A5A05')}${baslik(M.h)}${paragraf(selam(ad, dil))}${rakamBant(M.kb, t, M.ka)}${adimlar(M.a)}${dugme(`${site}/bookings`, M.d)}${paragraf(M.p)}`,
    }),
    metin: `${selam(ad, dil)}\n\n${M.kb}: ${t}\n\n${M.a.map((x, i) => `${i + 1}. ${duz(x)}`).join('\n')}\n\n${site}/bookings`,
  };
};

/* ═══════════════  5 · RANDEVU HATIRLATMA  ═══════════════ */

const randevuHatirlatma: Uretici = ({ ad, site, veri }, dil) => {
  const u = veri?.uzman ?? '',
    z = veri?.zaman ?? '',
    h = veri?.hizmet ?? '';
  const M = {
    tr: {
      konu: 'Yarın randevun var',
      on: `${u} · ${z}`,
      et: 'Yarın',
      h: 'Yarın görüşüyoruz',
      k: ['Uzman', 'Hizmet', 'Zaman'],
      p: 'Planın değiştiyse şimdi haber vermek en kolayı: randevuya 3 saatten fazla varken iptal ücretsiz.',
      d: 'Randevuyu gör',
      b: 'Yol tarifi al',
    },
    kk: {
      konu: 'Ертең жазылуың бар',
      on: `${u} · ${z}`,
      et: 'Ертең',
      h: 'Ертең көрісеміз',
      k: ['Маман', 'Қызмет', 'Уақыт'],
      p: 'Жоспарың өзгерсе қазір хабарлаған оңай: жазылуға 3 сағаттан көп барда бас тарту тегін.',
      d: 'Жазылуды көру',
      b: 'Бағыт алу',
    },
    ru: {
      konu: 'Завтра у вас запись',
      on: `${u} · ${z}`,
      et: 'Завтра',
      h: 'Завтра встречаемся',
      k: ['Мастер', 'Услуга', 'Время'],
      p: 'Если планы изменились, сообщить проще сейчас: отмена бесплатна, если до записи больше 3 часов.',
      d: 'Открыть запись',
      b: 'Построить маршрут',
    },
  }[dil];
  return {
    konu: M.konu,
    html: duzen({
      dil,
      onizleme: M.on,
      govde: `${ustEtiket(M.et)}${baslik(M.h)}${paragraf(selam(ad, dil))}${kunye([
        [M.k[0]!, u],
        [M.k[1]!, h],
        [M.k[2]!, z],
      ])}${paragraf(M.p)}${dugme(`${site}/bookings`, M.d)}${baglanti(`${site}/map`, M.b)}`,
    }),
    metin: `${selam(ad, dil)}\n\n${M.k[0]}: ${u}\n${M.k[1]}: ${h}\n${M.k[2]}: ${z}\n\n${M.p}\n${site}/bookings`,
  };
};

/* ═══════════════  6 · DEĞERLENDİRME DAVETİ  ═══════════════ */

const degerlendirme: Uretici = ({ ad, site, veri, cikisUrl }, dil) => {
  const u = veri?.uzman ?? '';
  const M = {
    tr: {
      konu: 'Nasıl geçti?',
      on: 'Değerlendirmen başka kadınlara yol gösteriyor',
      et: 'Deneyimin',
      h: 'Deneyimini anlatır mısın?',
      p1: `${u} ile randevun tamamlandı. Bir iki cümle bile başka kadınların doğru uzmanı bulmasına yardım ediyor.`,
      kb: 'Anonim yazabilirsin',
      kg: 'Salon ve uzman kimin yazdığını göremez — bu kural sunucuda korunuyor, tercih değil.',
      d: 'Değerlendir',
    },
    kk: {
      konu: 'Қалай өтті?',
      on: 'Пікірің басқа әйелдерге жол көрсетеді',
      et: 'Тәжірибең',
      h: 'Тәжірибеңді бөлісесің бе?',
      p1: `${u} қызметі аяқталды. Бір-екі сөйлем де басқа әйелдердің дұрыс маман табуына көмектеседі.`,
      kb: 'Анонимді жаза аласың',
      kg: 'Салон да, маман да кім жазғанын көрмейді — бұл ереже серверде қорғалады.',
      d: 'Пікір қалдыру',
    },
    ru: {
      konu: 'Как всё прошло?',
      on: 'Ваш отзыв помогает другим женщинам',
      et: 'Ваш опыт',
      h: 'Расскажете, как прошло?',
      p1: `Запись у ${u} завершена. Даже пара предложений помогает другим женщинам найти своего мастера.`,
      kb: 'Можно анонимно',
      kg: 'Ни салон, ни мастер не увидят автора — это правило защищено на сервере, а не настройка.',
      d: 'Оставить отзыв',
    },
  }[dil];
  return {
    konu: M.konu,
    html: duzen({
      dil,
      onizleme: M.on,
      cikisUrl,
      govde: `${ustEtiket(M.et)}${baslik(M.h)}${paragraf(`${selam(ad, dil)}. ${M.p1}`)}${kutu(M.kb, M.kg, 'yesil')}${dugme(`${site}/bookings`, M.d)}`,
    }),
    metin: `${selam(ad, dil)}. ${M.p1}\n\n${M.kb}: ${M.kg}\n\n${site}/bookings`,
  };
};

/* ═══════════════  7 · DEPOZİTO İADESİ HAZIR  ═══════════════ */

const depozitoIadesi: Uretici = ({ ad, site, veri }, dil) => {
  const t = veri?.tutar ?? '';
  const M = {
    tr: {
      konu: 'İaden hazır',
      on: `${t} — hesap bilgini bekliyoruz`,
      et: 'İade',
      h: 'Depozito iaden hazır',
      kb: 'İade tutarı',
      ka: 'Aynı iş günü gönderilir',
      p: 'Tek eksik hesap bilgin. Girdiğin bilgi yalnız iadeyi yapan ekiple paylaşılır; uzmana ya da salona gitmez.',
      d: 'Hesap bilgimi gir',
    },
    kk: {
      konu: 'Қайтарымың дайын',
      on: `${t} — шот деректеріңді күтеміз`,
      et: 'Қайтарым',
      h: 'Депозит қайтарымың дайын',
      kb: 'Қайтарым сомасы',
      ka: 'Сол жұмыс күні жіберіледі',
      p: 'Жалғыз кемшілік — шот деректерің. Енгізген деректерің тек қайтарым жасайтын топпен бөлісіледі; маманға да, салонға да бармайды.',
      d: 'Шот деректерін енгізу',
    },
    ru: {
      konu: 'Возврат готов',
      on: `${t} — ждём реквизиты`,
      et: 'Возврат',
      h: 'Возврат депозита готов',
      kb: 'Сумма возврата',
      ka: 'Отправим в тот же рабочий день',
      p: 'Не хватает только реквизитов. Данные видит лишь команда возврата; ни мастеру, ни салону они не передаются.',
      d: 'Ввести реквизиты',
    },
  }[dil];
  return {
    konu: M.konu,
    html: duzen({
      dil,
      onizleme: M.on,
      govde: `${ustEtiket(M.et)}${baslik(M.h)}${paragraf(selam(ad, dil))}${rakamBant(M.kb, t, M.ka)}${paragraf(M.p)}${dugme(`${site}/bookings`, M.d)}`,
    }),
    metin: `${selam(ad, dil)}\n\n${M.kb}: ${t} (${M.ka})\n${M.p}\n\n${site}/bookings`,
  };
};

/* ═══════════════  8 · TEKLİF GELDİ  ═══════════════ */

const teklifGeldi: Uretici = ({ ad, site, veri }, dil) => {
  const s = veri?.sayi ?? '3';
  const M = {
    tr: {
      konu: 'Teklifler geldi',
      on: `${s} uzman sana teklif gönderdi`,
      et: 'Teklif',
      h: 'Uzmanlar teklifini yanıtladı',
      kb: 'Gelen teklif',
      p: 'Fiyatları, süreleri ve değerlendirmeleri yan yana karşılaştırabilirsin. Seçtiğinde randevu doğrudan açılıyor.',
      d: 'Teklifleri karşılaştır',
      not: 'Sonraki teklifler için ayrıca posta göndermiyoruz — hepsi aynı yerde birikiyor.',
    },
    kk: {
      konu: 'Ұсыныстар келді',
      on: `${s} маман саған ұсыныс жіберді`,
      et: 'Ұсыныс',
      h: 'Мамандар тілегіңе жауап берді',
      kb: 'Келген ұсыныс',
      p: 'Бағаларды, ұзақтығын және пікірлерді қатар салыстыра аласың. Таңдағанда жазылу бірден ашылады.',
      d: 'Ұсыныстарды салыстыру',
      not: 'Келесі ұсыныстар үшін бөлек хат жібермейміз — бәрі сол жерде жинақталады.',
    },
    ru: {
      konu: 'Пришли предложения',
      on: `${s} мастера прислали предложения`,
      et: 'Предложения',
      h: 'Мастера ответили на ваш запрос',
      kb: 'Получено предложений',
      p: 'Можно сравнить цены, длительность и отзывы рядом. После выбора запись открывается сразу.',
      d: 'Сравнить предложения',
      not: 'О следующих предложениях отдельно не пишем — они собираются там же.',
    },
  }[dil];
  return {
    konu: M.konu,
    html: duzen({
      dil,
      onizleme: M.on,
      govde: `${ustEtiket(M.et)}${baslik(M.h)}${paragraf(selam(ad, dil))}${rakamBant(M.kb, s)}${paragraf(M.p)}${dugme(`${site}/quote/results`, M.d)}${paragraf(M.not)}`,
    }),
    metin: `${selam(ad, dil)}\n\n${M.kb}: ${s}\n${M.p}\n${M.not}\n\n${site}/quote/results`,
  };
};

/* ═══════════════  9 · PUAN HATIRLATMASI  ═══════════════ */

const puanHatirlatma: Uretici = ({ ad, site, veri, cikisUrl }, dil) => {
  const p = veri?.puan ?? '',
    g = veri?.gun ?? '30';
  const M = {
    tr: {
      konu: 'Puanların kullanılmayı bekliyor',
      on: `${p} puan · ${g} gün içinde dolacak`,
      et: 'Sadakat',
      h: 'Puanların duruyor',
      kb: 'AYNA puanın',
      ka: `${g} gün içinde bir kısmı dolacak`,
      p: 'Bir ödemenin en fazla %25’i puanla kapatılabiliyor. Bakiyen eşiği geçtiği için kullanıma açık.',
      d: 'Randevu al ve kullan',
    },
    kk: {
      konu: 'Ұпайларың қолданылуын күтуде',
      on: `${p} ұпай · ${g} күнде бітеді`,
      et: 'Адалдық',
      h: 'Ұпайларың сақтаулы',
      kb: 'AYNA ұпайың',
      ka: `${g} күнде бір бөлігі бітеді`,
      p: 'Төлемнің ең көбі 25%-ы ұпаймен жабылады. Балансың шектен асқандықтан қолдануға ашық.',
      d: 'Жазылып қолдану',
    },
    ru: {
      konu: 'Баллы ждут применения',
      on: `${p} баллов · сгорят через ${g} дней`,
      et: 'Лояльность',
      h: 'Ваши баллы на месте',
      kb: 'Баллы AYNA',
      ka: `Часть сгорит через ${g} дней`,
      p: 'Баллами можно закрыть до 25% платежа. Баланс превысил порог, так что они уже доступны.',
      d: 'Записаться и потратить',
    },
  }[dil];
  return {
    konu: M.konu,
    html: duzen({
      dil,
      onizleme: M.on,
      cikisUrl,
      govde: `${ustEtiket(M.et, '#9A5A05')}${baslik(M.h)}${paragraf(selam(ad, dil))}${rakamBant(M.kb, p, M.ka)}${paragraf(M.p)}${dugme(site, M.d)}`,
    }),
    metin: `${selam(ad, dil)}\n\n${M.kb}: ${p}\n${M.p}\n\n${site}`,
  };
};

/* ═══════════════  10 · GERİ KAZANIM  ═══════════════ */

const geriKazanim: Uretici = ({ ad, site, cikisUrl }, dil) => {
  const M = {
    tr: {
      konu: 'Bakımını erteledin mi?',
      on: 'Puanların duruyor, şehrinde yenilikler var',
      et: 'Uzun zamandır yoksun',
      h: 'Kaldığın yerden devam',
      p: 'Bir süredir uğramadın. AYNA puanların yerinde duruyor ve bir sonraki randevunda kullanabilirsin.',
      m: [
        'Şehrindeki uzman listesi güncellendi.',
        'Bu haftanın fırsatları yayında.',
        'Kaydettiğin salonlar hâlâ profilinde.',
      ],
      d: 'Neler değişmiş, bak',
    },
    kk: {
      konu: 'Күтіміңді кейінге қалдырдың ба?',
      on: 'Ұпайларың сақтаулы, қалаңда жаңалық бар',
      et: 'Көптен бері жоқсың',
      h: 'Қалған жеріңнен жалғастыр',
      p: 'Біраз уақыт кірмедің. AYNA ұпайларың сақтаулы, келесі жазылуыңда қолдана аласың.',
      m: [
        'Қалаңдағы маман тізімі жаңарды.',
        'Осы аптаның ұсыныстары эфирде.',
        'Сақтаған салондарың әлі профиліңде.',
      ],
      d: 'Не өзгергенін көр',
    },
    ru: {
      konu: 'Отложили уход за собой?',
      on: 'Баллы на месте, в городе новое',
      et: 'Давно не виделись',
      h: 'Продолжим с того же места',
      p: 'Вас давно не было. Баллы AYNA сохранились — их можно потратить на следующей записи.',
      m: [
        'Список мастеров в вашем городе обновился.',
        'Предложения недели уже в приложении.',
        'Сохранённые салоны остались в профиле.',
      ],
      d: 'Посмотреть, что нового',
    },
  }[dil];
  return {
    konu: M.konu,
    html: duzen({
      dil,
      onizleme: M.on,
      cikisUrl,
      govde: `${ustEtiket(M.et)}${baslik(M.h)}${paragraf(`${selam(ad, dil)}. ${M.p}`)}${madde(M.m)}${dugme(site, M.d)}`,
    }),
    metin: `${selam(ad, dil)}. ${M.p}\n\n${M.m.map((x) => `- ${duz(x)}`).join('\n')}\n\n${site}`,
  };
};

/* ═══════════════  11 · UZMAN: YENİ TALEP  ═══════════════ */

const uzmanTalep: Uretici = ({ ad, site, veri }, dil) => {
  const h = veri?.hizmet ?? '',
    s = veri?.sure ?? '3';
  const M = {
    tr: {
      konu: 'Yeni bir talep var',
      on: `${h} · ${s} saat içinde yanıtla`,
      et: 'Talep',
      h: 'Sana bir talep geldi',
      kb: 'Yanıt süresi',
      ka: 'Geçerse talep düşer',
      p: `İstenen hizmet: <strong>${h}</strong>. Kabul edebilir, farklı bir saat önerebilir ya da geçebilirsin.`,
      d: 'Talebi gör',
      b: 'Yanıt süren keşfette görünürlüğünü etkiliyor',
    },
    kk: {
      konu: 'Жаңа сұраныс бар',
      on: `${h} · ${s} сағат ішінде жауап бер`,
      et: 'Сұраныс',
      h: 'Саған сұраныс келді',
      kb: 'Жауап беру уақыты',
      ka: 'Өтсе сұраныс түседі',
      p: `Сұралған қызмет: <strong>${h}</strong>. Қабылдай аласың, басқа уақыт ұсына аласың немесе өткізе аласың.`,
      d: 'Сұранысты көру',
      b: 'Жауап уақытың іздеудегі көрінуіңе әсер етеді',
    },
    ru: {
      konu: 'Новый запрос',
      on: `${h} · ответьте за ${s} ч`,
      et: 'Запрос',
      h: 'Вам пришёл запрос',
      kb: 'Время на ответ',
      ka: 'После этого запрос снимется',
      p: `Запрошенная услуга: <strong>${h}</strong>. Можно принять, предложить другое время или пропустить.`,
      d: 'Открыть запрос',
      b: 'Скорость ответа влияет на вашу видимость в поиске',
    },
  }[dil];
  return {
    konu: M.konu,
    html: duzen({
      dil,
      onizleme: M.on,
      govde: `${ustEtiket(M.et, '#9A5A05')}${baslik(M.h)}${paragraf(selam(ad, dil))}${rakamBant(M.kb, `${s} ${dil === 'tr' ? 'saat' : dil === 'kk' ? 'сағат' : 'ч'}`, M.ka)}${paragraf(M.p)}${dugme(`${site}/seller/requests`, M.d)}${paragraf(M.b)}`,
    }),
    metin: `${selam(ad, dil)}\n\n${duz(M.p)}\n${M.kb}: ${s}\n\n${site}/seller/requests`,
  };
};

/* ═══════════════  12 · UZMAN: REKLAM YAYINDA  ═══════════════ */

const reklamYayinda: Uretici = ({ ad, site, veri }, dil) => {
  const g = veri?.gun ?? '30',
    v = veri?.vitrin ?? '';
  const M = {
    tr: {
      konu: 'Reklamın yayında',
      on: `${v} · ${g} gün`,
      et: 'Reklam',
      h: 'Reklamın yayına girdi',
      k: ['Vitrin', 'Süre', 'Durum'],
      durum: 'Yayında',
      p: 'Vitrinde <strong>Sponsorlu</strong> etiketiyle görünüyorsun — ücretli yerleşimi gizlemiyoruz, bu kullanıcının hakkı.',
      d: 'Performansı gör',
    },
    kk: {
      konu: 'Жарнамаң эфирде',
      on: `${v} · ${g} күн`,
      et: 'Жарнама',
      h: 'Жарнамаң эфирге шықты',
      k: ['Витрина', 'Мерзім', 'Күй'],
      durum: 'Эфирде',
      p: 'Витринада <strong>Демеушілік</strong> белгісімен көрінесің — ақылы орналасуды жасырмаймыз, бұл қолданушының құқығы.',
      d: 'Нәтижені көру',
    },
    ru: {
      konu: 'Реклама запущена',
      on: `${v} · ${g} дней`,
      et: 'Реклама',
      h: 'Ваша реклама в эфире',
      k: ['Витрина', 'Срок', 'Статус'],
      durum: 'В эфире',
      p: 'В витрине вы отмечены как <strong>Спонсировано</strong> — платное размещение мы не скрываем, это право пользователя.',
      d: 'Смотреть результаты',
    },
  }[dil];
  const gunEt = { tr: 'gün', kk: 'күн', ru: 'дней' }[dil];
  return {
    konu: M.konu,
    html: duzen({
      dil,
      onizleme: M.on,
      govde: `${ustEtiket(M.et, '#2F7A4A')}${baslik(M.h)}${paragraf(selam(ad, dil))}${kunye([
        [M.k[0]!, v],
        [M.k[1]!, `${g} ${gunEt}`],
        [M.k[2]!, M.durum],
      ])}${paragraf(M.p)}${dugme(`${site}/seller/ads`, M.d)}`,
    }),
    metin: `${selam(ad, dil)}\n\n${M.k[0]}: ${v}\n${M.k[1]}: ${g} ${gunEt}\n${M.k[2]}: ${M.durum}\n\n${duz(M.p)}\n${site}/seller/ads`,
  };
};

/* ═══════════════  KAYIT DEFTERİ  ═══════════════ */

/**
 * Anahtar `email_log.template` ile AYNI: tekrar engelleme buna dayanıyor.
 * Anahtarı değiştirmek, postayı almış herkese İKİNCİ KEZ göndermek demek.
 */
export const SABLONLAR = {
  hosgeldin,
  ilk_randevu: ilkRandevu,
  randevu_onaylandi: randevuOnaylandi,
  depozito_bekliyor: depozitoBekliyor,
  randevu_hatirlatma: randevuHatirlatma,
  degerlendirme,
  depozito_iadesi: depozitoIadesi,
  teklif_geldi: teklifGeldi,
  puan_hatirlatma: puanHatirlatma,
  geri_kazanim: geriKazanim,
  uzman_talep: uzmanTalep,
  reklam_yayinda: reklamYayinda,
} as const;

export type SablonAdi = keyof typeof SABLONLAR;

/**
 * Pazarlama postası mı?
 *
 * Yalnız bunlarda abonelikten çıkma bağlantısı var. İşlemsel postalar
 * (randevu, depozito, iade, talep) kullanıcının kendi işlemine bağlı;
 * onlardan "çık" denmez.
 */
export const PAZARLAMA: ReadonlySet<SablonAdi> = new Set<SablonAdi>([
  'hosgeldin',
  'ilk_randevu',
  'degerlendirme',
  'puan_hatirlatma',
  'geri_kazanim',
]);

export function sablonUret(ad: SablonAdi, girdi: SablonGirdi, dil: Dil): Sablon {
  return SABLONLAR[ad](girdi, dil);
}
