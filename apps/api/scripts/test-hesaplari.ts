/* eslint-disable no-console */
/**
 * TEST HESAPLARI — hem uzman hem müşteri, her paket katmanında.
 *
 * Kurucunun isteği: profili tamamlanmış, hizmet listesi ve sertifikaları olan,
 * KYC onaylı bir uzman; ayrıca farklı paketlerde (free / premium / platinum)
 * müşteri ve uzman hesapları. Böylece hangi özelliğin hangi pakette açık
 * olduğu GERÇEK hesaplarla denenebiliyor.
 *
 * ÇALIŞTIRMA (üretim veritabanına bağlanır — DATABASE_URL gerekir):
 *
 *   cd apps/api && pnpm exec tsx scripts/test-hesaplari.ts
 *
 * Parolalar burada ÜRETİLİYOR ve dosyaya yazılıyor; ekrana basılmıyor.
 * Betik idempotent: aynı telefonla ikinci kez çalıştırılırsa hesabı
 * GÜNCELLER, ikinci bir kayıt açmaz.
 *
 * UYARI — bu hesaplar TEST içindir. Yayına çıkmadan önce silinmeli;
 * `pnpm exec tsx scripts/test-hesaplari.ts --sil` hepsini kaldırır.
 */
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { encryptField, hashPassword, phoneHash } from '../src/common/crypto';

const prisma = new PrismaClient();
const SIR = process.env.FIELD_SECRET ?? process.env.ENCRYPTION_SECRET ?? 'dev-secret';

type Katman = 'free' | 'premium' | 'platinum';
type Tanim = {
  etiket: string;
  telefon: string;
  ad: string;
  rol: 'user' | 'professional';
  katman: Katman;
};

/** Her rol × her katman: özelliklerin nerede açıldığı böyle karşılaştırılır. */
const HESAPLAR: Tanim[] = [
  {
    etiket: 'Müşteri · ücretsiz',
    telefon: '+77000000101',
    ad: 'Ayla Test',
    rol: 'user',
    katman: 'free',
  },
  {
    etiket: 'Müşteri · premium',
    telefon: '+77000000102',
    ad: 'Bahar Test',
    rol: 'user',
    katman: 'premium',
  },
  {
    etiket: 'Müşteri · platinum',
    telefon: '+77000000103',
    ad: 'Ceren Test',
    rol: 'user',
    katman: 'platinum',
  },
  {
    etiket: 'Uzman · ücretsiz',
    telefon: '+77000000201',
    ad: 'Dilara Uzman',
    rol: 'professional',
    katman: 'free',
  },
  {
    etiket: 'Uzman · premium',
    telefon: '+77000000202',
    ad: 'Elmira Uzman',
    rol: 'professional',
    katman: 'premium',
  },
  {
    etiket: 'Uzman · platinum',
    telefon: '+77000000203',
    ad: 'Feruza Uzman',
    rol: 'professional',
    katman: 'platinum',
  },
];

/** Uzmanın tam profili: hizmet listesi, sertifikalar, biyografi. */
const HIZMETLER = [
  { id: 'svc-kesim', name: 'Kesim & fön', price: 9000, durationMin: 60, cat: 'hair' },
  { id: 'svc-boya', name: 'Saç boyama (kök)', price: 15000, durationMin: 90, cat: 'hair' },
  { id: 'svc-rofle', name: 'Röfle / Balayage', price: 28000, durationMin: 150, cat: 'hair' },
  { id: 'svc-keratin', name: 'Keratin / Botoks', price: 22000, durationMin: 120, cat: 'hair' },
];
const SERTIFIKALAR = ['Wella Master Colorist 2024', 'Olaplex Certified 2025', 'Keratin Pro 2023'];

function parolaUret(): string {
  // Okunabilir ama tahmin edilemez: telefonda elle yazılacak.
  return `Ayna${randomBytes(4).toString('hex')}!`;
}

async function hesapKur(t: Tanim): Promise<{ etiket: string; telefon: string; parola: string }> {
  const parola = parolaUret();
  const ph = phoneHash(t.telefon, SIR);
  const ortak = {
    name: t.ad,
    role: t.rol,
    city: 'Almatı',
    passwordHash: hashPassword(parola),
    phoneVerified: true,
    membershipTier: t.katman,
    isPremium: t.katman !== 'free',
    // Süresi geçmiş üyelik "üyelik yok" demek; testte geçerli olsun.
    membershipUntil: t.katman === 'free' ? null : new Date(Date.now() + 365 * 86_400_000),
    // §EK Z.3 — uzman KYC onaylı: depozito ve takvim akışları tam açılsın.
    kycStatus: t.rol === 'professional' ? 'approved' : 'none',
    kycVerifiedAt: t.rol === 'professional' ? new Date() : null,
  };

  const user = await prisma.user.upsert({
    where: { phoneHash: ph },
    create: { ...ortak, phoneHash: ph, phoneEnc: encryptField(t.telefon, SIR) },
    update: ortak,
  });

  if (t.rol === 'professional') {
    // Katalog karşılığı: müşteri tarafında aranabilir/randevu alınabilir olsun.
    const pro = await prisma.professional.upsert({
      where: { id: `test-pro-${user.id.slice(0, 8)}` },
      create: {
        id: `test-pro-${user.id.slice(0, 8)}`,
        name: t.ad,
        specialty: 'Saç & Renk',
        city: 'Almatı',
        servicesJson: JSON.stringify(HIZMETLER),
        priceFrom: 9000,
      },
      update: { servicesJson: JSON.stringify(HIZMETLER), city: 'Almatı' },
    });
    await prisma.specialist.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        proId: pro.id,
        bio: 'On yıllık saç ve renk uzmanı. Balayage ve keratin uygulamaları.',
        certificates: SERTIFIKALAR,
      },
      update: { proId: pro.id, certificates: SERTIFIKALAR },
    });
  }

  return { etiket: t.etiket, telefon: t.telefon, parola };
}

async function sil(): Promise<void> {
  for (const t of HESAPLAR) {
    const ph = phoneHash(t.telefon, SIR);
    const u = await prisma.user.findUnique({ where: { phoneHash: ph } });
    if (!u) continue;
    await prisma.specialist.deleteMany({ where: { userId: u.id } });
    await prisma.user.delete({ where: { id: u.id } });
    console.log(`silindi: ${t.etiket}`);
  }
}

async function main(): Promise<void> {
  if (process.argv.includes('--sil')) {
    await sil();
    return;
  }
  const sonuc: { etiket: string; telefon: string; parola: string }[] = [];
  for (const t of HESAPLAR) sonuc.push(await hesapKur(t));

  const satirlar = [
    'AYNA — TEST HESAPLARI',
    `Oluşturma: ${new Date().toISOString()}`,
    '',
    'Uzman hesapları: profil tamam, 4 hizmet, 3 sertifika, KYC ONAYLI.',
    'Yayına çıkmadan önce silin: pnpm exec tsx scripts/test-hesaplari.ts --sil',
    '',
    ...sonuc.map((h) => `${h.etiket.padEnd(22)} ${h.telefon}   ${h.parola}`),
    '',
  ].join('\n');

  const dosya = join(homedir(), 'Desktop', 'AYNA_test_hesaplari.txt');
  writeFileSync(dosya, satirlar, { mode: 0o600 });
  // Parolalar EKRANA basılmıyor: terminal kaydı, ekran görüntüsü ve loglar
  // üzerinden sızmasın. Yalnız nereye yazıldığı söyleniyor.
  console.log(`${sonuc.length} hesap hazır. Giriş bilgileri: ${dosya}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
