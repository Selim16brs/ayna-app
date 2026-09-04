import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * TEPE IŞIĞI — ekranların en üstündeki renk yıkaması.
 *
 * Kurucu: "ana sayfada hem tüm profillerde en üstte bu şekilde bir çalışma
 * yapar mısın? tabi ki SEÇİLEN RENGİN TONLARI olacak şekilde olmalı."
 */

const oku = (p: string) => readFileSync(join(__dirname, p), 'utf8');
const bilesen = oku('ui/TepeIsigi.tsx');
const ekran = (p: string) => readFileSync(join(__dirname, '..', 'app', p), 'utf8');

test('RENK TEMADAN — sabit renk kodu yok', () => {
  /*
   * Kurucunun tekrar eden şikâyeti: "renk değiştiğinde ... sabit kalıyor."
   * Buraya bir kez `#F8D7E3` yazılsaydı aksan değiştiğinde yıkama eski
   * renkte kalır ve ekranın geri kalanıyla kavga ederdi.
   */
  assert.doesNotMatch(bilesen, /#[0-9a-fA-F]{3,8}\b/, 'sabit renk kodu var');
  assert.match(bilesen, /fill=\{colors\.accent\}/, 'aksan renginden beslenmiyor');
  assert.match(bilesen, /fill=\{colors\.gold\}/, 'ikinci ton temadan gelmiyor');
  assert.match(bilesen, /stopColor=\{colors\.bg\}/, 'erime zemin renginden değil');
});

test('DOKUNUŞ YUTMUYOR ve içeriğin ARKASINDA', () => {
  /*
   * Yıkama başlığın üstünü kaplıyor. Dokunuşu yutsaydı şehir seçici,
   * mesaj ve bildirim düğmeleri çalışmazdı — görsel bir süs yüzünden
   * işlevsel düğmeler ölürdü.
   */
  assert.match(bilesen, /pointerEvents="none"/, 'dokunuşları yutuyor');
  assert.match(bilesen, /position: 'absolute'/, 'düzeni itiyor');
});

test('KOYU TEMADA hafifletiliyor ama kaybolmuyor', () => {
  // Aynı opaklık koyu zeminde leke gibi durur; çok kısılırsa hiç görünmez.
  const m = bilesen.match(/const k = koyu \? ([\d.]+) : 1;/);
  assert.ok(m, 'koyu tema ayarı yok');
  const k = Number(m![1]);
  assert.ok(k > 0.3 && k < 0.8, `koyu tema çarpanı makul değil: ${k}`);
});

test('OKUNURLUĞU BOZMUYOR — hiçbir katman yarı yarıya opak değil', () => {
  /*
   * Başlıktaki isim yıkamanın üstünde okunuyor. Opaklık yükselirse
   * kontrast düşer ve bu testin yakalayamayacağı bir okunurluk sorunu
   * doğar; üst sınır burada tutuluyor.
   *
   * Sınır 0.2'den 0.3'e çıkarıldı: kurucu "biraz daha belirgin olmalı"
   * dedi. Sınırın KENDİSİ duruyor — istek "belirgin", "okunmaz" değildi.
   */
  const opakliklar = [...bilesen.matchAll(/opacity=\{([\d.]+) \* k\}/g)].map((x) => Number(x[1]));
  assert.ok(opakliklar.length >= 3, 'katman bulunamadı');
  for (const o of opakliklar) assert.ok(o <= 0.3, `katman fazla opak: ${o}`);
});

test('ALTA DOĞRU ERİYOR — içeriğe sert çizgiyle bitmiyor', () => {
  // Sert bir kenar, yıkamayı bir "bant" gibi gösterirdi.
  assert.match(bilesen, /LinearGradient id="ti-erime"/, 'alt erime yok');
});

test('ANA SAYFA ve TÜM PROFİLLERDE var', () => {
  /*
   * Kurucu: "müşteri tarafında yaptığımız ve uzman ile salonda da olan
   * şeyler otomatik olarak bu ekranlarda da olmalı… zemine attığımız üst
   * taraftaki tasarım ve renk seçim olayı salon ve uzmanda da olmalı."
   *
   * Uzman ve salonun KENDİ ana ekranlarında yoktu: aynı uygulamanın iki
   * yarısı iki farklı ürün gibi duruyordu.
   */
  const yerler: [string, string][] = [
    ['(tabs)/discover.tsx', 'ana sayfa'],
    ['(tabs)/profile.tsx', 'kendi profilim'],
    ['uzman/[id].tsx', 'uzman profili'],
    ['professional/[id].tsx', 'salon/uzman profili'],
    ['seller/reports.tsx', 'uzman ana ekranı'],
    ['salon/home.tsx', 'salon ana ekranı'],
    ['salon/profile.tsx', 'salon profili'],
  ];
  for (const [yol, ad] of yerler) {
    assert.match(ekran(yol), /<TepeIsigi[\s/]/, `${ad} ekranında tepe ışığı yok`);
  }
  // Sekme başlığı: Randevularım · Benim İçin · W2W üçü de buradan besleniyor.
  assert.match(oku('ui/TabHero.tsx'), /<TepeIsigi \/>/, 'sekme başlığında tepe ışığı yok');
});

test('KAPSAYICISI KAPATMIYOR — kendi zemini olan başlıkta İÇERİDE', () => {
  /*
   * İlk denememde yıkama kendi-profilim başlığının DIŞINDAYDI ve
   * başlığın `heroSoft` zemini üstünü tamamen kapatıyordu: hiç
   * görünmüyordu. Kendi zemini olan kapsayıcıda içeride durmalı.
   */
  const p = ekran('(tabs)/profile.tsx');
  const basIndex = p.indexOf('style={[styles.header, { paddingTop:');
  const isikIndex = p.indexOf('<TepeIsigi />');
  assert.ok(isikIndex > basIndex, 'yıkama başlığın dışında — zemin onu kapatır');
  assert.match(
    p,
    /borderBottomRightRadius: 28,\s*\n\s*\/\/[^\n]*\n\s*overflow: 'hidden',/,
    'yuvarlak köşede taşma kırpılmıyor',
  );
});

test('YIKAMA BAŞLIKTAN AŞAĞI UZANIYOR', () => {
  /*
   * Kurucu: "çok kısa kalmış, daha aşağıya doğru olmalı."
   *
   * İlk sürümde ana sayfada 260 vardı: yıkama başlığın hemen altında
   * bitiyor, ince bir şerit gibi duruyordu. Yükseklik verilen yerlerde
   * artık ilk içerik kartlarının arkasına kadar iniyor.
   */
  /*
   * Ana sayfa artık SABİT ÜST BLOK kullanıyor (başlık + karşılama +
   * arama kaydırma alanının dışında) ve yıkama o bloğu DOLDURUYOR;
   * yükseklik vermek bloğu aşıp kayan içeriğe taşardı. Sabit yükseklik
   * yalnız kapsayıcısı tüm ekran olan yerde gerekli.
   */
  const m = ekran('professional/[id].tsx').match(/<TepeIsigi yukseklik=\{(\d+)\} \/>/);
  assert.ok(m, 'salon/uzman profilinde yükseklik verilmemiş');
  assert.ok(Number(m![1]) >= 400, `salon/uzman profili yıkaması kısa: ${m![1]}`);

  // Ana sayfada yıkama sabit bloğun İÇİNDE ve onu dolduruyor.
  const anaSayfa = ekran('(tabs)/discover.tsx');
  assert.match(
    anaSayfa,
    /<View style=\{styles\.sabitUst\}>\s*<TepeIsigi \/>/,
    'ana sayfada yıkama sabit bloğu doldurmuyor',
  );
});

test('RENK ALANIN ÇOĞUNA yayılıyor — erime geç başlıyor', () => {
  // Erime %55'te başlıyordu: renk alanın yarısında bitiyordu.
  const m = bilesen.match(/<Stop offset="(\d+)%" stopColor=\{colors\.bg\} stopOpacity=\{0\} \/>/);
  assert.ok(m, 'erimenin başlangıcı okunamadı');
  assert.ok(Number(m![1]) >= 65, `erime çok erken başlıyor: %${m![1]}`);
});

test('ANA SAYFADA başlık + karşılama + ARAMA sabit', () => {
  /*
   * Kurucu: "search kısmını üstünden yukarı kadar olan kısmı aynı
   * profildeki gibi sabit tutabilir misin?"
   *
   * Üçü de kaydırma alanının DIŞINDA olmalı; içeri kaçan biri sayfa
   * kayarken yukarı süzülür ve arama yine elden gider.
   */
  const d = ekran('(tabs)/discover.tsx');
  const sabitBlok = d.slice(d.indexOf('<View style={styles.sabitUst}>'), d.indexOf('<ScrollView'));
  for (const [ad, isaret] of [
    ['başlık', 'styles.header'],
    ['karşılama', 'styles.karsilama'],
    ['arama', 'styles.aramaKap'],
  ] as [string, string][]) {
    assert.ok(sabitBlok.includes(isaret), `${ad} sabit blokta değil`);
  }
  // Hızlı eylemler KAYMALI: sabit blok yalnız aramaya kadar.
  assert.ok(!sabitBlok.includes('HIZLI_EYLEMLER'), 'hızlı eylemler de sabitlenmiş');
});

test('SABİT BLOK yıkamanın taşmasını kırpıyor', () => {
  // Yıkama bloğu dolduruyor; kırpma olmasa alt kenarından kayan içeriğe
  // renk sızardı.
  const d = ekran('(tabs)/discover.tsx');
  assert.match(d, /sabitUst: \{ overflow: 'hidden' \}/, 'sabit blok taşmayı kırpmıyor');
});

test('RENK SEÇİMİ üç profilde de AYNI bileşenden', () => {
  /*
   * Blok müşteri profilinin içine yazılıydı ve salon profilinde HİÇ
   * yoktu: salon hesabıyla giren kişi ne temayı ne rengi değiştirebiliyordu.
   *
   * Kopyalamak yerine tek bileşen: birine eklenen yeni renk diğerinde de
   * çıkıyor. Test kopyalamayı da yasaklıyor — ekranların içinde ikinci bir
   * renk ızgarası kalmamalı.
   */
  for (const [yol, ad] of [
    ['(tabs)/profile.tsx', 'müşteri/uzman profili'],
    ['salon/profile.tsx', 'salon profili'],
  ] as const) {
    const k = ekran(yol);
    assert.match(k, /<GorunumKarti \/>/, `${ad}: görünüm kartı yok`);
    assert.ok(
      !/AKSAN_ANAHTARLARI\.map/.test(k),
      `${ad}: renk ızgarası ekrana KOPYALANMIŞ — ikisi zamanla ayrışır`,
    );
  }
  const kart = oku('ui/GorunumKarti.tsx');
  assert.match(kart, /AKSAN_ANAHTARLARI\.map/, 'ortak kartta renk ızgarası yok');
  assert.match(kart, /setPreference/, 'ortak kartta tema kipi yok');
});
