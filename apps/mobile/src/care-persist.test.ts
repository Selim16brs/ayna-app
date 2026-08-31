import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * BAKIM VERİSİ SUNUCUYA YAZILMALI.
 *
 * Bakım sekmesinin TAMAMI cihazda yaşıyordu: kullanıcı rutinini, anlarını ve
 * kişisel günlüğünü giriyordu, sunucuda hiçbir karşılığı yoktu — ne uç, ne
 * model. Telefon değişince hepsi gidiyordu ve kullanıcı bunu ancak
 * kaybettikten sonra fark ediyordu.
 *
 * Zincirin BEŞ halkası var ve herhangi biri kopunca hata SESSİZDİR:
 *   model → uç → istemci → mağaza yazma → mağaza OKUMA
 *
 * Beşincisi en sinsisi: yazma bağlanıp okuma unutulursa veri sunucuya gider
 * ama yeni cihazda ekran BOŞ açılır.
 */

const mobil = join(import.meta.dirname, '..');
const api = join(mobil, '..', 'api');
const store = readFileSync(join(mobil, 'src/store.ts'), 'utf8');
const apiSrc = readFileSync(join(mobil, 'src/api.ts'), 'utf8');
const sema = readFileSync(join(api, 'prisma/schema.prisma'), 'utf8');
const ctrl = readFileSync(join(api, 'src/care/care.controller.ts'), 'utf8');
const svc = readFileSync(join(api, 'src/care/care.service.ts'), 'utf8');

test('üç tablo da tanımlı', () => {
  for (const m of ['CareRoutine', 'CareMoment', 'CareLog']) {
    assert.match(sema, new RegExp(`^model ${m} \\{`, 'm'), `${m} modeli yok`);
  }
});

test('TÜRETİLMİŞ değerler saklanmıyor', () => {
  // `dueDays`/`daysLeft` anlık hesap. Saklansalardı zaman donar, kullanıcı
  // bir hafta sonra açtığında hâlâ "3 gün kaldı" görürdü.
  // YORUMLARI ELE: ilk sürümüm `dueDays` kelimesini şemada arıyordu ve
  // AÇIKLAMA satırında bulup düştü — kodun değil testin hatasıydı. Alan
  // tanımına bakılmalı, kelimenin geçtiği yere değil.
  const alanlar = (blok: string) =>
    blok
      .split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('///'))
      .join('\n');
  const rutin = alanlar(/model CareRoutine \{[\s\S]*?\n\}/.exec(sema)![0]);
  const an = alanlar(/model CareMoment \{[\s\S]*?\n\}/.exec(sema)![0]);
  assert.doesNotMatch(rutin, /^\s+dueDays\s/m, 'rutinde türetilmiş dueDays saklanıyor');
  assert.doesNotMatch(an, /^\s+daysLeft\s/m, 'anda türetilmiş daysLeft saklanıyor');
  assert.match(rutin, /lastDoneAt/, 'kaynak tarih yok');
  assert.match(an, /happensAt/, 'kaynak tarih yok');
  // Hesaplama sunucuda olmalı, yoksa istemciler ayrışır.
  assert.match(svc, /gunFarki/, 'gün farkı sunucuda hesaplanmıyor');
});

