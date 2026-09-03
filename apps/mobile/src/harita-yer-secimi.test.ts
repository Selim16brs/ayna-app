/**
 * HARİTA — ŞEHİR ve BÖLGE SEÇİMİ.
 *
 * Kurucu: "harita üzerinde şehir seçimi ile lokasyonu oraya çekmek ve
 * seçilen şehir içerisinde belirli bölgeyi seçerek bir arama daraltma
 * yapabilir miyiz?"
 *
 * Harita eskiden kullanıcının KAYITLI şehrine kilitliydi: Almatı'da
 * kayıtlı biri Astana'ya bakamıyordu ve bunu değiştirecek bir denetim de
 * yoktu.
 *
 * BÖLGE DARALTMA NEDEN COĞRAFİ DEĞİL: canlıda 25 uzmanın HİÇBİRİNİN
 * koordinatı yok (0/25); `proCoords` koordinat yoksa şehir merkezi
 * etrafına dağıtıyor. Yani haritadaki pinler gerçek konum değil. Harita
 * üzerinde alan çizdirip ona göre süzmek, uydurma noktaları süzmek
 * olurdu. Buna karşılık `district` alanı 25/25 dolu — daraltma o gerçek
 * veriye bağlandı.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bolgeAdi } from './bolge-adi';

const kok = join(import.meta.dirname, '..');
const ekran = readFileSync(join(kok, 'app/map.tsx'), 'utf8');
const sozluk = readFileSync(join(kok, '../../packages/i18n/src/messages/tr.ts'), 'utf8');

test('şehir HARİTADAN seçilebiliyor — kayıtlı şehre kilitli değil', () => {
  assert.match(ekran, /const \[city, setCity\] = useState\(varsayilanSehir\)/, 'şehir sabit');
  assert.match(ekran, /'map\.where\.city'/, 'şehir seçimi arayüzde yok');
  assert.ok(sozluk.includes("'map.where.city':"), 'şehir başlığı sözlükte yok');
});

test('şehir değişince harita ORAYA gidiyor', () => {
  // `cityCenter(city)` odağı veriyor; anahtar değişmezse harita eski
  // konumda kalır.
  assert.match(ekran, /const center = cityCenter\(city\)/, 'odak seçili şehirden gelmiyor');
  assert.match(ekran, /key=\{`\$\{city\}:\$\{bolge \?\? ''\}`\}/, 'harita yeni odağa sıçramıyor');
});

test('bölge daraltması GERÇEK district alanına dayanıyor', () => {
  assert.match(ekran, /bolgeAdiOf\(p\) === bolge/, 'bölge süzgeci yok');
  // Koordinata dayalı bir alan süzgeci OLMAMALI: pinler uydurma konumda.
  assert.ok(
    !/latitudeDelta[\s\S]{0,200}filter/.test(ekran),
    'coğrafi alan süzgeci eklenmiş — pinler gerçek konum değil',
  );
});

test('BOŞ şehir ve BOŞ bölge seçenek olarak gösterilmiyor', () => {
  /*
   * Tüm ülke listesini sunmak, dokunulunca bomboş harita açan seçenekler
   * üretirdi. Sayaç yalnız gerçekten sağlayıcısı olanları topluyor.
   */
  assert.match(ekran, /for \(const p of all\) if \(p\.city\)/, 'şehirler veriden türetilmiyor');
  assert.match(ekran, /if \(ad && ad !== city\)/, 'boş/şehirle aynı bölge eleniyor değil');
});

test('iki farklı district yazımı TEK ada iniyor', () => {
  /*
   * Tohum verisi "Almatı · Bostandık", canlı kayıtlar düz "Bostandık"
   * yazıyor. Ayıklanmazsa aynı bölge iki ayrı çip olurdu.
   *
   * Metne değil MANTIĞA bakıyor: ilk yazımda bekçi kaynak metnini arıyordu
   * ve normalizasyonu bozan mutasyonu YAKALAYAMADI.
   */
  assert.equal(bolgeAdi('Almatı · Bostandık', 'Almatı'), 'Bostandık');
  assert.equal(bolgeAdi('Bostandık', 'Almatı'), 'Bostandık');
  assert.equal(
    bolgeAdi('Almatı · Bostandık', 'Almatı'),
    bolgeAdi('Bostandık', 'Almatı'),
    'aynı bölge iki ayrı seçenek olarak çıkıyor',
  );
});

