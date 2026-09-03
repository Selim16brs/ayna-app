import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PAYLASIM_GUN, ProPostsService } from './pro-posts.service';
import { proPostCreateSchema } from './pro-posts.dto';

/**
 * UZMAN PAYLAŞIMLARI — öncesi/sonrası, yalnız kendi müşterilerine.
 *
 * Kurucu: "uzman daha önce tamamlanmış randevusu olan müşterilerini CRM
 * olarak tutulsun… paylaştığında daha önce müşterisi olan müşterilere
 * gösterilsin, bildirim gitsin… fotoğraflar 7 gün kalacak ve sonrasında
 * sistemden silinecek."
 */

interface Yazilan {
  post?: Record<string, unknown>;
  silinen?: string[];
  silinenGorseller: string[];
  pushlar: { userId: string; key: string }[];
}

function servis(
  over: {
    randevular?: unknown[];
    kullanicilar?: unknown[];
    bitenler?: unknown[];
    baskaKullanan?: number;
  } = {},
) {
  const y: Yazilan = { silinenGorseller: [], pushlar: [] };
  const prisma = {
    specialist: { findUnique: () => Promise.resolve({ proId: 'p1' }) },
    business: { findFirst: () => Promise.resolve(null) },
    professional: {
      findUnique: () => Promise.resolve({ name: 'Aigul', imageUrl: '' }),
      findMany: () => Promise.resolve([{ id: 'p1', name: 'Aigul', imageUrl: '' }]),
    },
    booking: { findMany: () => Promise.resolve(over.randevular ?? []) },
    user: { findMany: () => Promise.resolve(over.kullanicilar ?? []) },
    proPost: {
      create: (a: { data: Record<string, unknown> }) => {
        y.post = a.data;
        return Promise.resolve({
          id: 'g1',
          beforeUrl: 'b',
          afterUrl: 'a',
          note: '',
          createdAt: new Date(),
          expiresAt: a.data.expiresAt as Date,
        });
      },
      findMany: () => Promise.resolve(over.bitenler ?? []),
      findUnique: () => Promise.resolve(null),
      count: () => Promise.resolve(over.baskaKullanan ?? 0),
      deleteMany: (a: { where: { id: { in: string[] } } }) => {
        y.silinen = a.where.id.in;
        return Promise.resolve({ count: a.where.id.in.length });
      },
      update: () => Promise.resolve({}),
      delete: () => Promise.resolve({}),
    },
    proPostRecipient: {
      findUnique: () => Promise.resolve({ postId: 'g1', userId: 'm1' }),
      updateMany: () => Promise.resolve({ count: 1 }),
    },
  };
  const push = {
    sendTemplate: (userId: string, key: string) => {
      y.pushlar.push({ userId, key });
      return Promise.resolve();
    },
  };
  const storage = {
    put: (v: string) => Promise.resolve(v),
    remove: (u: string) => {
      y.silinenGorseller.push(u);
      return Promise.resolve(true);
    },
  };
  return { svc: new ProPostsService(prisma as never, push as never, storage as never), y };
}

const RANDEVU = (userId: string, status: string, ay: number) => ({
  userId,
  status,
  startAt: new Date(2026, ay, 1),
  service: 'Kesim',
});

test('CRM tamamlanmış randevulardan türüyor — ayrı liste yok', async () => {
  /*
   * Ayrı bir müşteri tablosu zamanla randevu gerçeğinden ayrışırdı:
   * randevu iptal olduğunda ya da uzman değiştiğinde liste yanlış kalırdı.
   */
  const { svc } = servis({
    randevular: [RANDEVU('m1', 'tamamlandi', 5), RANDEVU('m2', 'degerlendirme', 4)],
    kullanicilar: [
      { id: 'm1', name: 'Aida' },
      { id: 'm2', name: 'Dana' },
    ],
  });
  const { customers } = await svc.musterilerim('u1');
  assert.deepEqual(customers.map((c) => c.name).sort(), ['Aida', 'Dana']);
});

test('AYNI müşteri bir kez — en son randevusuyla', async () => {
  // İki randevusu olan müşteri listede iki kez görünseydi CRM sayıları
  // ve alıcı listesi şişerdi.
  const { svc } = servis({
    randevular: [RANDEVU('m1', 'tamamlandi', 8), RANDEVU('m1', 'kapandi', 2)],
    kullanicilar: [{ id: 'm1', name: 'Aida' }],
  });
  const { customers } = await svc.musterilerim('u1');
  assert.equal(customers.length, 1);
  assert.equal(customers[0]!.lastServiceAt, new Date(2026, 8, 1).getTime(), 'en son randevu değil');
});

