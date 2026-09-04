import assert from 'node:assert/strict';
import { test } from 'node:test';
import { kk, ru, tr } from './index.js';

// tr KAYNAK dildir ve eksiksiz olmalı; kk/ru onunla BİREBİR aynı anahtar kümesine
// sahip olmalı (CLAUDE.md: "kk/ru parite testi 3 dili senkron tutar").
//
// Bu test eskiden yalnız TEK YÖN denetliyordu — "kk/ru'da olup tr'de olmayan"
// yetim anahtar. Eksik yönü "alt küme olabilir, eksikler tr'ye düşer" diye
// gerekçelendirmiştim. Geri düşüş hatayı çözmüyor, GİZLİYOR: uzman doğrulama
// ekranının 17 anahtarı ru'ya hiç eklenmemişti ve Rus uzman ekranı baştan sona
// Türkçe görüyordu. Çökme yok, uyarı yok — kk %100 tamdı, yani politika değil
// unutulmuş bir çeviriydi. ru + kk birincil pazar dilleri; eksik olan hata.
const trKeys = new Set(Object.keys(tr));

test('kk/ru yalnızca tr içinde var olan anahtarları içerir', () => {
  for (const k of Object.keys(kk)) assert.ok(trKeys.has(k), `kk yetim anahtar: ${k}`);
  for (const k of Object.keys(ru)) assert.ok(trKeys.has(k), `ru yetim anahtar: ${k}`);
});

test('her tr anahtarının kk ve ru karşılığı var', () => {
  for (const [ad, sozluk] of Object.entries({ kk, ru })) {
    const eksik = Object.keys(tr).filter((k) => !(k in sozluk));
    assert.deepEqual(
      eksik,
      [],
      `${ad} çevirisi eksik (${eksik.length}) — kullanıcı bu ekranı Türkçe görür:\n  ` +
        eksik.join('\n  '),
    );
  }
});

test('hiçbir çeviri boş değil', () => {
  for (const [locale, dict] of Object.entries({ tr, kk, ru })) {
    for (const [key, value] of Object.entries(dict)) {
      assert.ok((value ?? '').trim().length > 0, `${locale}.${key} boş`);
    }
  }
});

test('tr kaynak dili boş değil', () => {
  assert.ok(Object.keys(tr).length > 0);
});

// EK Z.9 — kk/ru gerçek çevrilmiş olmalı: tr ile BİREBİR AYNI + Latince bir değer,
// çevrilmemiş (Türkçe kalmış) sinyalidir. İstisna: marka/özel/uluslararası terimler
// ve salt-interpolasyon değerleri (tüm dillerde aynı kalır).
const ALLOWED_IDENTICAL = new Set([
  'AYNA',
  'AYNA Life',
  'AYNA Passport',
  'AYNA Platinum',
  'AYNA Premium',
  'AYNA Safe',
  'AYNA W2W',
  'Always',
  'Always ✓',
  'App Store',
  'Boni',
  'Express',
  'Google Play',
  'Nail',
  'No-show',
  'Offline',
  'Platinum',
  'Premium',
  'Spa & Wellness',
  'TOP',
  '{pro} · {slot}',
  // İsimli selamlama: '{selam}' saate göre karşılama, '{ad}' kullanıcının adı.
  // Kelimesi yok, üç dilde de aynı — çeviri eksikliği değil.
  '{selam}, {ad}',
]);
const hasCyrillic = (s: string) => /[а-яА-ЯёЁ]/.test(s);
const hasLatinWord = (s: string) => /[a-zA-ZçğıöşüÇĞİÖŞÜ]{3,}/.test(s);

test('kk/ru çevrilmemiş (tr ile aynı, Latince) girdi içermez', () => {
  for (const [locale, dict] of Object.entries({ kk, ru })) {
    for (const key of Object.keys(tr)) {
      const v = (dict as Record<string, string>)[key];
      if (v === undefined) continue; // eksikse tr'ye düşer (üstteki testler kapsıyor)
      if (v === tr[key as keyof typeof tr] && hasLatinWord(v) && !hasCyrillic(v)) {
        assert.ok(
          ALLOWED_IDENTICAL.has(v.trim()),
          `${locale}.${key} çevrilmemiş görünüyor: ${JSON.stringify(v)}`,
        );
      }
    }
  }
});

