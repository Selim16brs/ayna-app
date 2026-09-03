import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACILIS_MESAJLARI } from '@ayna/domain';
import { splashMesajSemasi, splashOlcumSemasi } from './splash.dto';
import { SplashService } from './splash.service';

/**
 * AÇILIŞ MESAJLARI — sunucu (brief §7.1, §7.2, §7.3).
 */

const SATIR_TASLAK = {
  grup: 'A',
  etiket: 'neutral',
  active: true,
  sira: 0,
  saatBas: null,
  saatSon: null,
  haftaSonu: false,
  gunler: [] as number[],
  pencereBasAy: null,
  pencereBasGun: null,
  pencereSonAy: null,
  pencereSonGun: null,
  oncelikliOzelGun: false,
  adGerekli: false,
  dogumGunu: false,
  adsizTr: null,
  adsizKk: null,
  adsizRu: null,
  davranis: null,
  updatedAt: new Date('2026-09-04T10:00:00Z'),
};

const satir = (code: string, over: Record<string, unknown> = {}) => ({
  ...SATIR_TASLAK,
  code,
  tr: 'Merhaba',
  kk: 'Сәлем',
  ru: 'Привет',
  ...over,
});

function servis(satirlar: unknown[] = [], stats: unknown[] = []) {
  const yazilan: unknown[] = [];
  const prisma = {
    splashMessage: {
      findMany: () => Promise.resolve(satirlar),
      findUnique: ({ where }: { where: { code: string } }) =>
        Promise.resolve(
          (satirlar as { code: string }[]).find((s) => s.code === where.code) ?? null,
        ),
      create: ({ data }: { data: unknown }) => {
        yazilan.push(data);
        return Promise.resolve(data);
      },
      upsert: ({ create }: { create: unknown }) => {
        yazilan.push(create);
        return Promise.resolve(create);
      },
      update: ({ data }: { data: unknown }) => Promise.resolve(data),
    },
    splashStat: {
      upsert: (arg: unknown) => {
        yazilan.push(arg);
        return Promise.resolve({});
      },
      groupBy: () => Promise.resolve(stats),
    },
  };
  return { s: new SplashService(prisma as never), yazilan };
}

test('TABLO BOŞKEN yerel paket dönüyor — boş katalog gönderilmiyor', async () => {
  /*
   * Boş liste dönseydik cihaz "uzak katalog geldi" deyip kendi paketini
   * bırakabilirdi: açılışta boş ekran. Panelde satır olmaması normaldir.
   */
  const { s } = servis([]);
  const k = await s.katalog();
  assert.equal(k.surum, 'yerel');
  assert.equal(k.mesajlar.length, ACILIS_MESAJLARI.length);
});

test('SATIRLAR mesaja çevriliyor; koşullar korunuyor', async () => {
  const { s } = servis([
    satir('uzak_01'),
    satir('uzak_02', {
      saatBas: 5,
      saatSon: 11,
      gunler: [1, 2],
      pencereBasAy: 3,
      pencereBasGun: 21,
      pencereSonAy: 3,
      pencereSonGun: 23,
      oncelikliOzelGun: true,
      davranis: 'ilk_acilis',
    }),
  ]);
  const k = await s.katalog();
  const m = k.mesajlar.find((x) => x.id === 'uzak_02')!;
  assert.deepEqual(m.saat, [5, 11]);
  assert.deepEqual(m.gunler, [1, 2]);
  assert.deepEqual(m.pencere, { bas: [3, 21], son: [3, 23] });
  assert.equal(m.oncelikliOzelGun, true);
  assert.equal(m.davranis, 'ilk_acilis');
  // Koşulsuz satırda hiçbir koşul UYDURULMUYOR.
  const sade = k.mesajlar.find((x) => x.id === 'uzak_01')!;
  assert.equal(sade.saat, undefined);
  assert.equal(sade.pencere, undefined);
  assert.equal(sade.haftaSonu, undefined);
});

