import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CommissionsService, reactivationAmount } from './commissions.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { PushService } from '../push/push.service';
import type { StorageService } from '../storage/storage.service';

/**
 * K3 — İŞLEM BAŞINA KOMİSYON (kurucu kararı, 31.08.2026).
 *
 * Eskiden komisyon YALNIZ admin panelinden elle "dönem kapat" çalıştırılınca
 * doğuyordu ve uzmana hiçbir bildirim gitmiyordu. Kurucunun gözlemi: "işlem her
 * iki taraftan onaylandığında uzmanın AYNA'ya komisyon ödeme ekranı açılmıyor
 * ya da o yola sokacak bir şey hiç yok."
 *
 * Bu dosya SAHTE prisma ile gerçek davranışı sınar — kaynak taraması değil.
 */

type Fatura = Record<string, unknown>;

function sahteOrtam(opts: { bookings: unknown[]; mevcutFatura?: string[] } = { bookings: [] }) {
  const yazilan: Fatura[] = [];
  const bildirim: Array<{ userId: string; data: unknown }> = [];
  const denetim: string[] = [];
  // Benzersiz bookingId kısıtını GERÇEKTEN uygula — testin değeri buna bağlı.
  const alinmisBooking = new Set<string>(opts.mevcutFatura ?? []);
  // (proId, periodStart, periodEnd) üçlüsü de benzersiz.
  const alinmisDonem = new Set<string>();

  const prisma = {
    booking: { findMany: async () => opts.bookings },
    payment: { findMany: async () => [] },
    setting: { findUnique: async () => null },
    business: { findFirst: async () => ({ ownerUserId: 'sahip-1' }) },
    auditLog: {
      create: async ({ data }: { data: { action: string } }) => {
        denetim.push(data.action);
        return {};
      },
    },
    commissionInvoice: {
      create: async ({ data }: { data: Fatura }) => {
        const bid = data.bookingId as string | null;
        if (bid && alinmisBooking.has(bid))
          throw Object.assign(new Error('dup'), { code: 'P2002' });
        // ISO kullanılıyor çünkü `String(Date)` MİLİSANİYE taşımıyor; gerçek
        // sütun `timestamptz(6)` yani mikrosaniye hassasiyetinde. Saniye
        // hassasiyetiyle taklit etmek 1 ms kaydırmayı görünmez kılardı.
        const anahtar = `${String(data.proId)}|${(data.periodStart as Date).toISOString()}|${(data.periodEnd as Date).toISOString()}`;
        if (alinmisDonem.has(anahtar)) throw Object.assign(new Error('dup'), { code: 'P2002' });
        if (bid) alinmisBooking.add(bid);
        alinmisDonem.add(anahtar);
        yazilan.push(data);
        return data;
      },
      findUnique: async ({ where }: { where: { bookingId: string } }) =>
        alinmisBooking.has(where.bookingId) && !yazilan.some((f) => f.bookingId === where.bookingId)
          ? { id: 'eski' }
          : null,
      findMany: async () => (opts.mevcutFatura ?? []).map((id) => ({ bookingId: id })),
    },
  } as unknown as PrismaService;

  const push = {
    sendToUser: async (userId: string, data: unknown) => {
      bildirim.push({ userId, data });
    },
  } as unknown as PushService;

  const svc = new CommissionsService(prisma, {} as StorageService, push);
  return { svc, yazilan, bildirim, denetim };
}

const randevu = (id: string, price: number, completedAt = new Date('2026-08-31T12:00:00Z')) => ({
  id,
  proId: 'pro-1',
  proName: 'Madina Studio',
  price,
  completedAt,
});

test('tamamlanan randevu için ANINDA fatura kesilir', async () => {
  const { svc, yazilan } = sahteOrtam({ bookings: [randevu('b1', 20_000)] });
  const n = await svc.invoiceForBookings(['b1']);
  assert.equal(n, 1);
  assert.equal(yazilan.length, 1);
  const f = yazilan[0]!;
  assert.equal(f.bookingId, 'b1');
  assert.equal(f.bookingsCount, 1);
  assert.equal(f.grossRevenue, 20_000);
  assert.equal(f.commissionAmount, 2000); // %10
  assert.equal(f.status, 'pending');
  // Oran ANLIK GÖRÜNTÜ olarak yazılmalı; sonradan değişirse eski fatura
  // açıklanamaz hâle gelirdi.
  assert.equal(f.commissionRate, 10);
});

test('uzman ödemeye YÖNLENDİRİLİR — sessiz fatura yok', async () => {
  const { svc, bildirim } = sahteOrtam({ bookings: [randevu('b1', 20_000)] });
  await svc.invoiceForBookings(['b1']);
  assert.equal(bildirim.length, 1);
  assert.equal(bildirim[0]!.userId, 'sahip-1');
  // Derin bağlantı ödeme ekranına gitmeli; yoksa uzman yine kendi aramak zorunda.
  assert.deepEqual((bildirim[0]!.data as { data: unknown }).data, {
    route: '/seller/commissions',
  });
});

test('ÇİFTE TAHSİLAT YASAĞI — aynı randevu iki kez faturalanmaz', async () => {
  // Müşteri teyidi ve zamanlayıcı AYNI randevu için ardarda çalışabilir.
  const { svc, yazilan } = sahteOrtam({ bookings: [randevu('b1', 20_000)] });
  await svc.invoiceForBookings(['b1']);
  await svc.invoiceForBookings(['b1']);
  assert.equal(yazilan.length, 1, 'randevu iki kez faturalandı — uzmandan iki kez tahsilat');
});

