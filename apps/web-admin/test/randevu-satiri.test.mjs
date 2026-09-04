import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * RANDEVULAR & ÖDEMELER — 4 Eylül 2026, kurucunun panelde gördükleri.
 *
 * "admin panelindeki randevular ve ödemeler sayfası bozuk. yazılar iç içe
 * geçmiş" ve "müşteri dekont gönderdi ama admin panelinde sadece iptal var".
 */

const kok = join(import.meta.dirname, '..');
const ui = readFileSync(join(kok, 'app/page.tsx'), 'utf8');
const css = readFileSync(join(kok, 'app/globals.css'), 'utf8');
const api = readFileSync(join(kok, 'app/lib/api.ts'), 'utf8');

test("DÜĞME SINIF ADLARI CSS'te GERÇEKTEN VAR", () => {
  /*
   * `className="btn small danger"` yazılmıştı ama CSS'te `.small`/`.danger`
   * diye bir kural YOK (`btn-sm`, `btn-danger` var). Düğme yalnız `.btn`
   * alıyordu ve `.btn` bir FORM düğmesi: `width: 100%`. Satırdaki tüm yeri
   * kaplayıp ad/hizmet sütununu bir harflik şeride eziyordu — "yazılar iç
   * içe geçmiş" tam olarak buydu.
   *
   * Bu test satırdaki her sınıf adını CSS'te arıyor: uydurma bir sınıf
   * sessizce hiçbir şey yapmaz, ekranı bozar.
   */
  const eksik = [];
  for (const m of ui.matchAll(/className="([^"{}]+)"/g)) {
    for (const sinif of m[1].split(/\s+/).filter(Boolean)) {
      // Yardımcı/etiket sınıfları CSS'te tanımlı; değilse burada görünür.
      if (!new RegExp(`\\.${sinif.replace(/[-]/g, '\\-')}\\b`).test(css)) eksik.push(sinif);
    }
  }
  assert.deepEqual([...new Set(eksik)], [], 'CSS karşılığı olmayan sınıf(lar)');
});

test('.btn TAM GENİŞLİK — satır içinde kullanılmamalı', () => {
  // Kuralın kendisi doğru (form düğmesi); yanlış olan onu satırda kullanmaktı.
  assert.match(css, /\.btn \{[^}]*width: 100%/, '.btn artık tam genişlik değil — test eskimiş');
  assert.doesNotMatch(ui, /className="btn "/, 'satırda çıplak .btn kullanılıyor');
});

test('DEKONT panelde GÖRÜNÜYOR ve GERİ ALINABİLİYOR', () => {
  /*
   * §4.4: dekont yüklendiği an randevu kesinleşiyor, yönetici doğrulaması
   * SONRA geliyor. Panel dekontu hiç göstermiyordu: yönetici neyi
   * doğrulayacağını göremiyor, elinde yalnız "İptal" kalıyordu — ve iptal,
   * müşteriyi cezalandıran bambaşka bir sonuç.
   *
   * Zincirin üç halkası da olmalı: sunucu ucu → istemci → ekran.
   */
  const svc = readFileSync(join(kok, '../api/src/admin/admin.service.ts'), 'utf8');
  const ctrl = readFileSync(join(kok, '../api/src/admin/admin.controller.ts'), 'utf8');
  assert.match(svc, /async rejectDepositReceipt\(/, 'sunucuda geri alma yok');
  assert.match(ctrl, /@Post\('bookings\/:id\/reject-receipt'\)/, 'uç yok');
  assert.match(api, /rejectReceipt: \(id: string\)/, 'istemci fonksiyonu yok');
  assert.match(ui, /api\.rejectReceipt\(b\.id\)/, 'panelde düğme yok');
  /*
   * Koşulun KENDİSİ aranıyor: `{false ? (...)}` yazıp dekontu gizlemek
   * mümkün olmasın diye sabit koşul da elenmeli.
   */
  assert.match(
    ui,
    /\{b\.depositReceiptUri \? \(\s*<a href=\{b\.depositReceiptUri\}/,
    'dekont gösterilmiyor',
  );
  // Liste ucu dekontu döndürmezse ekran onu hiç göremez.
  assert.match(svc, /depositReceiptUri: b\.depositReceiptUri \?\? null/, 'liste dekontu dönmüyor');
});

test('GERİ ALMA randevuyu ÖLDÜRMÜYOR', () => {
  /*
   * Depozito beklemeye dönüyor: müşteri doğru dekontu yükleyebilsin.
   * İptal etseydi, parayı gerçekten göndermiş ama dekontu bulanık çıkmış
   * bir müşteri randevusunu kaybederdi.
   */
  const svc = readFileSync(join(kok, '../api/src/admin/admin.service.ts'), 'utf8');
  const i = svc.indexOf('async rejectDepositReceipt(');
  const govde = svc.slice(i, svc.indexOf('\n  }', i));
  assert.match(govde, /status: 'depozito_bekliyor'/, 'randevu iptal ediliyor');
  assert.match(govde, /receiptHash: null/, 'hash kalıyor — yeni dekont reddedilir');
  assert.match(govde, /admin\.booking\.receipt_rejected/, 'denetim kaydı yok');
});
