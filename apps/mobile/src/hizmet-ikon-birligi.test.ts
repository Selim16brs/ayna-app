/**
 * HİZMET İKONLARI — TEK TARZ BEKÇİSİ.
 *
 * Kurucu: "services ikonlarda farklılıklar var uygulama içerisinde. bütün
 * hepsi ana sayfadaki tarzda olmalı."
 *
 * Sorun eşlemede değil ÇİZİMDEYDİ. `HIZMET_IKON` tek kopyaydı ama altı ekran
 * onu ayrı ayrı çiziyor ve her biri kendi ölçüsünü koyuyordu:
 *
 *   discover        64 kutu · ikon 64 (kutuyu doldurur)  ← referans
 *   demand/new      64 kutu · ikon 30 (ortada yüzüyor, seçilince pembe zemin)
 *   quote/new       ikon 18
 *   seller/offline  ikon 18
 *   circle/new      ikon 16
 *   search          ikon 16
 *
 * Aynı görsel dört farklı boyutta çiziliyordu. Bu dosya tek çizim yerinin
 * (`ui/HizmetIkonu`) etrafından dolaşılmasını engelliyor.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const kok = join(import.meta.dirname, '..');
const bilesen = readFileSync(join(kok, 'src/ui/HizmetIkonu.tsx'), 'utf8');

/** `app/` altındaki tüm ekranlar. */
function ekranlar(dizin = join(kok, 'app')): string[] {
  return readdirSync(dizin, { withFileTypes: true }).flatMap((g) => {
    const yol = join(dizin, g.name);
    if (g.isDirectory()) return ekranlar(yol);
    return g.name.endsWith('.tsx') ? [yol] : [];
  });
}

/**
 * Yorumsuz kaynak. "Şu kalıp artık kullanılmıyor" testleri ham metne
 * bakarsa, kaldırma GEREKÇESİNİ anlatan yorumlara takılır.
 */
const yorumsuz = (k: string) =>
  k
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => {
      const t = l.trim();
      return !t.startsWith('//') && !t.startsWith('*');
    })
    .join('\n');

test('hiçbir ekran hizmet ikonunu KENDİ çizmiyor', () => {
  const suclular: string[] = [];
  for (const yol of ekranlar()) {
    const kod = yorumsuz(readFileSync(yol, 'utf8'));
    // `HIZMET_IKON[...]` ile doğrudan <Image> çizmek = kendi ölçüsünü koymak.
    if (/HIZMET_IKON\[[^\]]+\][\s\S]{0,120}<Image/.test(kod)) {
      suclular.push(yol.split('/app/')[1]!);
    }
  }
  assert.deepEqual(
    suclular,
    [],
    `hizmet ikonunu doğrudan çizen ekran: ${suclular.join(', ')} — ` +
      '`<HizmetIkonu>` kullanılmalı, yoksa ölçüler yeniden ayrışır',
  );
});

test('kategori ikonu çizen her ekran ortak bileşeni kullanıyor', () => {
  const beklenen = [
    '(tabs)/discover.tsx',
    'demand/new.tsx',
    'quote/new.tsx',
    'circle/new.tsx',
    'seller/offline.tsx',
    'search.tsx',
  ];
  for (const ad of beklenen) {
    const kod = readFileSync(join(kok, 'app', ad), 'utf8');
    assert.match(kod, /<HizmetIkonu\b/, `${ad}: ortak ikon bileşenini kullanmıyor`);
  }
});

