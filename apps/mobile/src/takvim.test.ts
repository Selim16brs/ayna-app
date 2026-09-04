import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ayAcikMi,
  ayEkle,
  ayIzgarasi,
  ayniGun,
  gunBasi,
  saatUygula,
  secilebilir,
  secilebilirYillar,
  tarihYaz,
  yilAyUygula,
} from './takvim';

/**
 * SAF TAKVİM MANTIĞI.
 *
 * Kurucu: "takvim asılı kalmış hiçbir değişiklik yapılamıyor... aynı hatalar
 * diğer takvimle giriş yapılan yerlerde de var."
 *
 * Native tarih seçici, telefondaki yapıda o modül bulunmadığı için epoch
 * sıfırda donuyor ve dokunuşa yanıt vermiyordu. OTA bunu çözemez. Takvim
 * saf JS'e taşındı; bu dosya mantığı JSX olmadan ölçüyor.
 */

test('ızgara HER AY 42 hücre — düğmeler zıplamıyor', () => {
  /*
   * Ay değişince satır sayısı oynarsa altındaki düğmeler yer değiştiriyor
   * ve kullanıcı yanlış yere basıyor.
   */
  for (const [y, a] of [
    [2026, 1], // Şubat 2026 — 28 gün, Pazar başlangıç
    [2026, 8], // Eylül 2026
    [2024, 1], // artık yıl Şubat
    [2026, 10],
  ]) {
    assert.equal(ayIzgarasi(y!, a!).length, 42, `${y}-${a! + 1} ızgarası 42 değil`);
  }
});

test('ızgara PAZARTESİ ile başlıyor', () => {
  // Türkiye'de hafta pazartesi başlar; pazar başlatmak günleri kaydırır.
  const g = ayIzgarasi(2026, 8);
  assert.equal(g[0]!.tarih.getDay(), 1, 'ilk hücre pazartesi değil');
});

test('ayın ilk günü doğru hücreye düşüyor', () => {
  // 1 Eylül 2026 salı → pazartesi başlangıçlı ızgarada ikinci hücre.
  const g = ayIzgarasi(2026, 8);
  const ilk = g.findIndex((h) => h.ayIcinde && h.tarih.getDate() === 1);
  assert.equal(new Date(2026, 8, 1).getDay(), 2, 'test varsayımı: 1 Eylül 2026 salı');
  assert.equal(ilk, 1);
});

test('komşu ayın günleri işaretli', () => {
  // Boş bırakmak haftanın hangi güne denk geldiğini okumayı zorlaştırıyor.
  const g = ayIzgarasi(2026, 8);
  assert.ok(
    g.some((h) => !h.ayIcinde),
    'komşu ay günleri yok',
  );
  assert.ok(g.filter((h) => h.ayIcinde).length === 30, 'Eylül 30 gün olmalı');
});

test('sınırlar GÜN bazında — aynı günün saati eleme yapmıyor', () => {
  /*
   * `minimumDate` "şimdi" olduğunda saat karşılaştırması bugünü seçilemez
   * yapardı; kullanıcı bugünü seçemeyince takvim bozuk görünür.
   */
  const simdi = new Date(2026, 8, 3, 9, 0);
  /*
   * KRİTİK HÜCRE: ızgaradaki günler GECE YARISINDA üretiliyor (00:00).
   * Saat bazında karşılaştırılsaydı bugünün hücresi 00:00 < 09:00 diye
   * ELENİRDİ ve kullanıcı bugünü hiç seçemezdi — ilk yazımda testim
   * 23:00 kullandığı için bu hatayı kaçırıyordu.
   */
  assert.equal(secilebilir(new Date(2026, 8, 3, 0, 0), simdi), true, 'bugün elendi');
  assert.equal(secilebilir(new Date(2026, 8, 3, 23, 0), simdi), true, 'bugün elendi');
  assert.equal(secilebilir(new Date(2026, 8, 2), simdi), false, 'dün seçilebiliyor');
});