test('İZİN BEYANI olmadan paylaşım YOK', async () => {
  /*
   * Öncesi/sonrası fotoğrafı kişisel veridir; uzmanın müşterisinden izin
   * alması gerekir. Şemada `z.literal(true)` — `false` bile gövdeye
   * giremiyor; servis ayrıca kendi kapısını tutuyor.
   */
  assert.equal(
    proPostCreateSchema.safeParse({
      beforeDataUrl: 'data:image/jpeg;base64,AAAA',
      afterDataUrl: 'data:image/jpeg;base64,BBBB',
      consent: false,
    }).success,
    false,
    'izinsiz gövde şemadan geçti',
  );
  const { svc } = servis({ randevular: [RANDEVU('m1', 'tamamlandi', 1)] });
  await assert.rejects(
    () => svc.paylas('u1', { beforeDataUrl: 'a', afterDataUrl: 'b', consent: false }),
    /izin/i,
  );
});

test('MÜŞTERİSİ OLMAYAN uzman paylaşamıyor', async () => {
  // Alıcısı olmayan bir gönderi depoda yer kaplar ve hiç kimseye ulaşmaz.
  const { svc } = servis({ randevular: [] });
  await assert.rejects(
    () => svc.paylas('u1', { beforeDataUrl: 'a', afterDataUrl: 'b', consent: true }),
    /müşteri/i,
  );
});

test('ALICI LİSTESİ gönderi anında DONDURULUYOR', async () => {
  /*
   * Alıcıyı her okumada randevulardan hesaplasaydık, 6. günde ilk
   * randevusunu tamamlayan biri kendisiyle hiç ilgisi olmayan eski bir
   * paylaşımı görürdü.
   */
  const { svc, y } = servis({
    randevular: [RANDEVU('m1', 'tamamlandi', 1), RANDEVU('m2', 'kapandi', 2)],
    kullanicilar: [
      { id: 'm1', name: 'Aida' },
      { id: 'm2', name: 'Dana' },
    ],
  });
  await svc.paylas('u1', { beforeDataUrl: 'a', afterDataUrl: 'b', consent: true });
  const alicilar = (y.post!.recipients as { create: { userId: string }[] }).create;
  assert.deepEqual(alicilar.map((a) => a.userId).sort(), ['m1', 'm2']);
});

test('SON GEÇERLİLİK yedi gün sonrası', async () => {
  const { svc, y } = servis({
    randevular: [RANDEVU('m1', 'tamamlandi', 1)],
    kullanicilar: [{ id: 'm1', name: 'Aida' }],
  });
  const once = Date.now();
  await svc.paylas('u1', { beforeDataUrl: 'a', afterDataUrl: 'b', consent: true });
  const fark = (y.post!.expiresAt as Date).getTime() - once;
  const gun = 24 * 60 * 60 * 1000;
  assert.ok(Math.abs(fark - PAYLASIM_GUN * gun) < 5000, `süre yanlış: ${fark / gun} gün`);
});

test('HER ALICIYA bildirim gidiyor', async () => {
  const { svc, y } = servis({
    randevular: [RANDEVU('m1', 'tamamlandi', 1), RANDEVU('m2', 'tamamlandi', 2)],
    kullanicilar: [
      { id: 'm1', name: 'Aida' },
      { id: 'm2', name: 'Dana' },
    ],
  });
  await svc.paylas('u1', { beforeDataUrl: 'a', afterDataUrl: 'b', consent: true });
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(y.pushlar.map((p) => p.userId).sort(), ['m1', 'm2']);
  assert.ok(y.pushlar.every((p) => p.key === 'propost.new'));
});

test('SÜRESİ BİTEN kayıt VE fotoğraf siliniyor', async () => {
  /*
   * "Sadece gizle" demek, kişisel veriyi sunucuda süresiz saklamak
   * olurdu. Kurucu "sistemden silinecek" dedi.
   */
  const { svc, y } = servis({
    bitenler: [{ id: 'g1', beforeUrl: 'u/once.jpg', afterUrl: 'u/sonra.jpg' }],
  });
  const n = await svc.sureBitenleriTemizle();
  assert.equal(n, 1);
  assert.deepEqual(y.silinen, ['g1'], 'kayıt silinmedi');
  assert.deepEqual(y.silinenGorseller.sort(), ['u/once.jpg', 'u/sonra.jpg'], 'fotoğraf silinmedi');
});

test('BAŞKA GÖNDERİ aynı fotoğrafı kullanıyorsa dosya SİLİNMİYOR', async () => {
  /*
   * Depo içerik hash'iyle tekilleştiriyor: aynı görseli paylaşan iki
   * gönderi AYNI dosyayı gösteriyor. Birini silerken dosyayı da silmek,
   * ötekinin görselini kırardı.
   */
  const { svc, y } = servis({
    bitenler: [{ id: 'g1', beforeUrl: 'u/ortak.jpg', afterUrl: 'u/ortak.jpg' }],
    baskaKullanan: 1,
  });
  await svc.sureBitenleriTemizle();
  assert.deepEqual(y.silinenGorseller, [], 'paylaşılan dosya silindi');
  assert.deepEqual(y.silinen, ['g1'], 'kayıt yine de silinmeli');
});

test('temizlenecek bir şey yoksa DEPOYA dokunulmuyor', async () => {
  const { svc, y } = servis({ bitenler: [] });
  assert.equal(await svc.sureBitenleriTemizle(), 0);
  assert.deepEqual(y.silinenGorseller, []);
  assert.equal(y.silinen, undefined);
});
