import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { birincilAksiyon, ikincilAksiyonlar } from './booking-flow';

/**
 * 01.09.2026 — kurucunun TELEFONDAN, çalışan uygulamada bulduğu hatalar.
 * Üçü de yalnız gerçek kullanımda görünüyordu.
 */

const oku = (...p: string[]) => readFileSync(join(import.meta.dirname, ...p), 'utf8');

test('§4.6 — erteleme önerisi KİLİTLENMİYOR', () => {
  // Kurucu: "uzman erteleme öneriyor, müşteri 'Erteleme önerildi' görüyor ama
  // kabul/red yok." Sebep: öneren bilinmiyorsa (alan gelmediyse) HİÇBİR
  // tarafta düğme çıkmıyordu. Bilinmezlikte açmak güvenli — sunucu önerenin
  // kendi önerisini yanıtlamasını OWN_PROPOSAL ile reddediyor.
  for (const rol of ['musteri', 'uzman'] as const) {
    assert.ok(
      birincilAksiyon('erteleme_onerildi', rol, {}),
      `${rol}: öneren bilinmiyorken düğme yok — randevu kilitli`,
    );
  }
  // Öneren biliniyorsa yalnız KARŞI taraf yanıtlar.
  assert.equal(birincilAksiyon('erteleme_onerildi', 'uzman', { ertelemeyiOneren: 'uzman' }), null);
  assert.ok(birincilAksiyon('erteleme_onerildi', 'musteri', { ertelemeyiOneren: 'uzman' }));
});

test('§4.6 — öneriyi yanıtlayan REDDEDEBİLİYOR', () => {
  // Yalnız "Kabul et" göstermek, kabul etmekten başka yol bırakmamaktı.
  const ik = ikincilAksiyonlar('erteleme_onerildi', 'musteri', { ertelemeyiOneren: 'uzman' });
  assert.ok(
    ik.some((a) => a.eylem === 'erteleme_red'),
    'red yolu yok',
  );
});

test('sunucunun HATA MESAJI kullanıcıya ulaşıyor', () => {
  // Ekranda "POST /bookings/... → 400" yazıyordu: istemci sunucunun kodunu
  // okuyup İNSAN OKUR mesajını atıyordu. Kullanıcı ne yapacağını bilemiyordu.
  const api = oku('api.ts');
  assert.match(api, /message\?: string/, 'hata gövdesinde mesaj tipi yok');
  assert.match(api, /mesaj \|\| `POST \$\{path\}/, 'POST hatasında mesaj kullanılmıyor');
  assert.match(api, /mesaj \|\| `\$\{yontem\} \$\{path\}/, 'diğer hatalarda mesaj kullanılmıyor');
});

test('ESKİ üyeye "üyeliğin yükseltildi" bildirimi GİTMİYOR', () => {
  // Koşul `!wasPremium && premium` idi: yerelin BİLMEMESİNİ "az önce
  // yükseltildi" sanıyordu. Taze kurulumda ve çıkış-girişte eski üyeye
  // kutlama gidiyordu.
  const store = oku('store.ts');
  assert.match(
    store,
    /if \(oncekiBiliniyor && !wasPremium/,
    'önceki katman bilinmeden kutlama atılıyor',
  );
  assert.match(store, /uyelikOgrenildi: s\.uyelikOgrenildi/, 'bayrak kalıcı değil');
});

test('durum rozeti içinde nabız yok — yazı sıkışmıyor', () => {
  // Nabız rozetin içine konmuştu; metni `flex: 1` ile çizdiği için dar
  // rozette metin sıfır genişliğe düşüyor, geriye hap içinde bir daire
  // kalıyordu.
  const liste = oku('..', 'app', '(tabs)', 'bookings.tsx');
  // Yorumda geçmesi serbest; RENDER edilmemeli.
  assert.ok(!/<BeklemeNabzi/.test(liste), 'rozetin içinde hâlâ nabız çiziliyor');
  assert.match(liste, /bekleyenNokta/, 'bekleme işareti hiç yok');
});

test('eylem TEK TUR: sunucunun döndürdüğü kayıt yazılıyor, liste yeniden çekilmiyor', () => {
  // Kurucu: "onayla'ya bastıktan ~15 saniye sonra onaylandığı belli oldu."
  // 15 sn tesadüf değil — `ISTEK_ZAMAN_ASIMI_MS` ile aynı. Eylem yolu POST +
  // (kuyruk boşaltma) + iki GET idi ve her uç nokta güncel randevuyu ZATEN
  // döndürdüğü hâlde yanıt atılıyordu.
  const store = oku('store.ts');
  assert.match(
    store,
    /const guncel = await bookingEylemGonder\(id, eylem, arg\);\s*\n\s*\/\/[\s\S]{0,200}?get\(\)\.sunucuRandevusunuYaz\(guncel\)/,
    'eylem yanıtı yazılmıyor — ekran boşuna tazeleme bekliyor',
  );
  const detay = oku('..', 'app', 'booking', '[id].tsx');
  const govde = detay.slice(detay.indexOf('const cagir ='), detay.indexOf('function calistir'));
  // Tazeleme YALNIZ redde kalmalı; başarı yolunda hiç olmamalı.
  // Yorum satırlarını sayma; yalnız GERÇEK çağrılar.
  const cagrilar = govde
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && /void hydrateBookings\(\)/.test(l));
  assert.equal(cagrilar.length, 1, 'başarıdan sonra hâlâ tam liste çekiliyor');
  assert.match(govde, /sonuc\.sonuc === 'reddedildi'/, 'kalıcı red ele alınmıyor');
});