test('ay değiştirince taşan gün ayın SONUNA sabitleniyor', () => {
  // 31 Mart'tan bir ay geri = 31 Şubat değil; sabitlenmezse Mart'a geri döner.
  const t = ayEkle(new Date(2026, 2, 31), -1);
  assert.equal(t.getMonth(), 1, 'şubata gitmedi');
  assert.equal(t.getDate(), 28, '2026 şubatı 28 gün');
});

test('saat uygulanınca GÜN kaymıyor', () => {
  const t = saatUygula(new Date(2026, 8, 3), 23, 45);
  assert.equal(t.getDate(), 3);
  assert.equal(t.getHours(), 23);
  assert.equal(t.getMinutes(), 45);
});

test('aynı gün karşılaştırması saatten etkilenmiyor', () => {
  assert.equal(ayniGun(new Date(2026, 8, 3, 0, 1), new Date(2026, 8, 3, 23, 59)), true);
  assert.equal(ayniGun(new Date(2026, 8, 3), new Date(2026, 8, 4)), false);
});

test('gün başı saati sıfırlıyor', () => {
  const g = gunBasi(new Date(2026, 8, 3, 17, 42));
  assert.equal(g.getHours(), 0);
  assert.equal(g.getMinutes(), 0);
});

test('tarih yazımı Türkçe ve okunur', () => {
  assert.equal(tarihYaz(new Date(2026, 8, 3), false), '3 Eylül 2026');
  assert.equal(tarihYaz(new Date(2026, 8, 3, 9, 5), true), '3 Eylül 2026 · 09:05');
});

/* ── NATIVE MODÜL GERİ GELMESİN ────────────────────────────────────────── */

test('hiçbir ekran NATIVE tarih seçici kullanmıyor', async () => {
  /*
   * ── BU TESTİN SEBEBİ ────────────────────────────────────────────────
   *
   * Kurucu: "takvim asılı kalmış hiçbir değişiklik yapılamıyor... aynı
   * hatalar diğer takvimle giriş yapılan yerlerde de var."
   *
   * `@react-native-community/datetimepicker` NATIVE bir modül. Telefondaki
   * yapı onu içermediğinde tarih 1 Oca 1970'te donuyor ve dokunuşa yanıt
   * vermiyordu — beş ekranda birden.
   *
   * En sinsi tarafı: `app.json` içinde `runtimeVersion: sdkVersion` var,
   * yani OTA güncellemeleri AYNI SDK'lı ESKİ yapılara da iniyor. JS
   * güncelleniyor ama native modül gelmiyor; OTA bunu ÇÖZEMİYOR ve hata
   * ancak yeni bir mağaza yapısıyla kapanıyor.
   *
   * Bu yüzden takvim saf JS'e taşındı. Modül yeniden kullanılırsa aynı
   * tuzak geri gelir — bu test onu engelliyor.
   */
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const kok = join(import.meta.dirname, '..');

  const dosyalar = (d: string): string[] =>
    readdirSync(d, { withFileTypes: true }).flatMap((g) => {
      const y = join(d, g.name);
      if (g.isDirectory()) return g.name === 'node_modules' ? [] : dosyalar(y);
      return /\.(ts|tsx)$/.test(g.name) && !g.name.endsWith('.test.ts') ? [y] : [];
    });

  // Yorumsuz kaynak: modülün NEDEN kaldırıldığını anlatan yorumlara takılmasın.
  const yorumsuz = (k: string) =>
    k
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      .split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');

  const suclular: string[] = [];
  for (const y of [...dosyalar(join(kok, 'app')), ...dosyalar(join(kok, 'src'))]) {
    if (yorumsuz(readFileSync(y, 'utf8')).includes('@react-native-community/datetimepicker')) {
      suclular.push(y.split('/apps/mobile/')[1]!);
    }
  }
  assert.deepEqual(suclular, [], `native tarih seçici geri gelmiş: ${suclular.join(', ')}`);
});

