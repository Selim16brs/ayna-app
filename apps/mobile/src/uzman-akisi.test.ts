import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { sablonlar } from './mesaj-sablonlari';

const yorumsuz = (k: string) =>
  k.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const oku = (...p: string[]) => yorumsuz(readFileSync(join(__dirname, '..', ...p), 'utf8'));
const api = (...p: string[]) =>
  yorumsuz(readFileSync(join(__dirname, '..', '..', 'api', 'src', ...p), 'utf8'));

/** Kurucunun bu turdaki bildirimleri. */

test('RANDEVU YOKKEN mesaj şablonları BOŞ DEĞİL', () => {
  /*
   * Kurucu: "mesaj alanı açılmıyor. burada standart kalıplar ile iletişim
   * kurulacaktı."
   *
   * Şablonlar randevu DURUMUNA bağlıydı; randevu yoksa liste boş
   * dönüyordu. Müşteri uzmanın profilinden mesaj açtığında ekranda "İlk
   * mesajı sen yaz" yazıyor ama yazacak hiçbir şey olmuyordu.
   */
  assert.ok(sablonlar('musteri').length > 0, 'müşteri randevusuz konuşamıyor');
  assert.ok(sablonlar('uzman').length > 0, 'uzman randevusuz konuşamıyor');
  // Kapanmış randevuda yine boş: oraya "uygun musun?" koymak akışa ait değil.
  assert.equal(sablonlar('musteri', 'iptal_musteri').length, 0);
});

test('MÜŞTERİ TALEBİ uzmanın TALEPLER ekranında', () => {
  /*
   * Kurucu: "müşteriden gelen randevu isteği uzmanın talepler kısmında
   * görünmeli."
   *
   * Ekran YALNIZ teklif havuzunu gösteriyordu; müşterinin doğrudan
   * randevu talebi buraya hiç düşmüyordu.
   */
  const k = oku('app', 'seller', 'requests.tsx');
  assert.match(k, /status === 'onay_bekliyor'/, 'doğrudan talepler listelenmiyor');
  assert.match(k, /randevuEylemi\(b\.id, 'onayla'\)/, 'onaylama yolu yok');
  assert.match(k, /b\.benimRolum !== 'musteri'/, 'uzmanın kendi randevuları da talep sayılıyor');
});

test('TAKVİME yalnız ONAYLANMIŞ randevu giriyor', () => {
  /*
   * Kurucu: "takvim kısmında randevu onaylandıktan sonra görünmeli, bunun
   * dışındaki talepler kesinlikle takvime işlenmez."
   */
  const k = oku('app', 'seller', 'agenda.tsx');
  const liste = k.slice(k.indexOf('const CALENDAR_STATUSES'), k.indexOf('function buildDayRows'));
  assert.doesNotMatch(liste, /'onay_bekliyor'/, 'onaysız talep takvimde');
  assert.match(liste, /'kesinlesti'/, 'onaylı randevu takvimde değil');
  assert.match(k, /\.filter\(takvimeGirer\)/, 'liste görünümü süzülmüyor');
});

test('KYC belgesi FOTOĞRAF kabul ediyor', () => {
  /*
   * Kurucu: "uzman kimlik doğrulama yapmak istediğinde görsel yüklüyor ama
   * doğrulama gönder dediğinde hata mesajı alıyor."
   *
   * Şema `max(600)` idi — bir ADRES uzunluğu. Uygulama ise base64
   * fotoğraf gönderiyor: on binlerce karakter. Her gönderim reddediliyordu.
   */
  const dto = api('kyc', 'kyc.dto.ts');
  const sinir = /documents: z\.array\(z\.string\(\)\.min\(1\)\.max\((\d+(?:_\d+)*)\)\)/.exec(dto);
  assert.ok(sinir, 'belge sınırı bulunamadı');
  assert.ok(Number(sinir![1]!.replace(/_/g, '')) > 100_000, 'belge sınırı hâlâ fotoğrafa yetmiyor');
  // Ham base64 veritabanına yazılmıyor: depoya taşınıp adresi saklanıyor.
  assert.match(
    api('kyc', 'kyc.service.ts'),
    /this\.storage\.put\(d, 'kyc'\)/,
    'belge depoya gitmiyor',
  );
});