test('BOZUK katalog YAYINLANMIYOR — yerel pakete düşülüyor', async () => {
  /*
   * Cihazın uygulayacağı doğrulamanın aynısı burada da koşuyor. Yalnız
   * koşullu mesaj kalırsa genel havuz boşalır: cihaz bunu zaten
   * reddederdi, biz de göndermiyoruz.
   */
  const { s } = servis([satir('yalniz_sabah', { saatBas: 5, saatSon: 11 })]);
  const k = await s.katalog();
  assert.equal(k.surum, 'yerel', 'havuzu boş bırakan katalog yayınlandı');
});

test('PASİF satırlar kataloğa girmiyor', async () => {
  const { s } = servis([]);
  // findMany where: { active: true } ile çağrılıyor — servis pasifi
  // kendisi ayıklamıyor, sorguda ayıklıyor. Sorgunun filtresini sınıyoruz.
  let filtre: unknown = null;
  const prisma = {
    splashMessage: {
      findMany: (a: { where?: unknown }) => ((filtre = a.where), Promise.resolve([])),
    },
  };
  await new SplashService(prisma as never).katalog();
  assert.deepEqual(filtre, { active: true });
  void s;
});

test('SÜRÜM en son değişiklik zamanı — değişiklikte ilerliyor', async () => {
  const eski = await servis([satir('a')]).s.katalog();
  const yeni = await servis([
    satir('a'),
    satir('b', { updatedAt: new Date('2026-10-01T00:00:00Z') }),
  ]).s.katalog();
  assert.notEqual(eski.surum, yeni.surum);
  assert.equal(yeni.surum, '2026-10-01T00:00:00.000Z');
});

test('YEREL PAKET AKTARIMI var olan satıra dokunmuyor', async () => {
  /*
   * Aktarım yöneticinin düzenlemesini geri alsaydı, bir tuşa yanlışlıkla
   * basmak bütün panel emeğini silerdi.
   */
  const { s, yazilan } = servis([satir(ACILIS_MESAJLARI[0]!.id, { tr: 'ELLE DEĞİŞTİRİLDİ' })]);
  const sonuc = await s.yerelPaketiAktar();
  assert.equal(sonuc.eklenen, ACILIS_MESAJLARI.length - 1);
  assert.ok(
    !yazilan.some((y) => (y as { code: string }).code === ACILIS_MESAJLARI[0]!.id),
    'var olan mesaj yeniden yazıldı',
  );
});

test('ÖLÇÜM kişiye ait hiçbir alan taşımıyor', () => {
  /*
   * Gizlilik kuralı: PII analitiğe ASLA. Şema kullanıcı kimliği kabul
   * etmiyor; gönderilse bile düşüyor.
   */
  const g = splashOlcumSemasi.parse({
    code: 'msg_01',
    locale: 'tr',
    atlandi: true,
    userId: 'kim-bu',
    telefon: '+7700',
  });
  assert.deepEqual(Object.keys(g).sort(), ['atlandi', 'code', 'locale']);
});

test('ÖLÇÜM sayacı gün+mesaj+dil kırılımında artıyor', async () => {
  const { s, yazilan } = servis();
  await s.olcumYaz({
    code: 'msg_01',
    locale: 'tr',
    atlandi: true,
    gun: new Date('2026-09-04T22:30:00Z'),
  });
  const a = yazilan[0] as { where: { gun_code_locale: { gun: Date } }; create: { atlama: number } };
  assert.equal(a.where.gun_code_locale.gun.toISOString(), '2026-09-04T00:00:00.000Z');
  assert.equal(a.create.atlama, 1);

  const { s: s2, yazilan: y2 } = servis();
  await s2.olcumYaz({
    code: 'msg_01',
    locale: 'tr',
    atlandi: false,
    gun: new Date('2026-09-04T22:30:00Z'),
  });
  assert.equal(
    (y2[0] as { create: { atlama: number } }).create.atlama,
    0,
    'atlanmayan gösterim atlama saydı',
  );
});

