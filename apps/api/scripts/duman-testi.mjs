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
  { receiptUri: `data:image/jpeg;base64,${Buffer.from(`dekont-${damga}`).toString('base64')}` },
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

/* ══════════════════════════════════════════════════════════════════════
 * AŞAMA 2 — HİZMET GÜNÜ → ÖDEME → PUAN → DEĞERLENDİRME
 *
 * Kurucu (06.09.2026): "end2end canlı deneme yap. hiçbir hatayı pas geçme…
 * tüm app özellikleri rezervasyondan puanlamaya kadar ne varsa sorunsuz
 * çalışsın."
 *
 * Yukarıdaki akış randevu GÜNÜ GELMEDEN durduğu için ödeme, puan ve
 * değerlendirme hiç denenmiyordu — para akışının yarısı testsizdi. Burada
 * başlangıcı GEÇMİŞTE olan bir randevu açılıyor (aynı gün/aynı saat kaydı
 * gerçek bir durum) ve akış sonuna kadar yürütülüyor.
 * ══════════════════════════════════════════════════════════════════════ */

const musteriToken = musteri.govde?.token;
const HIZMET_FIYATI = 20000;

/*
 * UZMANIN KİMLİĞİ KENDİ UCUNDAN.
 *
 * Keşif listesinden ADLA aramak yanlış kaydı bulabiliyor: aynı adlı eski bir
 * test kaydı varsa randevu BAŞKA uzmana bağlanıyor ve bu koşudaki uzman
 * "bu randevu üzerinde yetkin yok" hatası alıyor. Ad kimlik değildir —
 * uygulamanın kendi kuralı da bu.
 */
const proKimlik = (await get('/specialists/me/pro-id', uzmanToken))?.proId;
ol('uzman kendi keşif kimliğini okuyabiliyor', !!proKimlik, String(proKimlik));

/**
 * Başlangıcı GEÇMİŞTE olan randevu açar — hizmet günü akışı için.
 *
 * Süre 30 dk ve çağrılar en az 60 dk arayla: aksi hâlde randevular
 * birbirinin slotunu kapatıyor ve sunucu haklı olarak SLOT_TAKEN diyor.
 * (İlk yazımda 60 dk süre + 15 dk aralık kullanılmıştı; testin kendi verisi
 * çakışıyordu.)
 */
async function gecmisRandevuAc(dakikaOnce, fiyat = HIZMET_FIYATI) {
  const r = await gonder(
    '/bookings',
    {
      id: `e2e-${damga}-${Math.random().toString(36).slice(2, 8)}`,
      source: 'direct',
      service: 'Saç kesimi',
      proId: proKimlik,
      proName: 'Duman Uzman',
      proImage: '',
      dateLabel: 'bugün',
      inDays: 0,
      price: fiyat,
      durationMin: 30,
      startMs: Date.now() - dakikaOnce * 60_000,
    },
    musteriToken,
  );
  return r;
}

/** Randevuyu kesinleşmiş hâle getirir: uzman onaylar + müşteri dekont yükler. */
async function kesinlestir(id, dekontIcerik) {
  const onay = await gonder(`/bookings/${id}/approve`, {}, uzmanToken);
  const dekont = await gonder(
    `/bookings/${id}/deposit-receipt`,
    { receiptUri: `data:image/jpeg;base64,${dekontIcerik}` },
    musteriToken,
  );
  return { onay, dekont };
}

/* ── 2.1 MÜŞTERİ ÖNCE ÖDER, UZMAN SONRA TEYİT EDER ─────────────────── */
const r1 = await gecmisRandevuAc(200);
ol('geçmiş saatli randevu açılıyor', r1.ok, JSON.stringify(r1.govde).slice(0, 140));
const id1 = r1.govde?.id;
const k1 = await kesinlestir(id1, 'RTJFLTE=');
ol(
  'uzman onayı depozito adımını açıyor',
  k1.onay.govde?.status === 'depozito_bekliyor',
  String(k1.onay.govde?.status),
);
ol(
  'depozito %10 hesaplandı',
  Number(k1.onay.govde?.depositAmount) === HIZMET_FIYATI / 10,
  String(k1.onay.govde?.depositAmount),
);
ol(
  'dekont randevuyu kesinleştiriyor',
  k1.dekont.govde?.status === 'kesinlesti',
  String(k1.dekont.govde?.status),
);

// Kasada fiyat DEĞİŞTİ: 20.000 → 26.000. Puan ve komisyon bundan doğmalı.
const ODENEN = 26000;
const beyan = await gonder(`/bookings/${id1}/balance-paid`, { amount: ODENEN }, musteriToken);
ol('müşteri ödeme beyan edebiliyor', beyan.ok, JSON.stringify(beyan.govde).slice(0, 140));
ol(
  'beyan randevuyu ödeme beklemeye taşıyor',
  beyan.govde?.status === 'odeme_bekliyor',
  String(beyan.govde?.status),
);
ol(
  'beyan MÜŞTERİ görünümü dönüyor',
  beyan.govde?.benimRolum === 'musteri',
  String(beyan.govde?.benimRolum),
);
ol(
  'kasada değişen tutar kaydedildi',
  Number(beyan.govde?.finalPrice) === ODENEN,
  String(beyan.govde?.finalPrice),
);

const puanAra = await get('/loyalty', musteriToken);
ol('TEK TARAFLI beyan puan üretmiyor', (puanAra?.points ?? 0) === 0, `${puanAra?.points} puan`);

