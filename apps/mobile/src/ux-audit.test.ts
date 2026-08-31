import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * UX DENETİMİ B1–B4.
 *
 * Dördü de "işlem oldu mu?" sorusuna cevap vermeyen ekranlardı. Ayrı ayrı
 * küçük hatalar; ortak yanları, kullanıcıya YALAN ya da HİÇBİR ŞEY söylemeleri.
 */

const mobil = join(import.meta.dirname, '..');
const oku = (...p: string[]) => readFileSync(join(mobil, ...p), 'utf8');
/** Yorumları at — "kapora" gibi kelimeler yorumda geçtiği için testi yanıltıyordu. */
const kodu = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');

const store = kodu(oku('src', 'store.ts'));
const randevular = kodu(oku('app', '(tabs)', 'bookings.tsx'));

test('B1 · yükleniyor ile GERÇEKTEN boş ayrı şeyler', () => {
  // Randevular sekmesi `bookings.length === 0` görüp boş durumu çiziyordu.
  // İki pencerede yanlıştı: (a) soğuk açılışta AsyncStorage geri yüklemesi
  // asenkron, store `bookings: []` ile başlıyor; (b) sunucudan ilk çekim
  // sürerken. Yani randevusu OLAN kullanıcıya "hiç randevun yok" diyordu.
  for (const bayrak of ['bookingsLoading', 'demandsLoading']) {
    assert.match(store, new RegExp(`^\\s{2}${bayrak}: boolean;`, 'm'), `${bayrak} tanımlı değil`);
    // Başlangıç "true" olmalı: açılışta henüz BİLMİYORUZ. `false` başlarsa
    // ilk kare yine yanlış boş durumu çizer.
    assert.match(store, new RegExp(`^\\s+${bayrak}: true,`, 'm'), `${bayrak} true başlamıyor`);
  }

  // Bayrak VARLIĞI yetmez — ekranın onu KAPI olarak kullanması gerek.
  assert.match(randevular, /const showEmpty = bosListe && !yukleniyor;/, 'boş durum kapısı yok');
  assert.match(randevular, /const showSkeleton = bosListe && yukleniyor;/, 'iskelet yok');
  assert.match(
    randevular,
    /const yukleniyor = active === 'requests' \? demandsLoading : bookingsLoading;/,
    'sekmeye göre doğru bayrak seçilmiyor',
  );
});

test('B1 · bayrak HER çıkış yolunda iniyor', () => {
  // En kötü senaryo yanlış boş durum DEĞİL, sonsuz iskelet: sunucu kapalıyken
  // bayrak asılı kalırsa kullanıcı hiçbir zaman içerik göremez.
  for (const fn of ['hydrateBookings', 'hydrateDemands']) {
    const m = new RegExp(`${fn}: async \\(\\) => \\{[\\s\\S]*?\\n {6}\\},`).exec(store);
    assert.ok(m, `${fn} bulunamadı`);
    const govde = m[0];
    // token yok → hemen in
    assert.match(
      govde,
      /if \(!token\) \{\s*\n\s*set\(\{ \w+Loading: false \}\);/,
      `${fn}: misafir yolunda inmiyor`,
    );
    // hata olsa DA in
    assert.match(
      govde,
      /\} finally \{\s*\n(?:\s*\n)?\s*set\(\{ \w+Loading: false \}\);/,
      `${fn}: finally yok`,
    );
  }
});

test('B2 · kayıt oturumu ATILMIYOR, otomatik giriş yapılıyor', () => {
  // Sunucu kayıt yanıtında zaten tam oturum döndürüyordu; uygulama onu atıp
  // kullanıcıyı giriş ekranına yolluyor, az önce yazdığı telefon+şifreyi
  // tekrar yazdırıyordu.
  const musteri = kodu(oku('app', 'auth', 'customer.tsx'));
  assert.match(musteri, /const session = await api\.register\(/, 'oturum yakalanmıyor');
  assert.match(musteri, /setAuth\(session\);/, 'otomatik giriş yok');
  // Misafir niyeti korunmalı — açık yönlendirme saldırısına da kapalı olmalı.
  assert.match(musteri, /next\.startsWith\('\/'\)/, 'next doğrulanmıyor (açık yönlendirme riski)');

  const uzman = kodu(oku('app', 'auth', 'expert.tsx'));
  assert.doesNotMatch(uzman, /void res;/, 'uzman oturumu hâlâ atılıyor');
  assert.match(uzman, /setAuth\(\{ token: res\.token, user \}\)/, 'uzman otomatik girişi yok');
  // /specialists `user` döndürmüyor → /me ile tamamlanıyor; düşerse ESKİ yola
  // düşmeli, kullanıcı kaybolmamalı.
  assert.match(uzman, /await api\.me\(res\.token\)/, 'kullanıcı çekilmiyor');
  assert.match(uzman, /girildi \? '\/seller\/reports' : '\/auth\/login'/, 'yedek yol yok');
});

test('B2 · misafir niyeti kayıt zincirinde kaybolmuyor', () => {
  // Duvardaki "Kayıt ol" `next` taşımadan /auth'a gidiyordu: kullanıcı
  // "Randevu al" deyip kayıt olduğunda aradığı uzmanı baştan bulmak zorundaydı.
  const duvar = kodu(oku('src', 'auth-wall.ts'));
  assert.match(duvar, /pathname: '\/auth', params: \{ next: nereye \}/, 'duvar niyeti taşımıyor');
  const secici = kodu(oku('app', 'auth', 'index.tsx'));
  assert.match(
    secici,
    /pathname: '\/auth\/customer', params: next \? \{ next \} : \{\}/,
    'rol seçici aktarmıyor',
  );
});

test('B3 · kimlik belgesi gönderimi sessiz değil', () => {
  const kyc = kodu(oku('app', 'seller', 'kyc.tsx'));
  assert.match(kyc, /Alert\.alert\(t\('kyc\.sent_t'\), t\('kyc\.sent_b'\)\)/, 'başarı onayı yok');
  // Hata da sessizdi: catch HİÇ yoktu, istek düşünce ekran yine boşalıyordu.
  assert.match(
    kyc,
    /\} catch \{\s*\n\s*Alert\.alert\(t\('common\.error'\)\);/,
    'hata bildirimi yok',
  );
});

test('B4 · ödeme dekontu yüklemesi sessiz değil', () => {
  const kom = kodu(oku('app', 'seller', 'commissions.tsx'));
  assert.match(
    kom,
    /Alert\.alert\(t\('commission\.receipt_sent_t'\), t\('commission\.receipt_sent_b'\)\)/,
    'başarı onayı yok',
  );
  assert.match(
    kom,
    /\} catch \{\s*\n\s*Alert\.alert\(t\('common\.error'\)\);/,
    'hata bildirimi yok',
  );
});
