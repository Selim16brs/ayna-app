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
  assert.match(bilesen, /kutu: 64,/, 'kutu ölçüsü ana sayfadakinden farklı');
  assert.match(bilesen, /satir: 20,/, 'satır ölçüsü tanımlı değil');
  // Bileşenin dışında serbest ölçü verilmemeli.
  assert.match(bilesen, /width: olcu, height: olcu/, 'görsel ölçüyü tablodan almıyor');
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

test('eşlemede olmayan kategori sessizce kaybolmuyor', () => {
  // Ana sayfa da böyle yapıyordu: PNG yoksa vektör yedeği çiziliyor.
  assert.match(bilesen, /<Ionicons/, 'yedek ikon yok — kategori boş görünür');
});

test('satır bağlamı ikinci bir kutu eklemiyor', () => {
  // Hap zaten bir kap; içine kutu koymak ekranı kalabalıklaştırır.
  assert.match(bilesen, /if \(tarz === 'satir'\) return gorsel;/, 'satır bağlamı kutuya sarılıyor');
});

test('ikon görselleri ŞEFFAF — zemin görselin içinde değil', async () => {
  /*
   * Kurucu: "renk değiştiğinde hizmetler ikonlarının altındaki renk sabit
   * kalıyor."
   *
   * Sebep kodda değil ASSET'teydi: PNG'ler RGB (alfa kanalı YOK) ve lila
   * zemin görselin içine pişmişti. Kutuya hangi rengi verirsek verelim
   * üstüne opak bir kare biniyordu.
   *
   * Yeniden dışa aktarılan bir ikon alfasız gelirse aynı hata sessizce
   * geri döner — bu test onu yakalar.
   */
  const { readdirSync, readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const dizin = join(import.meta.dirname, '..', 'assets', 'hizmet-ikon');
  const alfasiz: string[] = [];
  for (const ad of readdirSync(dizin).filter((f) => f.endsWith('.png'))) {
    const buf = readFileSync(join(dizin, ad));
    // PNG IHDR: 8 bayt imza + 4 uzunluk + 4 tip, sonra genişlik/yükseklik/derinlik.
    // 25. bayt renk tipi: 6 = RGBA, 4 = gri+alfa. Alfasız tipler: 0, 2, 3.
    const renkTipi = buf[25];
    if (renkTipi !== 6 && renkTipi !== 4) alfasiz.push(`${ad} (tip ${renkTipi})`);
  }
  assert.deepEqual(alfasiz, [], `alfa kanalı olmayan ikon: ${alfasiz.join(', ')}`);
});
