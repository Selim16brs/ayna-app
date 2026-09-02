import { baslik, dugme, duzen, kutu, madde, paragraf } from './duzen';

/**
 * AYNA E-POSTA ŞABLONLARI.
 *
 * AIVIO'nun şablonlarından UYARLANDI ama birebir çevrilmedi: iki ürünün
 * yaşam döngüsü farklı. AIVIO'da "dersini kaçırma / seriyi bozma" vardı;
 * AYNA'da karşılığı yok — burada randevu, depozito ve değerlendirme var.
 * Aynı iskelet (karşılama → doğrulama → ilk eylem → hatırlatma → geri
 * kazanım), farklı içerik.
 *
 * ÜÇ DİL zorunlu: uygulamanın kuralı bu (tr kaynak, kk + ru). Konu satırı da
 * gövde de dile göre yazıldı; makine çevirisi değil.
 *
 * TON: AYNA kadın odaklı bir güven platformu. E-postalar acele ettirmiyor,
 * suçlamıyor, "son şansın" demiyor. Bir şey bekliyorsa neyi ve neden
 * beklediğini söylüyor.
 */

export type Dil = 'tr' | 'kk' | 'ru';

export interface SablonGirdi {
  ad: string;
  /** Uygulamanın kök adresi — bağlantılar buradan kuruluyor. */
  site: string;
  /** Abonelikten çıkma bağlantısı; işlemsel postalarda yok. */
  cikisUrl?: string | undefined;
  /** Şablona özel değerler (tutar, tarih, uzman adı…). */
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

type Uretici = (g: SablonGirdi, dil: Dil) => Sablon;

/* ─────────────────────────  YAŞAM DÖNGÜSÜ  ───────────────────────── */

const hosgeldin: Uretici = ({ ad, site, cikisUrl }, dil) => {
  const M = {
    tr: {
      konu: "AYNA'ya hoş geldin",
      on: 'Randevunu güvenceye alan üç şey',
      h: 'Güvenle randevu al',
      p1: 'AYNA, Kazakistan’da güzellik ve kişisel bakım için randevu aldığın yer. Aradaki güveni biz kuruyoruz.',
      p2: '<strong>Randevunu güvenceye alan üç şey:</strong>',
      m: [
        'Depozito bizde durur — uzman gelmezse iaden hazır.',
        'Konumun izinsiz paylaşılmaz; uzman numaranı görmez.',
        'Yorumlar anonim yazılabilir, salon kimin yazdığını göremez.',
      ],
      d: 'Uzmanları keşfet',
      son: 'İlk randevun birkaç dokunuş uzağında.',
    },
    kk: {
      konu: 'AYNA-ға қош келдің',
      on: 'Жазылуыңды қорғайтын үш нәрсе',
      h: 'Сеніммен жазыл',
      p1: 'AYNA — Қазақстанда сұлулық пен жеке күтімге жазылатын орның. Арадағы сенімді біз құрамыз.',
      p2: '<strong>Жазылуыңды қорғайтын үш нәрсе:</strong>',
      m: [
        'Депозит бізде тұрады — маман келмесе қайтарымың дайын.',
        'Орналасуың рұқсатсыз бөлісілмейді; маман нөміріңді көрмейді.',
        'Пікірлерді анонимді жазуға болады, салон кім жазғанын көрмейді.',
      ],
      d: 'Мамандарды ашу',
      son: 'Алғашқы жазылуың бірнеше түртуде.',
    },
    ru: {
      konu: 'Добро пожаловать в AYNA',
      on: 'Три вещи, которые защищают вашу запись',
      h: 'Записывайтесь спокойно',
      p1: 'AYNA — место, где в Казахстане записываются на красоту и уход за собой. Доверие между сторонами обеспечиваем мы.',
      p2: '<strong>Три вещи, которые защищают вашу запись:</strong>',
      m: [
        'Депозит хранится у нас — если мастер не пришёл, возврат готов.',
        'Геолокация не передаётся без разрешения; мастер не видит ваш номер.',
        'Отзывы можно писать анонимно, салон не увидит автора.',
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
      govde: `${baslik(M.h)}${paragraf(`${selam(ad, dil)}. ${M.p1}`)}${paragraf(M.p2)}${madde(M.m)}${dugme(site, M.d)}${paragraf(M.son)}`,
    }),
    metin: `${selam(ad, dil)}. ${M.p1}\n\n${M.m.map((x) => `- ${x.replace(/<[^>]+>/g, '')}`).join('\n')}\n\n${M.d}: ${site}`,
  };
};

const randevuHatirlatma: Uretici = ({ ad, site, veri }, dil) => {
  const uzman = veri?.uzman ?? '';
  const zaman = veri?.zaman ?? '';
  const M = {
    tr: {
      konu: 'Yarın randevun var',
      on: `${uzman} · ${zaman}`,
      h: 'Yarın görüşüyoruz',
      kb: 'Randevun',
      p: 'Planın değiştiyse şimdi haber vermek en kolayı: randevuya 3 saatten fazla varken iptal ücretsiz.',
      d: 'Randevuyu gör',
    },
    kk: {
      konu: 'Ертең жазылуың бар',
      on: `${uzman} · ${zaman}`,
      h: 'Ертең көрісеміз',
      kb: 'Жазылуың',
      p: 'Жоспарың өзгерсе, қазір хабарлаған оңай: жазылуға 3 сағаттан көп уақыт барда бас тарту тегін.',
      d: 'Жазылуды көру',
    },
    ru: {
      konu: 'Завтра у вас запись',
      on: `${uzman} · ${zaman}`,
      h: 'Завтра встречаемся',
      kb: 'Ваша запись',
      p: 'Если планы изменились, сообщить проще сейчас: отмена бесплатна, если до записи больше 3 часов.',
      d: 'Открыть запись',
    },
  }[dil];

  return {
    konu: M.konu,
    html: duzen({
      dil,
      onizleme: M.on,
      govde: `${baslik(M.h)}${paragraf(selam(ad, dil))}${kutu(M.kb, `${uzman}<br>${zaman}`)}${paragraf(M.p)}${dugme(`${site}/bookings`, M.d)}`,
    }),
    metin: `${selam(ad, dil)}\n\n${M.kb}: ${uzman} — ${zaman}\n\n${M.p}\n${site}/bookings`,
  };
};

const degerlendirme: Uretici = ({ ad, site, veri, cikisUrl }, dil) => {
  const uzman = veri?.uzman ?? '';
  const M = {
    tr: {
      konu: 'Nasıl geçti?',
      on: 'Değerlendirmen başka kadınlara yol gösteriyor',
      h: 'Deneyimini anlatır mısın?',
      p1: `${uzman} ile randevun tamamlandı. Bir iki cümle bile başka kadınların doğru uzmanı bulmasına yardım ediyor.`,
      p2: 'İstersen anonim yazabilirsin — salon ve uzman kimin yazdığını göremez.',
      d: 'Değerlendir',
    },
    kk: {
      konu: 'Қалай өтті?',
      on: 'Пікірің басқа әйелдерге жол көрсетеді',
      h: 'Тәжірибеңді бөлісесің бе?',
      p1: `${uzman} қызметі аяқталды. Бір-екі сөйлем де басқа әйелдердің дұрыс маман табуына көмектеседі.`,
      p2: 'Қаласаң анонимді жаза аласың — салон да, маман да кім жазғанын көрмейді.',
      d: 'Пікір қалдыру',
    },
    ru: {
      konu: 'Как всё прошло?',
      on: 'Ваш отзыв помогает другим женщинам',
      h: 'Расскажете, как прошло?',
      p1: `Запись у ${uzman} завершена. Даже пара предложений помогает другим женщинам найти своего мастера.`,
      p2: 'Можно написать анонимно — ни салон, ни мастер не увидят автора.',
      d: 'Оставить отзыв',
    },
  }[dil];

  return {
    konu: M.konu,
    html: duzen({
      dil,
      onizleme: M.on,
      cikisUrl,
      govde: `${baslik(M.h)}${paragraf(`${selam(ad, dil)}. ${M.p1}`)}${paragraf(M.p2)}${dugme(`${site}/bookings`, M.d)}`,
    }),
    metin: `${selam(ad, dil)}. ${M.p1}\n${M.p2}\n\n${site}/bookings`,
  };
};

const depozitoIadesi: Uretici = ({ ad, site, veri }, dil) => {
  const tutar = veri?.tutar ?? '';
  const M = {
    tr: {
      konu: 'İaden hazır',
      on: `${tutar} — hesap bilgini bekliyoruz`,
      h: 'Depozito iaden hazır',
      kb: 'İade tutarı',
      p: 'Hesap bilgini gir, aynı gün gönderelim. Bilgin yalnız iadeyi yapan ekiple paylaşılır; uzmana gitmez.',
      d: 'Hesap bilgimi gir',
    },
    kk: {
      konu: 'Қайтарымың дайын',
      on: `${tutar} — шот деректеріңді күтеміз`,
      h: 'Депозит қайтарымың дайын',
      kb: 'Қайтарым сомасы',
      p: 'Шот деректеріңді енгіз, сол күні жіберейік. Деректерің тек қайтарым жасайтын топпен бөлісіледі; маманға бармайды.',
      d: 'Шот деректерін енгізу',
    },
    ru: {
      konu: 'Возврат готов',
      on: `${tutar} — ждём реквизиты`,
      h: 'Возврат депозита готов',
      kb: 'Сумма возврата',
      p: 'Введите реквизиты — отправим в тот же день. Данные видит только команда возврата; мастеру они не передаются.',
      d: 'Ввести реквизиты',
    },
  }[dil];

  return {
    konu: M.konu,
    html: duzen({
      dil,
      onizleme: M.on,
      govde: `${baslik(M.h)}${paragraf(selam(ad, dil))}${kutu(M.kb, `<strong style="font-size:20px">${tutar}</strong>`)}${paragraf(M.p)}${dugme(`${site}/bookings`, M.d)}`,
    }),
    metin: `${selam(ad, dil)}\n\n${M.kb}: ${tutar}\n${M.p}\n\n${site}/bookings`,
  };
};

const ilkRandevu: Uretici = ({ ad, site, cikisUrl }, dil) => {
  const M = {
    tr: {
      konu: 'Aradığın uzmanı bulalım',
      on: 'Ne istediğini anlat, teklifler gelsin',
      h: 'Ne yaptırmak istiyorsun?',
      p1: 'Uzman aramak zorunda değilsin. Fotoğrafını ve bütçeni paylaş, uzmanlar sana teklif göndersin.',
      p2: 'Ya da doğrudan takvimden boş bir saat seç — dolu saatler zaten görünmüyor.',
      d: 'Dileğini anlat',
    },
    kk: {
      konu: 'Іздеген маманыңды табайық',
      on: 'Не қалайтыныңды айт, ұсыныстар келсін',
      h: 'Не жасатқың келеді?',
      p1: 'Маман іздеудің қажеті жоқ. Фотоңды және бюджетіңді бөліс, мамандар саған ұсыныс жіберсін.',
      p2: 'Немесе күнтізбеден бос уақыт таңда — бос емес сағаттар көрінбейді.',
      d: 'Тілегіңді айт',
    },
    ru: {
      konu: 'Найдём вашего мастера',
      on: 'Расскажите, что хотите — придут предложения',
      h: 'Что хотите сделать?',
      p1: 'Искать мастера необязательно. Поделитесь фото и бюджетом — мастера сами пришлют предложения.',
      p2: 'Или выберите свободное время в календаре — занятые часы там не показываются.',
      d: 'Рассказать о желании',
    },
  }[dil];

  return {
    konu: M.konu,
    html: duzen({
      dil,
      onizleme: M.on,
      cikisUrl,
      govde: `${baslik(M.h)}${paragraf(`${selam(ad, dil)}. ${M.p1}`)}${paragraf(M.p2)}${dugme(`${site}/quote`, M.d)}`,
    }),
    metin: `${selam(ad, dil)}. ${M.p1}\n${M.p2}\n\n${site}/quote`,
  };
};

const geriKazanim: Uretici = ({ ad, site, cikisUrl }, dil) => {
  const M = {
    tr: {
      konu: 'Bakımını erteledin mi?',
      on: 'Puanların duruyor',
      h: 'Kaldığın yerden devam',
      p1: 'Bir süredir uğramadın. AYNA puanların yerinde duruyor ve bir sonraki randevunda kullanabilirsin.',
      p2: 'Şehrindeki uzmanlar ve bu haftanın fırsatları güncellendi.',
      d: 'Neler değişmiş, bak',
    },
    kk: {
      konu: 'Күтіміңді кейінге қалдырдың ба?',
      on: 'Ұпайларың сақталып тұр',
      h: 'Қалған жеріңнен жалғастыр',
      p1: 'Біраз уақыт кірмедің. AYNA ұпайларың сақталып тұр, келесі жазылуыңда қолдана аласың.',
      p2: 'Қалаңдағы мамандар мен осы аптаның ұсыныстары жаңарды.',
      d: 'Не өзгергенін көр',
    },
    ru: {
      konu: 'Отложили уход за собой?',
      on: 'Ваши баллы на месте',
      h: 'Продолжим с того же места',
      p1: 'Вас давно не было. Баллы AYNA сохранились — их можно потратить на следующей записи.',
      p2: 'Мастера в вашем городе и предложения этой недели обновились.',
      d: 'Посмотреть, что нового',
    },
  }[dil];

  return {
    konu: M.konu,
    html: duzen({
      dil,
      onizleme: M.on,
      cikisUrl,
      govde: `${baslik(M.h)}${paragraf(`${selam(ad, dil)}. ${M.p1}`)}${paragraf(M.p2)}${dugme(site, M.d)}`,
    }),
    metin: `${selam(ad, dil)}. ${M.p1}\n${M.p2}\n\n${site}`,
  };
};

/**
 * Şablon kayıt defteri.
 *
 * Anahtar `email_log.template` ile AYNI: tekrar engelleme buna dayanıyor.
 * Yeni şablon eklerken anahtarı değiştirmek, kullanıcılara aynı postayı
 * ikinci kez göndermek demek.
 */
export const SABLONLAR = {
  hosgeldin,
  ilk_randevu: ilkRandevu,
  randevu_hatirlatma: randevuHatirlatma,
  degerlendirme,
  depozito_iadesi: depozitoIadesi,
  geri_kazanim: geriKazanim,
} as const;

export type SablonAdi = keyof typeof SABLONLAR;

/** Pazarlama postası mı? Sadece bunlarda abonelikten çıkma bağlantısı var. */
export const PAZARLAMA: ReadonlySet<SablonAdi> = new Set<SablonAdi>([
  'hosgeldin',
  'ilk_randevu',
  'degerlendirme',
  'geri_kazanim',
]);

export function sablonUret(ad: SablonAdi, girdi: SablonGirdi, dil: Dil): Sablon {
  return SABLONLAR[ad](girdi, dil);
}
