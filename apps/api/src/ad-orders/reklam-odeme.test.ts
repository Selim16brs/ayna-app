import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AdOrdersService } from './ad-orders.service';

/**
 * REKLAM ÖDEMESİ — Kaspi + dekont + admin onayı.
 *
 * Para söz konusu: burada yanlış giden her şey ya ödenmemiş reklamın yayına
 * girmesi ya da ödenmiş reklamın yayınlanmaması demek.
 */

const svcYap = (over: Record<string, unknown> = {}) => {
  const cagrilar: Record<string, unknown[]> = { bannerCreate: [], orderUpdate: [] };
  const prisma = {
    setting: { findUnique: () => Promise.resolve({ intValue: 200_000 }) },
    adOrder: {
      create: ({ data }: { data: unknown }) => Promise.resolve({ id: 'o1', ...(data as object) }),
      findUnique: () => Promise.resolve(over['order'] ?? null),
      findFirst: () => Promise.resolve(over['tekrar'] ?? null),
      update: ({ data }: { data: unknown }) => {
        cagrilar['orderUpdate']!.push(data);
        return Promise.resolve({ id: 'o1', ...(data as object) });
      },
    },
    adBanner: {
      create: ({ data }: { data: unknown }) => {
        cagrilar['bannerCreate']!.push(data);
        return Promise.resolve({ id: 'b1' });
      },
    },
    auditLog: { create: () => Promise.resolve({}) },
    /*
     * Uzman kimliği artık SUNUCUDA türetiliyor: istemci kullanıcı kimliği
     * gönderiyordu ve reklam kartı olmayan bir uzmana gidiyordu. Sahte
     * kayıtlar o çözümü taklit ediyor.
     */
    specialist: {
      // `??` kullanılamaz: açıkça `null` geçmek "kayıt yok" demek, oysa
      // `null ?? varsayılan` varsayılanı döndürür ve test hep uzman bulur.
      findFirst: () => Promise.resolve('specialist' in over ? over['specialist'] : { proId: 'p1' }),
    },
    business: { findFirst: () => Promise.resolve('business' in over ? over['business'] : null) },
  };
  // Bildirimler ŞABLONDAN gidiyor (kk/ru turu); sahte servis ikisini de tanır.
  const push = { sendToUser: () => Promise.resolve(), sendTemplate: () => Promise.resolve() };
  const storage = { put: (x: string) => Promise.resolve(x) };
  return {
    svc: new AdOrdersService(prisma as never, push as never, storage as never),
    cagrilar,
  };
};

test('DEKONTSUZ reklam yayına ALINAMAZ', async () => {
  // Onay düğmesi dekont olmadan da basılabilir. Sunucu buna izin verseydi
  // hiç ödenmemiş bir reklam vitrine düşerdi.
  const { svc, cagrilar } = svcYap({ order: { id: 'o1', receiptUri: null, months: 1 } });
  await assert.rejects(() => svc.onayla('o1'), /RECEIPT_MISSING|Dekont/);
  assert.equal(cagrilar['bannerCreate']!.length, 0, 'dekontsuz reklam üretildi');
});

test('onayda reklam SATIN ALINAN SÜRE kadar yayınlanıyor', async () => {
  const { svc, cagrilar } = svcYap({
    order: {
      id: 'o1',
      userId: 'u1',
      proId: 'p1',
      months: 3,
      placement: 'firsatlar',
      title: 'T',
      subtitle: '',
      image: 'i',
      receiptUri: 'r',
    },
  });
  await svc.onayla('o1');
  const b = cagrilar['bannerCreate']![0] as { startsAt: Date; endsAt: Date; placement: string };
  const gun = Math.round((b.endsAt.getTime() - b.startsAt.getTime()) / 86_400_000);
  assert.equal(gun, 90, '3 aylık sipariş 90 gün yayınlanmıyor');
  assert.equal(b.placement, 'firsatlar', 'satın alınan vitrin uygulanmıyor');
});

test('sipariş anında TUTAR DONDURULUYOR', async () => {
  // Uzman 200.000'i görüp öderken admin fiyatı değiştirirse, ödenen ile
  // beklenen tutar ayrışırdı. Tutar sipariş kaydına yazılıyor.
  const { svc } = svcYap();
  const o = (await svc.olustur('u1', {
    proName: 'P',
    placement: 'one_cikanlar',
    title: 'T',
    image: 'i',
    months: 2,
  })) as unknown as { amount: number };
  assert.equal(o.amount, 400_000, '2 ay için tutar dondurulmadı');
});

