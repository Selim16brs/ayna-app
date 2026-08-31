import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * İLK 30 SANİYE — madde #2 (kayıt duvarı) ve #19 (dil).
 *
 * Faz 0 keşfinde bulunanlar:
 *   - Karşılama ekranında YALNIZ "Giriş yap" ve "Kayıt ol" vardı. Keşfet'e,
 *     bir uzman profiline ya da bir fiyata giden hiçbir yol yoktu — oysa
 *     katalog uçları zaten korumasız, yani gezinti teknik olarak mümkündü.
 *   - `expo-localization` kuruluydu ama `getLocales()` HİÇ çağrılmıyordu;
 *     `DEFAULT_LOCALE='tr'` sabitti. Telefonu Rusça olan Almatı kullanıcısı
 *     uygulamayı okuyamadığı dilde karşılıyordu.
 *   - Dil seçimi HİÇBİR YERE yazılmıyordu; karşılama ekranındaki yorum
 *     "kalıcı" diyordu ama her soğuk açılış Türkçeye dönüyordu.
 */

const kok = join(import.meta.dirname, '..');
const karsilama = readFileSync(join(kok, 'app/index.tsx'), 'utf8');
const locale = readFileSync(join(kok, 'src/locale.tsx'), 'utf8');
const kapi = readFileSync(join(kok, 'src/auth-wall.ts'), 'utf8');
const login = readFileSync(join(kok, 'app/auth/login.tsx'), 'utf8');

test('#2 — karşılama ekranından MİSAFİR gezinti var', () => {
  assert.match(karsilama, /t\('welcome\.browse'\)/, 'misafir düğmesi yok');
  assert.match(karsilama, /router\.push\('\/discover'\)/, "Keşfet'e yol yok");
  // Gezinti BİRİNCİL eylem olmalı: giriş/kayıt ikincil kalsın.
  const m = /label=\{t\('welcome\.browse'\)\}[\s\S]{0,120}?variant="(\w+)"/.exec(karsilama);
  assert.ok(m, 'misafir düğmesi okunamadı');
  assert.equal(m[1], 'primary', 'gezinti birincil eylem değil');
});

test('#2 — giriş kapısı NİYETİ koruyor', () => {
  // Kullanıcı uzmanı beğenip "Randevu al" dediğinde giriş sonrası Keşfet'e
  // atılırsa aradığı uzmanı baştan bulması gerekir.
  assert.match(kapi, /params: \{ next: nereye \}/, 'kapı hedef yolu taşımıyor');
  assert.match(login, /const geriDon =/, 'giriş dönüş yolunu okumuyor');
  assert.match(login, /next\.startsWith\('\/'\)/, 'açık yönlendirme koruması yok');
});

test('#2 — kapı gerçek aksiyonlarda, gezintide DEĞİL', () => {
  const profil = readFileSync(join(kok, 'app/professional/[id].tsx'), 'utf8');
  // Randevu, mesaj ve favori giriş istemeli.
  const kez = [...profil.matchAll(/girisGerekli\(/g)].length;
  assert.ok(kez >= 3, `kapı ${kez} yerde — randevu, mesaj ve favoride olmalı`);
  // Ama profilin KENDİSİ misafire açık olmalı: kapı yalnız İŞLEYİCİLERİN
  // içinde olmalı, bileşen gövdesinde değil. İlk sürümümde dilim sınırını
  // `const book` yapmıştım ve ondan ÖNCE tanımlı olan `messagePro`'yu
  // "render sırasında çağrılıyor" sanıp düştü — kod doğruydu.
  const ilkIsleyici = profil.indexOf('  const messagePro');
  assert.ok(ilkIsleyici > 0, 'işleyiciler bulunamadı');
  const govde = profil.slice(profil.indexOf('export default function'), ilkIsleyici);
  assert.doesNotMatch(govde, /girisGerekli\(/, 'profil görüntülemek için giriş isteniyor');
  // Her çağrı bir işleyicinin içinde: `if (...) return;` kalıbıyla.
  for (const m of profil.matchAll(/girisGerekli\(/g)) {
    const satir = profil.slice(profil.lastIndexOf('\n', m.index) + 1, m.index);
    assert.match(satir, /if \($/, 'kapı koşulsuz çağrılıyor');
  }
});

test('#19 — cihaz dili okunuyor, üçü dışındaysa RU', () => {
  assert.match(locale, /getLocales\(\)/, 'cihaz dili okunmuyor');
  assert.match(locale, /function cihazDili\(\): Locale/, 'eşleme yok');
  // Hedef pazarın ortak dili RU; Türkçe yalnız cihaz Türkçeyse.
  const m = /function cihazDili\(\): Locale \{[\s\S]*?\n\}/.exec(locale);
  assert.ok(m, 'cihazDili okunamadı');
  assert.match(m[0], /return 'ru';/, 'varsayılan RU değil');
  for (const d of ['tr', 'kk', 'ru']) {
    assert.ok(m[0].includes(`'${d}'`), `${d} eşlemede yok`);
  }
});

test('#19 — dil seçimi KALICI', () => {
  // Karşılama ekranındaki yorum "kalıcı" diyordu ama hiçbir yere
  // yazılmıyordu: her soğuk açılış Türkçeye dönüyordu.
  assert.match(locale, /AsyncStorage\.setItem\(DIL_ANAHTARI/, 'seçim kaydedilmiyor');
  assert.match(locale, /AsyncStorage\.getItem\(DIL_ANAHTARI/, 'seçim okunmuyor');
  // Kullanıcının açık seçimi cihaz dilini EZMELİ.
  assert.match(locale, /useEffect\(\(\) => \{[\s\S]*?getItem\(DIL_ANAHTARI/, 'açılışta okunmuyor');
});
