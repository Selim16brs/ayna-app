import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ProfileChangesService } from './profile-changes.service';
import { encryptField, phoneHash } from '../common/crypto';

/**
 * TELEFON DEĞİŞİKLİĞİ — KULLANICI TALEP EDER, ADMIN ONAYLAR.
 *
 * Kurucu: "kullanıcının telefon numarasını değiştirme özelliği komple
 * kapalı. kullanıcı değişiklik gönderebilmesi lazım ve adminden onay
 * alması gerekir."
 *
 * SMS DOĞRULAMASI YOK — kurucu kararı: "biz neden telefon değişikliği
 * yaparken Mobizon'u araya sokuyoruz ki? o tamamen admin işi. Mobizon ile
 * telefonu doğrulama olayı zaten başka bir yerde var."
 *
 * Zincirin tamamı: kullanıcı bildirir → admin onaylar → numara değişir ve
 * DOĞRULANMAMIŞ işaretlenir → uygulama doğrulama ekranını gösterir.
 * Son halkanın testi `telefon-tazeleme.test.ts` içinde.
 */

const KEY = 'a'.repeat(64);
const ESKI = '77770001122';
const YENI = '77775553344';

function ortam(over: Record<string, unknown> = {}) {
  const izler = {
    userUpdate: [] as Record<string, unknown>[],
    istek: [] as Record<string, unknown>[],
  };
  const kullanicilar: Record<
    string,
    { id: string; phoneHash: string; status: string; name: string; role: string }
  > = {
    u1: {
      id: 'u1',
      phoneHash: phoneHash(ESKI, KEY),
      status: 'active',
      name: 'Ayşe',
      role: 'customer',
    },
    ...((over['users'] as object) ?? {}),
  };
  const prisma = {
    user: {
      findUnique: ({ where }: { where: { id?: string; phoneHash?: string } }) => {
        if (where.id) return Promise.resolve(kullanicilar[where.id] ?? null);
        return Promise.resolve(
          Object.values(kullanicilar).find((u) => u.phoneHash === where.phoneHash) ?? null,
        );
      },
      update: ({ data }: { data: Record<string, unknown> }) => {
        izler.userUpdate.push(data);
        return Promise.resolve({});
      },
    },
    otpCode: {
      findFirst: () =>
        Promise.resolve(
          'otp' in over
            ? over['otp']
            : {
                id: 'o1',
                codeHash: hashOtp('123456', KEY),
              },
        ),
      update: () => Promise.resolve({}),
    },
    profileChangeRequest: {
      updateMany: () => Promise.resolve({ count: 0 }),
      create: ({ data }: { data: Record<string, unknown> }) => {
        izler.istek.push(data);
        return Promise.resolve({ id: 'r1', ...data });
      },
      findUnique: () => Promise.resolve(over['req'] ?? null),
      update: ({ data }: { data: unknown }) => Promise.resolve({ id: 'r1', ...(data as object) }),
      findMany: () => Promise.resolve((over['kayitlar'] as unknown[]) ?? []),
    },
    auditLog: { create: () => Promise.resolve({}) },
  };
  const svc = new ProfileChangesService(prisma as never, { FIELD_ENCRYPTION_KEY: KEY } as never);
  return { svc, izler };
}

/* ── TALEP ─────────────────────────────────────────────────────────────── */

test('talep açılıyor ve ONAY BEKLİYOR', async () => {
  const { svc, izler } = ortam();
  const r = await svc.telefonTalebi('u1', YENI);
  assert.deepEqual(r.pending, ['phone']);
  assert.equal(izler.istek.length, 1);
  assert.equal(izler.istek[0]!['status'], 'pending', 'talep anında uygulanmış');
  // Numara HENÜZ değişmedi: onay bekliyor.
  assert.equal(izler.userUpdate.length, 0, 'onay beklemeden numara değişti');
});

test('BAŞKASINA AİT numara için talep açılmıyor', async () => {
  /*
   * Onaya bırakılsaydı admin, farkında olmadan iki hesabı aynı numaraya
   * bağlamayı onaylayabilirdi — `phoneHash` benzersiz olduğu için de
   * onay anında veritabanı hatası patlardı.
   */
  const { svc, izler } = ortam({
    users: {
      u2: {
        id: 'u2',
        phoneHash: phoneHash(YENI, KEY),
        status: 'active',
        name: 'B',
        role: 'customer',
      },
    },
  });
  await assert.rejects(() => svc.telefonTalebi('u1', YENI), /PHONE_TAKEN|kayıtlı/);
  assert.equal(izler.istek.length, 0);
});

test('SİLİNMİŞ hesabın numarası yeniden kullanılabiliyor', async () => {
  // Silinen hesap telefonu serbest bırakır (kayıt akışında da böyle).
  const { svc, izler } = ortam({
    users: {
      u2: {
        id: 'u2',
        phoneHash: phoneHash(YENI, KEY),
        status: 'deleted',
        name: 'B',
        role: 'customer',
      },
    },
  });
  await svc.telefonTalebi('u1', YENI);
  assert.equal(izler.istek.length, 1);
});

test('kendi numarası için talep açılmıyor', async () => {
  const { svc, izler } = ortam();
  await assert.rejects(() => svc.telefonTalebi('u1', ESKI), /PHONE_SAME|senin/);
  assert.equal(izler.istek.length, 0, 'admin boş yere meşgul edildi');
});