/*
 * ── CÜMLE İÇİNDE KALMIŞ LATİN KELİME ──────────────────────────────────────
 *
 * Üstteki test yalnız DEĞERİN TAMAMI tr ile aynıysa yakalıyor. Çevirinin
 * gövdesi Kirilce ama içinde tek bir Türkçe kelime kaldıysa hiçbir test
 * görmüyordu. Canlıda tam olarak bu vardı:
 *
 *   · kk.offers.created_b  → "Науқаның Keşfet-те көрінеді" (Kazak kullanıcı
 *     uygulamada "Keşfet" diye bir sekme görmüyor; onun sekmesi "Ашу").
 *   · ru.hours.conflict_penalty → "клиентка planировала" (Latin "plan" +
 *     Kiril ek: hiçbir dilde var olmayan bir kelime).
 *
 * Kural: kk/ru değerlerinde Latin harfli kelime YALNIZ marka, ürün ve
 * uluslararası kısaltma olabilir. Yeni bir marka geliyorsa listeye eklenir —
 * eklenmesi bilinçli bir karar olsun diye liste burada duruyor.
 */
const LATIN_MARKALAR = new Set([
  'AI',
  'App',
  'Always',
  'AYNA',
  'BIN',
  'Boni',
  'Cut',
  'Express',
  'Google',
  'GPS',
  'IBAN',
  'Instagram',
  'INVEST',
  'JPG',
  'Kaspi',
  'KYC',
  'Life',
  'LLP',
  'mail',
  'MB',
  'name',
  'Nail',
  'Offline',
  'out',
  'Passport',
  'Platinum',
  'Play',
  'remove',
  'bg',
  'Plus',
  'Premium',
  'premium',
  'PNG',
  'QR',
  'Safe',
  'SES',
  'show',
  'Spa',
  'Store',
  'Stories',
  'Story',
  'TOO',
  'TOP',
  'Wellness',
  'at',
  'e',
  'email',
  'kz',
  'no',
  'W2W',
]);

test('kk/ru cümlelerinde MARKA DIŞI Latin kelime kalmıyor', () => {
  for (const [locale, dict] of Object.entries({ kk, ru })) {
    for (const [key, deger] of Object.entries(dict as Record<string, string>)) {
      if (typeof deger !== 'string') continue;
      // Parametreler ({ad}, {tutar}) çeviri değil, yer tutucudur.
      const govde = deger.replace(/\{[^}]*\}/g, ' ');
      for (const kelime of govde.match(/[A-Za-zÇĞİÖŞÜçğıöşü]{2,}/g) ?? []) {
        assert.ok(
          LATIN_MARKALAR.has(kelime),
          `${locale}.${key} içinde çevrilmemiş Latin kelime: "${kelime}" — ${deger}`,
        );
      }
    }
  }
});

/*
 * ── KAZAKÇA TEK ÜSLUP: "СЕН" ──────────────────────────────────────────────
 *
 * Kaynak dil (tr) baştan sona "sen" diyor: "randevunu", "kazanacaksın",
 * "dene". Kazakça sözlük de 85 satırda "сен" derken ÜÇ satırda birden
 * "сіз"e geçiyordu — kullanıcı aynı akış içinde iki farklı üslupla
 * konuşulduğunu görüyordu (ör. randevu kartında "сен", hemen altındaki
 * adres notunda "сіздің").
 *
 * "-сіз" EKİ (şeksіz, mүmkіnsіz) kelimenin İÇİNDE geçiyor; kural yalnız
 * kelimenin BAŞINDAKİ zamire bakıyor.
 */
const KK_RESMI =
  /(^|[^а-яәғқңөұүһіА-ЯӘҒҚҢӨҰҮҺІ])(сіз|сізд[а-яәғқңөұүһі]*|Сіз|Сізд[а-яәғқңөұүһі]*)([^а-яәғқңөұүһіА-ЯӘҒҚҢӨҰҮҺІ]|$)/;

test('kk sözlüğü tek üslupta — "сіз" değil "сен"', () => {
  for (const [key, deger] of Object.entries(kk as Record<string, string>)) {
    if (typeof deger !== 'string') continue;
    assert.ok(!KK_RESMI.test(deger), `kk.${key} resmi üslupta ("сіз"): ${deger}`);
  }
});

