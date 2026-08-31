import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BookingsScheduler } from './bookings.scheduler';

/**
 * ZAMANLAYICI DAVRANIŞ TESTLERİ — brief §4.2, §4.4, §4.5, §3.
 *
 * Neden metin değil DAVRANIŞ testi: buradaki en pahalı hata "kesinlesti →
 * hizmet_gunu geçişini kimse yapmıyor" idi. Kod derleniyordu, hiçbir kaynak
 * araması bunu yakalamıyordu; akış sessizce `kesinlesti`de takılıyor ve
 * uzmanın "İşlemi bitirdim" butonu HİÇ açılmıyordu. Eksik olan bir satır
 * değil, olmayan bir satırdı — onu ancak sonucu ölçen bir test yakalar.
 */

type Kayit = Record<string, unknown>;

/** Zamanlayıcının kullandığı kadarıyla sahte Prisma. */
function sahtePrisma(bookings: Kayit[]) {
  const eslesir = (b: Kayit, where: Kayit): boolean =>
    Object.entries(where).every(([k, v]) => {
      const deger = b[k];
      if (v === null || typeof v !== 'object') return deger === v;
      const kosul = v as Record<string, unknown>;
      if ('in' in kosul) return (kosul.in as unknown[]).includes(deger);
      if (deger == null && ('lt' in kosul || 'lte' in kosul || 'gt' in kosul)) {
        // `{ not: null, lt: X }` — startAt yoksa eşleşmez.
        return false;
      }
      // Karşılaştırmalar hem tarih hem sayı üzerinde çalışıyor: zamanlayıcı
      // ikisini de kullanıyor (`startAt: { lt: … }`, `responseReminders: { lt: 2 }`).
      const say = (v: unknown) => (v instanceof Date ? v.getTime() : Number(v));
      const sayi = say(deger);
      let ok = true;
      if ('not' in kosul) ok = ok && deger !== kosul.not;
      if ('lt' in kosul) ok = ok && sayi < say(kosul.lt);
      if ('lte' in kosul) ok = ok && sayi <= say(kosul.lte);
      if ('gt' in kosul) ok = ok && sayi > say(kosul.gt);
      return ok;
    });

  return {
    booking: {
      findMany: ({ where }: { where: Kayit }) =>
        Promise.resolve(bookings.filter((b) => eslesir(b, where)).map((b) => ({ ...b }))),
      updateMany: ({ where, data }: { where: Kayit; data: Kayit }) => {
        const hedef = bookings.filter((b) => eslesir(b, where));
        for (const b of hedef) Object.assign(b, data);
        return Promise.resolve({ count: hedef.length });
      },
      update: ({ where, data }: { where: { id: string }; data: Kayit }) => {
        const b = bookings.find((x) => x.id === where.id);
        if (b)
          for (const [k, v] of Object.entries(data)) {
            const artis = (v as { increment?: number })?.increment;
            b[k] = typeof artis === 'number' ? Number(b[k] ?? 0) + artis : v;
          }
        return Promise.resolve(b);
      },
    },
    business: { findFirst: () => Promise.resolve(null) },
    specialist: { findFirst: () => Promise.resolve(null) },
  };
}

const pushlar: { title: string }[] = [];
const sahtePush = {
  sendToUser: (_u: string, m: { title: string }) => {
    pushlar.push(m);
    return Promise.resolve();
  },
  sendTemplate: () => Promise.resolve(),
};

function kur(bookings: Kayit[]) {
  pushlar.length = 0;
  const prisma = sahtePrisma(bookings);
  // Zamanlayıcı yalnız bu üç bağımlılığı kullanıyor; DI kabı gerekmiyor.
  return new BookingsScheduler(
    prisma as never,
    sahtePush as never,
    { grantCompletionRewards: () => undefined } as never,
  );
}

const dk = (n: number) => new Date(Date.now() + n * 60_000);