test('şehir adının kendisi BÖLGE sayılmıyor', () => {
  // Canlıda `district = 'Almatı'` olan kayıtlar var: bu bölge bilgisi
  // değil, doldurulmamış alan. Seçenek listesine girmemeli.
  assert.equal(bolgeAdi('Almatı', 'Almatı'), '');
  assert.equal(bolgeAdi('almatı', 'Almatı'), '', 'büyük/küçük harf farkı kaçıyor');
  assert.equal(bolgeAdi('', 'Almatı'), '');
  assert.equal(bolgeAdi('   ', 'Almatı'), '');
});

test('bölge adı boşluk ve ayraç kirinden temizleniyor', () => {
  assert.equal(bolgeAdi('  Almatı ·  Medeu  ', 'Almatı'), 'Medeu');
  assert.equal(bolgeAdi('Almatı ·', 'Almatı'), '', 'boş bölge adı sızıyor');
});

test('şehir değişince bölge SIFIRLANIYOR', () => {
  // Almatı'nın Medeu'su Astana'da yok; eski seçim listeyi boşaltırdı.
  assert.match(ekran, /setCity\(ad\);\s*\n\s*setBolge\(null\);/, 'şehir değişince bölge kalıyor');
});

test('bölgesi olmayan şehirde boş şerit değil AÇIKLAMA çıkıyor', () => {
  assert.match(ekran, /bolgeler\.length > 0 \?/, 'boş bölge listesi karşılanmıyor');
  assert.ok(sozluk.includes("'map.where.no_area':"), 'boş bölge açıklaması yok');
});

test('düğmeler başlığın SAĞ YUVASINDA — ekran dışına taşmıyor', () => {
  /*
   * Kurucu: "orda hiçbir değişiklik yok... bir şehir seçimi ya da alan
   * seçimi yok."
   *
   * Değişiklik yayındaydı ama GÖRÜNMÜYORDU: düğmeler `StackHeader`ın
   * YANINA kardeş olarak konmuştu. StackHeader zaten tam genişlik bir satır
   * (`texts` flexGrow:1); onu bir satıra daha sarıp yanına bir şey koymak
   * ekranın dışına taşıyor. Mevcut liste düğmesi de aynı sebeple
   * görünmüyordu — hata benden önce vardı, ben üstüne bir tane daha
   * eklemiştim.
   */
  assert.match(
    ekran,
    /<StackHeader\n\s+title=\{t\('map\.title'\)\}\n\s+right=\{/,
    'düğmeler sağ yuvada değil',
  );
  assert.ok(
    !ekran.includes('styles.headerRow'),
    'başlık hâlâ bir satıra sarılmış — kardeş düğmeler ekran dışında kalır',
  );
});

test('yer seçici haritayı yemiyor — alt sayfa', () => {
  assert.match(ekran, /<Modal\n\s+visible=\{yerAcik\}/, 'yer seçici alt sayfada değil');
  assert.match(ekran, /maxHeight: '80%'/, 'alt sayfa ekranın tamamını kaplıyor');
  // Sonuca döndüren düğme — arama ekranındaki kuralın aynısı.
  assert.match(ekran, /'map\.where\.apply'/, 'sonuç gösterme düğmesi yok');
  assert.match(ekran, /disabled=\{pros\.length === 0\}/, 'boş sonuçta düğme kapanmıyor');
});

test('seçili yer düğmenin üstünde YAZILI', () => {
  // Kullanıcı nereye baktığını görmek için sayfayı açmak zorunda kalmamalı.
  assert.match(ekran, /bolge \? `\$\{city\} · \$\{bolge\}` : city/, 'seçili yer görünmüyor');
});