/*
 * ── RUSÇA TEK ÜSLUP: "ВЫ" ─────────────────────────────────────────────────
 *
 * Kurucu kararı (05.09.2026): Rusça sözlük baştan sona RESMİ üslupta.
 *
 * Öncesinde sözlük ikiye bölünmüştü — 179 satır "вы", 161 satır "ты" — ve
 * bölünme ekran ekran değil, cümle cümleydi: bildirimlerin 45'i samimi, 5'i
 * resmi; randevu ekranının 8'i resmi, 1'i samimiydi. Kullanıcı aynı akışta
 * iki farklı sesle konuşuluyordu.
 *
 * Üç işaret denetleniyor: samimi zamirler, 2. tekil fiil çekimi (-ешь/-ишь)
 * ve dönüştürülen emir kiplerinin tekil biçimleri.
 */
const RU_SAMIMI_ZAMIR = /(^|[^А-Яа-яЁё])(ты|теб[ея]|тобо[йю]|тво[а-яё]+)([^А-Яа-яЁё]|$)/i;
// «лишь» ve «тишь» fiil değil, -шь kuralının yanlış pozitifleri.
const RU_FIIL_DISI = new Set(['лишь', 'тишь']);
const RU_2TEKIL = /[А-Яа-яЁё]+(ешь|ишь|ёшь)(ся)?(?![А-Яа-яЁё])/i;
const RU_TEKIL_EMIR = new Set([
  'будь',
  'введи',
  'верни',
  'вернёшься',
  'видишь',
  'включи',
  'возвращай',
  'войди',
  'впиши',
  'выбери',
  'выбираешь',
  'выделяешься',
  'дай',
  'делись',
  'добавь',
  'дождись',
  'дотянись',
  'едешь',
  'загляни',
  'загрузи',
  'задай',
  'заполни',
  'заполняй',
  'зарабатывай',
  'засияй',
  'захочешь',
  'идёшь',
  'используй',
  'ищешь',
  'коснись',
  'можешь',
  'нажми',
  'назначаешь',
  'найдёшь',
  'напиши',
  'обратись',
  'опаздываешь',
  'опиши',
  'оплати',
  'оплатишь',
  'оповещай',
  'опубликуй',
  'оставишь',
  'оставь',
  'отвечаешь',
  'отдохни',
  'откроешь',
  'открой',
  'отмени',
  'отметь',
  'отправляешь',
  'отправь',
  'отредактируй',
  'отсканируй',
  'оформишь',
  'оцени',
  'перейди',
  'пересмотри',
  'повысь',
  'погаси',
  'поделись',
  'подписывайся',
  'подтверди',
  'получай',
  'попадаешь',
  'попадай',
  'попробуй',
  'посмотри',
  'потеряешь',
  'предложи',
  'предупреди',
  'пригласи',
  'приглашай',
  'придёшь',
  'принимаешь',
  'присоединяйся',
  'проверь',
  'продли',
  'продолжаешь',
  'продолжай',
  'продолжи',
  'продолжишь',
  'публикуй',
  'публикуйся',
  'работаешь',
  'работай',
  'расскажи',
  'решаешь',
  'следи',
  'смотри',
  'собери',
  'создавай',
  'создай',
  'сократи',
  'сохрани',
  'спрашивай',
  'увидишь',
  'удаляй',
  'узнавай',
  'узнаешь',
  'узнай',
  'укажи',
  'управляй',
  'уточни',
  'участвуешь',
  'учитывай',
  'хочешь',
]);

test('ru sözlüğü tek üslupta — "ты" değil "вы"', () => {
  for (const [key, deger] of Object.entries(ru as Record<string, string>)) {
    if (typeof deger !== 'string') continue;
    assert.ok(!RU_SAMIMI_ZAMIR.test(deger), `ru.${key} samimi zamir taşıyor: ${deger}`);
    for (const kelime of deger.match(/[А-Яа-яЁё]+/g) ?? []) {
      if (RU_FIIL_DISI.has(kelime.toLowerCase())) continue;
      assert.ok(!RU_2TEKIL.test(kelime), `ru.${key} 2. tekil fiil taşıyor: "${kelime}" — ${deger}`);
    }
    for (const kelime of deger.match(/[А-Яа-яЁё]+/g) ?? []) {
      assert.ok(
        !RU_TEKIL_EMIR.has(kelime.toLowerCase()),
        `ru.${key} samimi emir kipi taşıyor: "${kelime}" — ${deger}`,
      );
    }
  }
});
