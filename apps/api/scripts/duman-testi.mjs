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

/* ── 2b · ONAY KAPISI — onaysız uzman katalogda YOK ────────────────── */
/*
 * Uzman kaydolur olmaz katalogda görünüyordu. Artık yönetici hesabı
 * açmadan ne listede ne profil adresinde var. Kapı önce KAPALI olduğu
 * doğrulanıyor, sonra açılıp akışın geri kalanı sınanıyor — yalnız
 * açtıktan sonra bakmak, kapının hiç çalışmadığı bir sürümde de geçerdi.
 */
const onaysizListe = await get('/professionals');
ol('onaysız uzman katalogda YOK', !(onaysizListe ?? []).some((x) => x.name === 'Duman Uzman'));

const yoneticiGiris = await gonder('/auth/login', {
  identifier: 'admin',
  password: process.env.ADMIN_BOOTSTRAP_PASSWORD ?? '',
});
const yoneticiToken = yoneticiGiris.govde?.token;
ol('yönetici girişi', !!yoneticiToken, JSON.stringify(yoneticiGiris.govde).slice(0, 120));

const kuyruk = await get('/admin/specialists', yoneticiToken);
const bekleyen = (kuyruk ?? []).find((x) => x.name === 'Duman Uzman');
ol('uzman ONAY KUYRUĞUNA düştü', !!bekleyen, `kuyruk: ${(kuyruk ?? []).length}`);
if (bekleyen) {
  const ac = await gonder(
    `/admin/specialists/${bekleyen.id}/status`,
    { status: 'approved' },
    yoneticiToken,
  );
  ol('yönetici uzman hesabını açtı', ac.ok, JSON.stringify(ac.govde).slice(0, 120));
}

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

/* ── 8 · TEKLİF ROUND TRIP — uzman teklif verir, MÜŞTERİ GÖRÜR ─────────
 *
 * Kurucu "uzman onayladı ama müşteriye teklif düşmedi" dediğinde bu
 * yolun hangi ucunda koptuğunu gösterecek bir şey yoktu: duman testi
 * "uzman talebi görüyor" deyip duruyordu. Asıl sözleşme bundan sonrası —
 * teklif yazılıyor mu, müşterinin listesine düşüyor mu.
 */
const teklif = await gonder(
  `/quote-requests/${talep.govde?.id}/quotes`,
  {
    price: 18000,
    discountPercent: 0,
    etaMin: 90,
    slots: [Date.now() + 3 * 86_400_000],
  },
  uzmanToken,
);
ol(
  'uzman teklif gönderebiliyor',
  teklif.ok,
  teklif.ok ? '' : JSON.stringify(teklif.govde).slice(0, 200),
);

const benimTalepler = await get('/quote-requests/mine', musteri.govde?.token);
const benimTalep = Array.isArray(benimTalepler)
  ? benimTalepler.find((r) => r.id === talep.govde?.id)
  : null;
ol(
  'teklif MÜŞTERİNİN listesine düşüyor',
  (benimTalep?.offers ?? []).length === 1,
  `${(benimTalep?.offers ?? []).length} teklif`,
);
const gelenTeklif = benimTalep?.offers?.[0];
ol('teklifte UZMANIN ADI var', !!gelenTeklif?.proName, String(gelenTeklif?.proName));
/*
 * Mesafe UYDURULMUYOR: sunucu kimlikten üretilmiş bir sayı yerine gerçek
 * koordinat gönderiyor (yoksa null). `distanceKm` alanı hiç olmamalı.
 */
ol(
  'mesafe uydurulmuyor',
  gelenTeklif && !('distanceKm' in gelenTeklif),
  'distanceKm: ' + String(gelenTeklif?.distanceKm),
);

/* ── 9 · TEKLİF SEÇİMİ → RANDEVU + UZMANIN GÖRDÜĞÜ ────────────────────
 *
 * Seçimden sonra uzman tarafında randevunun DOĞRU görünmesi: rolü sunucu
 * damgalıyor (uzman kendi ekranında müşteri görünümüne düşmesin) ve
 * müşterinin ADI geliyor (uzman kimin geleceğini bilsin).
 */