test('tarih girilen her ekran ORTAK takvimi kullanıyor', async () => {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const kok = join(import.meta.dirname, '..');
  for (const ad of [
    'app/auth/customer.tsx',
    'app/auth/expert.tsx',
    'app/auth/business/new.tsx',
    'src/ui/DateField.tsx',
    'src/ui/TarihSecici.tsx',
  ]) {
    const kod = readFileSync(join(kok, ad), 'utf8');
    assert.match(kod, /<TakvimSecici/, `${ad}: ortak takvimi kullanmıyor`);
  }
});

/* ── SAAT SEÇİMİ ───────────────────────────────────────────────────────── */

test('dakika BEŞER — klasik çarkta kısıtlamaya gerek yok', async () => {
  /*
   * Bir ara çeyrek saate (00/15/30/45) indirilmişti; o zaman saat yatay
   * çiplerle seçiliyordu ve 12 çip kalabalık kalıyordu.
   *
   * Kurucu klasik çevirmeli seçici isteyince kısıtlama gereksiz bir engele
   * dönüştü: çarkta kaydırmak zaten ucuz ama 13:10'a randevu YAZILAMIYORDU.
   */
  const { DAKIKALAR } = await import('./takvim');
  assert.equal(DAKIKALAR.length, 12);
  assert.equal(DAKIKALAR[2], 10, 'beşer artmıyor');
});

test('çark satırlara OTURUYOR — serbest kaymıyor', async () => {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const kod = readFileSync(join(import.meta.dirname, 'ui', 'TakvimSecici.tsx'), 'utf8');
  /*
   * Kurucu: "saat için klasik sistem bir şey yapsan."
   *
   * Klasik çarkın "tık tık" oturma hissi bu ikisinden geliyor. Onlarsız
   * liste serbest kayıyor ve hangi değerin seçili olduğu belirsizleşiyor.
   */
  assert.match(kod, /snapToInterval=\{OGE_Y\}/, 'çark satırlara oturmuyor');
  assert.match(kod, /decelerationRate="fast"/, 'çark serbest kayıyor');
  /*
   * Seçilen saat şeritte kaybolmasın diye SABİT BİR YERDE de yazıyor.
   * İlk yazımda test yalnız stil ADINI arıyordu ve kullanım yerinden
   * kaldırılınca bile geçiyordu (stil tanımı dosyada duruyor); artık
   * çizilen JSX'e bağlı.
   */
  assert.match(
    kod,
    /<View style=\{styles\.saatBaslikSatir\}>[\s\S]{0,600}getHours\(\)\)\.padStart/,
    'seçili saat ayrıca gösterilmiyor',
  );
});

test('kişisel kayıt ekranında klavye içeriği örtmüyor', async () => {
  /*
   * Kurucu: "kaydet ile klavye arası çok açık ve yazı altta kalıyor."
   *
   * İKİ SEBEP: (1) `footer` altında `TAB_BAR_CLEARANCE` kadar boşluk
   * ayırıyordu — oysa bu bir YIĞIN ekranı, altında sekme çubuğu YOK ve
   * klavye açılınca o boşluk yukarı taşınıp koca bir delik bırakıyordu.
   * (2) Klavye kaçışı yoktu; yazılan satır klavyenin altında kalıyordu.
   */
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const kod = readFileSync(join(import.meta.dirname, '..', 'app', 'care', 'add.tsx'), 'utf8');
  assert.match(kod, /KeyboardAvoidingView/, 'klavye kaçışı yok');
  assert.equal(
    /paddingBottom: TAB_BAR_CLEARANCE/.test(kod),
    false,
    'yığın ekranında sekme çubuğu boşluğu ayrılıyor',
  );
  // Üç form da (günlük, rutin, özel gün) aynı kaptan geçmeli.
  assert.equal((kod.match(/<FormKabi>/g) ?? []).length, 3, 'formların hepsi sarılmamış');
});

