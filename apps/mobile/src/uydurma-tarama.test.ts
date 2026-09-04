import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { saglayiciMesafesi } from './data';

/**
 * UYDURMA VERİ TARAMASI — kurucunun "bu ve benzeri hatalar var mı kontrol
 * et" isteği üzerine bulunan hataların TEKRAR ETMEMESİ için.
 *
 * Hepsinin ortak kalıbı aynı: gerçek veri yokken ekranın makul görünen
 * bir sayı ya da etiket ÜRETMESİ. Kullanıcı bunu kendi hesabı hakkında
 * bir gerçek sanıyor.
 */

/*
 * YORUMLAR TARAMAYA DAHİL DEĞİL.
 *
 * Bu testlerin çoğu "şu eski kalıp geri gelmedi" diye kod arıyor. Aynı
 * kalıp, düzeltmeyi ANLATAN yorumlarda da geçiyor ("burada `?? 'bronze'`
 * vardı"). İlk sürümde dört test tam bu yüzden kendi açıklamama takıldı.
 * Yorumlar sökülüyor: test kodun ne YAPTIĞINA bakıyor, ne anlattığına
 * değil.
 */
const yorumsuz = (k: string) =>
  k.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const oku = (...p: string[]) => yorumsuz(readFileSync(join(__dirname, '..', ...p), 'utf8'));