/*
 * KAPI: müşteri doğrulanmadan randevu ALAMAZ — teklif seçimi dahil.
 * Doğrudan randevu yolu bu kapıyı uyguluyordu, teklif seçimi atlıyordu.
 */
const kapali = await gonder(
  `/quote-requests/${talep.govde?.id}/select`,
  { quoteId: gelenTeklif?.id, slotMs: gelenTeklif?.slots?.[0] },
  musteri.govde?.token,
);
/*
 * Kod ZARFIN İÇİNDE: hata gövdesi `{ error: { code, message, requestId } }`
 * biçiminde dönüyor (`AllExceptionsFilter`). İlk yazdığımda düz `code`
 * aramıştım ve test 403'ü görmesine rağmen düştü — CI yakaladı.
 */
const kapaliKod = kapali.govde?.error?.code ?? kapali.govde?.code;
ol(
  'doğrulanmamış müşteri teklif seçemiyor',
  kapali.durum === 403 && kapaliKod === 'VERIFICATION_REQUIRED',
  `${kapali.durum} ${kapaliKod ?? ''}`,
);

/*
 * Yönetici onayı telefon doğrulamasının ALTERNATİFİ (§randevu kapısı).
 * Kurucu bunu panelden kullanıyor; burada da o yol deneniyor.
 */
const musteriId = (await get('/auth/me', musteri.govde?.token))?.id;
const onay = await gonder(`/admin/users/${musteriId}/approve`, { approved: true }, yoneticiToken);
ol(
  'yönetici müşteriyi onaylayabiliyor',
  onay.ok,
  onay.ok ? '' : JSON.stringify(onay.govde).slice(0, 120),
);

const secim = await gonder(
  `/quote-requests/${talep.govde?.id}/select`,
  { quoteId: gelenTeklif?.id, slotMs: gelenTeklif?.slots?.[0] },
  musteri.govde?.token,
);
ol(
  'müşteri teklifi seçebiliyor',
  secim.ok,
  secim.ok ? '' : JSON.stringify(secim.govde).slice(0, 200),
);

const uzmanRandevulari = await get('/bookings/provider', uzmanToken);
const yeniRandevu = Array.isArray(uzmanRandevulari)
  ? uzmanRandevulari.find((b) => b.id === secim.govde?.bookingId)
  : null;
ol(
  'randevu UZMANIN listesinde',
  !!yeniRandevu,
  Array.isArray(uzmanRandevulari)
    ? `${uzmanRandevulari.length} kayıt`
    : String(uzmanRandevulari?.error?.code),
);
ol('rolü SUNUCU damgalıyor', yeniRandevu?.benimRolum === 'uzman', String(yeniRandevu?.benimRolum));
ol(
  'uzman MÜŞTERİNİN ADINI görüyor',
  yeniRandevu?.customerName === 'Duman Müşteri',
  String(yeniRandevu?.customerName),
);

/* ── 10 · PARA YOLU — depozito, tamamlanma, PUAN ───────────────────────
 *
 * Kurucunun ilk kuralı: "sistem hiçbir şekilde randevu, değerlendirme,
 * not, puanlama, ayna para… hiçbir şeyi kendiliğinden uydurmamalı."
 *
 * Bu yolun hiçbir ucu duman testinde yoktu: depozito yüklendiğinde
 * randevu kesinleşiyor mu, tamamlandığında puan GERÇEKTEN hak edilen
 * kadar mı yükleniyor. Para ve puan sessizce bozulursa kimse fark etmez.
 */
const bookingId = secim.govde?.bookingId;
const dekont = await gonder(
  `/bookings/${bookingId}/deposit-receipt`,
  { receiptUri: 'data:image/jpeg;base64,RFVNQU4=' },
  musteri.govde?.token,
);
ol(
  'depozito dekontu kabul ediliyor',
  dekont.ok,
  dekont.ok ? '' : JSON.stringify(dekont.govde).slice(0, 160),
);
ol(
  'dekont randevuyu KESİNLEŞTİRİYOR',
  dekont.govde?.status === 'kesinlesti',
  String(dekont.govde?.status),
);
/*
 * Depozito hizmet bedelinin %10'u (K1). Sabit bir tutar ya da yuvarlama
 * yoktu: 18.000 ₸ için tam 1.800 ₸.
 */
