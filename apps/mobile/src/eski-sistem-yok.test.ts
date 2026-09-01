import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tr } from '@ayna/i18n';

/**
 * "ESKİYE AİT RANDEVU SİSTEMİ İLE İLGİLİ HİÇBİR ŞEY KALMASIN."
 *
 * Kurucunun tekrar tekrar söylediği kural. Akışları sildim ama ONLARI ANAN
 * EKRANLARI taramadım: komisyon ödeme ekranı uzman menüsünde duruyordu ve
 * silinmiş uçları çağırıyordu; ana sayfa "uzman iade dekontunu yükledi"
 * diyordu; 47 ölü metin çevirilerde yaşıyordu. Tek tek hata avlamak yerine
 * kural artık burada bekçileniyor.
 */

const KOK = join(import.meta.dirname, '..');
const oku = (...p: string[]) => readFileSync(join(KOK, ...p), 'utf8');
const TR: Record<string, string> = tr;

/** MD'nin kaldırdığı akışlara ait ekranlar — hiçbiri geri gelmemeli. */
const YASAK_EKRANLAR = [
  ['app', 'seller', 'commissions.tsx'], // §4.4 ikinci tahsilat yok
  ['app', 'payment'], // uygulama içi ödeme yok (§4.4 havale + dekont)
];

test('MD’nin kaldırdığı ekranlar geri gelmemiş', () => {
  for (const yol of YASAK_EKRANLAR) {
    assert.ok(!existsSync(join(KOK, ...yol)), `${yol.join('/')} geri gelmiş`);
  }
});

test('hiçbir ekran SİLİNMİŞ sunucu ucunu çağırmıyor', () => {
  // Çağrı derlenir ama çalışma anında 404 döner: kullanıcı düğmeye basar,
  // hiçbir şey olmaz. Sessiz kırıklığın en can sıkıcı türü.
  const olu = [
    'myCommissions',
    'uploadCommissionReceipt',
    'confirmDepositReceipt',
    'confirmCompletionApi',
    'freeCancelBooking',
    'uploadRefundReceiptApi',
    'confirmRefundApi',
    'reassignBooking',
    'acceptReassignApi',
    'rejectReassignApi',
    'createPayment',
    'confirmPayment',
    'paymentFor',
  ];
  const api = oku('src', 'api.ts');
  for (const ad of olu) {
    assert.ok(!new RegExp(`\\n  ${ad}:`).test(api), `api.ts hâlâ '${ad}' tanımlıyor`);
  }
});

test('uzman menüsünde ölü bağlantı yok', () => {
  const menu = oku('app', 'seller', 'menu.tsx');
  const rotalar = [...menu.matchAll(/route: '(\/[\w/-]+)'/g)].map((m) => m[1]!);
  for (const r of rotalar) {
    const dosya = join(KOK, 'app', `${r.replace(/^\//, '')}.tsx`);
    assert.ok(existsSync(dosya), `menüdeki '${r}' ekranı yok — dokununca boşluğa düşer`);
  }
});

test('çevirilerde ölü akıştan kalan metin yok', () => {
  for (const onek of ['commission.', 'payment.pay_kaspi', 'booking.refund.']) {
    const kalan = Object.keys(TR).filter((k) => k.startsWith(onek));
    assert.deepEqual(kalan, [], `ölü metinler duruyor: ${kalan.join(', ')}`);
  }
});

test('randevu ekranlarında ESKİ durum adı geçmiyor', () => {
  const eski = [
    'deposit_pending',
    'completed_pending',
    'balance_pending',
    'awaiting_provider',
    'alternative_proposed',
    'reassigned_pending',
    'refund_submitted',
    'deposit_submitted',
  ];
  const klasor = join(KOK, 'app', 'booking');
  for (const dosya of readdirSync(klasor)) {
    if (!dosya.endsWith('.tsx')) continue;
    const src = readFileSync(join(klasor, dosya), 'utf8');
    for (const ad of eski) {
      assert.ok(!src.includes(ad), `${dosya} içinde eski durum adı '${ad}'`);
    }
  }
});