test('§3 — randevu saati gelince KESINLESTI → HIZMET_GUNU', async () => {
  const b: Kayit = {
    id: 'b1',
    status: 'kesinlesti',
    startAt: dk(-5),
    userId: 'u1',
    proId: 'p1',
    gunHatirlatmalari: 0,
  };
  await kur([b]).tick();
  assert.equal(
    b.status,
    'hizmet_gunu',
    'akış kesinleşmede takılı kalıyor — uzmanın "İşlemi bitirdim" butonu hiç açılmaz',
  );
});

test('§3 — saati GELMEMİŞ randevu hizmet gününe geçmez', async () => {
  const b: Kayit = { id: 'b2', status: 'kesinlesti', startAt: dk(120), gunHatirlatmalari: 0 };
  await kur([b]).tick();
  assert.equal(b.status, 'kesinlesti');
});

test('§4.2 — randevu saatine 3 saatten az kalan TALEP otomatik düşer', async () => {
  const b: Kayit = {
    id: 'b3',
    status: 'onay_bekliyor',
    startAt: dk(100), // < 3 saat
    responseDeadline: dk(120), // cevap penceresi HENÜZ dolmadı
    responseReminders: 2,
    userId: 'u1',
    gunHatirlatmalari: 0,
  };
  await kur([b]).tick();
  assert.equal(b.status, 'otomatik_dustu', 'son anda cevapsız talep müşteriyi bekletiyor');
});

test('§4.4 — askıda kalan DEPOZİTO randevusu 3 saat eşiğinde düşer', async () => {
  // Müşteri push'u hiç açmadıysa 10 dakikalık sayaç başlamaz; bu randevu
  // eşik koruması olmadan slotu sonsuza kadar tutardı.
  const b: Kayit = {
    id: 'b4',
    status: 'depozito_bekliyor',
    startAt: dk(100),
    depositDeadline: dk(500),
    userId: 'u1',
    gunHatirlatmalari: 0,
  };
  await kur([b]).tick();
  assert.equal(b.status, 'otomatik_dustu');
});

test('§4.5 — 30 dk hatırlatması bir kez gider, tekrar turda TEKRARLAMAZ', async () => {
  const b: Kayit = {
    id: 'b5',
    status: 'kesinlesti',
    startAt: dk(25),
    userId: 'u1',
    proId: 'p1',
    gunHatirlatmalari: 0,
  };
  const s = kur([b]);
  await s.tick();
  const ilk = pushlar.filter((m) => m.title.includes('30 dakika')).length;
  assert.equal(ilk, 1, '30 dk hatırlatması gitmedi');
  await s.tick();
  const ikinci = pushlar.filter((m) => m.title.includes('30 dakika')).length;
  assert.equal(ikinci, 1, 'aynı hatırlatma her turda tekrar gidiyor (spam)');
});

test('§4.5 — aynı turda hem "1 saat" hem "30 dk" gitmez', async () => {
  const b: Kayit = {
    id: 'b6',
    status: 'kesinlesti',
    startAt: dk(25),
    userId: 'u1',
    proId: 'p1',
    gunHatirlatmalari: 0,
  };
  await kur([b]).tick();
  assert.equal(pushlar.filter((m) => m.title.includes('1 saat')).length, 0);
});

test('§6 — depozito penceresi bitmeden son uyarı gider (bir kez)', async () => {
  const b: Kayit = {
    id: 'b7',
    status: 'depozito_bekliyor',
    startAt: dk(600), // eşiğin dışında: düşmesin
    depositDeadline: dk(3),
    userId: 'u1',
    gunHatirlatmalari: 0,
  };
  const s = kur([b]);
  await s.tick();
  await s.tick();
  assert.equal(
    pushlar.filter((m) => m.title.includes('son dakikalar')).length,
    1,
    'son uyarı ya hiç gitmiyor ya her turda tekrarlıyor',
  );
});
