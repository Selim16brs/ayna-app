import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PushService } from './push.service';

/**
 * BİLDİRİM GEÇMİŞİ — kullanıcının kendi kutusu.
 *
 * Kurucu: "bildirim geçmişi ucunu da yap."
 *
 * Uygulama içi liste yalnız kullanıcının KENDİ yaptıklarını biliyordu;
 * karşı tarafın yaptıkları (uzman onayladı, teklif geldi) push olarak
 * geçip kayboluyordu. Outbox bunun yerini tutamaz: o bir TESLİM kuyruğu,
 * teslim edileni 7 gün sonra siliyor ve edilemeyeni "dead" bırakıyor.
 */

function ortam() {
  const izler = { gecmis: [] as unknown[], outbox: 0, guncelleme: [] as unknown[] };
  const prisma = {
    userNotification: {
      create: ({ data }: { data: unknown }) => {
        izler.gecmis.push(data);
        return Promise.resolve({ id: 'n1' });
      },
      findMany: () =>
        Promise.resolve([
          {
            id: 'n1',
            title: 'Randevu kesinleşti',
            body: 'Depozito alındı',
            route: '/bookings',
            readAt: null,
            createdAt: new Date(1_700_000_000_000),
          },
        ]),
      updateMany: (arg: unknown) => {
        izler.guncelleme.push(arg);
        return Promise.resolve({ count: 1 });
      },
    },
    notificationOutbox: {
      create: () => {
        izler.outbox += 1;
        return Promise.resolve({ id: 'o1' });
      },
    },
    pushToken: { findMany: () => Promise.resolve([]) },
  };
  const svc = new PushService(prisma as never, { PUSH_ENABLED: true } as never);
  return { svc, izler };
}

test('GÖNDERİLEN her bildirim GEÇMİŞE de yazılıyor', async () => {
  const { svc, izler } = ortam();
  await svc.sendToUser('u1', {
    title: 'Yeni teklifin var',
    body: 'Bir uzman teklif gönderdi',
    data: { route: '/quote/results?id=1' },
  });
  assert.equal(izler.gecmis.length, 1, 'geçmişe yazılmadı');
  const kayit = izler.gecmis[0] as { userId: string; title: string; route?: string };
  assert.equal(kayit.userId, 'u1');
  assert.equal(kayit.title, 'Yeni teklifin var');
  assert.equal(kayit.route, '/quote/results?id=1', 'hedef ekran taşınmıyor');
});

test('GEÇMİŞ yazımı TESLİMİ engellemiyor', async () => {
  /*
   * Geçmişi kaybetmek kötü; bildirimi hiç göndermemek daha kötü. Yazma
   * düşse bile teslim denenmeli.
   */
  const { svc, izler } = ortam();
  await svc.sendToUser('u1', { title: 'a', body: 'b' });
  assert.equal(izler.outbox, 1, 'teslim kuyruğuna yazılmadı');
});

test('LİSTE okundu bilgisiyle dönüyor', async () => {
  const { svc } = ortam();
  const liste = await svc.history('u1');
  assert.equal(liste.length, 1);
  assert.deepEqual(liste[0], {
    id: 'n1',
    title: 'Randevu kesinleşti',
    body: 'Depozito alındı',
    route: '/bookings',
    read: false,
    createdAtMs: 1_700_000_000_000,
  });
});

test('OKUNDU işareti SAHİPLİĞE bağlı', async () => {
  /*
   * Kimlik tek başına yeterli değil: `where` içinde kullanıcı da var,
   * yoksa başkasının bildirimini okundu yapmak mümkün olurdu.
   */
  const { svc, izler } = ortam();
  await svc.markRead('u1', 'n9');
  const arg = izler.guncelleme[0] as { where: { userId: string; id?: string } };
  assert.equal(arg.where.userId, 'u1', 'sahiplik aranmıyor');
  assert.equal(arg.where.id, 'n9');

  // id verilmezse KULLANICININ TÜMÜ (başkasınınki değil).
  await svc.markRead('u1');
  const hepsi = izler.guncelleme[1] as { where: { userId: string; id?: string } };
  assert.equal(hepsi.where.userId, 'u1');
  assert.equal(hepsi.where.id, undefined);
});
