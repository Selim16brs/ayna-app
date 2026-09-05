// AYNA — veri temizliği: admin dışındaki tüm hesap ve işlem verisini siler.
// İçerik/referans tabloları (katalog, ayar, blog, kampanya, koleksiyon) korunur.
//
// Kullanım:
//   DRY-RUN (varsayılan, hiçbir şey silmez):
//     DATABASE_URL="..." npx tsx prisma/purge-data.ts
//   GERÇEK SİLME:
//     DATABASE_URL="..." npx tsx prisma/purge-data.ts --apply
//
// UYARI: --apply geri alınamaz. Önce yedek alın.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

// Silinecek tablolar — bağımlıdan bağımsıza doğru sıralı.
// Şemada FK relation neredeyse yok, ama sıra yine de mantıksal tutarlılık için korunuyor.
const PURGE: { model: keyof typeof prisma; label: string }[] = [
  // Oturum / cihaz / güvenlik
  { model: 'otpCode', label: 'otp_codes' },
  { model: 'pushToken', label: 'push_tokens' },
  { model: 'kycVerification', label: 'kyc_verifications' },
  { model: 'trustedContact', label: 'trusted_contacts' },
  { model: 'safetySession', label: 'safety_sessions' },
  { model: 'userBlock', label: 'user_blocks' },
  // Mesajlaşma
  { model: 'message', label: 'messages' },
  { model: 'conversation', label: 'conversations' },
  // Topluluk (Circle)
  { model: 'circleReport', label: 'circle_reports' },
  { model: 'circleComment', label: 'circle_comments' },
  { model: 'circleFollow', label: 'circle_follows' },
  { model: 'circlePost', label: 'circle_posts' },
  // Moderasyon / başvuru kuyrukları
  { model: 'dispute', label: 'disputes' },
  { model: 'profileChangeRequest', label: 'profile_change_requests' },
  { model: 'blogApplication', label: 'blog_applications' },
  // Değerlendirme ve sadakat
  { model: 'rating', label: 'ratings' },
  { model: 'loyaltyEntry', label: 'loyalty_entries' },
  // Finans
  { model: 'payment', label: 'payments' },
  { model: 'commissionInvoice', label: 'commission_invoices' },
  { model: 'commissionPayout', label: 'commission_payouts' },
  { model: 'subscription', label: 'subscriptions' },
  // Teklif / randevu akışı
  { model: 'offer', label: 'offers' },
  { model: 'quote', label: 'quotes' },
  { model: 'quoteRequest', label: 'quote_requests' },
  { model: 'booking', label: 'bookings' },
  // Takvim / davet
  { model: 'specialistBlock', label: 'specialist_blocks' },
  { model: 'specialistAvailability', label: 'specialist_availability' },
  { model: 'businessInviteCode', label: 'business_invite_codes' },
  // Sağlayıcı kayıtları
  { model: 'specialist', label: 'specialists' },
  { model: 'business', label: 'businesses' },
  { model: 'professional', label: 'professionals' },
  // Silinen uzmanlara/salonlara bağlı reklam bandı (pro_id öksüz kalırdı)
  { model: 'adBanner', label: 'ad_banners' },
  // Denetim kaydı — actor_id / ip_hash / device_hash kişisel veri içerir
  { model: 'auditLog', label: 'audit_logs' },
];

// Dokunulmayan içerik/referans tabloları — sadece raporda gösterilir.
const KEEP: { model: keyof typeof prisma; label: string }[] = [
  { model: 'serviceCategory', label: 'service_categories' },
  { model: 'setting', label: 'settings' },
  { model: 'featureFlag', label: 'feature_flags' },
  { model: 'blogArticle', label: 'blog_articles' },
  { model: 'weeklyTheme', label: 'weekly_themes' },
  { model: 'marketPrice', label: 'market_prices' },
  { model: 'campaign', label: 'campaigns' },
  { model: 'collection', label: 'collections' },
  { model: 'announcement', label: 'announcements' },
];

const count = (m: keyof typeof prisma) => (prisma[m] as any).count();

