import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * #17 HESAP SİLME ve #7 PAYWALL.
 *
 * Tespit:
 *   - Silme akışı vardı ve iyiydi (çift onay, ne silinir/ne anonimleşir/ne
 *     yasal kalır ayrı ayrı yazılı) ama kullanıcının DURUMUNA bakmıyordu:
 *     aktif randevusu, ödenmiş kaporası ya da yanacak puanı olan biri
 *     bunları bilmeden silebiliyordu.
 *   - `TierUpsell` uzman ve salonun ANA EKRANINDA duruyordu: kayıt olan
 *     kişi ilk karede satın alma teklifiyle karşılaşıyordu.
 */

const kok = join(import.meta.dirname, '..');
/**
 * Kaynağı YORUMSUZ okur.
 *
 * Bu oturumda DÖRT kez yorumdaki bir kelimeyi kod sanıp yanlış alarm verdim
 * (`dueDays`, "kapatılamayan", `SELLER_PAST_CLIENTS`, `sellerServices`).
 * Gerekçe yazmak bir şeyi "kullanıyor" yapmaz; tarama artık varsayılan
 * olarak yorumsuz.
 */
function kodu(...yol: string[]): string {
  return readFileSync(join(kok, ...yol), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const gizlilik = kodu('app/profile/privacy.tsx');
const upsell = kodu('src/ui/TierUpsell.tsx');

test('#17 — silme uygulama İÇİNDEN tamamlanıyor', () => {
  assert.match(gizlilik, /api\.deleteMyAccount\(token\)/, 'silme ucu çağrılmıyor');
  // İki adım: yıkıcı düğme ayrı bir dokunuşta olmalı.
  const onay = [...gizlilik.matchAll(/Alert\.alert\(/g)].length;
  assert.ok(onay >= 3, `${onay} onay adımı — durum uyarısı + iki aşamalı onay bekleniyordu`);
  // Silince oturum kapanmalı.
  assert.match(gizlilik, /logout\(\);/, 'silme sonrası oturum kapanmıyor');
});

test('#17 — kaybedilecekler ÖZEL olarak uyarılıyor', () => {
  // Genel "geri alınamaz" metni yeterli değil: parası ya da randevusu olan
  // biri ne kaybettiğini bilmeli.
  assert.match(gizlilik, /const maddeler: string\[\] = \[\]/, 'durum listesi yok');
  for (const k of [
    'privacy.delete_open_booking',
    'privacy.delete_open_deposit',
    'privacy.delete_open_points',
  ]) {
    assert.ok(gizlilik.includes(k), `${k} uyarısı yok`);
  }
  // Kaybedecek bir şeyi YOKSA fazladan ekran çıkmamalı.
  assert.match(gizlilik, /if \(maddeler\.length === 0\) \{/, 'boş durumda da ekran gösteriliyor');
  // Yanmış kapora "kaybedilecek" sayılmaz.
  assert.match(gizlilik, /!b\.depositForfeited/, 'yanmış kapora da uyarıya giriyor');
});

test('#7 — paywall ilk oturumda gösterilmiyor', () => {
  assert.match(upsell, /const anlamliAksiyon = useStore/, 'ilk oturum kapısı yok');
  assert.match(upsell, /if \(!anlamliAksiyon\) return null;/, 'kapı kullanılmıyor');
  // Ölçüt TOHUMLANMIŞ veriye dayanmamalı: `sellerServices` demo verisiyle
  // dolu geliyor, yani kullanıcının bir şey yaptığını göstermez.
  assert.doesNotMatch(upsell, /sellerServices/, 'tohumlanmış veri ölçüt olarak kullanılıyor');
  assert.match(upsell, /st\.bookings\.length > 0/, 'gerçek etkileşim ölçütü yok');
});

test('#7 — paywall kapatılabilir kalıyor', () => {
  // Kart bir ekranı KAPLAMIYOR: satır içi, kullanıcı görmezden gelebilir.
  // Zorunlu tam ekran paywall olsaydı denetim onu da yasaklardı.
  assert.doesNotMatch(upsell, /<Modal/, 'upsell tam ekran modal olmuş');
});