test('sunucu kaydı yazılırken İSTEMCİYE ÖZEL alanlar korunuyor', () => {
  // `benimRolum` sunucuda yok. Gelen nesne olduğu gibi yazılsaydı rol silinir,
  // randevu yanlış tarafın listesine düşerdi — yeni kapattığımız hata.
  const store = oku('store.ts');
  const y = store.slice(store.indexOf('sunucuRandevusunuYaz: (uzak)'));
  const govde = y.slice(0, y.indexOf('iadeTalebiDamgala'));
  assert.match(govde, /benimRolum: y\.benimRolum/, 'rol korunmuyor');
  assert.match(govde, /reminded24: y\.reminded24/, 'hatırlatma bayrağı korunmuyor');
});

test('detay ekranı: uzman MÜŞTERİNİN ödeme kartını görmüyor', () => {
  // Ekran görüntüsü: uzmanın kendi randevusunda kırmızı "Randevunu korumak
  // için öde — 09:19 içinde ödemezsen randevu düşer" kartı. Ödemeyecek olan
  // taraf. Aciliyet, sırası gelen tarafındır.
  const detay = oku('..', 'app', 'booking', '[id].tsx');
  const blok = detay.slice(
    detay.indexOf("booking.status === 'depozito_bekliyor'"),
    detay.indexOf("booking.status === 'onay_bekliyor'"),
  );
  assert.match(blok, /rol === 'musteri' \?/, 'depozito kartı rol ayırmıyor');
  assert.match(blok, /flow\.deposit\.countdown_pro_t/, 'uzman için ayrı metin yok');
  // Kırmızı acil kenarlık YALNIZ müşteri kolunda.
  const uzmanKolu = blok.slice(blok.indexOf(') : ('));
  assert.ok(!/acilKart/.test(uzmanKolu), 'uzmana hâlâ acil kırmızı kart çiziliyor');
});

test('detay ekranı: uzman kendisi hakkında ÜÇÜNCÜ ŞAHIS okumuyor', () => {
  const detay = oku('..', 'app', 'booking', '[id].tsx');
  // "uzmanın yanıt süresi" / "Hizmetten sonra uzmana" — uzmanın kendi ekranında.
  assert.match(detay, /rol === 'uzman' \? 'flow\.approve\.countdown_pro'/, 'yanıt süresi rol körü');
  assert.match(
    detay,
    /rol === 'uzman' \? 'booking\.balance\.remaining_pro'/,
    'kalan tutar etiketi rol körü',
  );
});

test('SUNUCU REDDİ başarı sayılmıyor — sessizce yutulan dekont yok', () => {
  // Kurucu: "depozito talebi admin paneline ulaşmıyor."
  // Sunucu tarafı doğruydu (dekont kaydediliyor, kuyruk sorgusu ve panel
  // sayfası yerinde). Kopan halka istemcideydi: `gonder` yalnız 'kuyrukta'
  // durumuna bakıyor, KALICI REDDİ (409 dekont tekrar kullanıldı, 404 randevu
  // yok, 403 taraf değil) aşağıdaki "Randevu kesinleşti" ekranına düşürüyordu.
  // Müşteri gönderdiğini sanıyor, sunucuda kayıt yok, admin kuyruğu boş.
  const dep = oku('..', 'app', 'booking', 'deposit.tsx');
  const bas = dep.indexOf('const gonder =');
  const gonder = dep.slice(bas, dep.indexOf('\n  return (', bas));
  const redIdx = gonder.indexOf("sonuc.sonuc === 'reddedildi'");
  const basariIdx = gonder.indexOf('deposit.done_t');
  assert.ok(redIdx > 0, 'kalıcı red hiç ele alınmıyor');
  assert.ok(redIdx < basariIdx, 'red kontrolü BAŞARI ekranından sonra — yine yutulur');
  assert.match(gonder, /sonuc\.mesaj \?\?/, 'sunucunun gerekçesi gösterilmiyor');
});

