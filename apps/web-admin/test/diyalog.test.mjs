import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * PANEL İÇİ DİYALOG — TARAYICI PENCERESİ KALMADI.
 *
 * Kurucu: "admin paneli rezil durumda hiç user friendly değil ve karışık.
 * bunu daha profesyonel ve kafa karıştırıcılıklardan uzak şekilde yapman
 * lazım. bir değişiklik olduğunda üstten açılan pencere ile değil admin
 * panelinden olsun."
 *
 * Panelde 30 yerde `prompt`/`alert`/`confirm` vardı. Bunlar tarayıcının
 * kendi kutuları: panelin tasarımıyla ilgisiz, ekranın tepesinden düşüyor,
 * TEK alan alıyor ve sayfayı kilitliyor. Üye düzenlemek için arka arkaya
 * DÖRT pencere açılıyordu; üçüncüde vazgeçen ilk ikisini de kaybediyordu.
 */

const kok = join(import.meta.dirname, '..');
const sayfa = readFileSync(join(kok, 'app/page.tsx'), 'utf8');
const diyalog = readFileSync(join(kok, 'app/ui/Diyalog.tsx'), 'utf8');
const css = readFileSync(join(kok, 'app/globals.css'), 'utf8');

/** Yorumsuz kaynak: "bu kalıp kalmadı" testleri gerekçe yorumlarına takılmasın. */
const yorumsuz = (k) =>
  k
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n');