const teyit = await gonder(`/bookings/${id1}/balance-received`, {}, uzmanToken);
ol('uzman ödemeyi teyit edebiliyor', teyit.ok, JSON.stringify(teyit.govde).slice(0, 140));
ol(
  'iki onay randevuyu TAMAMLIYOR',
  teyit.govde?.status === 'tamamlandi',
  String(teyit.govde?.status),
);
ol(
  'teyit UZMAN görünümü dönüyor',
  teyit.govde?.benimRolum === 'uzman',
  String(teyit.govde?.benimRolum),
);

// Puan yazımı `void` bir zincirde: sabit uyku yerine ölçüyoruz.
const beklenenPuan = Math.floor(ODENEN / 100);
await bakiyeBekle(beklenenPuan);
const puanSonra = await get('/loyalty', musteriToken);
// %1 geri kazanım ÖDENEN tutardan: 26.000 → 260 puan (rezervasyondaki 20.000 değil).
ol(
  'puan ÖDENEN tutardan doğdu',
  (puanSonra?.points ?? 0) === Math.floor(ODENEN / 100),
  `${puanSonra?.points} puan (beklenen ${Math.floor(ODENEN / 100)})`,
);

/* ── 2.2 SIRA TERS: UZMAN ÖNCE TEYİT EDER ──────────────────────────── */
const r2 = await gecmisRandevuAc(130);
const id2 = r2.govde?.id;
await kesinlestir(id2, 'RTJFLTI=');
const teyitOnce = await gonder(`/bookings/${id2}/balance-received`, {}, uzmanToken);
ol('uzman ÖNCE teyit edebiliyor', teyitOnce.ok, JSON.stringify(teyitOnce.govde).slice(0, 120));
ol(
  'tek taraflı teyit randevuyu KAPATMIYOR',
  teyitOnce.govde?.status === 'odeme_bekliyor',
  String(teyitOnce.govde?.status),
);
const beyanSonra = await gonder(`/bookings/${id2}/balance-paid`, {}, musteriToken);
ol(
  'müşteri beyanı el sıkışmayı TAMAMLIYOR',
  beyanSonra.govde?.status === 'tamamlandi',
  String(beyanSonra.govde?.status),
);
await bakiyeBekle(Math.floor(ODENEN / 100) + HIZMET_FIYATI / 100);
const puanIki = await get('/loyalty', musteriToken);
// İkinci randevu 20.000 (fiyat değişmedi) → +200 puan.
ol(
  'ters sırada da puan doğuyor',
  (puanIki?.points ?? 0) === Math.floor(ODENEN / 100) + HIZMET_FIYATI / 100,
  `${puanIki?.points} puan`,
);

/* ── 2.3 DEĞERLENDİRME ─────────────────────────────────────────────── */
const yorum = await gonder(
  '/ratings',
  { bookingId: id1, raterRole: 'user', score: 5, comment: 'Duman testi yorumu', anonymous: true },
  musteriToken,
);
ol('tamamlanan randevu değerlendirilebiliyor', yorum.ok, JSON.stringify(yorum.govde).slice(0, 140));
ol(
  'yorum YAZARIN KİMLİĞİNİ taşımıyor',
  !JSON.stringify(yorum.govde ?? {}).includes(musteriId),
  JSON.stringify(yorum.govde ?? {}).slice(0, 120),
);

const yorumsuzRandevu = await gecmisRandevuAc(60);
const yorumRed = await gonder(
  '/ratings',
  { bookingId: yorumsuzRandevu.govde?.id, raterRole: 'user', score: 1, comment: 'olmaz' },
  musteriToken,
);
ol(
  'TAMAMLANMAMIŞ randevu değerlendirilemiyor',
  !yorumRed.ok,
  `${yorumRed.durum} ${yorumRed.govde?.error?.code ?? ''}`,
);

/* ── 2.4 KOMİSYON VE CARİ ──────────────────────────────────────────── */
const kom = await get('/admin/commissions', yoneticiToken);
const salon = (kom?.salons ?? []).find((s) => s.proName === 'Duman Uzman');
ol('komisyon panelinde uzman görünüyor', !!salon, `salon sayısı: ${(kom?.salons ?? []).length}`);
if (salon) {
  // İki tamamlanan randevu: 26.000 + 20.000 = 46.000 ciro → %10 = 4.600 komisyon.
  const beklenenKomisyon = (ODENEN + HIZMET_FIYATI) * 0.1;
  ol(
    'komisyon ÖDENEN tutarlardan',
    Math.abs(salon.earned - beklenenKomisyon) < 1,
    `${salon.earned} (beklenen ${beklenenKomisyon})`,
  );
  // Depozitolar AYNA'da: 2.000 + 2.000 = 4.000 peşin tahsil.
  ol('peşin depozito düşülüyor', Math.abs(salon.deposits - 4000) < 1, String(salon.deposits));
  // Cari borç = komisyon − depozito = 4.600 − 4.000 = 600.
  ol(
    'cari borç = komisyon − depozito',
    Math.abs(salon.outstanding - 600) < 1,
    `${salon.outstanding} (beklenen 600)`,
  );
}

/* ── 2.5 ONAY BİLDİRİMİ ────────────────────────────────────────────── */
/*
 * Onay anında müşterinin 10 dakikalık depozito süresi BAŞLIYOR. Bildirim
 * gitmezse müşteri telefonu kapalıyken randevusunu kaybediyor.
 */
