import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { RatingsService } from './ratings.service';

/**
 * YORUM YANITI YALNIZ MUHATABINDAN.
 *
 * `POST /ratings/:id/reply` yalnız GİRİŞ istiyordu, "bu yorum sana mı
 * yazılmış" diye sormuyordu. Yani giriş yapmış HERKES — rakip bir uzman,
 * sıradan bir müşteri — başkasının yorumunun altına yanıt yazabiliyordu ve
 * yanıt ekranda "Salon yanıtı" diye görünüyordu.
 *
 * Müşteri, salonun ağzından yazılmış uydurma bir cümle okuyordu.
 */

type Kayit = Record<string, unknown>;

function servis(yorum: Kayit, uzmanlar: Kayit[] = [], isletmeler: Kayit[] = []) {
  const prisma = {
    rating: {
      findUnique: () => Promise.resolve({ ...yorum }),
      findMany: () => Promise.resolve([]),
      update: ({ data }: { data: Kayit }) => {
        Object.assign(yorum, data);
        return Promise.resolve({ ...yorum });
      },
    },
    specialist: {
      findFirst: ({ where }: { where: Kayit }) =>
        Promise.resolve(
          uzmanlar.find((u) => u.userId === where.userId && u.proId === where.proId) ?? null,
        ),
    },
    business: {
      findFirst: ({ where }: { where: Kayit }) =>
        Promise.resolve(
          isletmeler.find(
            (b) => b.ownerUserId === where.ownerUserId && b.professionalId === where.professionalId,
          ) ?? null,
        ),
    },
    setting: { findUnique: () => Promise.resolve(null) },
  };
  return { svc: new RatingsService(prisma as never), yorum };
}

const YORUM = (ek: Kayit = {}): Kayit => ({
  id: 'r1',
  subjectId: 'p1',
  visible: true,
  reply: '',
  ...ek,
});

test('BAŞKASININ yorumuna yanıt yazılamıyor', async () => {
  const { svc, yorum } = servis(YORUM(), [{ userId: 'rakip', proId: 'p9' }]);
  await assert.rejects(
    () => svc.reply('r1', 'Bu salon berbat', 'rakip'),
    /muhatabı|NOT_RATING_SUBJECT/,
  );
  assert.equal(yorum.reply, '', 'yorumun altına başkasının cümlesi yazıldı');
});

test('SIRADAN MÜŞTERİ salon ağzından konuşamıyor', async () => {
  const { svc } = servis(YORUM(), [], []);
  await assert.rejects(() => svc.reply('r1', 'Teşekkürler 🙏', 'musteri-1'), /muhatabı/);
});

test('BAĞIMSIZ UZMAN kendi yorumuna yanıt verebiliyor', async () => {
  const { svc, yorum } = servis(YORUM(), [{ userId: 'uzman-1', proId: 'p1' }]);
  await svc.reply('r1', 'Teşekkürler!', 'uzman-1');
  assert.equal(yorum.reply, 'Teşekkürler!');
});

test('SALON SAHİBİ işletmesinin yorumuna yanıt verebiliyor', async () => {
  const { svc, yorum } = servis(YORUM(), [], [{ ownerUserId: 'salon-1', professionalId: 'p1' }]);
  await svc.reply('r1', 'İlginiz için teşekkürler', 'salon-1');
  assert.equal(yorum.reply, 'İlginiz için teşekkürler');
});

test('AÇILMAMIŞ yoruma muhatabı da yanıt veremiyor', async () => {
  // §6.D — yanıt yalnız görünür (kalıcı) yoruma. Bu kural zaten vardı,
  // yetki kapısı eklenirken düşmediğini doğruluyoruz.
  const { svc } = servis(YORUM({ visible: false }), [{ userId: 'uzman-1', proId: 'p1' }]);
  await assert.rejects(() => svc.reply('r1', 'x', 'uzman-1'), /açılmamış/);
});

test('UÇ, GİRİŞ YAPAN KİŞİNİN kimliğini servise geçiriyor', () => {
  /*
   * Servis doğru kapıyı kursa bile, uç sabit ya da istemciden gelen bir
   * kimlik geçirirse kapı hiçbir şeye yaramaz. Bu tek satır davranışla
   * görülemiyor (sahte servis her kimliği kabul eder), kaynakla görülüyor.
   */
  const kaynak = readFileSync(new URL('./ratings.controller.ts', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.match(
    kaynak,
    /this\.ratings\.reply\(id, body\.reply, req\.user!\.id\)/,
    'yanıt ucu oturum kimliğini geçirmiyor — yetki kapısı boşa çalışır',
  );
});