test('RANDEVU SAATLERİ uydurulmuyor — yalnız sunucudan', () => {
  /*
   * Sunucu cevap vermeyince ekran 10:00'dan başlayıp saat başı ON kutucuk
   * çiziyordu. O saatler uzmanın takviminde yoktu: müşteri yayınlanmamış
   * bir saati seçip randevu akışına giriyordu.
   */
  const k = oku('app', 'professional', '[id].tsx');
  assert.doesNotMatch(k, /Array\.from\(\{ length: 10 \}/, 'saat üretimi geri gelmiş');
  assert.match(k, /const daySlots = \(serverSlots \?\? \[\]\)/, 'saatler sunucudan gelmiyor');
  // Yükleniyor ile ALINAMADI ayrı: ikisi de "hazır" sayılırsa boş ızgara
  // "bugün hiç yer yok" gibi okunurdu.
  assert.match(k, /'yukleniyor' \| 'hazir' \| 'hata'/, 'yükleniyor/hata ayrımı yok');
  assert.match(k, /booking\.schedule\.slots_failed/, 'alınamadı durumu kullanıcıya söylenmiyor');
});

test('MESAFE yalnız gerçek koordinattan — kimlikten üretilmiyor', () => {
  // Koordinat yoksa sayı YOK.
  assert.equal(saglayiciMesafesi({ lat: null, lng: null, city: 'Almatı' }, 'Almatı'), null);
  assert.equal(saglayiciMesafesi({ city: 'Almatı' }, 'Almatı'), null);
  const gercek = saglayiciMesafesi({ lat: 43.3, lng: 76.9, city: 'Almatı' }, 'Almatı');
  assert.ok(gercek !== null && gercek > 0, 'gerçek koordinatta mesafe hesaplanmıyor');

  for (const [dosya, ...yol] of [
    ['arama', 'app', 'search.tsx'],
    ['salon satırı', 'src', 'ui', 'SalonRow.tsx'],
  ] as const) {
    const k = oku(...(yol as unknown as string[]));
    assert.doesNotMatch(k, /proCoords\(pro\.id\)/, `${dosya}: mesafe kimlikten üretiliyor`);
    assert.match(k, /saglayiciMesafesi\(pro/, `${dosya}: ortak kural kullanılmıyor`);
  }
});

test('TALEP LİSTESİNDE hash mesafesi kalmadı', () => {
  const k = oku('app', 'seller', 'requests.tsx');
  assert.doesNotMatch(k, /const estKm/, 'kimlikten mesafe üreten yardımcı duruyor');
  assert.doesNotMatch(k, /estKm\(demand\.id\)/, 'uydurma mesafe hâlâ yazılıyor');
});

test('BÜTÇE ekranı olmayan bir limit uydurmuyor', () => {
  const k = oku('app', 'profile', 'budget.tsx');
  assert.doesNotMatch(k, /const LIMIT = \d+/, 'uydurma aylık limit geri gelmiş');
  // "Bu ay harcanan" GERÇEKTEN bu ay: tüm geçmişi toplamak da bir yalandı.
  assert.match(k, /b\.startMs >= ayBasi/, 'toplam bu ayla sınırlanmıyor');
});

test('KADRO hizmetleri koda gömülü tablodan gelmiyor', () => {
  const k = oku('app', 'seller', 'staff.tsx');
  assert.doesNotMatch(k, /STAFF_SERVICES/, 'ad→hizmet tablosu hâlâ okunuyor');
  assert.match(k, /kadroda\?\.services \?\? \[\]/, 'hizmetler sunucudan alınmıyor');
});

test('PUANI OLMAYAN uzman "0,0" görünmüyor', () => {
  for (const yol of [
    ['app', 'seller', 'staff.tsx'],
    ['app', 'salon', 'staff.tsx'],
  ]) {
    const k = oku(...yol);
    assert.doesNotMatch(k, /rating\.toFixed\(1\)(?!\s*:)/, `${yol.join('/')}: 0,0 puan yazılıyor`);
  }
  const staff = oku('src', 'staff.ts');
  assert.match(staff, /rating: null/, 'bilinmeyen puan sıfır olarak taşınıyor');
});

test('SADAKAT SEVİYESİ bilinmiyorken uydurulmuyor', () => {
  const k = oku('app', 'rewards.tsx');
  assert.doesNotMatch(k, /tier\?\.key \?\? 'bronze'/, 'seviye "Bronz"a düşüyor');
  assert.match(k, /tierKey \? \(/, 'seviye yokken rozet yine çiziliyor');
});

test('GERİ ÇAĞIRMA "gönderildi" rozeti TAHMİNDEN gelmiyor', () => {
  /*
   * "Pencere geçmişse gitmiştir" varsayılıyordu. Zamanlayıcı çalışmamış
   * ya da gönderim hata almış olabilir: uzman gitmemiş bir mesajı gitmiş
   * sanıyordu.
   */
  const k = oku('app', 'seller', 'reengage.tsx');
  assert.doesNotMatch(k, /preSent: c\.kalanGun/, 'gönderim hâlâ gün sayısından çıkarılıyor');
  assert.match(k, /preSent: c\.preSent === true/, 'gerçek gönderim kaydı okunmuyor');
  const sunucu = yorumsuz(
    readFileSync(
      join(__dirname, '..', '..', 'api', 'src', 'reengage', 'reengage.service.ts'),
      'utf8',
    ),
  );
  assert.match(sunucu, /reengageSent\.findMany/, 'sunucu gönderim kaydını dönmüyor');
});

test('AJANDA çalışma saatlerini uydurmuyor', () => {
  const k = oku('app', 'seller', 'agenda.tsx');
  assert.doesNotMatch(k, /const OPEN_H = \d+/, 'sabit açılış saati geri gelmiş');
  assert.match(k, /gunPenceresi\(hours, dayStart\)/, 'uzmanın kendi saatleri kullanılmıyor');
  // Kapalı günde BOŞ aralık üretilmiyor; ama o güne alınmış randevu gizlenmiyor.
  assert.match(k, /if \(!pencere\) return bs\.map/, 'kapalı gün yanlış işleniyor');
});

test('DOLULUK şeridi kapalı saatleri "boş kapasite" saymıyor', () => {
  const k = oku('src', 'ui', 'OccupancyStrip.tsx');
  assert.match(
    k,
    /freeHours: saatBiliniyor \? free : \[\]/,
    'saat bilinmezken boş saat üretiliyor',
  );
});

test('KISITLI HESAPTA kalan gün uydurulmuyor', () => {
  const k = oku('app', 'seller', 'reports.tsx');
  assert.doesNotMatch(k, /restrictedDaysLeft \?\? 7/, 'kalan gün 7 varsayılıyor');
  assert.match(k, /restrictedDays !== null \?/, 'bilinmeyen gün sayısı yine yazılıyor');
});

test('REKLAM ve ÜYELİK fiyatları sunucudan', () => {
  const rapor = oku('app', 'seller', 'reports.tsx');
  assert.doesNotMatch(rapor, /reklamAylik \?\? 200000/, 'uydurma reklam fiyatı');
  const uyelik = oku('app', 'membership.tsx');
  assert.match(
    uyelik,
    /oranlar\.premiumUserKzt \|\| PREMIUM_PRICE_KZT/,
    'premium fiyatı sunucudan değil',
  );
  assert.match(
    uyelik,
    /oranlar\.platinumUserKzt \|\| PLATINUM_PRICE_KZT/,
    'platinum fiyatı sunucudan değil',
  );
});

test('BAŞKA KİŞİNİN profiline sessizce düşülmüyor', () => {
  const uzman = oku('app', 'uzman', '[id].tsx');
  assert.doesNotMatch(
    uzman,
    /\?\? salon\.staff\[0\]/,
    'bulunamayan uzman için ilk kişi gösteriliyor',
  );
  assert.doesNotMatch(uzman, /\|\| '1'/, 'kimliksiz istekte 1 numaralı salon açılıyor');
  const pro = oku('app', 'professional', '[id].tsx');
  assert.doesNotMatch(
    pro,
    /const proId = id \?\? '1'/,
    'kimliksiz istekte 1 numaralı işletme açılıyor',
  );
});
