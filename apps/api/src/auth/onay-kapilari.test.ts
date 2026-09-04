import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { randevuVerebilir } from '@ayna/domain';

const yorumsuz = (k: string) =>
  k.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const oku = (...p: string[]) => yorumsuz(readFileSync(join(__dirname, '..', ...p), 'utf8'));

/**
 * ONAY KAPILARI — kurucunun isteği.
 *
 * "uzman ve salonlar admin panelinde onay verilmeden açılamaz. ayrıca bir
 * müşteri ya admin panelinden onaylanmalı ya da mutlaka telefon ile
 * doğrulama yapmalı. aksi takdirde uygulamada kesinlikle randevu veremez.
 * ilk açılış hediye puanı da bu doğrulamalardan sonra işlenir."
 */

test('RANDEVU KAPISI ikisinden birine bakıyor', () => {
  assert.equal(randevuVerebilir({ phoneVerified: true }), true);
  assert.equal(randevuVerebilir({ adminApproved: true }), true);
  assert.equal(randevuVerebilir({ phoneVerified: true, adminApproved: true }), true);
  assert.equal(randevuVerebilir({}), false);
  assert.equal(randevuVerebilir({ phoneVerified: false, adminApproved: false }), false);
  // null/undefined "doğrulanmış" sayılmıyor.
  assert.equal(randevuVerebilir({ phoneVerified: null, adminApproved: undefined }), false);
});

test('SUNUCU doğrulanmamış müşterinin randevusunu REDDEDİYOR', () => {
  /*
   * Uygulamadaki düğme de kapanıyor ama tek gerçek kapı sunucu: eski bir
   * uygulama sürümü ya da doğrudan istek yine geçebilirdi.
   */
  const k = oku('bookings', 'bookings.service.ts');
  const govde = k.slice(k.indexOf('async create('), k.indexOf('async create(') + 1800);
  assert.match(govde, /randevuVerebilir\(kisi\)/, 'kapı randevu oluşturmada yok');
  assert.match(govde, /RANDEVU_KAPISI_KODU/, 'hata kodu paylaşılmıyor');
  // SALONUN kendi eklediği çevrimdışı kayıt bu kapıdan geçmiyor: orada
  // müşteri hesabı yok, kapatsaydık salon kendi defterini tutamazdı.
  assert.match(govde, /if \(userId\) \{/, 'kapı hesapsız kayda da uygulanıyor');
  assert.match(govde, /kisi\?\.role === 'user'/, 'kapı uzman/salona da uygulanıyor');
});

test('HOŞ GELDİN BONUSU doğrulamadan SONRA ve BİR KEZ', () => {
  /*
   * Bonus kayıt anında yazılıyordu: doğrulanmamış numarayla açılan her
   * hesap 200 puan kazanıyordu ve aynı kişi bunu tekrarlayabilirdi.
   */
  const k = oku('auth', 'auth.service.ts');
  /*
   * Dilim register'ın KENDİ gövdesiyle sınırlı. `async login(`e kadar
   * almak yardımcı fonksiyonu da içine alıyordu ve test kendi
   * düzeltmemizi "hata" sanıyordu.
   */
  const kayitBas = k.indexOf('async register(');
  const kayitSon = k.indexOf('return this.session(user);', kayitBas);
  assert.ok(kayitBas > 0 && kayitSon > kayitBas, 'register gövdesi bulunamadı');
  const kayit = k.slice(kayitBas, kayitSon);
  assert.doesNotMatch(kayit, /await grantPoints\(/, 'bonus hâlâ doğrudan kayıt anında yazılıyor');
  assert.match(
    kayit,
    /if \(dogrulanmis\) await this\.hosGeldinBonusu/,
    'kayıt öncesi doğrulanmışa bonus yok',
  );

  const dogrula = k.slice(k.indexOf('async verifyOtp('), k.indexOf('async resetPassword('));
  assert.match(dogrula, /hosGeldinBonusu/, 'doğrulama sonrası bonus yazılmıyor');

  // Tekrar yazımı engelleyen bekçi: defterde aynı sebep varsa çıkıyor.
  const bonus = k.slice(k.indexOf('private async hosGeldinBonusu'));
  assert.match(bonus.slice(0, 500), /if \(varMi\) return;/, 'bonus tekrar tekrar yazılabiliyor');
});

test('ONAYSIZ uzman/salon KATALOGDA yok', () => {
  const k = oku('catalog', 'catalog.service.ts');
  const liste = k.slice(k.indexOf('async professionals()'), k.indexOf('async professional('));
  assert.match(
    liste,
    /specialist\.findMany\(\{\s*where: \{ status: \{ not: 'approved' \}/,
    'onaysız uzman süzülmüyor',
  );
  assert.match(
    liste,
    /business\.findMany\(\{\s*where: \{ status: \{ not: 'approved' \}/,
    'onaysız salon süzülmüyor',
  );
});

test('ONAYSIZ profil DERİN BAĞLANTIYLA da açılmıyor', () => {
  /*
   * Listeden gizlemek yetmiyor: onaysız bir uzman kendi profil
   * bağlantısını dağıtıp randevu toplayabilirdi.
   */
  const k = oku('catalog', 'catalog.service.ts');
  const detay = k.slice(k.indexOf('async professional(id: string)'));
  const bas = detay.slice(0, 2500);
  assert.match(
    bas,
    /spOnay && spOnay\.status !== 'approved'/,
    'uzman onayı derin bağlantıda okunmuyor',
  );
  assert.match(
    bas,
    /bizOnay && bizOnay\.status !== 'approved'/,
    'salon onayı derin bağlantıda okunmuyor',
  );
});

test('UZMAN KUYRUĞU salona bağlı uzmanları da gösteriyor', () => {
  /*
   * Kurucu: "uzman onayı admin paneline düşmüyor." Sorgu
   * `kind: 'independent'` ile süzüyordu: salona bağlanan uzman
   * kayıtlarının tamamı kuyruğun dışında kalıyordu.
   */
  const k = oku('admin', 'admin.service.ts');
  const kuyruk = k.slice(k.indexOf('async specialists()'), k.indexOf('async setSpecialistStatus'));
  assert.doesNotMatch(kuyruk, /kind: 'independent'/, 'salona bağlı uzman kuyruğa düşmüyor');
  assert.match(kuyruk, /orderBy: \[\{ status: 'asc' \}/, 'onay bekleyenler başta değil');
  assert.match(kuyruk, /status: s\.status/, 'onay durumu panele dönmüyor');
});

test('REKLAM yayın penceresi ZORUNLU ve durum GERÇEK', () => {
  const k = oku('admin', 'admin.service.ts');
  const ekle = k.slice(k.indexOf('async createAd('), k.indexOf('async createAd(') + 1600);
  assert.match(ekle, /AD_WINDOW_REQUIRED/, 'tarihsiz reklam kabul ediliyor');
  assert.match(ekle, /AD_WINDOW_INVALID/, 'bitiş başlangıçtan önce olabiliyor');

  const liste = k.slice(k.indexOf('async ads()'), k.indexOf('async createAd('));
  assert.match(liste, /'doldu'/, 'süresi dolmuş reklam ayırt edilmiyor');
  assert.match(liste, /'yayinda'/, 'gerçek yayın durumu dönmüyor');
});