test('numara veritabanında AÇIK METİN saklanmıyor', async () => {
  const { svc, izler } = ortam();
  await svc.telefonTalebi('u1', YENI);
  const changes = izler.istek[0]!['changes'] as Record<string, unknown>;
  assert.equal(
    JSON.stringify(changes).includes(YENI),
    false,
    'tam numara talep kaydında açık duruyor',
  );
  assert.equal(changes['phone'], '…3344', 'maskeli hâli yok');
  assert.equal(typeof changes['phoneEnc'], 'string', 'şifreli numara yok');
  assert.equal(changes['phoneVerified'], false, 'doğrulanmadan doğrulanmış yazıldı');
});

/* ── ONAY ──────────────────────────────────────────────────────────────── */

const onayliTalep = () => ({
  id: 'r1',
  userId: 'u1',
  changes: {
    phone: '…3344',
    phoneEnc: encryptField(YENI, KEY).toString('hex'),
    phoneVerified: false,
  },
});

test('ONAY numarayı GERÇEKTEN değiştiriyor', async () => {
  /*
   * ── BU TESTİN SEBEBİ ────────────────────────────────────────────────
   * `approve()` YALNIZ `name` yazıyordu. Telefon zaten "onay gerektiren"
   * listesindeydi ama onaylansa bile numara değişmiyordu: kayıt
   * "approved" görünüyor, kullanıcının numarası aynı kalıyordu.
   * Sistem olmayan bir şeyi olmuş gösteriyordu.
   */
  const { svc, izler } = ortam({ req: onayliTalep() });
  await svc.approve('r1', 'admin1');
  assert.equal(izler.userUpdate.length, 1, 'onaylandı ama numara yazılmadı');
  const yazilan = izler.userUpdate[0]!;
  assert.equal(yazilan['phoneHash'], phoneHash(YENI, KEY), 'yanlış numara yazıldı');
  assert.ok(yazilan['phoneEnc'], 'şifreli numara yazılmadı');
  /*
   * DOĞRULANMAMIŞ. Bu akışta SMS yok; numaranın sahibi olduğu kanıtlanmadı,
   * yalnız admin uygun buldu. `true` yazmak sistemin kanıtı varmış gibi
   * davranması olurdu — ve kullanıcıya doğrulama ekranı hiç çıkmazdı.
   */
  assert.equal(yazilan['phoneVerified'], false, 'doğrulanmamış numara doğrulanmış sayıldı');
});

test('ONAY sırasında numarayı araya biri kaptıysa yazılmıyor', async () => {
  /*
   * Talep ile onay arasında dakikalar/günler geçebiliyor. Kontrolsüz
   * yazmak `phoneHash` benzersizliğine takılıp onayı yarıda bırakırdı ve
   * admin sebebini anlamazdı.
   */
  const { svc, izler } = ortam({
    req: onayliTalep(),
    users: {
      u2: {
        id: 'u2',
        phoneHash: phoneHash(YENI, KEY),
        status: 'active',
        name: 'B',
        role: 'customer',
      },
    },
  });
  await assert.rejects(() => svc.approve('r1', 'admin1'), /PHONE_TAKEN|alınmış/);
  assert.equal(izler.userUpdate.length, 0, 'başkasının numarası üstüne yazıldı');
});

test('telefon içermeyen onay eskisi gibi çalışıyor', async () => {
  // Mevcut akış bozulmamalı: yalnız isim değişikliği hâlâ uygulanıyor.
  const { svc, izler } = ortam({ req: { id: 'r1', userId: 'u1', changes: { name: 'Yeni Ad' } } });
  await svc.approve('r1', 'admin1');
  assert.equal(izler.userUpdate[0]!['name'], 'Yeni Ad');
});

/* ── ADMIN GÖRÜNÜMÜ ────────────────────────────────────────────────────── */

test('admin listesinde numara ÇÖZÜLÜ, şifreli hâli GİZLİ', async () => {
  const { svc } = ortam({ kayitlar: [{ id: 'r1', changes: onayliTalep().changes }] });
  const liste = await svc.list('pending');
  const c = (liste[0] as { changes: Record<string, unknown> }).changes;
  // Admin karar verebilmek için tam numarayı görmeli.
  assert.equal(c['phone'], YENI, 'admin numarayı göremiyor');
  // Şifreli hâlin panele gitmesinin faydası yok, sızma yüzeyi büyütür.
  assert.equal('phoneEnc' in c, false, 'şifreli numara panele sızıyor');
});

/* ── EKRAN ─────────────────────────────────────────────────────────────── */

test('kullanıcı için değiştirme yolu AÇIK', () => {
  /*
   * Kurucu: "komple kapalı." Profil ekranındaki alan salt okunurdu ve
   * "destek ile iletişime geç" diyordu — yani hiçbir yol yoktu.
   */
  const kok = join(import.meta.dirname, '..', '..', '..', 'mobile');
  const edit = readFileSync(join(kok, 'app/profile/edit.tsx'), 'utf8');
  assert.match(edit, /\/profile\/phone/, 'profil ekranından değiştirme yolu yok');
  const ekran = readFileSync(join(kok, 'app/profile/phone.tsx'), 'utf8');
  // Ekran KODU da istiyor: yalnız numara gönderen bir ekran, sunucudaki
  // korumayı kullanıcıya çıkmaz gibi gösterirdi.
  assert.match(ekran, /requestPhoneChange\(/, 'talep gönderilmiyor');
  // SMS BURADA YOK: kurucu kararı. Ekranın kod istemesi akışı tıkıyordu.
  assert.equal(/otpRequest\(/.test(ekran), false, 'telefon değişikliğinde SMS geri gelmiş');
});
