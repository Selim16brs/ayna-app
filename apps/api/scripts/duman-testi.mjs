#!/usr/bin/env node
/**
 * DUMAN TESTİ — gerçek sunucu, gerçek veritabanı, gerçek HTTP.
 *
 * ── NEDEN VAR ───────────────────────────────────────────────────────────
 *
 * Birim testleri iki tarafı AYRI AYRI doğruluyor: mobil tipler kendi
 * içinde tutarlı, sunucu şeması kendi içinde tutarlı. ARADAKİ SÖZLEŞMEYE
 * bakan bir şey yoktu ve tam oradan kırıldı: uygulama hizmet satırlarını
 * `serviceId` ile göndermeye başlayınca kayıt şeması hâlâ `id` istiyordu.
 * Hizmet seçen HER uzman "Geçersiz veri" alıyor, kayıt olamıyordu. Canlıya
 * çıktı ve hiçbir test kızarmadı.
 *
 * Bu betik uygulamanın GERÇEKTEN gönderdiği gövdeleri gerçek uçlara
 * gönderiyor. Aynı sınıftan bir kopma bir daha sessiz kalamaz.
 *
 * ── NE YAPMAZ ───────────────────────────────────────────────────────────
 *
 * Ekran çizimini, gezinmeyi ya da bildirim teslimini denemiyor — bunlar
 * sunucunun dışında. Kapsamı SÖZLEŞME: gövde kabul ediliyor mu, dönen veri
 * ekranların beklediği şekilde mi.
 *
 * ── KULLANIM ────────────────────────────────────────────────────────────
 *
 *   pnpm --filter @ayna/api smoke              # yerel (localhost:3000)
 *   API=https://... pnpm --filter @ayna/api smoke
 *
 * Sunucu ZATEN ÇALIŞIYOR olmalı. Test verisi sonunda siliniyor.
 */

const B = (process.env.API ?? 'http://localhost:3000') + '/api/v1';
const damga = Date.now().toString().slice(-9);

const sonuclar = [];
const ol = (ad, kosul, detay = '') => {
  sonuclar.push({ ad, gecti: !!kosul, detay });
  return !!kosul;
};

const get = (yol, t) =>
  fetch(B + yol, { headers: t ? { Authorization: `Bearer ${t}` } : {} }).then((r) => r.json());
const gonder = (yol, govde, t, yontem = 'POST') =>
  fetch(B + yol, {
    method: yontem,
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    body: JSON.stringify(govde),
  }).then(async (r) => ({ ok: r.ok, durum: r.status, govde: await r.json().catch(() => null) }));

/* ── 1 · KATALOG — herkese açık vitrin ─────────────────────────────── */
const tax = await get('/taxonomy');
ol(
  'katalog 13 kategori döndürüyor',
  tax?.kategoriler?.length === 13,
  `${tax?.kategoriler?.length}`,
);
const tumAlt = (tax?.kategoriler ?? []).flatMap((k) => k.altHizmetler);
ol('katalog 64 alt hizmet döndürüyor', tumAlt.length === 64, `${tumAlt.length}`);
ol(
  'adlar ÜÇ DİLDE geliyor',
  (tax?.kategoriler ?? []).every((k) => k.ad?.tr && k.ad?.ru && k.ad?.kk),
);

/* ── 2 · UZMAN KAYDI — uygulamanın gönderdiği gövdeyle ──────────────── */
const uzmanTel = '+7700' + damga.slice(0, 7);
const kayit = await gonder('/specialists', {
  name: 'Duman Uzman',
  phone: uzmanTel,
  password: 'Duman12345!',
  city: 'Almatı',
  kind: 'independent',
  entityType: 'freelance',
  certificates: [],
  sector: 'hair',
  lat: 43.24,
  lng: 76.92,
  // Brief §4.1 biçimi: katalog bağı `serviceId`, ad uzmanın kendi sözcüğü.
  services: [
    { serviceId: 'hair.coloring', name: 'Kök boyası', price: 15000, durationMin: 60 },
    { serviceId: 'hair.coloring', name: 'Tam boya', price: 25000, durationMin: 120 },
    { serviceId: 'nails.manicure', name: 'Klasik manikür', price: 6000, durationMin: 45 },
    // Kataloğa bağlanmayan satır: kaydı DÜŞÜRMEMELİ, saklanmamalı.
    { name: 'Roza özel paketi', price: 20000, durationMin: 90 },
    // Regüle işlem: kayıt geçmeli, satır yönetici kuyruğuna düşmeli.
    { serviceId: 'skin.anti_age', name: 'Dudak dolgusu', price: 40000, durationMin: 60 },
  ],
});
ol('uzman kaydı kabul edildi', kayit.ok, kayit.ok ? '' : JSON.stringify(kayit.govde).slice(0, 200));
const uzmanToken = kayit.govde?.token;

/* ── 3 · ARZ — "Yakında" rozeti (brief §7.4) ───────────────────────── */
const tax2 = await get('/taxonomy');
const alt = (id) => tax2.kategoriler.flatMap((k) => k.altHizmetler).find((a) => a.id === id);
ol('arz gelince "Yakında" kalkıyor', alt('hair.coloring')?.yakinda === false);
ol('KARDEŞ hizmet etkilenmiyor', alt('hair.blowdry')?.yakinda === true);