const oncekiKutu = (await get('/push/notifications', musteriToken))?.length ?? 0;
const r3 = await gecmisRandevuAc(270);
const onay3 = await gonder(`/bookings/${r3.govde?.id}/approve`, {}, uzmanToken);
ol('onay bildirimi için randevu onaylandı', onay3.ok, JSON.stringify(onay3.govde).slice(0, 160));
await new Promise((r) => setTimeout(r, 900));
const kutu = (await get('/push/notifications', musteriToken)) ?? [];
ol('ONAY müşteriye bildiriliyor', kutu.length > oncekiKutu, `${oncekiKutu} → ${kutu.length}`);
const onayBildirimi = kutu[0];
ol(
  'bildirim DEPOZİTO TUTARINI yazıyor',
  String(onayBildirimi?.body ?? '').includes('2000'),
  String(onayBildirimi?.body ?? '').slice(0, 90),
);
ol(
  'bildirim depozito ekranına yönlendiriyor',
  String(onayBildirimi?.route ?? '').includes('/booking/deposit'),
  String(onayBildirimi?.route ?? ''),
);

/* ── 2.6 BİLDİRİM TERCİHİ ──────────────────────────────────────────── */
await gonder('/prefs', { notif: { booking: false } }, musteriToken);
const kapaliOncesi = (await get('/push/notifications', musteriToken))?.length ?? 0;
const r4 = await gecmisRandevuAc(340);
await gonder(`/bookings/${r4.govde?.id}/approve`, {}, uzmanToken);
await new Promise((r) => setTimeout(r, 900));
const kapaliSonrasi = (await get('/push/notifications', musteriToken))?.length ?? 0;
// Kapatılan bildirim TELEFONA düşmüyor ama KUTUDA duruyor: kullanıcı
// "telefonuma düşmesin" dedi, "hiç haberim olmasın" demedi.
ol(
  'kapatılan bildirim kutuda DURUYOR',
  kapaliSonrasi > kapaliOncesi,
  `${kapaliOncesi} → ${kapaliSonrasi}`,
);
await gonder('/prefs', { notif: { booking: true } }, musteriToken);

/* ══════════════════════════════════════════════════════════════════════
 * AŞAMA 3 — İPTAL, İADE VE PUANIN GERİ DÖNMESİ
 *
 * Depozitonun bir kısmı puanla ödenebiliyor. İade hakkı doğduğunda NAKİT
 * iade yalnız gerçekten ödenen nakit olmalı; puanla kapatılan kısım PUAN
 * olarak geri dönmeli. Aksi hâlde randevu alıp hemen iptal ederek puan
 * paraya çevrilebiliyordu.
 * ══════════════════════════════════════════════════════════════════════ */

/**
 * Bakiye HEDEFE ulaşana kadar bekler — sabit uyku yerine ÖLÇÜM.
 *
 * Puan yazımı `void` bir zincirde ilerliyor; sabit bir bekleme yavaş bir
 * makinede yetmiyor ve test rastgele düşüyordu. Rastgele düşen bir test,
 * hiç olmayan bir testten kötüdür: insan onu görmezden gelmeyi öğrenir.
 */
async function bakiyeBekle(enAz, turSayisi = 25) {
  for (let i = 0; i < turSayisi; i++) {
    const p = (await get('/loyalty', musteriToken))?.points ?? 0;
    if (p >= enAz) return p;
    await new Promise((r) => setTimeout(r, 200));
  }
  return (await get('/loyalty', musteriToken))?.points ?? 0;
}

/** Puanla ödeme kilidini açacak kadar bakiye kazandırır (tamamlanan randevu). */
async function puanBiriktir(hedefPuan) {
  let dk = 400;
  for (let i = 0; i < 12; i++) {
    const oncekiBakiye = (await get('/loyalty', musteriToken))?.points ?? 0;
    if (oncekiBakiye >= hedefPuan) return oncekiBakiye;
    const r = await gecmisRandevuAc(dk, 200000); // %1 → 2.000 puan
    dk += 90;
    if (!r.ok) {
      console.error(
        `  puan turu ${i}: randevu açılamadı — ${JSON.stringify(r.govde).slice(0, 120)}`,
      );
      continue;
    }
    // Her tur FARKLI dekont: aynı içerik ikinci kez kabul edilmiyor (doğru
    // davranış — testin kendi verisi tekrarlıyordu).
    const kk = await kesinlestir(
      r.govde?.id,
      Buffer.from(`puan-turu-${i}-${damga}`).toString('base64'),
    );
    if (!kk.dekont.ok) {
      console.error(`  puan turu ${i}: dekont — ${JSON.stringify(kk.dekont.govde).slice(0, 120)}`);
      continue;
    }
    const bp = await gonder(`/bookings/${r.govde?.id}/balance-paid`, {}, musteriToken);
    const br = await gonder(`/bookings/${r.govde?.id}/balance-received`, {}, uzmanToken);
    if (!bp.ok || !br.ok) {
      console.error(
        `  puan turu ${i}: ödeme — ${JSON.stringify(bp.govde).slice(0, 80)} | ${JSON.stringify(br.govde).slice(0, 80)}`,
      );
      continue;
    }
    // Bu turun puanı yazılana kadar bekle: sabit uyku yavaş makinede yetmiyor.
    await bakiyeBekle(oncekiBakiye + 1);
  }
  return (await get('/loyalty', musteriToken))?.points ?? 0;
}

const bakiye = await puanBiriktir(5000);
ol('puan kilidi açılacak bakiyeye ulaşıldı', bakiye >= 5000, `${bakiye} puan`);