ol(
  "depozito hizmetin %10'u",
  Number(dekont.govde?.depositAmount) === 1800,
  String(dekont.govde?.depositAmount),
);

/*
 * RANDEVU GÜNÜ GELMEDEN TAMAMLANAMAZ.
 *
 * `kesinlesti → odeme_bekliyor` diye bir geçiş YOK: araya `hizmet_gunu`
 * giriyor ve oraya geçişi randevu saati geldiğinde zamanlayıcı yapıyor.
 * Bu kural olmasaydı uzman ileri tarihli bir randevuyu bugün kapatıp
 * puanı ve komisyon saatini erken başlatabilirdi.
 *
 * Tamamlanma sonrası adımlar (ödeme beyanı, puan yüklemesi) burada
 * DENENMİYOR: randevunun saatinin gelmesini beklemek gerekiyor ve
 * zamanlayıcı 60 saniyede bir dönüyor — duman testini bir dakika
 * bekletmek, kazandırdığından çok maliyet olurdu. O adımların kuralları
 * birim testlerinde bağlı (completion-rewards, state-machine).
 */
const erken = await gonder(`/bookings/${bookingId}/complete`, {}, uzmanToken);
const erkenKod = erken.govde?.error?.code ?? erken.govde?.code;
ol(
  'randevu günü gelmeden TAMAMLANAMIYOR',
  !erken.ok && erkenKod === 'INVALID_TRANSITION',
  `${erken.durum} ${erkenKod ?? ''}`,
);

/*
 * ÖDEME BEYANI DA ERKEN AÇILMIYOR — kurucu (05.09.2026) ödeme düğmesinin
 * "hizmet saati başladığında" açılmasını istedi. Randevu ileri tarihli
 * olduğu için burada kapıya çarpması gerekiyor: açık kalsaydı müşteri
 * yaşanmamış bir hizmet için para ve puan doğurabilirdi.
 */
const erkenOdeme = await gonder(`/bookings/${bookingId}/balance-paid`, {}, musteri.govde?.token);
const erkenOdemeKod = erkenOdeme.govde?.error?.code ?? erkenOdeme.govde?.code;
ol(
  'hizmet saati gelmeden ÖDEME BEYAN EDİLEMİYOR',
  !erkenOdeme.ok && erkenOdemeKod === 'ODEME_ERKEN',
  `${erkenOdeme.durum} ${erkenOdemeKod ?? ''}`,
);

/*
 * Beyan edilen TUTAR da doğrulanıyor: sıfır ya da negatif bir tutar,
 * komisyonu ve puanı sıfırlamanın en kolay yoluydu.
 */
const kotuTutar = await gonder(
  `/bookings/${bookingId}/balance-paid`,
  { amount: -5000 },
  musteri.govde?.token,
);
ol(
  'negatif ödeme tutarı REDDEDİLİYOR',
  !kotuTutar.ok,
  `${kotuTutar.durum} ${kotuTutar.govde?.error?.code ?? ''}`,
);

/*
 * Puan da erken yüklenmiyor: tamamlanmamış randevudan puan doğarsa
 * "uydurma puan" tam olarak budur.
 */
const sadakat = await get('/loyalty', musteri.govde?.token);
ol(
  'tamamlanmamış randevudan PUAN DOĞMUYOR',
  (sadakat?.points ?? 0) === 0,
  `${sadakat?.points} puan`,
);

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
  // Sıra ÖNEMLİ: randevu ve teklifler talebe bağlı; önce onlar silinmeli.
  await p.booking.deleteMany({ where: { userId: { in: ids } } });
  await p.quote.deleteMany({ where: { userId: { in: ids } } });
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