test('AYNI DEKONT iki siparişte kullanılamaz', async () => {
  // Depozitodaki kuralın aynısı: tek ödeme iki reklamı açmasın.
  const { svc } = svcYap({
    order: { id: 'o1', userId: 'u1', status: 'bekliyor' },
    tekrar: { id: 'baska' },
  });
  await assert.rejects(
    () => svc.dekontYukle('u1', 'o1', 'ayni-dekont'),
    /RECEIPT_REUSED|kullanılmış/,
  );
});

test('fiyat PANELDEN yönetiliyor, koda gömülü değil', () => {
  const dto = readFileSync(join(import.meta.dirname, '..', 'settings', 'settings.dto.ts'), 'utf8');
  assert.match(
    dto,
    /rate\.ad_monthly_kzt/,
    'reklam ücreti panelde yok — değiştirmek sürüm gerektirir',
  );
});

test('tablo dağıtımda AÇILIYOR', () => {
  // Railway `db push` çalıştırıyor, `migrate deploy` DEĞİL.
  const sql = readFileSync(
    join(import.meta.dirname, '..', '..', 'prisma', 'pre-push', '04-reklam-siparisi.sql'),
    'utf8',
  );
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "ad_orders"/, 'tablo üretimde hiç oluşmaz');
  assert.match(sql, /ad_orders_receipt_hash_key/, 'aynı dekont iki kez kullanılabilir');
});

/*
 * UZMAN KİMLİĞİ — istemciden değil sunucudan.
 *
 * Kurucu: "senin için seçtiklerimize tıklayınca hiçbir şey açılmıyor."
 * Sebep: istemci `currentUser.id` (KULLANICI kimliği) gönderiyordu, sunucu
 * doğrulamadan `pro_id` alanına yazıyordu. Kart olmayan bir uzmana
 * gidiyor, ekran sonsuza kadar "Yükleniyor"da kalıyordu.
 *
 * Aynı kural değerlendirmelerde zaten vardı ("subjectId istemciden
 * GÜVENİLMEZ — randevudan sunucuda türetilir"); reklamda eksikti.
 */

test('uzman kimliği SUNUCUDA türetiliyor — istemciden alınmıyor', async () => {
  const { svc } = svcYap({ specialist: { proId: 'gercek-uzman' } });
  const o = (await svc.olustur('u1', {
    proName: 'P',
    placement: 'one_cikanlar',
    title: 'T',
    image: 'i',
  })) as unknown as { proId: string };
  assert.equal(o.proId, 'gercek-uzman', 'kimlik uzman kaydından gelmiyor');
});

test('salon hesabı için işletme kaydından türetiliyor', async () => {
  const { svc } = svcYap({ specialist: null, business: { professionalId: 'salon-uzman' } });
  const o = (await svc.olustur('u1', {
    proName: 'P',
    placement: 'one_cikanlar',
    title: 'T',
    image: 'i',
  })) as unknown as { proId: string };
  assert.equal(o.proId, 'salon-uzman', 'salon kaydı çözülmüyor');
});

test('katalog kaydı olmayan hesap reklam VEREMEZ', async () => {
  // Verilseydi kart hiçbir yere gitmeyen bir bağlantı olurdu — hatanın
  // kendisi buydu.
  const { svc } = svcYap({ specialist: null, business: null });
  await assert.rejects(
    () =>
      svc.olustur('u1', {
        proName: 'P',
        placement: 'one_cikanlar',
        title: 'T',
        image: 'i',
      }),
    /no_professional/,
  );
});

test('reklamın AÇIKLAMASI kaydediliyor ve yayına taşınıyor', async () => {
  // Kurucu: "reklamın neyi anlattığını anlatan bir alan olmalı."
  const { svc, cagrilar } = svcYap({
    order: {
      id: 'o1',
      receiptUri: 'r',
      months: 1,
      proId: 'p1',
      title: 'T',
      subtitle: 'S',
      description: 'Bu reklam kış bakım paketini anlatıyor.',
      image: 'i',
      placement: 'one_cikanlar',
    },
  });
  await svc.onayla('o1');
  const banner = cagrilar['bannerCreate']![0] as { description?: string };
  assert.equal(
    banner.description,
    'Bu reklam kış bakım paketini anlatıyor.',
    'açıklama yayınlanan reklama taşınmıyor',
  );
});