test('her yazma SAHİPLİK koşulu taşıyor', () => {
  // `update`/`delete` kimlik kontrolü yapmadan başkasının satırını bulur.
  // `updateMany`/`deleteMany` + userId koşulu, sahibi olmayanı 0 satırda
  // bırakır ve 404 döneriz.
  const yazmalar = [...svc.matchAll(/prisma\.care\w+\.(update|delete)(Many)?\(/g)];
  assert.ok(yazmalar.length >= 5, `beklenenden az yazma: ${yazmalar.length}`);
  for (const m of yazmalar) {
    assert.equal(m[2], 'Many', `${m[0]} tekil — sahiplik kontrolü atlanabilir`);
  }
  const koşullu = [...svc.matchAll(/where: \{ id, userId \}/g)].length;
  assert.ok(koşullu >= 5, `${koşullu} yazmada userId koşulu var, en az 5 olmalı`);
});

test('uçlar giriş zorunlu', () => {
  assert.match(ctrl, /@UseGuards\(JwtAuthGuard\)/, 'bakım uçları korumasız');
  // Kullanıcı kimliği GÖVDEDEN değil oturumdan alınmalı; yoksa istemci
  // başkasının kimliğini gönderip onun verisini yazabilir.
  assert.doesNotMatch(ctrl, /body\.userId|@Body\(\)[^)]*userId/, 'userId gövdeden alınıyor');
  const cagri = [...ctrl.matchAll(/this\.care\.\w+\(req\.user!\.id/g)].length;
  assert.ok(cagri >= 8, `${cagri} uç oturum kimliği kullanıyor, en az 8 olmalı`);
});

test('istemci fonksiyonları tanımlı', () => {
  for (const f of [
    'care',
    'addCareRoutine',
    'completeCareRoutine',
    'addCareMoment',
    'addCareLog',
    'updateCareLog',
    'removeCareLog',
  ]) {
    assert.match(apiSrc, new RegExp(`^\\s{2}${f}:`, 'm'), `api.${f} yok`);
  }
});

test('mağaza yazıyor VE geçici kimliği takas ediyor', () => {
  // Takas şart: "tamamladım"/silme kimliği sunucuya gönderiyor. Yerel `cr_3`
  // gönderilirse sunucu tanımaz ve işlem sessizce düşer.
  for (const [eylem, cagri] of [
    ['addRoutine', 'addCareRoutine'],
    ['addMoment', 'addCareMoment'],
    ['addPersonalLog', 'addCareLog'],
  ]) {
    const m = new RegExp(`      ${eylem}: \\(input\\) => \\{[\\s\\S]*?\\n      \\},`).exec(store);
    assert.ok(m, `${eylem} bulunamadı`);
    assert.ok(
      m[0].includes(`api\n          .${cagri}(`) || m[0].includes(`.${cagri}(`),
      `${eylem} sunucuya yazmıyor`,
    );
    assert.match(
      m[0],
      /x\.id === gecici \? \{ \.\.\.x, id: r\.id \}/,
      `${eylem} kimlik takası yapmıyor`,
    );
    assert.match(m[0], /\.catch\(/, `${eylem} başarısızlıkta hayalet satır bırakıyor`);
  }
});

test('mağaza OKUYOR ve açılışta çağrılıyor', () => {
  // En sinsi hata: yazma bağlanır, okuma unutulur. Veri sunucuya gider ama
  // yeni cihazda ekran boş açılır.
  assert.match(store, /hydrateCare: async \(\) => \{/, 'hydrateCare yok');
  assert.match(store, /api\.care\(token\)/, 'sunucudan okumuyor');
  const layout = readFileSync(join(mobil, 'app/_layout.tsx'), 'utf8');
  assert.match(layout, /void hydrateCare\(\);/, 'açılışta çağrılmıyor');
});

test('etiket TEK biçimlendiriciden üretiliyor', () => {
  // Sunucu tarihi saklıyor, gösterim biçimini değil. İkinci bir
  // biçimlendirici yazılsaydı aynı tarih iki yerde farklı görünürdü.
  assert.match(
    store,
    /formatTrDate\(new Date\(m\.happensAtMs\), false\)/,
    'an etiketi üretilmiyor',
  );
  assert.match(store, /formatTrDate\(new Date\(l\.dateMs\), true\)/, 'günlük etiketi üretilmiyor');
  const df = readFileSync(join(mobil, 'src/ui/DateField.tsx'), 'utf8');
  assert.match(df, /from '\.\.\/date-label'/, 'DateField kendi kopyasını taşıyor');
});

test('sağlık-yakını veri hesap silinince SERT siliniyor', () => {
  // Rutinler cilt/saç durumunu, günlük kişisel notları taşıyor.
  const acc = readFileSync(join(api, 'src/auth/account-data.service.ts'), 'utf8');
  for (const t of ['careRoutine', 'careMoment', 'careLog']) {
    assert.ok(
      acc.includes(`this.prisma.${t}.deleteMany({ where: { userId } })`),
      `${t} hesap silinince kalıyor`,
    );
  }
  // Vermeden silmek olmaz: dışa aktarımda da yer almalı.
  for (const alan of ['bakimRutinlerim', 'bakimAnlarim', 'bakimGunlugum']) {
    assert.ok(acc.includes(alan), `dışa aktarımda ${alan} yok`);
  }
});
