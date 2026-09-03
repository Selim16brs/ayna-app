import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * MÜŞTERİ, UZMAN PANELİNE DÜŞEMEZ.
 *
 * Kurucu: "çok büyük bir hata var. müşteri hesabı diye açtığım hesapta
 * premium üyelik aldığımda beni bireysel uzman gibi gösterdi."
 *
 * ── NE OLUYORDU ─────────────────────────────────────────────────────────
 *
 * Rolü HİÇBİR ŞEY değiştirmiyordu — sunucuda hesap hâlâ `user`, yalnız
 * `membership_tier` premium olmuştu. Sorun tamamen YÖNLENDİRMEDEYDİ:
 * abonelik dekontu ekranı (`seller/sub-receipt`) dekont yüklenince
 * KOŞULSUZ `/seller/reports`a gidiyordu. Müşteri de premium'u aynı
 * ekrandan aldığı için kendini "Bireysel Uzman" rozetli, "Hizmetlerimi
 * gir" ve "AYNA komisyonu" yazan uzman panelinde buluyordu.
 *
 * Bu, görünüşten daha kötü bir hata: kullanıcı HESABININ TÜRÜNÜN
 * değiştiğini sanıyor.
 *
 * ── NEDEN İKİ KATMAN ────────────────────────────────────────────────────
 *
 * Yalnız yönlendirmeyi onarmak yetmez; panele giden başka bir yol
 * eklendiğinde aynı hata sessizce geri gelir. Kapı artık EKRANIN
 * KENDİSİNDE: nereden gelinirse gelinsin müşteri içeri giremiyor.
 */

const kok = join(import.meta.dirname, '..');
const oku = (rel: string) => readFileSync(join(kok, 'app', rel), 'utf8');

const yorumsuz = (k: string) =>
  k
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n');

test('abonelik dekontu ROLE GÖRE dönüyor', () => {
  const kod = yorumsuz(oku('seller/sub-receipt.tsx'));
  // Koşulsuz uzman paneline dönüş, hatanın ta kendisiydi.
  assert.equal(
    /replace\('\/seller\/reports'\)/.test(kod),
    false,
    'dekont sonrası herkes uzman paneline gönderiliyor',
  );
  assert.match(kod, /musteri \?/, 'dönüş rolü ayırmıyor');
  assert.match(kod, /\/profile\/passport/, 'müşteri kendi üyelik sayfasına gitmiyor');
});

test('uzman paneli müşteriyi İÇERİ ALMIYOR', () => {
  const kod = yorumsuz(oku('seller/reports.tsx'));
  assert.match(kod, /const satici = rol === 'professional' \|\| rol === 'salon'/, 'rol kapısı yok');
  assert.match(kod, /if \(rol && !satici\) return <Redirect/, 'müşteri yönlendirilmiyor');
});

test('salon paneli de müşteriyi içeri almıyor', () => {
  // Aynı hata oradan da girebilirdi.
  const kod = yorumsuz(oku('salon/home.tsx'));
  assert.match(kod, /if \(rol && !satici\) return <Redirect/, 'salon panelinde rol kapısı yok');
});

test('rol BİLİNMEDEN yönlendirme yapılmıyor', () => {
  /*
   * `rol` henüz yüklenmemişken (oturum geri yükleniyor) yönlendirmek,
   * GERÇEK uzmanı kendi panelinden atardı. Koşul bilerek `rol &&` ile
   * başlıyor.
   */
  for (const ad of ['seller/reports.tsx', 'salon/home.tsx']) {
    assert.match(yorumsuz(oku(ad)), /if \(rol && !satici\)/, `${ad}: rol yokken de atıyor`);
  }
});

test('giriş ve açılış yönlendirmesi ROLE bakıyor', () => {
  // Bu ikisi zaten doğruydu; kural geri alınmasın diye bağlanıyor.
  assert.match(
    yorumsuz(oku('index.tsx')),
    /currentUser\.role === 'salon'/,
    'açılış rolü yok sayıyor',
  );
  assert.match(yorumsuz(oku('auth/login.tsx')), /role/, 'giriş rolü yok sayıyor');
});

/* ── EKRAN METNİ NE DEDİĞİNİ ANLATIYOR MU ────────────────────────────── */

test('AI hakkı "kullandım" gibi okunmuyor', () => {
  /*
   * Kurucu: "yeni üye olmama rağmen 5/5 hakkımı kullanmışım gibi
   * gösteriyor."
   *
   * Rakam DOĞRUYDU — 5/5, "5 hakkın kaldı" demekti. Ama pay/payda biçimi
   * burada bilgi taşımıyor, yalnız belirsizlik üretiyor: aynı yazı hem
   * "5 kaldı" hem "5 kullandın" diye okunabiliyor. Yeni üyenin ilk
   * izlenimi "hakkım bitmiş" oluyordu.
   */
  const kod = readFileSync(join(kok, 'app', 'boni.tsx'), 'utf8');
  assert.equal(
    /\{quota\.remaining\}\/\{quota\.limit\}/.test(kod),
    false,
    'hak sayısı hâlâ pay/payda biçiminde',
  );
  assert.match(kod, /fillParams\(t\('boni\.quota\.remaining'\)/, 'kalan sayı cümle içinde değil');
});

test('kalan hak metni ÜÇ DİLDE de sayıyı cümleye alıyor', () => {
  for (const dil of ['tr', 'kk', 'ru']) {
    const s = readFileSync(
      join(kok, '..', '..', 'packages', 'i18n', 'src', 'messages', `${dil}.ts`),
      'utf8',
    );
    const m = s.match(/'boni\.quota\.remaining': '([^']+)'/);
    assert.ok(m, `${dil}: anahtar yok`);
    assert.match(m[1]!, /\{n\}/, `${dil}: sayı yerleştirilmiyor`);
  }
});