/* ── 4 · HİZMET LİSTESİ — bağsız satır saklanmıyor (brief §4.1) ────── */
const benimHizmetler = await get('/specialists/me/services', uzmanToken);
const adlar = (benimHizmetler?.services ?? []).map((s) => s.name);
ol('bağsız satır saklanmadı', !adlar.includes('Roza özel paketi'), adlar.join(' | '));
ol(
  'uzmanın KENDİ adları korundu',
  adlar.includes('Kök boyası') && adlar.includes('Tam boya'),
  'aynı alt hizmete iki satır',
);

/* ── 5 · PROFİL — katalog bağı ve benzersiz satır kimliği (brief §4.7) */
const pros = await get('/professionals');
const benim = (pros ?? []).find((x) => x.name === 'Duman Uzman');
ol('uzman keşifte görünüyor', !!benim);
ol(
  'alan seti hizmetlerden türedi',
  JSON.stringify(benim?.sectors ?? []) === JSON.stringify(['hair', 'nails', 'skin']),
  JSON.stringify(benim?.sectors ?? []),
);
const detay = benim ? await get('/professionals/' + benim.id) : null;
const hizmetler = detay?.services ?? [];
ol(
  'profil hizmetleri KATALOG BAĞIYLA geliyor',
  hizmetler.length > 0 && hizmetler.every((s) => s.serviceId),
);
ol('satır kimlikleri BENZERSİZ', new Set(hizmetler.map((s) => s.id)).size === hizmetler.length);

/* ── 6 · MÜŞTERİ + ÇOKLU HİZMET TALEBİ (brief §4.5) ────────────────── */
const musteri = await gonder('/auth/register', {
  name: 'Duman Müşteri',
  phone: '+7701' + damga.slice(0, 7),
  password: 'Duman12345!',
  city: 'Almatı',
});
ol('müşteri kaydı', musteri.ok, musteri.ok ? '' : JSON.stringify(musteri.govde).slice(0, 200));

const talep = await gonder(
  '/quote-requests',
  {
    category: 'hair',
    mode: 'describe',
    collectMin: 180,
    note: 'Düğün paketi',
    serviceIds: ['hair.event_hair', 'makeup.bridal', 'nails.gel_polish'],
  },
  musteri.govde?.token,
);
ol('düğün paketi talebi', talep.ok, talep.ok ? '' : JSON.stringify(talep.govde).slice(0, 200));
ol(
  'üç hizmet de saklandı',
  (talep.govde?.serviceIds ?? []).length === 3,
  JSON.stringify(talep.govde?.serviceIds),
);
ol('birincil hizmet geriye dönük yazıldı', talep.govde?.serviceId === 'hair.event_hair');

/* ── 7 · UZMAN TALEBİ HİZMET LİSTESİYLE GÖRÜYOR (brief §4.5) ───────── */
const acik = await get('/quote-requests/open', uzmanToken);
const gorunen = Array.isArray(acik) ? acik.find((r) => r.id === talep.govde?.id) : null;
ol(
  'uzman talebi görüyor',
  !!gorunen,
  Array.isArray(acik) ? `${acik.length} açık talep` : String(acik?.error?.code),
);
ol('talep HİZMET LİSTESİYLE geliyor', (gorunen?.serviceIds ?? []).length === 3);

/* ── RAPOR ─────────────────────────────────────────────────────────── */
const dusen = sonuclar.filter((s) => !s.gecti);
for (const s of sonuclar) {
  console.log(`${s.gecti ? '✔' : '✖'} ${s.ad}${s.detay ? '  · ' + s.detay : ''}`);
}
console.log(`\n${sonuclar.length - dusen.length}/${sonuclar.length} geçti`);

/* ── TEMİZLİK — bu betik ARDINDA VERİ BIRAKMAZ ─────────────────────── */
try {
  const { PrismaClient } = await import('@prisma/client');
  const p = new PrismaClient();
  const kullanicilar = await p.user.findMany({
    where: { name: { in: ['Duman Uzman', 'Duman Müşteri'] } },
    select: { id: true },
  });
  const ids = kullanicilar.map((u) => u.id);
  const prolar = await p.professional.findMany({
    where: { name: 'Duman Uzman' },
    select: { id: true },
  });
  await p.quoteRequest.deleteMany({ where: { userId: { in: ids } } });
  await p.regulatedServiceFlag.deleteMany({ where: { proId: { in: prolar.map((x) => x.id) } } });
  await p.specialist.deleteMany({ where: { userId: { in: ids } } });
  await p.professional.deleteMany({ where: { name: 'Duman Uzman' } });
  await p.user.deleteMany({ where: { id: { in: ids } } });
  await p.$disconnect();
  console.log('test verisi silindi');
} catch (e) {
  // Temizlik başarısız olursa TEST SONUCU DEĞİŞMEZ ama sessiz de kalmaz:
  // arkada kalan veri bir sonraki çalıştırmayı bozabilir.
  console.error('UYARI: test verisi silinemedi —', String(e).slice(0, 200));
}

process.exit(dusen.length === 0 ? 0 : 1);
