import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PushService } from './push.service';

/**
 * KULLANICININ KAPATTIĞI BİLDİRİM GERÇEKTEN GÖNDERİLMİYOR.
 *
 * Tercih sunucuya kaydediliyordu (`UserPrefs.notifJson`) ama push gönderen
 * kod onu HİÇ okumuyordu. Kullanıcı "Bakım hatırlatmaları"nı kapatıyor,
 * telefonu kapattığı bildirimi almaya devam ediyordu — tutulmayan bir söz.
 */

type Kayit = Record<string, unknown>;

function servis(notifJson: string | null) {
  const kutu: Kayit[] = [];
  const outbox: Kayit[] = [];
  const prisma = {
    user: { findUnique: () => Promise.resolve({ defaultLocale: 'tr' }) },
    userPrefs: { findUnique: () => Promise.resolve(notifJson === null ? null : { notifJson }) },
    userNotification: {
      create: (a: { data: Kayit }) => {
        kutu.push(a.data);
        return Promise.resolve(a.data);
      },
    },
    notificationOutbox: {
      create: (a: { data: Kayit }) => {
        outbox.push(a.data);
        return Promise.resolve({ id: `o${outbox.length}` });
      },
      findUnique: () => Promise.resolve(null),
    },
    pushToken: { findMany: () => Promise.resolve([]) },
  };
  return { svc: new PushService(prisma as never, {} as never), kutu, outbox };
}

const bekle = () => new Promise((r) => setImmediate(r));

test('KAPATILAN grupta push GÖNDERİLMİYOR', async () => {
  const { svc, outbox } = servis(JSON.stringify({ care: false }));
  await svc.sendTemplate('u1', 'reengage.due');
  await bekle();
  assert.equal(outbox.length, 0, 'kapatılan bildirim yine de telefona gidiyor');
});

test('kapatılsa bile UYGULAMA İÇİ KUTUYA yazılıyor', async () => {
  /*
   * Kullanıcı "telefonuma düşmesin" dedi, "hiç haberim olmasın" demedi.
   * Kaydı da silmek, kendi randevusunun geçmişini ondan saklamak olurdu —
   * üstelik bildirim kutusunu kendi açıyor.
   */
  const { svc, kutu } = servis(JSON.stringify({ care: false }));
  await svc.sendTemplate('u1', 'reengage.due');
  await bekle();
  assert.equal(kutu.length, 1, 'bildirim geçmişten de silindi');
});

test('AÇIK grupta push gönderiliyor', async () => {
  const { svc, outbox } = servis(JSON.stringify({ care: true }));
  await svc.sendTemplate('u1', 'reengage.due');
  await bekle();
  assert.equal(outbox.length, 1);
});

test('TERCİH KAYDI YOKSA push gönderiliyor', async () => {
  const { svc, outbox } = servis(null);
  await svc.sendTemplate('u1', 'booking.remind_1h');
  await bekle();
  assert.equal(outbox.length, 1, 'ayar yapmamış kullanıcı bildirim alamıyor');
});

test('BOZUK tercih kaydı bildirimleri KESMİYOR', async () => {
  const { svc, outbox } = servis('{bozuk json');
  await svc.sendTemplate('u1', 'booking.remind_1h');
  await bekle();
  assert.equal(outbox.length, 1);
});

test('ZORUNLU bildirim tercihe rağmen gidiyor', async () => {
  // Depozito süresi bitiyor: kaçırmak randevuyu kaybettirir.
  const { svc, outbox } = servis(JSON.stringify({ booking: false, care: false }));
  await svc.sendTemplate('u1', 'booking.deposit_last_minutes');
  await bekle();
  assert.equal(outbox.length, 1, 'para/süre bildirimi de susturuldu');
});

test('BİR GRUBU kapatmak diğerini kapatmıyor', async () => {
  const { svc, outbox } = servis(JSON.stringify({ care: false }));
  await svc.sendTemplate('u1', 'booking.remind_1h');
  await bekle();
  assert.equal(outbox.length, 1);
});