test('HİZMET tek tek EKLENİYOR ve kutusu kapanıyor', () => {
  /*
   * Kurucu: "hizmet ekleniyor mu eklenmiyor mu belli değil… ekle demesi
   * lazım ve o hizmet eklenmiş olarak kabul edilmeli ve penceresi
   * kapanmalı."
   */
  const k = oku('app', 'seller', 'services.tsx');
  assert.match(k, /const satiriEkle = \(key: string\) =>/, 'tek satır ekleme yok');
  assert.match(k, /setSellerServices\(guncel\.filter\(satirGecerli\)\)/, 'ekleme kaydetmiyor');
  assert.match(k, /kapat\(key\);/, 'kutu kapanmıyor');
  assert.match(k, /!acikMi\(r\.key\) \? \(/, 'eklenmiş hizmet özetlenmiyor');
});

test('UZMAN PROFİLİ salon kimliğini ADRESTEN tahmin etmiyor', () => {
  /*
   * Kurucu: "uzman salona kayıt yaptı ve salonda görünüyor. ama müşteri
   * uzmanın profiline tıkladığında 'bu profil bulunamadı' diye hata
   * veriyor."
   *
   * Salon kimliği uzman kimliğinden `split('-u')[0]` ile çıkarılıyordu —
   * eski demo kimlik biçimine göre. Gerçek kimlikler UUID.
   */
  const k = oku('app', 'uzman', '[id].tsx');
  assert.match(k, /salonParam \?\? ''/, 'salon kimliği bağlantıyla gelmiyor');
  const kaynak = oku('app', 'professional', '[id].tsx');
  assert.match(
    kaynak,
    /params: \{ id: u\.id, salon: pro\.id \}/,
    'bağlantı salon kimliği taşımıyor',
  );
});

test('UZMAN PUAN TOPLAMIYOR', () => {
  // Kurucu: "uzman ve salon puan toplayamaz."
  const k = oku('app', '(tabs)', 'profile.tsx');
  assert.match(
    k,
    /'profile\.menu\.rewards', icon: 'gift-outline', customerOnly: true/,
    'puanlar uzmanda',
  );
  assert.match(
    k,
    /'profile\.menu\.referral', icon: 'gift-outline', customerOnly: true/,
    'davet ödülü uzmanda',
  );
});

test('UZMAN GİZLİLİĞİ müşterininkiyle aynı değil', () => {
  /*
   * Kurucu: "konum paylaşımı açılıp kapanabilir bir özellik olmamalı çünkü
   * uzman adresini belirtmeli."
   */
  const k = oku('app', 'profile', 'privacy.tsx');
  assert.match(
    k,
    /satici && \(x\.key === 'location' \|\| x\.key === 'anon'\)/,
    'konum anahtarı uzmanda duruyor',
  );
  assert.match(k, /privacy\.pro_address/, 'uzmana özel bölüm yok');
});

test('OLMAYAN TEKLİF duyurulmuyor', () => {
  /*
   * Kurucu: "hiçbir teklif gelmeden direkt bildirim geldi ve bildirimde
   * teklifler gelmeye başladı yazıyor."
   */
  const k = oku('src', 'store.ts');
  // Dilim `createDemand`in GÖVDESİ: tip tanımındaki `createDemand:` daha
  // önce geçtiği için `indexOf` oradan başlıyordu ve gövdeyi kaçırıyordu.
  const bas = k.indexOf('createDemand: async');
  const son = k.indexOf('hydrateDemands:', bas);
  assert.ok(bas > 0 && son > bas, 'createDemand gövdesi bulunamadı');
  const govde = k.slice(bas, son);
  assert.doesNotMatch(govde, /notif\.offers_started/, 'talep açılırken teklif bildirimi atılıyor');
  assert.match(govde, /notif\.demand_sent/, 'gerçekten olan şey söylenmiyor');
  // Gerçek teklif geldiğinde bildirim düşüyor.
  const layout = oku('app', '_layout.tsx');
  assert.match(layout, /titleKey: 'notif\.offers_started'/, 'gerçek teklifte bildirim yok');
  assert.match(layout, /params: \{ n: String\(fresh\.count\) \}/, 'bildirim sayısı gerçek değil');
});

test('SALON KODU paylaşımı YALNIZ kodu taşıyor', () => {
  // Kurucu: "sadece kod kopyalanmalı."
  const k = oku('app', 'seller', 'codes.tsx');
  assert.match(k, /Share\.share\(\{ message: code, title:/, 'kopyalanan metne açıklama karışıyor');
});

test('UZMAN PORTRESİ müşteriyle aynı biçimde', () => {
  const k = oku('app', 'seller', 'reports.tsx');
  assert.match(k, /portreKesilmis \? styles\.portreKap : styles\.avatarHalka/, 'portre hep daire');
  // Profil fotoğrafının altındaki yansıma/degrade kaldırıldı.
  const pro = oku('app', 'professional', '[id].tsx');
  assert.doesNotMatch(pro, /styles\.reflection/, 'yansıma duruyor');
});