test('panelde hiç tarayıcı penceresi kalmadı', () => {
  const kod = yorumsuz(sayfa);
  for (const kalip of [/\bprompt\(/, /\balert\(/, /\bconfirm\(/]) {
    const m = kod.match(new RegExp(kalip.source, 'g'));
    assert.equal(m, null, `hâlâ kullanılıyor: ${m?.join(', ')}`);
  }
});

test('üye düzenleme TEK formda — dört pencere değil', () => {
  /*
   * Eski akış: ad → e-posta → şehir → telefon, arka arkaya dört `prompt`.
   * Üçüncüde vazgeçen ilk ikisini de kaybediyordu ve hangi üyeyi
   * düzenlediği hiçbir yerde yazmıyordu.
   */
  const i = sayfa.indexOf("baslik: `${u.name || 'Üye'} — bilgileri düzenle`");
  assert.ok(i > 0, 'üye düzenleme formu yok');
  const blok = sayfa.slice(i, i + 1400);
  for (const alan of ["ad: 'name'", "ad: 'email'", "ad: 'city'", "ad: 'phone'"]) {
    assert.ok(blok.includes(alan), `tek formda eksik alan: ${alan}`);
  }
  // Kimin düzenlendiği başlıkta: `prompt` bunu gösteremiyordu.
  assert.match(blok, /u\.name/, 'hangi üyenin düzenlendiği başlıkta yok');
});

test('yıkıcı işlemler AYRI görünüyor', () => {
  // Silme/engelleme, sıradan onaydan renkle ayrılmalı; `confirm` hepsini
  // aynı kutuda gösteriyordu.
  assert.match(diyalog, /tehlikeli/, 'yıkıcı işlem ayrımı yok');
  assert.match(diyalog, /btn-danger/, 'yıkıcı onay kırmızı değil');
  const sayi = (sayfa.match(/tehlikeli: true/g) ?? []).length;
  assert.ok(sayi >= 6, `yıkıcı işaretlenmiş işlem az: ${sayi}`);
});

test('bildirim iş akışını KESMİYOR', () => {
  /*
   * `alert` tıklama bekliyordu. Bildirim şeridi kendiliğinden kayboluyor —
   * kayıt sonrası her seferinde "Tamam"a basmak panelin en sinir bozucu
   * yanıydı.
   */
  assert.match(diyalog, /setTimeout\(\(\) => setBildirimler/, 'bildirim kendiliğinden kapanmıyor');
  assert.match(diyalog, /aria-live="polite"/, 'ekran okuyucu bildirimi duymuyor');
});

test('vazgeçmenin bilinen yolları çalışıyor', () => {
  // ESC ve perdeye tıklama: tarayıcı penceresindeki alışkanlık burada da
  // olmalı, yoksa kullanıcı sıkıştığını hisseder.
  assert.match(diyalog, /e\.key === 'Escape'/, 'ESC ile kapanmıyor');
  assert.match(diyalog, /e\.target === e\.currentTarget/, 'perdeye tıklayınca kapanmıyor');
});

test('zorunlu alan boşken kaydedilemiyor', () => {
  assert.match(diyalog, /eksikZorunlu/, 'zorunlu alan denetimi yok');
  assert.match(diyalog, /disabled=\{eksikZorunlu\}/, 'boş zorunlu alanla kaydet açık');
});

test('menü aranabilir — 26 kalem gözle taranmıyor', () => {
  /*
   * Kutunun VAR OLMASI yetmez, LİSTEYİ SÜZMESİ gerekir: ilk yazımda test
   * yalnız `navAra` adını arıyordu ve süzme kaldırıldığında geçiyordu.
   * Şimdi süzmenin kendisi ve Türkçe karşılaştırma (İ/ı) aranıyor.
   */
  assert.match(
    sayfa,
    /g\.items\.filter\(\(n\) =>[\s\S]{0,200}navAra/,
    'arama kutusu listeyi süzmüyor',
  );
  assert.match(
    sayfa,
    /toLocaleLowerCase\('tr'\)[\s\S]{0,120}navAra[\s\S]{0,120}toLocaleLowerCase\('tr'\)/,
    'Türkçe harf karşılaştırması yok — "İ" aranınca sonuç kaybolur',
  );
  assert.match(sayfa, /Eşleşen ekran yok/, 'arama boş sonuç durumu yok');
  assert.match(css, /\.nav-ara/, 'arama kutusunun stili yok');
});

test('dar ekranda panel kullanılabilir kalıyor', () => {
  // Yönetici telefondan da bakıyor; sabit 246px kenar menü ekranı yiyordu.
  assert.match(css, /@media \(max-width: 1080px\)/, 'dar ekran düzeni yok');
});

test('klavye odağı görünür', () => {
  assert.match(css, /:focus-visible/, 'odak halkası yok — klavyeyle gezilemiyor');
});

test('hareket azaltma tercihi dinleniyor', () => {
  assert.match(css, /prefers-reduced-motion/, 'animasyon kapatılamıyor');
});

/* ── PREMIUM GÖRSEL DİL ────────────────────────────────────────────────── */

test('kenar menü KOYU — panelin baştan aşağı beyaz olduğu hâl geride kaldı', () => {
  /*
   * Kurucu: "modern premium bir admin sayfası."
   *
   * Eski panelde kenar menü, kartlar ve zemin neredeyse aynı tondaydı;
   * hiyerarşi yalnız ince çizgilerle kuruluyor ve sonuç yıkanmış, şablon
   * gibi görünüyordu. Koyu menü hiyerarşiyi tek başına kuruyor.
   */
  const m = css.match(/--nav-bg:\s*#([0-9a-f]{6})/i);
  assert.ok(m, 'koyu menü tokenı yok');
  // Belirli bir hex'e değil KOYULUĞA bağlanıyor: ton ayarlanınca test
  // kırılmamalı, ama menü beyaza dönerse kırılmalı.
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  const parlaklik = (r * 299 + g * 587 + b * 114) / 1000;
  assert.ok(parlaklik < 60, `kenar menü yeterince koyu değil (parlaklık ${parlaklik})`);
  assert.match(css, /\.sidebar\s*\{[^}]*background:\s*var\(--nav-bg\)/, 'menü koyu değil');
});

test('seçili menü kaleminde yazı OKUNUYOR', () => {
  /*
   * Aksan lime — açık bir renk. Üstüne beyaz yazı okunmuyordu; seçili
   * kalem koyu mürekkep yazı kullanıyor.
   */
  assert.match(
    css,
    /\.nav-item\.active\s*\{[^}]*background:\s*var\(--accent\)[^}]*color:\s*var\(--on-accent\)/,
    'seçili kalemde lime üstüne okunmayan yazı',
  );
});

test('markanın yazı tipi var — sistem yazı tipine düşmüyor', () => {
  const layout = readFileSync(join(kok, 'app/layout.tsx'), 'utf8');
  assert.match(layout, /Plus_Jakarta_Sans/, 'panel sistem yazı tipinde');
  // `next/font` kendi sunucumuzdan verir: dışarıya istek yok, bekletme yok.
  assert.match(layout, /next\/font\/google/, 'yazı tipi kendi sunucumuzdan gelmiyor');
  assert.match(css, /var\(--font-ui\)/, 'gövde yazı tipini kullanmıyor');
});

test('bekleyen iş kartları diğer sayaçlarla AYNI ölçüde', () => {
  /*
   * Panonun ilk satırı ve en çok bakılan yeri. Kendi küçük sınıflarını
   * (`stat-v`/`stat-l`) kullanıyordu; rakamlar minicik kalıyor ve bekleyen
   * iş gözden kaçıyordu.
   */
  assert.equal(/className="stat-v"/.test(sayfa), false, 'kart kendi küçük ölçüsünde');
  assert.match(sayfa, /className=\{`stat stat-tik/, 'ortak kart sınıfı kullanılmıyor');
});

test('işi olan kart ÖNE ÇIKIYOR', () => {
  // On bir kart aynı görünürse bekleyen işi taramak gözle sayma işine döner.
  assert.match(sayfa, /n > 0 \? 'dikkat' : ''/, 'dolu kuyruk ayırt edilmiyor');
  assert.match(css, /\.stat-tik\.dikkat/, 'dikkat durumunun stili yok');
  // Renk sabit kod değil anlam tokenından: `#e5484d` elle yazılmıştı.
  assert.equal(/#e5484d/.test(sayfa), false, 'sabit kodlanmış uyarı rengi kalmış');
});

test('satırda tek ana eylem var', () => {
  /*
   * Üye satırında beş düğme yan yana: Kaydet · Düzenle · Şifre · Kısıtla ·
   * Askıya al. Hepsi aksan renginde olunca hangisinin ana eylem olduğu
   * okunmuyordu.
   */
  /*
   * KURALIN GÖVDESİ ölçülüyor, yalnız seçicisi değil: ilk yazımda test
   * seçiciyi arıyordu ve `:hover` bloğundaki aynı seçiciye takılıp
   * asıl kural silindiğinde bile geçiyordu.
   */
  /*
   * Kural artık VARSAYILANDA: `.btn-sm` sessiz doğuyor, vurgu `.btn-primary`
   * ile bilinçli veriliyor. Önceki hâlinde her düğme aksan rengindeydi ve
   * istisna listesiyle sessizleştiriliyordu.
   */
  const varsayilan = css.match(/\n\.btn-sm \{([^}]*)\}/);
  assert.ok(varsayilan, '.btn-sm kuralı yok');
  assert.match(varsayilan[1], /background:\s*var\(--bg-alt\)/, 'varsayılan düğme hâlâ vurgulu');
  assert.match(css, /\.btn-primary \{[^}]*background:\s*var\(--accent\)/, 'birincil düğme yok');
});

test('yıkıcı eylem RENKTEN BAŞKA bir şeyle de ayrılıyor', () => {
  // Renk körlüğünde tek başına renk yetmez.
  const d = css.match(/\.btn-danger \{([^}]*)\}/);
  assert.ok(d, '.btn-danger kuralı yok');
  assert.match(d[1], /border:\s*1px solid/, 'yıkıcı düğmenin kenarlığı yok');
});

/* ── BİLGİ MİMARİSİ ────────────────────────────────────────────────────── */

test('her ekranın TEK adı var — menü, üst bar ve başlık aynı', () => {
  /*
   * Kurucu: "admin paneli çorba gibi, ne nerede ne iş yapıyor ne ile
   * alakalı hiçbir şey belli değil."
   *
   * Sebeplerinden biri: aynı ekran üç farklı adla anılıyordu. Menüde
   * "Sadakat", başlıkta "Puan ekonomisi"; "Salon Onay" / "Salon
   * başvuruları"; hatta "Feature Flag" gibi İngilizce kalanlar.
   * Yöneticinin aradığı ekranı bulamamasının yarısı buydu.
   */
  const etiketler = [...sayfa.matchAll(/label: '([^']+)',\s*\n?\s*icon:/g)].map((m) => m[1]);
  const basliklar = [...sayfa.matchAll(/<h1 className="page-title">\s*([^<{]+?)[\s{]*(?:<|\{)/g)]
    .map((m) => m[1].trim())
    .filter(Boolean);
  assert.ok(etiketler.length >= 20, `menü etiketi az: ${etiketler.length}`);

  const eksik = basliklar.filter((b) => !etiketler.includes(b));
  assert.deepEqual(eksik, [], `menüde karşılığı olmayan sayfa başlığı: ${eksik.join(' · ')}`);
});

test('menü grupları YAPILAN İŞE göre', () => {
  /*
   * Eski gruplar iç modüllere göreydi ("Pazar", "Finans") ve yöneticinin
   * yaptığı işe karşılık gelmiyordu.
   */
  for (const grup of [
    'PANO',
    'ONAY BEKLEYENLER',
    'KİŞİLER',
    'RANDEVU & PARA',
    'KATALOG',
    'İÇERİK',
    'SİSTEM',
  ]) {
    assert.ok(sayfa.includes(`title: '${grup}'`), `grup yok: ${grup}`);
  }
});

test('bekleyen işlerin HEPSİ tek grupta', () => {
  // Dağıtıldıklarında "beni bekleyen iş var mı" sorusunun cevabı menüye
  // yayılıyordu.
  const i = sayfa.indexOf("title: 'ONAY BEKLEYENLER'");
  const j = sayfa.indexOf("title: 'KİŞİLER'", i);
  const blok = sayfa.slice(i, j);
  for (const id of [
    'businesses',
    'kyc',
    'profileChanges',
    'subscriptions',
    'disputes',
    'reviewDisputes',
    'moderation',
    'support',
    'specialists',
  ]) {
    assert.ok(blok.includes(`id: '${id}'`), `onay kuyruğu grubunda eksik: ${id}`);
  }
});

test('üst bar NEREDE OLDUĞUNU söylüyor', () => {
  /*
   * Panelde hiç üst bar yoktu: ekran doğrudan içerikle başlıyor, hangi
   * bölümde olunduğu yalnız menüdeki vurgudan anlaşılıyordu — kaydırınca
   * o da gözden çıkıyor.
   */
  assert.match(sayfa, /className="ustbar"/, 'üst bar yok');
  assert.match(sayfa, /aktifGrup/, 'bölüm adı gösterilmiyor');
  assert.match(sayfa, /aktifEtiket/, 'sayfa adı gösterilmiyor');
  assert.match(sayfa, /bekleyenToplam/, 'bekleyen iş sayısı üst barda yok');
});

test('tasarım ÖLÇEKTEN geliyor — rastgele piksel yok', () => {
  /*
   * CSS üç kez üst üste yamalanmıştı ve kurallar birbirini eziyordu.
   * Ölçek olmadığında her ekran kendi boşluğunu seçiyor; "sıra sıra
   * dizilmiş" hissi tam olarak buradan doğuyor.
   */
  for (const token of ['--s1:', '--s4:', '--t-md:', '--t-2xl:', '--r-md:', '--sh-2:']) {
    assert.ok(css.includes(token), `ölçek tokenı yok: ${token}`);
  }
  // Ölçek varken hâlâ elle piksel yazmak sistemi delerdi.
  const elle = (css.match(/padding: \d+px \d+px/g) ?? []).length;
  assert.ok(elle <= 3, `ölçek dışı boşluk çok: ${elle}`);
});
