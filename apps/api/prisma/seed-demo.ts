import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { encryptField, hashPassword, normalizePhone, phoneHash } from '../src/common/crypto';

// AYNA — SUNUM/DEMO tohumu. 4 hazır hesap (hepsi Almatı, yakın konum):
//   1) Müşteri:            Darina Serbu
//   2) Bağımsız uzman:     Selim Vurgun
//   3) Salon (sahibi):     Asiye Yenikara  → "Asiye Güzellik Salonu"
//   4) Salona bağlı uzman: Oksana Serbu    → Asiye'nin salonuna bağlı
//
// Giriş: e-posta + şifre (aşağıda). Tekrar çalıştırılabilir — var olan hesabı atlar.
// Çalıştırma:  pnpm --filter @ayna/api exec tsx prisma/seed-demo.ts
// (DATABASE_URL ve FIELD_ENCRYPTION_KEY canlı sunucununkiyle aynı olmalı.)

const prisma = new PrismaClient();
const key = process.env.FIELD_ENCRYPTION_KEY ?? '';

const PASSWORD = 'ayna1234'; // dört hesap için ortak demo şifresi
const CITY = 'Almatı';

// Almatı — Dostyk/Medeu civarı; dördü de birbirine ~200 m
const LOC = {
  salon: { lat: 43.2386, lng: 76.955 }, // Asiye salonu (Oksana da burada)
  selim: { lat: 43.2401, lng: 76.9562 }, // bağımsız uzman
  darina: { lat: 43.2395, lng: 76.9541 }, // müşteri
};

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=70`;

const services = (rows: { id: string; name: string; price: number; durationMin: number }[]) =>
  JSON.stringify(rows);

// E-postaya göre idempotent kullanıcı oluşturur; varsa mevcut kaydı döndürür.
async function upsertUser(input: {
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'professional' | 'salon';
  gender?: 'female' | 'unspecified';
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    console.log(`  · zaten var: ${input.email} (${input.name})`);
    return existing;
  }
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phoneHash: phoneHash(input.phone, key),
      phoneEnc: Uint8Array.from(encryptField(normalizePhone(input.phone), key)),
      passwordHash: hashPassword(PASSWORD),
      role: input.role,
      status: 'active',
      city: CITY,
      gender: input.gender ?? 'unspecified',
      phoneVerified: true,
      defaultLocale: 'ru',
      timezone: 'Asia/Almaty',
    },
  });
  console.log(`  ✓ oluşturuldu: ${input.email} (${input.name})`);
  return user;
}

async function main(): Promise<void> {
  if (!key) throw new Error('FIELD_ENCRYPTION_KEY tanımlı değil — canlı sunucununkiyle aynı olmalı.');
  console.log('AYNA demo tohumu başlıyor…\n');

  // 1) MÜŞTERİ — Darina Serbu
  await upsertUser({
    name: 'Darina Serbu',
    email: 'darina.serbu@ayna.kz',
    phone: '+7 701 000 0001',
    role: 'user',
    gender: 'female',
  });

  // 2) BAĞIMSIZ UZMAN — Selim Vurgun
  const selimUser = await upsertUser({
    name: 'Selim Vurgun',
    email: 'selim.vurgun@ayna.kz',
    phone: '+7 701 000 0002',
    role: 'professional',
  });
  if (!(await prisma.specialist.findUnique({ where: { userId: selimUser.id } }))) {
    const pro = await prisma.professional.create({
      data: {
        name: 'Selim Vurgun',
        specialty: 'Saç & Renk Uzmanı',
        sector: 'hair',
        kind: 'independent',
        city: CITY,
        district: 'Almatı · Medeu',
        lat: LOC.selim.lat,
        lng: LOC.selim.lng,
        about: 'Bağımsız saç ve renk uzmanı. Hijyen ve fiyat şeffaflığı önceliğim.',
        rating: 4.8,
        reviewCount: 26,
        experienceYears: 9,
        priceFrom: 8000,
        imageUrl: img('photo-1503951914875-452162b0f3f1'),
        badge: 'verified',
        servicesJson: services([
          { id: 'svc-cut', name: 'Saç Kesimi', price: 8000, durationMin: 45 },
          { id: 'svc-color', name: 'Saç Boyama', price: 22000, durationMin: 120 },
          { id: 'svc-care', name: 'Bakım & Fön', price: 12000, durationMin: 60 },
        ]),
      },
    });
    await prisma.specialist.create({
      data: {
        userId: selimUser.id,
        kind: 'independent',
        proId: pro.id,
        bio: 'Bağımsız saç ve renk uzmanı — Almatı.',
        featured: true,
      },
    });
    console.log('    → keşif kaydı + uzman profili bağlandı');
  }

  // 3) SALON — Asiye Yenikara (sahip) → "Asiye Güzellik Salonu"
  const asiyeUser = await upsertUser({
    name: 'Asiye Yenikara',
    email: 'asiye.yenikara@ayna.kz',
    phone: '+7 701 000 0003',
    role: 'salon',
    gender: 'female',
  });
  let business = await prisma.business.findFirst({ where: { ownerUserId: asiyeUser.id } });
  if (!business) {
    const salonPro = await prisma.professional.create({
      data: {
        name: 'Asiye Güzellik Salonu',
        specialty: 'Güzellik Salonu',
        sector: 'hair',
        kind: 'salon',
        city: CITY,
        district: 'Almatı · Medeu',
        lat: LOC.salon.lat,
        lng: LOC.salon.lng,
        about: 'Almatı Medeu’de tam hizmet güzellik salonu. Saç, tırnak, makyaj.',
        rating: 4.9,
        reviewCount: 41,
        experienceYears: 7,
        priceFrom: 6000,
        imageUrl: img('photo-1560066984-138dadb4c035'),
        badge: 'verified',
      },
    });
    business = await prisma.business.create({
      data: {
        ownerUserId: asiyeUser.id,
        name: 'Asiye Güzellik Salonu',
        ownerName: 'Asiye Yenikara',
        sector: 'hair',
        about: 'Almatı Medeu’de tam hizmet güzellik salonu.',
        city: CITY,
        district: 'Medeu',
        address: 'Dostyk Ave 89, Almatı',
        lat: LOC.salon.lat,
        lng: LOC.salon.lng,
        phone: '+7 701 000 0003',
        email: 'asiye.yenikara@ayna.kz',
        workingHours: '10:00–20:00',
        categories: ['hair', 'nails', 'makeup'],
        status: 'approved',
        professionalId: salonPro.id,
      },
    });
    console.log('    → salon (onaylı) + keşif kaydı oluşturuldu');
  }

  // Salon davet kodları: biri Oksana için kullanılacak, biri canlı demo için boşta.
  const DEMO_CODE = 'ASIYE-DEMO'; // canlı demoda yeni uzman bağlamak istersen bu kod aktif kalır
  for (const [code, status] of [
    ['ASIYE-OKSANA', 'used'],
    [DEMO_CODE, 'active'],
  ] as const) {
    if (!(await prisma.businessInviteCode.findUnique({ where: { code } }))) {
      await prisma.businessInviteCode.create({
        data: { businessId: business.id, code, status },
      });
    }
  }

  // 4) SALONA BAĞLI UZMAN — Oksana Serbu → Asiye'nin salonu
  const oksanaUser = await upsertUser({
    name: 'Oksana Serbu',
    email: 'oksana.serbu@ayna.kz',
    phone: '+7 701 000 0004',
    role: 'professional',
    gender: 'female',
  });
  if (!(await prisma.specialist.findUnique({ where: { userId: oksanaUser.id } }))) {
    await prisma.specialist.create({
      data: {
        userId: oksanaUser.id,
        businessId: business.id,
        kind: 'salon_bound',
        bio: 'Asiye Güzellik Salonu — makyaj & tırnak uzmanı.',
        featured: false,
      },
    });
    // Oksana'nın kullandığı davet kodunu ona işaretle
    await prisma.businessInviteCode
      .update({ where: { code: 'ASIYE-OKSANA' }, data: { status: 'used', usedByUserId: oksanaUser.id } })
      .catch(() => undefined);
    console.log('    → Asiye salonuna bağlı uzman olarak eklendi');
  }

  console.log('\n✅ Demo tohumu tamam. Giriş bilgileri:');
  console.log('  Müşteri            → darina.serbu@ayna.kz   / ' + PASSWORD);
  console.log('  Bağımsız uzman     → selim.vurgun@ayna.kz   / ' + PASSWORD);
  console.log('  Salon (sahibi)     → asiye.yenikara@ayna.kz / ' + PASSWORD);
  console.log('  Salona bağlı uzman → oksana.serbu@ayna.kz   / ' + PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