const kilitDurumu = await get('/loyalty', musteriToken);
ol(
  'bakiye eşiği geçince KİLİT AÇILIYOR',
  kilitDurumu?.spend?.unlocked === true,
  JSON.stringify(kilitDurumu?.spend ?? {}).slice(0, 120),
);

/* ── 3.1 DEPOZİTONUN BİR KISMI PUANLA ─────────────────────────────── */
const rp = await gecmisRandevuAc(1500);
const rpId = rp.govde?.id;
await gonder(`/bookings/${rpId}/approve`, {}, uzmanToken);
const puanliDekont = await gonder(
  `/bookings/${rpId}/deposit-receipt`,
  {
    receiptUri: `data:image/jpeg;base64,${Buffer.from(`puanli-${damga}`).toString('base64')}`,
    pointsRequested: 100000,
  },
  musteriToken,
);
ol(
  'puanlı dekont kabul ediliyor',
  puanliDekont.ok,
  JSON.stringify(puanliDekont.govde).slice(0, 140),
);
const bakiyeSonra = (await get('/loyalty', musteriToken))?.points ?? 0;
const harcanan = bakiye - bakiyeSonra;
// Tavan: biriken puanın %25'i ve depozitoyu (2.000) aşamaz.
ol(
  'puan TAVANI aşılmıyor',
  harcanan > 0 && harcanan <= 2000,
  `${harcanan} puan harcandı (depozito 2000, bakiye ${bakiye})`,
);
ol('istemcinin istediği kadar DÜŞÜLMÜYOR', harcanan < 100000, `${harcanan}`);

/* ── 3.2 ÜCRETSİZ İPTAL → NAKİT İADE + PUAN GERİ ──────────────────── */
const iptal = await gonder(`/bookings/${rpId}/cancel`, { reason: 'E2E iptal' }, musteriToken);
ol('müşteri iptal edebiliyor', iptal.ok, JSON.stringify(iptal.govde).slice(0, 120));
ol(
  'iptal MÜŞTERİ iptali olarak kaydediliyor',
  iptal.govde?.status === 'iptal_musteri',
  String(iptal.govde?.status),
);
// Randevu geçmişte → eşik geçti → depozito YANAR (§4.7). Yanan depozitoda
// iade hakkı doğmuyor; puan da geri gelmiyor (ceza yarıya bölünmemeli).
const yanmis = iptal.govde?.depositForfeited === true;
ol('geç iptalde depozito YANIYOR', yanmis, String(iptal.govde?.depositForfeited));
const iadeRed = await gonder(
  `/bookings/${rpId}/refund-request`,
  { payoutInfo: 'Kaspi 7700' },
  musteriToken,
);
ol(
  'yanan depozitoda İADE HAKKI YOK',
  !iadeRed.ok,
  `${iadeRed.durum} ${iadeRed.govde?.error?.code ?? ''}`,
);
const bakiyeYanma = (await get('/loyalty', musteriToken))?.points ?? 0;
ol(
  'yanan depozitoda puan da geri GELMİYOR',
  bakiyeYanma === bakiyeSonra,
  `${bakiyeSonra} → ${bakiyeYanma}`,
);

/* ── 3.3 ERKEN İPTAL → NAKİT İADE PUANI İÇERMİYOR ─────────────────── */
// Başlangıcı İLERİDE olan randevu: eşik geçmedi, depozito yanmıyor.
const ileri = await gonder(
  '/bookings',
  {
    id: `e2e-${damga}-ileri`,
    source: 'direct',
    service: 'Saç kesimi',
    proId: proKimlik,
    proName: 'Duman Uzman',
    proImage: '',
    dateLabel: 'yarın',
    inDays: 1,
    price: HIZMET_FIYATI,
    durationMin: 30,
    startMs: Date.now() + 48 * 3600_000,
  },
  musteriToken,
);
const ileriId = ileri.govde?.id;
await gonder(`/bookings/${ileriId}/approve`, {}, uzmanToken);
const ileriDekont = await gonder(
  `/bookings/${ileriId}/deposit-receipt`,
  {
    receiptUri: `data:image/jpeg;base64,${Buffer.from(`ileri-${damga}`).toString('base64')}`,
    pointsRequested: 100000,
  },
  musteriToken,
);
ol(
  'ileri tarihli randevu kesinleşiyor',
  ileriDekont.govde?.status === 'kesinlesti',
  String(ileriDekont.govde?.status),
);
const puanIleri = Number(ileriDekont.govde?.pointsUsed ?? 0);
ol('kullanılan puan EKRANA gönderiliyor', puanIleri > 0, `${puanIleri} puan`);
const bakiyeIleri = (await get('/loyalty', musteriToken))?.points ?? 0;
const iptalErken = await gonder(`/bookings/${ileriId}/cancel`, {}, musteriToken);
ol(
  'erken iptalde depozito YANMIYOR',
  iptalErken.govde?.depositForfeited !== true,
  String(iptalErken.govde?.depositForfeited),
);
const iade = await gonder(
  `/bookings/${ileriId}/refund-request`,
  { payoutInfo: 'Kaspi 7700' },
  musteriToken,
);
ol('erken iptalde iade talebi açılıyor', iade.ok, JSON.stringify(iade.govde).slice(0, 140));
// NAKİT iade = depozito − puanla ödenen kısım. Tamamı nakit ödenseydi puan
// paraya çevrilmiş olurdu.
ol(
  'nakit iade puanla ödenen kısmı İÇERMİYOR',
  Number(iade.govde?.amount) === 2000 - puanIleri,
  `${iade.govde?.amount} (depozito 2000 − puan ${puanIleri})`,
);
const bakiyeIadeSonrasi = await bakiyeBekle(bakiyeIleri + puanIleri);
ol(
  'puanla ödenen kısım PUAN olarak geri geliyor',
  bakiyeIadeSonrasi === bakiyeIleri + puanIleri,
  `${bakiyeIleri} + ${puanIleri} → ${bakiyeIadeSonrasi}`,
);

