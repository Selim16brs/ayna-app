import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { BookingsService } from './bookings.service';

/**
 * HER EYLEM UCU, EYLEMİ YAPANIN ROLÜNÜ GERİ DÖNDÜRÜR.
 *
 * Kurucu (05.09.2026): "uzman ekranında ödemeyi yaptım yazıyor. ya bu nasıl
 * bir mantık! müşteri tarafında olması gereken ödemeyi yaptım butonu uzmanda
 * var."
 *
 * Sebep: `transition()` dönen kaydı `mapBooking(row)` ile üretiyordu ve o
 * fonksiyon rol bilmediğinde 'musteri' damgalıyordu. Yani uzman ne yaparsa
 * yapsın (onayla, işlemi bitirdim, ödeme aldım) sunucu ona MÜŞTERİ görünümü
 * geri veriyordu. Uygulama yerelde rolü koruduğu sürece gizli kalıyor, rol
 * yerelde yoksa (yeni kurulum, yoklamayla gelen kayıt) uzman müşteri
 * ekranını görüyordu.
 */

type Kayit = Record<string, unknown>;

function sahteOrtam(randevu: Kayit) {
  const prisma = {
    booking: {
      findUnique: () => Promise.resolve({ ...randevu }),
      findFirst: () => Promise.resolve(null),
      findMany: () => Promise.resolve([]),
      update: ({ data }: { data: Kayit }) => {
        Object.assign(randevu, data);
        return Promise.resolve({ ...randevu });
      },
      updateMany: () => Promise.resolve({ count: 0 }),
    },
    setting: { findUnique: () => Promise.resolve(null), findMany: () => Promise.resolve([]) },
    specialist: { findFirst: () => Promise.resolve({ userId: 'uzman-1', proId: 'p1' }) },
    business: { findFirst: () => Promise.resolve(null) },
    user: {
      findUnique: ({ where }: { where: { id: string } }) =>
        Promise.resolve({ id: where.id, role: 'user', pointsUnlockedAt: null }),
      findMany: () => Promise.resolve([]),
      updateMany: () => Promise.resolve({ count: 0 }),
    },
    loyaltyEntry: {
      findMany: () => Promise.resolve([]),
      create: () => Promise.resolve({}),
      createMany: () => Promise.resolve({ count: 0 }),
    },
    auditLog: { create: () => Promise.resolve({}) },
    professional: { findUnique: () => Promise.resolve(null) },
    $executeRaw: () => Promise.resolve(0),
    $transaction: async (fn: (tx: unknown) => unknown) => fn(prisma),
  };
  const svc = new BookingsService(
    prisma as never,
    { sendToUser: () => Promise.resolve(), sendTemplate: () => Promise.resolve() } as never,
    { put: async (x: string) => x } as never,
    { refundQuota: () => undefined, findActive: () => Promise.resolve(null) } as never,
  );
  return { svc, randevu };
}

const RANDEVU = (ek: Kayit = {}): Kayit => ({
  id: 'bk-1',
  userId: 'musteri-1',
  proId: 'p1',
  status: 'hizmet_gunu',
  price: 20000,
  depositAmount: 2000,
  startAt: new Date(Date.now() - 30 * 60_000),
  balanceDeclaredAt: null,
  finalPrice: null,
  depositForfeited: false,
  rescheduleCount: 0,
  responseReminders: 0,
  bySalon: false,
  ...ek,
});

test('UZMAN "işlemi bitirdim" derse UZMAN görünümü dönüyor', async () => {
  const { svc } = sahteOrtam(RANDEVU());
  const r = (await svc.complete('bk-1', 'uzman-1')) as { benimRolum?: string };
  assert.equal(r.benimRolum, 'uzman', 'uzmana müşteri görünümü dönüyor — müşteri düğmeleri çıkar');
});

test('UZMAN "ödemeyi aldım" derse UZMAN görünümü dönüyor', async () => {
  const { svc } = sahteOrtam(RANDEVU({ status: 'odeme_bekliyor', balanceDeclaredAt: new Date() }));
  const r = (await svc.balanceReceived('bk-1', 'uzman-1')) as { benimRolum?: string };
  assert.equal(r.benimRolum, 'uzman');
});

test('UZMAN randevuyu onaylarsa UZMAN görünümü dönüyor', async () => {
  const { svc } = sahteOrtam(RANDEVU({ status: 'onay_bekliyor' }));
  const r = (await svc.approve('bk-1', 'uzman-1')) as { benimRolum?: string };
  assert.equal(r.benimRolum, 'uzman');
});

