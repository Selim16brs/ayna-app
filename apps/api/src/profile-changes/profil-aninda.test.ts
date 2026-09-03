/**
 * PROFİL DEĞİŞİKLİĞİ — çoğu anında, iletişim bilgisi onayla.
 *
 * Kurucu: "uzmanların telefon ve mailleri dışındaki şeyleri profillerinde
 * değiştirdiklerinde admin paneline onay almasına gerek yok."
 *
 * Eskiden HER değişiklik kuyruğa düşüyordu: tanıtım yazısındaki bir harfi
 * düzeltmek için bile admin bekleniyordu.
 *
 * ONAYDA KALANLAR telefon ve e-posta — kimlik doğrulama ve iletişim
 * kanalı. Sessizce değişirse hesap devri ya da müşteriyi platform dışına
 * çekme yolu açılır. Salonun "iletişim telefonu" da buna dahil.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ProfileChangesService } from './profile-changes.service';

const svcYap = () => {
  const cagrilar: Record<string, unknown[]> = { talep: [], userUpdate: [] };
  const prisma = {
    user: {
      findUnique: () => Promise.resolve({ id: 'u1', name: 'Eski Ad', role: 'professional' }),
      update: ({ data }: { data: unknown }) => {
        cagrilar['userUpdate']!.push(data);
        return Promise.resolve({});
      },
    },
    profileChangeRequest: {
      updateMany: () => Promise.resolve({}),
      create: ({ data }: { data: unknown }) => {
        cagrilar['talep']!.push(data);
        return Promise.resolve({ id: 'r1', ...(data as object) });
      },
    },
    auditLog: { create: () => Promise.resolve({}) },
  };
  return { svc: new ProfileChangesService(prisma as never), cagrilar };
};

test('tanıtım/isim/sosyal ANINDA — kuyruğa hiç girmiyor', async () => {
  const { svc, cagrilar } = svcYap();
  const r = await svc.submit('u1', { name: 'Yeni Ad', social: { instagram: 'x' } });
  assert.deepEqual(r.pending, [], 'bekleyen olmamalı');
  assert.equal(cagrilar['talep']!.length, 0, 'boş talep admin panelini dolduruyor');
  assert.deepEqual(cagrilar['userUpdate']![0], { name: 'Yeni Ad' }, 'isim yazılmadı');
});

test('TELEFON onay bekliyor', async () => {
  const { svc, cagrilar } = svcYap();
  const r = await svc.submit('u1', { phone: '+77009998877' });
  assert.deepEqual(r.pending, ['phone']);
  assert.equal(cagrilar['talep']!.length, 1, 'telefon değişikliği kuyruğa girmedi');
});

test('E-POSTA onay bekliyor', async () => {
  const { svc } = svcYap();
  const r = await svc.submit('u1', { email: 'yeni@ornek.kz' });
  assert.deepEqual(r.pending, ['email']);
});

test('KARIŞIK gönderimde ikisi AYRIŞIYOR', async () => {
  /*
   * Tek kaydetmede hem tanıtım hem telefon değişebilir. Tanıtımın telefonu
   * beklemesi kabul edilemez; telefonun tanıtımla birlikte sessizce geçmesi
   * de öyle.
   */
  const { svc, cagrilar } = svcYap();
  const r = await svc.submit('u1', { name: 'Yeni Ad', phone: '+77001112233' });
  assert.deepEqual(r.applied, ['name'], 'isim anında uygulanmadı');
  assert.deepEqual(r.pending, ['phone'], 'telefon beklemiyor');
  const talep = cagrilar['talep']![0] as { changes: Record<string, unknown> };
  assert.deepEqual(talep.changes, { phone: '+77001112233' }, 'kuyruğa fazlası girmiş');
});

test('SALON profilinde yalnız iletişim telefonu bekliyor', async () => {
  /*
   * Salon formu tek nesne gönderiyor. İçinden yalnız `contact` ayrılmalı;
   * tanıtım, adres ve fotoğraflar onunla birlikte beklememeli.
   */
  const { svc, cagrilar } = svcYap();
  const r = await svc.submit('u1', {
    salonProfile: {
      about: 'Yeni tanıtım',
      address: 'Yeni adres',
      photos: ['a'],
      contact: '+77005554433',
    },
  });
  assert.deepEqual(r.pending, ['salonProfile'], 'iletişim telefonu beklemiyor');
  const talep = cagrilar['talep']![0] as { changes: { salonProfile: Record<string, unknown> } };
  assert.deepEqual(
    talep.changes.salonProfile,
    { contact: '+77005554433' },
    'kuyruğa telefondan fazlası girmiş',
  );
  assert.ok(r.applied.includes('salonProfile'), 'diğer salon alanları uygulanmadı');
});

test('telefonsuz salon kaydetmesi kuyruğa GİRMİYOR', async () => {
  const { svc, cagrilar } = svcYap();
  const r = await svc.submit('u1', { salonProfile: { about: 'Sadece tanıtım' } });
  assert.deepEqual(r.pending, []);
  assert.equal(cagrilar['talep']!.length, 0);
});

test('boş isim User kaydını EZMİYOR', async () => {
  // Formdan boş isim gelirse mevcut ad silinmemeli.
  const { svc, cagrilar } = svcYap();
  await svc.submit('u1', { name: '   ' });
  assert.equal(cagrilar['userUpdate']!.length, 0, 'boş isim yazıldı');
});