/* ══════════════════════════════════════════════════════════════════════
 * AŞAMA 4 — ÜYELİK VE REKLAM (para giren diğer iki yol)
 * ══════════════════════════════════════════════════════════════════════ */

/* ── 4.1 ÜYELİK: SATIN AL → DEKONT → ONAY ─────────────────────────── */
const uyelik = await gonder('/subscriptions', { tier: 'premium' }, uzmanToken);
ol('üyelik talebi açılıyor', uyelik.ok, JSON.stringify(uyelik.govde).slice(0, 140));
const uyelikId = uyelik.govde?.id;
ol(
  'üyelik BEKLİYOR durumunda başlıyor',
  uyelik.govde?.status === 'pending',
  String(uyelik.govde?.status),
);

const uyelikDekontIcerik = `data:image/jpeg;base64,${Buffer.from(`uyelik-${damga}`).toString('base64')}`;
const uyelikDekont = await gonder(
  `/subscriptions/${uyelikId}/receipt`,
  { receiptUri: uyelikDekontIcerik },
  uzmanToken,
);
ol('üyelik dekontu yükleniyor', uyelikDekont.ok, JSON.stringify(uyelikDekont.govde).slice(0, 120));

// AYNI dekont ikinci bir üyelikte kullanılamaz.
const uyelik2 = await gonder('/subscriptions', { tier: 'premium' }, uzmanToken);
const tekrarDekont = await gonder(
  `/subscriptions/${uyelik2.govde?.id}/receipt`,
  { receiptUri: uyelikDekontIcerik },
  uzmanToken,
);
ol(
  'AYNI üyelik dekontu ikinci kez kullanılamıyor',
  !tekrarDekont.ok,
  `${tekrarDekont.durum} ${tekrarDekont.govde?.error?.code ?? ''}`,
);

const uyelikOnay = await gonder(
  `/admin/subscriptions/${uyelikId}/approve`,
  { months: 1 },
  yoneticiToken,
);
ol('yönetici üyeliği onaylıyor', uyelikOnay.ok, JSON.stringify(uyelikOnay.govde).slice(0, 140));
const benimUyelik = await get('/subscriptions/mine', uzmanToken);
ol('üyelik AKTİF oldu', benimUyelik?.tier === 'premium', String(benimUyelik?.tier));
const ilkBitis = new Date(benimUyelik?.until ?? 0).getTime();
ol(
  'üyelik bitişi 30 gün sonra',
  Math.abs(ilkBitis - (Date.now() + 30 * 86_400_000)) < 5 * 60_000,
  new Date(ilkBitis).toISOString(),
);

// ZATEN AKTİF talebi yeniden onaylamak bedava 30 gün yazardı.
const tekrarOnay = await gonder(
  `/admin/subscriptions/${uyelikId}/approve`,
  { months: 1 },
  yoneticiToken,
);
ol(
  'AKTİF üyelik yeniden onaylanamıyor',
  !tekrarOnay.ok,
  `${tekrarOnay.durum} ${tekrarOnay.govde?.error?.code ?? ''}`,
);

/* ── 4.2 YENİLEME: ÖDENEN GÜN KAYBOLMUYOR ─────────────────────────── */
const yenileme = await gonder('/subscriptions', { tier: 'premium' }, uzmanToken);
await gonder(
  `/subscriptions/${yenileme.govde?.id}/receipt`,
  { receiptUri: `data:image/jpeg;base64,${Buffer.from(`yenileme-${damga}`).toString('base64')}` },
  uzmanToken,
);
await gonder(`/admin/subscriptions/${yenileme.govde?.id}/approve`, { months: 1 }, yoneticiToken);
const yenilenmis = await get('/subscriptions/mine', uzmanToken);
const yeniBitis = new Date(yenilenmis?.until ?? 0).getTime();
// Kalan 30 günün ÜSTÜNE 30 gün: toplam ~60. Sabit "bugün + 30" yazsaydı
// uzman ödediği bir ayı kaybederdi.
ol(
  'yenilemede ödenen gün KAYBOLMUYOR',
  Math.abs(yeniBitis - (ilkBitis + 30 * 86_400_000)) < 5 * 60_000,
  `${new Date(ilkBitis).toISOString().slice(0, 10)} → ${new Date(yeniBitis).toISOString().slice(0, 10)}`,
);

// Eski satır kapatılmalı: kapatılmazsa zamanlayıcı onu bulup uzmanı free'ye düşürür.
const eskiKapandi = await gonder('/admin/subscriptions/run-expire', {}, yoneticiToken);
ol('süre dolum turu çalışıyor', eskiKapandi.ok, JSON.stringify(eskiKapandi.govde).slice(0, 80));
const uyelikSonra = await get('/subscriptions/mine', uzmanToken);
ol(
  'YENİLEYEN uzman üyeliğini KAYBETMİYOR',
  uyelikSonra?.tier === 'premium',
  String(uyelikSonra?.tier),
);