test('ölçüler TEK yerde — ekranlar kendi sayısını koyamıyor', () => {
  // İzin verilen iki bağlam ve tek tanım.
  assert.match(bilesen, /const OLCU = \{/, 'ölçü tablosu yok');
  assert.match(bilesen, /kutu: \{ kap: 64, ikon: \d+ \}/, 'kutu ölçüsü ana sayfadakinden farklı');
  assert.match(bilesen, /satir: \{ kap: 0, ikon: \d+ \}/, 'satır ölçüsü tanımlı değil');
  // Ölçü SERBEST yazılamaz: vektörün boyu da tablodan gelmeli, yoksa
  // ekranlar yine kendi sayılarını koyar ve set ayrışır.
  assert.match(bilesen, /size=\{OLCU\[tarz\]\.ikon\}/, 'vektör ölçüyü tablodan almıyor');
  assert.doesNotMatch(bilesen, /size=\{tarz === /, 'ölçü bileşen içinde elle seçiliyor');
});

test('kutu, ana sayfadaki kap ile birebir aynı', () => {
  /*
   * Referans `discover.tsx` içindeki `ikonKart`: 64×64, radius.md, taşma
   * gizli, yüzey zemin, 1px accentSoft çerçeve. Bileşen bunu taşıyor.
   */
  for (const kural of [
    'width: OLCU.kutu',
    'height: OLCU.kutu',
    'borderRadius: radius.md',
    "overflow: 'hidden'",
    'borderColor: colors.accentSoft',
  ]) {
    assert.ok(bilesen.includes(kural), `kutu kabında eksik: ${kural}`);
  }
  /*
   * ZEMİN `surface`TAN `accentSoft`A GEÇTİ.
   *
   * Kurucu: "renk değiştiğinde hizmetler ikonlarının altındaki renk sabit
   * kalıyor." Zemin aslında GÖRSELİN İÇİNDEYDİ (PNG'ler alfa kanalsızdı) ve
   * kutunun rengi hiç görünmüyordu. Görseller şeffaflaştırılınca zemin
   * ortaya çıktı; aksanın açık tonuna bağlandı ki seçilen renk setiyle
   * birlikte değişsin.
   */
  assert.match(bilesen, /backgroundColor: colors\.accentSoft/, 'kutu zemini aksana bağlı değil');
});

test('seçili durum ikonun GÖRÜNÜŞÜNÜ değiştirmiyor', () => {
  /*
   * `demand/new` seçilince kutuyu aksanla dolduruyordu: Figma çizimi pembe
   * zeminde okunmuyor ve ana sayfadaki hâlinden bambaşka görünüyordu.
   * Seçim yalnız çerçeveden belli olmalı — zemin sabit.
   */
  const i = bilesen.indexOf('kutuSecili:');
  assert.ok(i > 0, 'seçili durum tanımı yok');
  const kural = bilesen.slice(i, bilesen.indexOf('}', i));
  assert.ok(
    !kural.includes('backgroundColor'),
    'seçili kutu zemini değiştiriyor — ikon aksan üstünde kalır',
  );
  assert.ok(kural.includes('borderColor'), 'seçim çerçeveden belli olmuyor');
});

test('HER kategori vektör çiziliyor — karışık set yok', () => {
  /*
   * Kurucu: "senin yaptığın 6 icon tarzı güzeldi. daha öncekileri de ona
   * benzer yap."
   *
   * 13 kategorinin 7'si elle çizilmiş PNG, 6'sı vektördü — iki ayrı tarz
   * yan yana duruyordu. Artık hepsi tek vektör ailesinden.
   */
  assert.match(bilesen, /<Ionicons/, 'vektör çizilmiyor');
  assert.doesNotMatch(bilesen, /HIZMET_IKON/, 'PNG eşlemesi geri gelmiş — set yine karışır');
  assert.doesNotMatch(bilesen, /<Image\b/, 'PNG çizimi geri gelmiş');
});

test('ikon RENGİ ve ZEMİNİ aksanı takip ediyor', () => {
  /*
   * Kurucu: "renk değiştiğinde hizmetler ikonlarının altındaki renk sabit
   * kalıyor."
   *
   * Zemin düzelmişti ama ÇİZGİ RENGİ hâlâ sabitti: PNG'nin içine pişmiş
   * koyu erguvandı. Vektöre geçince ikisi de aksandan besleniyor —
   * sabit bir renk kodu geri konursa bu test düşer.
   */
  assert.match(bilesen, /color=\{colors\.accent\}/, 'ikon rengi aksandan gelmiyor');
  assert.match(bilesen, /backgroundColor: colors\.accentSoft/, 'zemin aksandan gelmiyor');
  assert.doesNotMatch(bilesen, /color(?:=\{)?['"]#/, 'sabit renk kodu var');
});

test('satır bağlamı ikinci bir kutu eklemiyor', () => {
  // Hap zaten bir kap; içine kutu koymak ekranı kalabalıklaştırır.
  assert.match(bilesen, /if \(tarz === 'satir'\) return gorsel;/, 'satır bağlamı kutuya sarılıyor');
});

test('KATEGORİ İKON ADLARI gerçek — boş kutu çıkmıyor', async () => {
  /*
   * Ionicons adı YANLIŞ yazılırsa hiçbir şey hata vermez: ekranda BOŞ bir
   * kutu çıkar. Tip denetimi de yakalamaz — ad `@ayna/domain`de `string`.
   *
   * Bu test glif haritasını OKUYOR: ad fontta yoksa düşer.
   */
  const { CATEGORY_IDS, CATEGORY_META } = await import('@ayna/domain');
  const harita = JSON.parse(
    readFileSync(
      join(
        kok,
        '..',
        '..',
        'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json',
      ),
      'utf8',
    ),
  ) as Record<string, number>;
  const bulunmayan = CATEGORY_IDS.filter((id) => !(CATEGORY_META[id]!.icon in harita)).map(
    (id) => `${id} → ${CATEGORY_META[id]!.icon}`,
  );
  assert.deepEqual(bulunmayan, [], `Ionicons'ta olmayan ikon: ${bulunmayan.join(', ')}`);
});

test('İKON ADI TEK YERDE — panel ve uygulama ayrışamıyor', async () => {
  /*
   * Uygulamanın kendi eşlemesi vardı. İki liste, aynı kategoriye panelde
   * bir ikon telefonda başka bir ikon verebilirdi.
   */
  const taksonomi = readFileSync(join(kok, 'src/taxonomy.ts'), 'utf8');
  assert.match(taksonomi, /CATEGORY_META\[id\]\?\.icon/, 'uygulama ikonu katalogdan okumuyor');
  assert.doesNotMatch(
    taksonomi,
    /const IKON: Record<string, IoniconName>/,
    'uygulamada ikinci ikon eşlemesi geri gelmiş',
  );
  const { CATEGORY_IDS, CATEGORY_META } = await import('@ayna/domain');
  const { TAXONOMY } = await import('./taxonomy');
  for (const id of CATEGORY_IDS) {
    assert.equal(
      TAXONOMY.find((c) => c.id === id)?.icon,
      CATEGORY_META[id]!.icon,
      `${id} ikonu panelle aynı değil`,
    );
  }
});