test('çark açılışta seçili değerde AÇILIYOR ama sonra KENDİ KENDİNE OYNAMIYOR', async () => {
  /*
   * ── BU TEST DEĞİŞTİ, ÇÜNKÜ KOD YANLIŞTI ─────────────────────────────
   *
   * Kurucu: "saat hareket etmiyor seçemiyorum."
   *
   * `contentOffset` DOĞRUDAN seçili değerden hesaplanıyordu. Kullanıcı
   * çarkı çevirince seçim değişiyor, bileşen yeniden çiziliyor ve DEĞİŞEN
   * `contentOffset` kaydırmayı geri çekiyordu — çark her denemede kendini
   * toparlıyor, "hiç oynamıyor" gibi görünüyordu.
   *
   * Şart artık iki taraflı: başlangıç seçili değerden gelmeli AMA bir daha
   * değişmemeli (ilk çizimde dondurulmalı).
   */
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const kod = readFileSync(join(import.meta.dirname, 'ui', 'TakvimSecici.tsx'), 'utf8');
  assert.match(
    kod,
    /useState\(\(\) => carkSirasi\(liste, deger\) \* OGE_Y\)/,
    'başlangıç konumu ilk çizimde dondurulmuyor',
  );
  assert.match(kod, /contentOffset=\{\{ x: 0, y: baslangic \}\}/, 'çark seçili değerde açılmıyor');
  // Canlı değerden türetmek, hatanın ta kendisiydi.
  assert.equal(
    /contentOffset=\{\{ x: 0, y: sira \* OGE_Y \}\}/.test(kod),
    false,
    'konum yine canlı değerden türetiliyor — çark geri çekilir',
  );
});

test('TEK DOKUNUŞLA sürükleme de seçimi kaydediyor', async () => {
  /*
   * Parmak kalkınca sürüklenme (momentum) olmazsa `onMomentumScrollEnd`
   * HİÇ tetiklenmiyor; kullanıcı çarkı azıcık çevirip bıraktığında seçim
   * kaydedilmiyordu.
   */
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const kod = readFileSync(join(import.meta.dirname, 'ui', 'TakvimSecici.tsx'), 'utf8');
  assert.match(kod, /onScrollEndDrag=/, 'yavaş sürüklemede seçim kaydedilmiyor');
});

test('çark seçimi liste DIŞINA taşmıyor', async () => {
  /*
   * Hızlı savurmada kaydırma konumu listenin dışına çıkıyor ve
   * `liste[index]` `undefined` dönüyordu — saat "NaN" oluyordu.
   */
  const { carkSecimi, SAATLER } = await import('./takvim');
  assert.equal(carkSecimi(-500, 44, SAATLER.length), 0, 'yukarı taşma kırpılmıyor');
  assert.equal(carkSecimi(99999, 44, SAATLER.length), 23, 'aşağı taşma kırpılmıyor');
  assert.equal(carkSecimi(44 * 7 + 3, 44, SAATLER.length), 7, 'en yakın satıra oturmuyor');
});

test('bilinmeyen değer çarkı BOŞ açmıyor', async () => {
  const { carkSirasi, DAKIKALAR } = await import('./takvim');
  assert.equal(carkSirasi(DAKIKALAR, 30), 6);
  // Listede olmayan bir dakika (ör. eski kayıttan 07) ilk satıra düşer.
  assert.equal(carkSirasi(DAKIKALAR, 7), 0);
});

/* ── GİZLİLİK KARTI YERİ ───────────────────────────────────────────────── */