/* ── 4.3 REKLAM: SİPARİŞ → DEKONT → YAYIN ─────────────────────────── */
const reklam = await gonder(
  '/ad-orders',
  {
    proName: 'Duman Uzman',
    placement: 'one_cikanlar',
    title: 'Duman kampanyası',
    subtitle: 'E2E',
    image: 'data:image/jpeg;base64,UkVLTEFN',
    months: 2,
  },
  uzmanToken,
);
ol('reklam siparişi açılıyor', reklam.ok, JSON.stringify(reklam.govde).slice(0, 140));
const reklamId = reklam.govde?.id;
/*
 * Görsel DEPOLAMADAN geçiyor. R2 yapılandırılmamış ortamda (yerel/CI)
 * `storage.put` değeri olduğu gibi döndürüyor — o yüzden burada beklenen şey
 * "veri adresi değil" değil, "görsel KAYBOLMAMIŞ". Depolamadan geçtiğinin
 * kanıtı birim testinde (`reklam-gorseli.test.ts`); burada zincirin
 * kopmadığını doğruluyoruz.
 */
ol(
  'reklam görseli siparişte duruyor',
  !!reklam.govde?.image,
  String(reklam.govde?.image ?? '').slice(0, 40),
);

const dekontsuzOnay = await gonder(`/admin/ad-orders/${reklamId}/approve`, {}, yoneticiToken);
ol(
  'DEKONTSUZ reklam yayına alınamıyor',
  !dekontsuzOnay.ok,
  `${dekontsuzOnay.durum} ${dekontsuzOnay.govde?.error?.code ?? ''}`,
);

await gonder(
  `/ad-orders/${reklamId}/receipt`,
  { receiptUri: `data:image/jpeg;base64,${Buffer.from(`reklam-${damga}`).toString('base64')}` },
  uzmanToken,
);
const reklamOnay = await gonder(`/admin/ad-orders/${reklamId}/approve`, {}, yoneticiToken);
ol('reklam yayına alınıyor', reklamOnay.ok, JSON.stringify(reklamOnay.govde).slice(0, 120));
ol(
  'sipariş YAYINDA durumuna geçiyor',
  reklamOnay.govde?.status === 'yayinda',
  String(reklamOnay.govde?.status),
);

const tekrarReklamOnay = await gonder(`/admin/ad-orders/${reklamId}/approve`, {}, yoneticiToken);
ol(
  'YAYINDAKİ sipariş yeniden onaylanamıyor',
  !tekrarReklamOnay.ok,
  `${tekrarReklamOnay.durum} ${tekrarReklamOnay.govde?.error?.code ?? ''}`,
);

const reklamlar = await get('/ads');
const benimReklam = (reklamlar ?? []).find((a) => a.title === 'Duman kampanyası');
ol('reklam KEŞİFTE görünüyor', !!benimReklam, `${(reklamlar ?? []).length} reklam`);

/* ══════════════════════════════════════════════════════════════════════
 * AŞAMA 5 — ERTELEME, GELMEDİ AKIŞI VE W2W
 * ══════════════════════════════════════════════════════════════════════ */

/* ── 5.1 ERTELEME (§4.6) ──────────────────────────────────────────── */
const ert = await gonder(
  '/bookings',
  {
    id: `e2e-${damga}-ertele`,
    source: 'direct',
    service: 'Saç kesimi',
    proId: proKimlik,
    proName: 'Duman Uzman',
    proImage: '',
    dateLabel: 'yarın',
    inDays: 2,
    price: HIZMET_FIYATI,
    durationMin: 30,
    startMs: Date.now() + 200 * 3600_000,
  },
  musteriToken,
);
const ertId = ert.govde?.id;
const ertOnay = await gonder(`/bookings/${ertId}/approve`, {}, uzmanToken);
ol('erteleme randevusu onaylanıyor', ertOnay.ok, JSON.stringify(ertOnay.govde).slice(0, 150));
const ertDekont = await gonder(
  `/bookings/${ertId}/deposit-receipt`,
  { receiptUri: `data:image/jpeg;base64,${Buffer.from(`ertele-${damga}`).toString('base64')}` },
  musteriToken,
);
ol(
  'erteleme randevusunun dekontu yükleniyor',
  ertDekont.ok,
  JSON.stringify(ertDekont.govde).slice(0, 150),
);
const ertDurum = (await get('/bookings/mine', musteriToken))?.find((b) => b.id === ertId);
ol(
  'erteleme randevusu kesinleşti',
  ertDurum?.status === 'kesinlesti',
  `durum: ${ertDurum?.status} · rescheduleCount: ${ertDurum?.rescheduleCount}`,
);
const yeniSaat = Date.now() + 224 * 3600_000;
const oneri = await gonder(`/bookings/${ertId}/reschedule`, { startMs: yeniSaat }, musteriToken);
ol('müşteri erteleme önerebiliyor', oneri.ok, JSON.stringify(oneri.govde).slice(0, 130));
ol(
  'erteleme ÖNERİ durumuna geçiyor',
  oneri.govde?.status === 'erteleme_onerildi',
  String(oneri.govde?.status),
);

// §4.6 — ÖNEREN kendi önerisini kabul edemez.
const kendiKabul = await gonder(`/bookings/${ertId}/reschedule/accept`, {}, musteriToken);
ol(
  'ÖNEREN kendi önerisini kabul edemiyor',
  !kendiKabul.ok,
  `${kendiKabul.durum} ${kendiKabul.govde?.error?.code ?? ''}`,
);