test('red gerekçesi çağırana ULAŞIYOR', () => {
  // Yalnız 'reddedildi' dizesi dönüyordu; ekran "neden" diyemiyordu.
  const store = oku('store.ts');
  assert.match(store, /export type EylemSonucu = \{/, 'sonuç tipi yok');
  assert.match(store, /sonuc: 'reddedildi', \.\.\.\(err\.message/, 'gerekçe taşınmıyor');
});

test('ödeme kodu ve randevu no GÖNDER düğmesinin üstünde', () => {
  // Kod yalnız hesap kartındaki düz cümlenin içinde geçiyordu; müşteri onu
  // Kaspi açıklamasına yazması gerektiğini kaçırıyordu. Kodsuz gelen transfer,
  // admin kuyruğunda sahibi belirsiz bir para demek.
  const dep = oku('..', 'app', 'booking', 'deposit.tsx');
  const kart = dep.indexOf("t('deposit.ref.title')");
  const dugme = dep.indexOf("label={t('deposit.submit')}");
  assert.ok(kart > 0, 'referans kartı yok');
  assert.ok(kart < dugme, 'kart gönder düğmesinin ALTINDA — istenen üstü');
  assert.match(dep, /t\('deposit\.ref\.booking'\)/, 'randevu no gösterilmiyor');
  // İkisi de kopyalanabilir olmalı: elle kopyalanacak değerler.
  const blok = dep.slice(kart, dugme);
  assert.equal((blok.match(/selectable/g) ?? []).length, 2, 'kod/no kopyalanamıyor');
});

test('ödeme kodu TEK YERDEN türetiliyor', () => {
  // Mobil ve panel ayrı ayrı hesaplasaydı, biri değiştiğinde müşterinin
  // yazdığı kod adminin aradığı kodla tutmaz, ödeme kayıp görünürdü.
  const dep = oku('..', 'app', 'booking', 'deposit.tsx');
  assert.match(
    dep,
    /odemeReferansi[\s\S]{0,80}from '@ayna\/domain'/,
    'mobil kendi kopyasını kullanıyor',
  );
  assert.ok(!/function odemeReferansi/.test(dep), 'ekranda hâlâ yerel türetme var');
});

test('ÖNE ÇIKANLAR ödenmiş vitrinden besleniyor', () => {
  // Bölümün kendi yorumu "yalnız admin'in seçtikleri" diyordu ama kod
  // `badge === 'campaign'` ile süzüyordu: vitrin satılıyor, admin reklamı
  // giriyor, ekranda hiç çıkmıyordu.
  const d = oku('..', 'app', '(tabs)', 'discover.tsx');
  // Yorumda geçmesi serbest; KODDA olmamalı.
  const kodSatirlari = d
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join('\n');
  assert.ok(
    !/badge === 'campaign'/.test(kodSatirlari),
    'öne çıkanlar hâlâ rozete göre süzülüyor — ödenmiş reklam yayınlanmıyor',
  );
  assert.match(
    d,
    /const featured = oneCikanReklamlari/,
    'öne çıkanlar reklam tablosundan gelmiyor',
  );
});

test('ücretli yerleşim SPONSORLU etiketli', () => {
  // Ödenmiş yerleşimi organik içerikten ayırt edilemez göstermek kullanıcıyı
  // yanıltır. İki bölümde de reklam kartı `sponsored` ile çiziliyor.
  const d = oku('..', 'app', '(tabs)', 'discover.tsx');
  for (const kaynak of ['firsatReklamlari.map', 'featured.map']) {
    const i = d.indexOf(kaynak);
    assert.ok(i > 0, `${kaynak} yok`);
    const kart = d.slice(i, i + 420);
    assert.match(kart, /sponsored/, `${kaynak}: reklam sponsorlu etiketsiz çiziliyor`);
  }
});

test('reklam iki bölümde birden ÇIKMIYOR', () => {
  // Aynı kart hem Fırsatlar hem Öne çıkanlar'da çıksaydı ekran tekrarlı
  // görünürdü; yerleşimi reklamı ödeyen seçiyor.
  const d = oku('..', 'app', '(tabs)', 'discover.tsx');
  assert.match(d, /placement === 'firsatlar'/, 'fırsat reklamları ayrılmıyor');
  assert.match(d, /placement === 'one_cikanlar'/, 'öne çıkan reklamları ayrılmıyor');
});

test('Reklam ver kartı YANIT & KALİTE bölümünün ÜSTÜNDE', () => {
  // Kurucu konumu açıkça verdi: kazanç alanı, ekranın hâlâ okunan bölgesinde
  // olmalı. Aşağı kayarsa bir daha kimse görmez.
  const r = oku('..', 'app', 'seller', 'reports.tsx');
  const reklam = r.indexOf("router.push('/seller/ads')");
  const kalite = r.indexOf("t('reports.quality.title')");
  assert.ok(reklam > 0, 'ana sayfada reklam kartı yok');
  assert.ok(kalite > 0, 'yanıt & kalite bölümü bulunamadı');
  assert.ok(reklam < kalite, 'reklam kartı yanıt & kalite bölümünün ALTINDA');
});

test('Reklam ver kartı menü satırı DEĞİL — reklam gibi duruyor', () => {
  // "bir reklam çalışması gibi olsun": teklif, yer ve fiyat tek bakışta.
  const r = oku('..', 'app', 'seller', 'reports.tsx');
  // Sabit pencere yerine kartın TAMAMI: kart büyüdükçe test kör kalmasın.
  const bas = r.indexOf("router.push('/seller/ads')");
  const blok = r.slice(bas, r.indexOf('</LinearGradient>', bas));
  assert.match(blok, /LinearGradient/, 'düz kart — vurgusu yok');
  assert.match(blok, /ads\.promo\.title/, 'teklif başlığı yok');
  assert.match(blok, /ads\.promo\.price/, 'fiyat görünmüyor');
  assert.match(blok, /ads\.promo\.cta/, 'çağrı düğmesi yok');
});

test('reklam fiyatı SUNUCUDAN okunuyor', () => {
  // Panelden değiştirilen ücret eski uygulama sürümlerinde yanlış görünmesin.
  const r = oku('..', 'app', 'seller', 'reports.tsx');
  assert.match(r, /s\.config\.rates\.adMonthlyKzt/, 'fiyat istemciye gömülü');
});

test('reklam kartı: yayında olduğunda GÜN SAYACI gösteriyor', () => {
  // Kurucu: "reklam yayına alındığında ana ekranında reklamınız yayında
  // 1/30 şeklinde kaç gün kaldığını görmeli."
  const r = oku('..', 'app', 'seller', 'reports.tsx');
  const bas = r.indexOf("router.push('/seller/ads')");
  const kart = r.slice(bas, r.indexOf('</LinearGradient>', bas));
  assert.match(kart, /ads\.live\.title/, 'yayında hâli yok');
  assert.match(kart, /ads\.live\.progress/, 'gün sayacı (1/30) yok');
  assert.match(kart, /ads\.live\.left|ads\.live\.last_day/, 'kalan gün yazmıyor');
  assert.match(kart, /reklamCubukDolu/, 'ilerleme çubuğu yok');
});

test('reklam kartı: ödeme doğrulanırken SATIŞ KARTI gösterilmiyor', () => {
  // Aksi hâlde uzman dekontunu göndermiş olmasına rağmen aynı satış kartını
  // görür ve İKİNCİ KEZ ödeyebilir. 200.000 ₸'lik bir hata.
  const r = oku('..', 'app', 'seller', 'reports.tsx');
  const bas = r.indexOf("router.push('/seller/ads')");
  const kart = r.slice(bas, r.indexOf('</LinearGradient>', bas));
  assert.match(kart, /bekleyenReklam \?/, 'bekleyen ödeme hâli yok');
  assert.match(kart, /ads\.wait\.title/, 'doğrulanıyor mesajı yok');
  // Sıra kritik: yayında ve bekleyen hâlleri satış kolundan ÖNCE gelmeli.
  assert.ok(
    kart.indexOf('bekleyenReklam ?') < kart.indexOf('ads.promo.price'),
    'satış kartı bekleyen ödemeden önce çiziliyor',
  );
});

test('gün hesabı ekranda DEĞİL, ortak mantıkta', () => {
  // Sınır günleri (ilk gün, son gün, süresi geçmiş kayıt) ekran içinde
  // hesaplansaydı sessizce yanlış çıkardı; `@ayna/domain` içinde sınanıyor.
  const r = oku('..', 'app', 'seller', 'reports.tsx');
  assert.match(r, /reklamGunu[\s\S]{0,60}from '@ayna\/domain'/, 'gün hesabı ekranda yapılıyor');
});