test('gizlilik vaadi W2W akışında DEĞİL, gizlilik ekranında', async () => {
  /*
   * Kurucu: "bu açıklama w2w içerisinde gereksiz, bunu gizlilik alanında
   * gösterelim." + "hem üst hem altta var."
   *
   * Kart topluluk akışında ÜÇ kez çiziliyordu (üstte, altta ve boş
   * durumda): her açılışta aynı üç maddeyi tekrar okutuyor ve asıl içeriği
   * aşağı itiyordu. Bir kez okunacak bir vaat, akışta değil gizlilik
   * ekranında yaşamalı — insan bu soruyu zaten oraya sorarak geliyor.
   */
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const kok = join(import.meta.dirname, '..', 'app');
  const w2w = readFileSync(join(kok, '(tabs)', 'circle.tsx'), 'utf8');
  const gizlilik = readFileSync(join(kok, 'profile', 'privacy.tsx'), 'utf8');

  assert.equal(/circle\.privacy\./.test(w2w), false, 'kart hâlâ W2W akışında');
  assert.match(gizlilik, /circle\.privacy\.title/, 'kart gizlilik ekranına taşınmamış');
  // Üç madde de taşınmalı; biri unutulursa vaat eksik anlatılır.
  for (const k of ['circle.privacy.a', 'circle.privacy.b', 'circle.privacy.c']) {
    assert.ok(gizlilik.includes(k), `gizlilik ekranında eksik madde: ${k}`);
  }
});

test('gönderi ekranında son satır düğmenin altında kalmıyor', async () => {
  /*
   * Kurucu: "kaymış ekran." Son kart ("Anonim paylaş") "Paylaş" düğmesinin
   * altında yarım kalıyordu: ScrollView `flex: 1` almadığı için kendini
   * içeriği kadar boyutlandırıyor ve kabı taşırıyordu.
   */
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const kod = readFileSync(join(import.meta.dirname, '..', 'app', 'circle', 'new.tsx'), 'utf8');
  assert.match(kod, /style=\{styles\.kaydirma\}/, 'kaydırma alanı esnek değil');
  assert.match(kod, /kaydirma: \{ flex: 1 \}/, 'kaydırma alanına flex verilmemiş');
});

/* ── ÇARK GERÇEKTEN DÖNÜYOR MU ─────────────────────────────────────────── */

test('çarkı SARAN bir Pressable yok', async () => {
  /*
   * Kurucu: "çalışmıyor."
   *
   * İçerik bir `Pressable` ile sarılıydı. `Pressable` dokunma
   * sorumluluğunu (responder) üstleniyor; parmağı basılı tutup
   * SÜRÜKLEYİNCE hareketi kendi alıyor ve içteki `ScrollView`a hiç
   * bırakmıyordu. Takvimdeki gün seçimi tek DOKUNUŞ olduğu için
   * çalışıyordu — hata yalnız kaydırma gereken çarkta görünüyordu.
   *
   * Perde artık ayrı bir katman (`absoluteFill`); içerik hiçbir
   * `Pressable` içinde değil.
   */
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const kod = readFileSync(join(import.meta.dirname, 'ui', 'TakvimSecici.tsx'), 'utf8');
  assert.equal(
    /<Pressable style=\{styles\.sayfa\}/.test(kod),
    false,
    'içerik hâlâ Pressable ile sarılı — sürükleme yutuluyor',
  );
  assert.match(kod, /<View style=\{styles\.sayfa\}>/, 'içerik düz View değil');
  assert.match(
    kod,
    /<Pressable\s*\n\s*style=\{StyleSheet\.absoluteFill\}/,
    'perde ayrı katman değil',
  );
});

