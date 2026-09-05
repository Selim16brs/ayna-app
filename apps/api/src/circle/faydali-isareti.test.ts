import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CircleService } from './circle.service';

/**
 * "FAYDALI" İŞARETİ UYDURULAMAZ.
 *
 * Uç kullanıcı kimliğini HİÇ almıyordu ve servis sayacı körlemesine
 * artırıyordu. Giriş yapmış herkes:
 *   · aynı gönderiyi sınırsız kez işaretleyip sayacı şişirebiliyor,
 *   · `on: false` göndererek BAŞKASININ gönderisinin işaretlerini sıfıra
 *     indirebiliyordu (sayaç 0'da kırpılıyordu, yani hepsi silinebiliyordu).
 *
 * Topluluğun güven sinyali tek satırlık bir döngüyle uydurulabiliyordu.
 */

type Kayit = Record<string, unknown>;

function servis(gonderi: Kayit, isaretler: Kayit[] = []) {
  const prisma = {
    circlePost: {
      findUnique: () => Promise.resolve({ ...gonderi }),
      update: ({ data }: { data: Kayit }) => {
        Object.assign(gonderi, data);
        return Promise.resolve({ helpful: gonderi.helpful });
      },
    },
    circleHelpful: {
      create: ({ data }: { data: Kayit }) => {
        if (isaretler.some((i) => i.userId === data.userId && i.postId === data.postId)) {
          return Promise.reject(Object.assign(new Error('unique'), { code: 'P2002' }));
        }
        isaretler.push(data);
        return Promise.resolve(data);
      },
      delete: ({ where }: { where: { userId_postId: { userId: string; postId: string } } }) => {
        const i = isaretler.findIndex(
          (x) => x.userId === where.userId_postId.userId && x.postId === where.userId_postId.postId,
        );
        if (i < 0) return Promise.reject(new Error('yok'));
        isaretler.splice(i, 1);
        return Promise.resolve({});
      },
      count: ({ where }: { where: { postId: string } }) =>
        Promise.resolve(isaretler.filter((i) => i.postId === where.postId).length),
    },
  };
  return { svc: new CircleService(prisma as never, {} as never, {} as never), gonderi, isaretler };
}

const GONDERI = (ek: Kayit = {}): Kayit => ({
  id: 'g1',
  status: 'published',
  helpful: 0,
  helpfulBase: 0,
  ...ek,
});

test('AYNI KİŞİ iki kez işaretleyince sayaç bir kez artıyor', async () => {
  const { svc, gonderi } = servis(GONDERI());
  await svc.setHelpful('u1', 'g1', true);
  await svc.setHelpful('u1', 'g1', true);
  await svc.setHelpful('u1', 'g1', true);
  assert.equal(gonderi.helpful, 1, 'sayaç döngüyle şişirilebiliyor');
});

test('FARKLI kişiler sayacı artırıyor', async () => {
  const { svc, gonderi } = servis(GONDERI());
  await svc.setHelpful('u1', 'g1', true);
  await svc.setHelpful('u2', 'g1', true);
  assert.equal(gonderi.helpful, 2);
});

test('KİMSE BAŞKASININ işaretini kaldıramıyor', async () => {
  /*
   * Asıl zarar buydu: rakip bir kullanıcı `on: false` göndererek başkasının
   * gönderisinin bütün işaretlerini silebiliyordu.
   */
  const { svc, gonderi } = servis(GONDERI());
  await svc.setHelpful('u1', 'g1', true);
  await svc.setHelpful('u2', 'g1', true);
  await svc.setHelpful('kotu', 'g1', false);
  await svc.setHelpful('kotu', 'g1', false);
  assert.equal(gonderi.helpful, 2, 'başkasının işaretleri silindi');
});

test('kişi KENDİ işaretini kaldırabiliyor', async () => {
  const { svc, gonderi } = servis(GONDERI());
  await svc.setHelpful('u1', 'g1', true);
  await svc.setHelpful('u1', 'g1', false);
  assert.equal(gonderi.helpful, 0);
});

test('GEÇMİŞ SAYAÇ korunuyor — uydurma kullanıcı listesi üretilmiyor', async () => {
  // Kişiye bağlanmadan önce biriken işaretlerin sahibi bilinmiyor; silmek de
  // uydurmak da yanlış olurdu. Yeni işaretler eskinin üstüne ekleniyor.
  const { svc, gonderi } = servis(GONDERI({ helpful: 5, helpfulBase: 5 }));
  await svc.setHelpful('u1', 'g1', true);
  assert.equal(gonderi.helpful, 6);
});

test('YAYINDA OLMAYAN gönderi işaretlenemiyor', async () => {
  // Moderasyondaki ya da kaldırılmış gönderi güven sinyali biriktirmemeli.
  const { svc } = servis(GONDERI({ status: 'pending' }));
  await assert.rejects(() => svc.setHelpful('u1', 'g1', true), /bulunamadı/);
});

test('UÇ, giriş yapan kişinin kimliğini geçiriyor', () => {
  const kaynak = readFileSync(new URL('./circle.controller.ts', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.match(
    kaynak,
    /setHelpful\(req\.user!\.id, id,/,
    'faydalı ucu kimliği geçirmiyor — sayaç yine uydurulabilir',
  );
});