async function main() {
  const host = (process.env.DATABASE_URL ?? '').replace(/\/\/[^@]*@/, '//***@');
  console.log(`\nVeritabanı: ${host || '(DATABASE_URL tanımsız!)'}`);
  console.log(
    `Mod: ${APPLY ? '\x1b[31mGERÇEK SİLME (--apply)\x1b[0m' : 'DRY-RUN (hiçbir şey silinmez)'}\n`,
  );

  // --- Güvenlik kontrolü: admin var mı? ---
  const admins = await prisma.user.findMany({
    where: { role: 'admin' },
    select: { id: true, name: true, email: true, status: true, createdAt: true },
  });
  if (admins.length === 0) {
    throw new Error('DURDURULDU: role=admin olan kullanıcı yok. Silme yapılırsa hiç hesap kalmaz.');
  }
  console.log(`Korunacak admin (${admins.length}):`);
  for (const a of admins) {
    console.log(`  • ${a.name || '(isimsiz)'} — ${a.email ?? 'e-posta yok'} [${a.status}]`);
  }

  // --- Kullanıcı dağılımı ---
  const byRole = await prisma.user.groupBy({ by: ['role'], _count: { _all: true } });
  console.log('\nKullanıcı rolleri:');
  for (const r of byRole.sort((a, b) => b._count._all - a._count._all)) {
    const mark = r.role === 'admin' ? 'KORUNUR' : 'silinir';
    console.log(`  ${String(r.role).padEnd(14)} ${String(r._count._all).padStart(6)}  ${mark}`);
  }

  // --- Silinecek tablolar ---
  console.log('\nSilinecek tablolar:');
  let total = 0;
  const counts: Record<string, number> = {};
  for (const t of PURGE) {
    const n = await count(t.model);
    counts[t.label] = n;
    total += n;
    if (n > 0) console.log(`  ${t.label.padEnd(28)} ${String(n).padStart(6)}`);
  }
  const nonAdmin = await prisma.user.count({ where: { role: { not: 'admin' } } });
  console.log(`  ${'users (admin hariç)'.padEnd(28)} ${String(nonAdmin).padStart(6)}`);
  total += nonAdmin;
  console.log(`  ${'─'.repeat(34)}\n  ${'TOPLAM'.padEnd(28)} ${String(total).padStart(6)}`);

  // --- Korunacak tablolar ---
  console.log('\nKorunacak tablolar:');
  for (const t of KEEP) {
    const n = await count(t.model);
    console.log(`  ${t.label.padEnd(28)} ${String(n).padStart(6)}`);
  }

  if (!APPLY) {
    console.log('\n\x1b[33mDRY-RUN — hiçbir kayıt silinmedi.\x1b[0m');
    console.log('Uygulamak için: --apply ekleyin.\n');
    return;
  }

  // --- Gerçek silme: tek transaction ---
  console.log('\n\x1b[31mSiliniyor...\x1b[0m');
  const deleted = await prisma.$transaction(async (tx) => {
    const out: Record<string, number> = {};
    for (const t of PURGE) {
      const r = await (tx as any)[t.model].deleteMany({});
      out[t.label] = r.count;
    }
    const u = await tx.user.deleteMany({ where: { role: { not: 'admin' } } });
    out['users (admin hariç)'] = u.count;
    return out;
  });

  for (const [label, n] of Object.entries(deleted)) {
    if (n > 0) console.log(`  ${label.padEnd(28)} ${String(n).padStart(6)} silindi`);
  }

  // --- Doğrulama ---
  const remainingUsers = await prisma.user.count();
  const remainingAdmins = await prisma.user.count({ where: { role: 'admin' } });
  const leftovers: string[] = [];
  for (const t of PURGE) {
    const n = await count(t.model);
    if (n > 0) leftovers.push(`${t.label}=${n}`);
  }

  console.log('\nDoğrulama:');
  console.log(`  Kalan kullanıcı: ${remainingUsers} (admin: ${remainingAdmins})`);
  console.log(`  Temizlenmemiş tablo: ${leftovers.length ? leftovers.join(', ') : 'yok'}`);
  console.log(
    remainingUsers === remainingAdmins && leftovers.length === 0
      ? '\n\x1b[32m✔ Temizlik tamamlandı — sadece admin kaldı.\x1b[0m\n'
      : '\n\x1b[33m⚠ Beklenmeyen kalıntı var, yukarıyı kontrol edin.\x1b[0m\n',
  );
}

main()
  .catch((e) => {
    console.error('\n\x1b[31mHATA:\x1b[0m', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