test('aynı uzmanın AYNI ANDA kapanan iki randevusu ikisi de faturalanır', async () => {
  // Zamanlayıcı `updateMany` ile 200 randevuyu TEK `now` ile kapatıyor, yani
  // (proId, periodStart, periodEnd) üçlüsü çakışıyor. Fatura KAYBOLMAMALI.
  const an = new Date('2026-08-31T12:00:00Z');
  const { svc, yazilan } = sahteOrtam({
    bookings: [randevu('b1', 20_000, an), randevu('b2', 30_000, an)],
  });
  const n = await svc.invoiceForBookings(['b1', 'b2']);
  assert.equal(n, 2, 'çakışma yüzünden fatura kaybedildi');
  assert.deepEqual(yazilan.map((f) => f.bookingId).sort(), ['b1', 'b2']);
});

test('komisyonu sıfır çıkan randevu fatura üretmez', async () => {
  // 0 ₸'lik faturayı uzmana bildirmek gürültüden ibaret olurdu.
  const { svc, yazilan, bildirim } = sahteOrtam({ bookings: [randevu('b1', 0)] });
  assert.equal(await svc.invoiceForBookings([]), 0);
  const n = await svc.invoiceForBookings(['b1']);
  assert.equal(n, 0);
  assert.equal(yazilan.length, 0);
  assert.equal(bildirim.length, 0);
});

test('KURAL · vade tamamlanmadan 45 DAKİKA sonra — gün değil', async () => {
  // Kurucu kuralı: uzman parayı aldıktan sonra 45 DAKİKA içinde ödemeli.
  // K3'ü yazarken vadeyi eski aylık modele bakarak 7 GÜN yapmıştım;
  // dakikalarla ölçülen bir kuralı güne çevirmek onu işlevsiz bırakıyordu.
  const an = new Date('2026-08-31T12:00:00Z');
  const { svc, yazilan } = sahteOrtam({ bookings: [randevu('b1', 20_000, an)] });
  await svc.invoiceForBookings(['b1']);
  const due = yazilan[0]!.dueDate as Date;
  assert.equal(due.getTime() - an.getTime(), 45 * 60_000, 'varsayılan vade 45 dakika değil');
});

test('E5 · vade ve tanınan süre admin panelinden yönetilebiliyor', () => {
  // Sözleşme gerekçesiyle pencere uzatılabilmeli (K5 hukuki notu); kod
  // değişikliği gerektirmesin.
  const dto = readFileSync(join(import.meta.dirname, '..', 'settings', 'settings.dto.ts'), 'utf8');
  assert.match(dto, /rate\.commission_due_minutes/, 'vade ayarı panelde yok');
  assert.match(dto, /rate\.commission_grace_minutes/, 'tanınan süre ayarı panelde yok');
});

test('TEK KURAL · dönem kapanışı yolu tamamen kaldırıldı', () => {
  // Kurucu: "para akışı ile ilgili birden fazla kural olamaz."
  // İki model birlikte durduğunda vadeler farklıydı (30 dk vs 7 gün) ve aynı
  // randevu iki kez faturalanabiliyordu; çifte tahsilat koruması yazmak zorunda
  // kalmıştım — o koruma zaten ikiliğin belirtisiydi.
  const svcKaynak = readFileSync(join(import.meta.dirname, 'commissions.service.ts'), 'utf8');
  assert.doesNotMatch(svcKaynak, /async closePeriod\(/, 'dönem kapanışı hâlâ serviste');
  const ctrl = readFileSync(join(import.meta.dirname, 'commissions-admin.controller.ts'), 'utf8');
  assert.doesNotMatch(ctrl, /close-period/, 'dönem kapatma ucu hâlâ açık');
  const panel = readFileSync(
    join(import.meta.dirname, '..', '..', '..', 'web-admin', 'app', 'page.tsx'),
    'utf8',
  );
  assert.doesNotMatch(panel, /Dönemi kapat/, 'panelde dönem kapatma düğmesi duruyor');
});

test('KURAL · yeniden açılış bedeli borcun İKİ KATI', () => {
  // "ödemediği komisyon bedelini X2 olacak şekilde ödeme yapmalı"
  assert.equal(reactivationAmount(2000), 4000);
  assert.equal(reactivationAmount(1234.56), 2469.12);
  assert.equal(reactivationAmount(0), 0);
  // Negatif borç diye bir şey yok; sıfıra sabitlenmeli.
  assert.equal(reactivationAmount(-500), 0);
});

test('KURAL · son uyarı askıya almadan ÖNCE ve bedeli söyleyerek gider', () => {
  // "eğer yapmazsa hesabının kapatılacağı bildirilmeli" + 2 katı "daha
  // öncesinde belirtilmeli". Askıya alındıktan sonra öğrenmek kuralı çiğner.
  const kaynak = readFileSync(join(import.meta.dirname, 'commissions.service.ts'), 'utf8');
  const m = /async runOverdue[\s\S]*?\n {2}\}/.exec(kaynak);
  assert.ok(m, 'runOverdue yok');
  assert.match(m[0], /title: 'Son uyarı — komisyon ödemesi'/, 'son uyarı gönderilmiyor');
  assert.match(m[0], /hesabın askıya alınır/, 'sonucu söylemiyor');
  assert.match(
    m[0],
    /Yeniden açmak için \$\{reactivationAmount\(borc\)\} ₸/,
    '2 katı önceden bildirilmiyor',
  );
  assert.match(m[0], /title: 'Hesabın askıya alındı'/, 'askıya alma bildirilmiyor');
});