const kabul = await gonder(`/bookings/${ertId}/reschedule/accept`, {}, uzmanToken);
ol('karşı taraf erteleme kabul edebiliyor', kabul.ok, JSON.stringify(kabul.govde).slice(0, 130));
ol(
  'erteleme kabulünde randevu KESİNLEŞMİŞ kalıyor',
  kabul.govde?.status === 'kesinlesti',
  String(kabul.govde?.status),
);
ol(
  'yeni saat randevuya yazıldı',
  Math.abs(Number(kabul.govde?.startMs) - yeniSaat) < 60_000,
  `startMs=${kabul.govde?.startMs} (beklenen ${yeniSaat})`,
);
// Depozito AYNEN taşınıyor: yeni tarih için ikinci kez ödeme istenmiyor.
ol(
  'depozito yeni tarihe TAŞINIYOR',
  Number(kabul.govde?.depositAmount) === HIZMET_FIYATI / 10,
  String(kabul.govde?.depositAmount),
);

// §7.8 — randevu başına 1 ücretsiz erteleme.
const ikinciErteleme = await gonder(
  `/bookings/${ertId}/reschedule`,
  { startMs: Date.now() + 248 * 3600_000 },
  musteriToken,
);
ol(
  'İKİNCİ erteleme hakkı yok',
  !ikinciErteleme.ok,
  `${ikinciErteleme.durum} ${ikinciErteleme.govde?.error?.code ?? ''}`,
);

/* ── 5.2 "GELMEDİ" AKIŞI (§4.8) ───────────────────────────────────── */
// Randevu saati GELMEDEN "gelmedi" işaretlenemez.
const ns = await gecmisRandevuAc(5); // 5 dk önce başladı → 15 dk dolmadı
await gonder(`/bookings/${ns.govde?.id}/approve`, {}, uzmanToken);
await gonder(
  `/bookings/${ns.govde?.id}/deposit-receipt`,
  { receiptUri: `data:image/jpeg;base64,${Buffer.from(`noshow-${damga}`).toString('base64')}` },
  musteriToken,
);
const erkenNs = await gonder(`/bookings/${ns.govde?.id}/no-show`, {}, uzmanToken);
ol(
  '15 dakika dolmadan "gelmedi" işaretlenemiyor',
  !erkenNs.ok,
  `${erkenNs.durum} ${erkenNs.govde?.error?.code ?? ''}`,
);

// 20 dk önce başlamış randevuda işaretlenebiliyor.
const ns2 = await gecmisRandevuAc(430);
await gonder(`/bookings/${ns2.govde?.id}/approve`, {}, uzmanToken);
await gonder(
  `/bookings/${ns2.govde?.id}/deposit-receipt`,
  { receiptUri: `data:image/jpeg;base64,${Buffer.from(`noshow2-${damga}`).toString('base64')}` },
  musteriToken,
);
const gelmedi = await gonder(`/bookings/${ns2.govde?.id}/no-show`, {}, uzmanToken);
ol('uzman "gelmedi" işaretleyebiliyor', gelmedi.ok, JSON.stringify(gelmedi.govde).slice(0, 130));
ol(
  'randevu NO-SHOW durumuna geçiyor',
  gelmedi.govde?.status === 'no_show_musteri',
  String(gelmedi.govde?.status),
);
ol(
  'itiraz penceresi açılıyor',
  !!gelmedi.govde?.finalizeDeadline,
  String(gelmedi.govde?.finalizeDeadline),
);

const itiraz = await gonder(`/bookings/${ns2.govde?.id}/dispute`, {}, musteriToken);
ol('müşteri itiraz edebiliyor', itiraz.ok, JSON.stringify(itiraz.govde).slice(0, 120));
ol(
  'itirazda finansal durum DONUYOR',
  itiraz.govde?.status === 'uyusmazlik',
  String(itiraz.govde?.status),
);

// UZMAN gelmedi: depozito iadesi + telafi puanı.
const uns = await gecmisRandevuAc(520);
await gonder(`/bookings/${uns.govde?.id}/approve`, {}, uzmanToken);
await gonder(
  `/bookings/${uns.govde?.id}/deposit-receipt`,
  { receiptUri: `data:image/jpeg;base64,${Buffer.from(`uzmanyok-${damga}`).toString('base64')}` },
  musteriToken,
);
const puanOnce = (await get('/loyalty', musteriToken))?.points ?? 0;
const uzmanYok = await gonder(`/bookings/${uns.govde?.id}/provider-no-show`, {}, musteriToken);
ol(
  'müşteri "uzman gelmedi" bildirebiliyor',
  uzmanYok.ok,
  JSON.stringify(uzmanYok.govde).slice(0, 130),
);
ol(
  'uzman no-show durumu yazılıyor',
  uzmanYok.govde?.status === 'no_show_uzman',
  String(uzmanYok.govde?.status),
);
const puanTelafi = await bakiyeBekle(puanOnce + 1);
ol(
  'uzman gelmediğinde TELAFİ PUANI veriliyor',
  puanTelafi > puanOnce,
  `${puanOnce} → ${puanTelafi}`,
);

/* ── 5.3 W2W ──────────────────────────────────────────────────────── */
const gonderi = await gonder(
  '/circle/posts',
  { category: 'Saç', text: 'Duman testi sorusu — kök boya önerisi?', anonymous: true },
  musteriToken,
);
ol('W2W gönderisi açılıyor', gonderi.ok, JSON.stringify(gonderi.govde).slice(0, 130));
const gonderiId = gonderi.govde?.id;