test('RAPOR gösterimi olmayan mesaja SKİP ORANI UYDURMUYOR', async () => {
  /*
   * 0 yazsaydık "hiç atlanmıyor" gibi okunur, düşük performanslı mesaj
   * ayıklaması (brief §7.3) yanlış mesajı korurdu.
   */
  const { s } = servis(
    [],
    [
      { code: 'bos', _sum: { gosterim: 0, atlama: 0 } },
      { code: 'kotu', _sum: { gosterim: 100, atlama: 80 } },
      { code: 'iyi', _sum: { gosterim: 100, atlama: 5 } },
    ],
  );
  const r = await s.rapor();
  assert.equal(r.find((x) => x.code === 'bos')!.skipOrani, null);
  assert.equal(r.find((x) => x.code === 'kotu')!.skipOrani, 0.8);
  // En çok atlanan başta: ayıklanacak mesaj listenin üstünde.
  assert.equal(r[0]!.code, 'kotu');
});

test('PANELDE üç dil ZORUNLU', () => {
  const taban = { grup: 'A', metin: { tr: 'a', kk: 'b', ru: 'c' } };
  assert.ok(splashMesajSemasi.safeParse(taban).success);
  // ÜÇ dilin her biri ayrı ayrı sınanıyor: yalnız birini test etseydim
  // diğer ikisinin denetimi sessizce kalkabilirdi (mutasyon bunu gösterdi).
  for (const eksik of [
    { kk: 'b', ru: 'c' },
    { tr: '', kk: 'b', ru: 'c' },
    { tr: '  ', kk: 'b', ru: 'c' },
    { tr: 'a', ru: 'c' },
    { tr: 'a', kk: '  ', ru: 'c' },
    { tr: 'a', kk: 'b' },
    { tr: 'a', kk: 'b', ru: '' },
  ]) {
    assert.equal(
      splashMesajSemasi.safeParse({ ...taban, metin: eksik }).success,
      false,
      JSON.stringify(eksik),
    );
  }
});

test('PANELDE penceresiz öncelikli özel gün reddediliyor', () => {
  const taban = { grup: 'E', metin: { tr: 'a', kk: 'b', ru: 'c' } };
  assert.equal(splashMesajSemasi.safeParse({ ...taban, oncelikliOzelGun: true }).success, false);
  assert.ok(
    splashMesajSemasi.safeParse({
      ...taban,
      oncelikliOzelGun: true,
      pencere: { bas: [3, 21], son: [3, 23] },
    }).success,
  );
});

test('PANELDE {name} taşıyan mesaj adsız karşılıksız kaydedilemiyor', () => {
  /*
   * Adı olmayan kullanıcıya ham "{name}" göstermek, sistemin uydurma
   * yapmasının en görünür hâli olurdu.
   */
  const taban = {
    grup: 'F',
    metin: { tr: 'Merhaba {name}!', kk: 'Сәлем {name}!', ru: 'Привет, {name}!' },
  };
  assert.equal(splashMesajSemasi.safeParse(taban).success, false);
  assert.ok(splashMesajSemasi.safeParse({ ...taban, adGerekli: true }).success);
  assert.ok(
    splashMesajSemasi.safeParse({
      ...taban,
      adsizMetin: { tr: 'Merhaba!', kk: 'Сәлем!', ru: 'Привет!' },
    }).success,
  );
});

test('PANELDE ters saat aralığı reddediliyor', () => {
  const taban = { grup: 'C', metin: { tr: 'a', kk: 'b', ru: 'c' } };
  assert.equal(splashMesajSemasi.safeParse({ ...taban, saat: [17, 5] }).success, false);
  assert.equal(splashMesajSemasi.safeParse({ ...taban, saat: [5, 5] }).success, false);
  assert.ok(splashMesajSemasi.safeParse({ ...taban, saat: [17, 24] }).success);
});