test('açılış dakikası çarkın SEÇENEKLERİNDEN birine oturuyor', async () => {
  /*
   * "Şimdi" 19:24 iken listede 24 YOK: çark 00'ı işaretliyor ama özet
   * "19:24" yazıyordu. Kullanıcı ekranda iki farklı sayı görünce
   * "çalışmıyor" diyor — haklı olarak.
   */
  const { enYakinDakika, DAKIKALAR } = await import('./takvim');
  for (const d of [0, 1, 24, 26, 43, 58, 59]) {
    assert.ok(DAKIKALAR.includes(enYakinDakika(d)), `${d} → listede olmayan değer`);
  }
  assert.equal(enYakinDakika(24), 25, '24 en yakın seçeneğe gitmiyor');
  /*
   * 58 → 55, 00 DEĞİL. 00'a yuvarlamak bir sonraki saate geçmek demek:
   * kullanıcı 19:58 yazdığında ekranda 20:00 görürdü — SAATİ sessizce
   * değiştirmek, dakikayı yuvarlamaktan çok daha kötü.
   */
  assert.equal(enYakinDakika(58), 55, '58 saati ileri kaydırıyor');
  assert.equal(enYakinDakika(30), 30, 'tam değer değişiyor');
});

// ── YIL/AY SEÇİMİ — kurucunun isteği ────────────────────────────────────

test('DOĞUM TARİHİ için 120 yıl geriye açık', () => {
  /*
   * Kurucu: "1970'de doğan birisi için yıl seçmek çok zor oluyor."
   * Sınır verilmediğinde (doğum tarihi alanı) geriye doğru pencere geniş
   * olmalı; dar olsaydı 1970 listede HİÇ olmaz ve kullanıcı yine ok
   * tuşlarıyla uğraşırdı.
   */
  const yillar = secilebilirYillar(2000);
  assert.ok(yillar.includes(1970), '1970 listede yok');
  assert.ok(yillar.includes(1930), 'yeterince geriye gitmiyor');
  assert.ok(yillar[0]! < yillar[yillar.length - 1]!, 'liste artan sırada değil');
});

test('SINIR VARSA yıl listesi sınırların DIŞINA çıkmıyor', () => {
  // Randevu takviminde geçmiş yıl seçilebilseydi kullanıcı geçmişe
  // randevu almaya çalışırdı.
  const yillar = secilebilirYillar(2026, new Date(2026, 0, 1), new Date(2027, 11, 31));
  assert.deepEqual(yillar, [2026, 2027]);
});

test('AY, İÇİNDE TEK BİR GÜN bile seçilebiliyorsa AÇIK', () => {
  /*
   * Ayın 1'ini sınamak yetmiyor: `enAz` 15 Mart ise Mart'ın tamamı kapalı
   * görünürdü, oysa 15–31 Mart seçilebilir.
   */
  const enAz = new Date(2026, 2, 15);
  assert.equal(ayAcikMi(2026, 2, enAz), true, 'kısmen açık ay kapalı görünüyor');
  assert.equal(ayAcikMi(2026, 1, enAz), false, 'tamamen geçmiş ay açık görünüyor');
});

test('AY DEĞİŞİNCE gün TAŞMIYOR', () => {
  // 31 Ocak'tayken Şubat seçilirse 31 Şubat olmaz.
  const d = yilAyUygula(new Date(2026, 0, 31), 2026, 1);
  assert.equal(d.getMonth(), 1, 'ay bir sonrakine taştı');
  assert.equal(d.getDate(), 28);
});

test('YIL/AY seçimi SINIRA çekiliyor', () => {
  const enAz = new Date(2026, 5, 10);
  const d = yilAyUygula(new Date(2026, 5, 1), 2026, 5, enAz);
  assert.equal(d.getTime(), enAz.getTime(), 'sınırın dışına düşen seçim düzeltilmiyor');
  const enCok = new Date(2026, 5, 20);
  const d2 = yilAyUygula(new Date(2026, 5, 25), 2026, 5, undefined, enCok);
  assert.equal(d2.getTime(), enCok.getTime());
});

test('ARTIK YIL 29 Şubat doğru', () => {
  assert.equal(yilAyUygula(new Date(2024, 0, 31), 2024, 1).getDate(), 29);
  assert.equal(yilAyUygula(new Date(2026, 0, 31), 2026, 1).getDate(), 28);
});