test('MÜŞTERİ ödeme beyan ederse MÜŞTERİ görünümü dönüyor', async () => {
  const { svc } = sahteOrtam(RANDEVU());
  const r = (await svc.balancePaid('bk-1', 'musteri-1')) as { benimRolum?: string };
  assert.equal(r.benimRolum, 'musteri');
});

test('MÜŞTERİ iptal ederse MÜŞTERİ görünümü dönüyor', async () => {
  const { svc } = sahteOrtam(RANDEVU({ status: 'kesinlesti' }));
  const r = (await svc.cancel('bk-1', 'vazgeçtim', 'musteri-1')) as { benimRolum?: string };
  assert.equal(r.benimRolum, 'musteri');
});

test('ROL PARAMETRESİ ZORUNLU — yeni eylem ucu unutamaz', () => {
  /*
   * Rolü sınıf alanında tutmak (`lastActorId` gibi) eşzamanlı iki isteğin
   * birbirinin rolünü ezmesine açıktı: `assertParty` ile `transition`
   * arasında `await` var. Parametre zorunlu olduğu için hem yarış yok hem
   * de yeni bir uç yazan kişi geçmeyi unutamıyor — derleyici durduruyor.
   */
  const kaynak = readFileSync(new URL('./bookings.service.ts', import.meta.url), 'utf8');
  const i = kaynak.indexOf('private async transition(');
  assert.ok(i > 0, 'transition bulunamadı');
  const imza = kaynak.slice(i, kaynak.indexOf('{', kaynak.indexOf(') ', i)));
  assert.match(imza, /rol: ActorRole/, 'rol parametresi isteğe bağlı ya da yok');
  assert.doesNotMatch(imza, /rol\?: ActorRole/, 'rol parametresi isteğe bağlı — unutulabilir');
});

test('mapBooking ROLÜ ZORUNLU İSTİYOR — sessiz varsayılan yok', () => {
  /*
   * Asıl tuzak buradaydı: `forProvider` isteğe bağlıydı ve verilmediğinde
   * sessizce 'musteri' damgalıyordu. `mapBooking(row)` yazan her uç, hiçbir
   * uyarı almadan uzmana müşteri ekranını gönderiyordu.
   *
   * Zorunlu olunca sessiz varsayılan diye bir şey kalmıyor: rolü yazmayan
   * kod derlenmiyor.
   */
  const kaynak = readFileSync(new URL('./bookings.service.ts', import.meta.url), 'utf8');
  const i = kaynak.indexOf('function mapBooking(');
  assert.ok(i > 0, 'mapBooking bulunamadı');
  const imza = kaynak.slice(i, kaynak.indexOf(') {', i));
  assert.match(
    imza,
    /opts: \{ forProvider: boolean/,
    'rol isteğe bağlı — sessizce müşteri sanılır',
  );
  assert.doesNotMatch(imza, /opts\?:/, 'opts isteğe bağlı bırakılmış');
  assert.doesNotMatch(imza, /forProvider\?:/, 'forProvider isteğe bağlı bırakılmış');
});

test('ROL KİMLİKTEN TÜRETİLMİYOR — aynı kişi iki randevuda iki rolde', () => {
  /*
   * Kurucu önerisi (05.09.2026): "ID'lerin başına UZ/MU/SL ekleyelim, roller
   * de bu şekilde anlaşılsın."
   *
   * Öneri akla yakın ama rol KULLANICININ değil, RANDEVUNUN özelliği: bir
   * uzman başka bir uzmandan randevu aldığında o randevuda MÜŞTERİDİR.
   * Kimlik önekine bakan sistem ona uzman ekranını gösterirdi — bugünkü
   * hatanın aynısı, bu kez veriye gömülü olduğu için düzeltilemez hâlde.
   *
   * Bu test o kapıyı kapatıyor: aynı kullanıcı kimliği, iki farklı randevuda
   * iki farklı rol alabiliyor.
   */
  const { svc: svc1 } = sahteOrtam(RANDEVU({ userId: 'ayni-kisi', status: 'onay_bekliyor' }));
  const { svc: svc2 } = sahteOrtam(RANDEVU({ userId: 'ayni-kisi', status: 'kesinlesti' }));
  return Promise.all([
    svc1.approve('bk-1', 'uzman-1'),
    svc2.cancel('bk-1', 'vazgeçtim', 'ayni-kisi'),
  ]).then(([uzmanGorunumu, musteriGorunumu]) => {
    assert.equal((uzmanGorunumu as { benimRolum?: string }).benimRolum, 'uzman');
    assert.equal((musteriGorunumu as { benimRolum?: string }).benimRolum, 'musteri');
  });
});