const akis = await get('/circle/posts');
const benimGonderi = (akis ?? []).find((x) => x.id === gonderiId);
ol('gönderi akışta görünüyor', !!benimGonderi, `${(akis ?? []).length} gönderi`);
ol(
  'ANONİM gönderide yazar kimliği YOK',
  benimGonderi?.authorUserId == null,
  String(benimGonderi?.authorUserId),
);

const f1 = await gonder(`/circle/posts/${gonderiId}/helpful`, { on: true }, musteriToken);
const f2 = await gonder(`/circle/posts/${gonderiId}/helpful`, { on: true }, musteriToken);
const f3 = await gonder(`/circle/posts/${gonderiId}/helpful`, { on: true }, musteriToken);
ol(
  'AYNI kişi sayacı şişiremiyor',
  Number(f3.govde?.helpful) === 1,
  `3 kez işaretlendi → ${f3.govde?.helpful}`,
);
const baskasi = await gonder(`/circle/posts/${gonderiId}/helpful`, { on: true }, uzmanToken);
ol(
  'FARKLI kişi sayacı artırıyor',
  Number(baskasi.govde?.helpful) === 2,
  String(baskasi.govde?.helpful),
);
const silmeDenemesi = await gonder(`/circle/posts/${gonderiId}/helpful`, { on: false }, uzmanToken);
ol(
  'kişi YALNIZ KENDİ işaretini kaldırıyor',
  Number(silmeDenemesi.govde?.helpful) === 1,
  `${silmeDenemesi.govde?.helpful} (müşterininki durmalı)`,
);

const yorumW2W = await gonder(
  `/circle/posts/${gonderiId}/comments`,
  { text: 'Duman testi cevabı' },
  uzmanToken,
);
ol('W2W yorumu yazılabiliyor', yorumW2W.ok, JSON.stringify(yorumW2W.govde).slice(0, 120));
const yorumlar = await get(`/circle/posts/${gonderiId}/comments`);
ol(
  'yorumda KULLANICI KİMLİĞİ dönmüyor',
  !JSON.stringify(yorumlar ?? []).includes(musteriId),
  JSON.stringify(yorumlar ?? []).slice(0, 100),
);

/* ── RAPOR ─────────────────────────────────────────────────────────── */
const dusen = sonuclar.filter((s) => !s.gecti);
for (const s of sonuclar) {
  console.log(`${s.gecti ? '✔' : '✖'} ${s.ad}${s.detay ? '  · ' + s.detay : ''}`);
}
console.log(`\n${sonuclar.length - dusen.length}/${sonuclar.length} geçti`);

/* ── TEMİZLİK — bu betik ARDINDA VERİ BIRAKMAZ ─────────────────────── */
try {
  /*
   * TEMİZLİK, SUNUCUNUN VERİTABANINDA ÇALIŞMALI.
   *
   * `DATABASE_URL` verilmediğinde Prisma varsayılan bağlantıya düşüyor ve
   * temizlik BAŞKA bir veritabanında koşuyordu: ekrana "test verisi silindi"
   * yazıyor, gerçek veritabanında kayıtlar birikmeye devam ediyordu. Sonraki
   * koşu o kalıntılara takılıyor ve hata sanki üründeymiş gibi görünüyor.
   */
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL yok — temizlik yanlış veritabanında koşabilir');
  }
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
  /*
   * ÜYELİK, REKLAM ve BANNER da siliniyor.
   *
   * Temizlik yalnız randevu/teklif/uzman kayıtlarını siliyordu: üyelik ve
   * reklam siparişleri birikiyor, dekont tekilliği yüzünden BİR SONRAKİ
   * koşu düşüyordu. "Ardında veri bırakmaz" sözü tutulmuş olmuyordu.
   */
  await p.subscription.deleteMany({ where: { userId: { in: ids } } });
  await p.adOrder.deleteMany({ where: { userId: { in: ids } } });
  await p.adBanner.deleteMany({ where: { proId: { in: prolar.map((x) => x.id) } } });
  await p.rating.deleteMany({ where: { subjectId: { in: prolar.map((x) => x.id) } } });
  await p.loyaltyEntry.deleteMany({ where: { userId: { in: ids } } });
  await p.refundRequest.deleteMany({ where: { payeeUserId: { in: ids } } });
  await p.userNotification.deleteMany({ where: { userId: { in: ids } } });
  await p.notificationOutbox.deleteMany({ where: { userId: { in: ids } } });
  await p.userPrefs.deleteMany({ where: { userId: { in: ids } } });
  await p.specialist.deleteMany({ where: { userId: { in: ids } } });
  await p.professional.deleteMany({ where: { name: 'Duman Uzman' } });
  await p.user.deleteMany({ where: { id: { in: ids } } });
  await p.$disconnect();
  // HANGİ veritabanı temizlendi: yanlış hedefe koşan bir temizlik sessiz kalmasın.
  const hedef = (process.env.DATABASE_URL ?? '').split('/').pop()?.split('?')[0] ?? '?';
  console.log(`test verisi silindi (veritabanı: ${hedef})`);
} catch (e) {
  // Temizlik başarısız olursa TEST SONUCU DEĞİŞMEZ ama sessiz de kalmaz:
  // arkada kalan veri bir sonraki çalıştırmayı bozabilir.
  console.error('UYARI: test verisi silinemedi —', String(e).slice(0, 200));
}

process.exit(dusen.length === 0 ? 0 : 1);
