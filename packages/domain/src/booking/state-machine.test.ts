import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ALLOWED_TRANSITIONS,
  BOOKING_STATUSES,
  IPTAL_ESIGI_SAAT,
  InvalidTransitionError,
  assertTransition,
  canTransition,
  esikGecti,
  holdsSlot,
  isBookingState,
  isTerminal,
} from './state-machine.js';

/**
 * Kaynak: AYNA_RANDEVU_AKISI_BRIEF.md §3–§4.
 * Bu testler brief'in KURALLARINI kilitler; isimleri değil.
 */

test('brief §3 — diyagramdaki ana hat baştan sona yürüyor', () => {
  const hat = [
    'taslak',
    'onay_bekliyor',
    'depozito_bekliyor',
    'kesinlesti',
    'hizmet_gunu',
    'odeme_bekliyor',
    'tamamlandi',
    'degerlendirme',
    'kapandi',
  ] as const;
  for (let i = 0; i < hat.length - 1; i++) {
    assert.ok(canTransition(hat[i]!, hat[i + 1]!), `${hat[i]} → ${hat[i + 1]} kapalı`);
  }
});

test('brief §4.4 — depozito ATLANAMAZ', () => {
  // Onaydan doğrudan kesinleşmeye geçilebilseydi randevu para alınmadan
  // garanti olurdu; depozito AYNA'nın tek tahsilatı (§4.4, §10).
  assert.equal(canTransition('onay_bekliyor', 'kesinlesti'), false);
  assert.equal(canTransition('onay_bekliyor', 'hizmet_gunu'), false);
  assert.equal(canTransition('onay_bekliyor', 'tamamlandi'), false);
});

test('brief §4.3 — karşı öneri turu YALNIZ BİR KEZ', () => {
  // Uzman karşı öneriye yalnız Kabul/Red verebilir. `karsi_oneri` durumundan
  // tekrar `degisiklik_onerildi`ye dönüş, sonsuz ping-pong demekti.
  assert.equal(canTransition('karsi_oneri', 'degisiklik_onerildi'), false, 'ping-pong açık');
  assert.ok(canTransition('karsi_oneri', 'depozito_bekliyor'), 'uzman kabul edemiyor');
  assert.ok(canTransition('karsi_oneri', 'iptal_uzman'), 'uzman reddedemiyor');
});

test('brief §4.9 — ödeme el sıkışması atlanamaz', () => {
  // Müşteri "ödedim" demeden uzman "aldım" diyemez; hizmet günü doğrudan
  // tamamlanamaz.
  assert.equal(canTransition('hizmet_gunu', 'tamamlandi'), false);
  assert.ok(canTransition('hizmet_gunu', 'odeme_bekliyor'));
  assert.ok(canTransition('odeme_bekliyor', 'tamamlandi'));
});

test('brief §4.9 — uyuşmazlıkta değerlendirme YİNE açılır', () => {
  // "puan yüklenmez, değerlendirme yine açılır" — kapatmak kuralı çiğnerdi.
  assert.ok(canTransition('odeme_bekliyor', 'uyusmazlik'));
  assert.ok(canTransition('uyusmazlik', 'degerlendirme'));
});

test('brief §4.8 — "gelmedi" beyanına itiraz yolu açık', () => {
  assert.ok(canTransition('no_show_musteri', 'uyusmazlik'));
  assert.ok(canTransition('no_show_uzman', 'uyusmazlik'));
});

test('brief §4.6 — erteleme reddedilirse ESKİ randevu geçerli kalır', () => {
  assert.ok(canTransition('kesinlesti', 'erteleme_onerildi'));
  assert.ok(canTransition('erteleme_onerildi', 'kesinlesti'), 'red sonrası geri dönüş yok');
});

test('brief §4.2 — slot talep gönderildiği AN kilitlenir, taslakta değil', () => {
  assert.equal(holdsSlot('taslak'), false, 'gönderilmemiş talep slot tutuyor');
  assert.ok(holdsSlot('onay_bekliyor'), 'talep slotu kilitlemiyor');
  assert.ok(holdsSlot('depozito_bekliyor'));
  assert.ok(holdsSlot('kesinlesti'));
});

test('kapanan hiçbir durum slot tutmaz', () => {
  // Aksi hâlde düşen/iptal olan randevu uzmanın takvimini süresiz işgal ederdi.
  for (const s of BOOKING_STATUSES) {
    if (isTerminal(s)) assert.equal(holdsSlot(s), false, `${s} kapalı ama slot tutuyor`);
  }
});

test('gerçekten kapalı olan durumlar', () => {
  // Brief §3 `no_show_*` ve `uyusmazlik`i terminal sayıyor, ama §4.8 no-show
  // beyanına 24 saat İTİRAZ hakkı veriyor ve §4.9 uyuşmazlıkta değerlendirmenin
  // yine açılmasını istiyor. Yani ikisi de bir yere GİDEBİLİYOR; diyagramdaki
  // "terminal" nitelemesi "kullanıcı için son" anlamında, "çıkışı yok"
  // anlamında değil. Kapalı olanlar yalnız şunlar:
  const terminal = BOOKING_STATUSES.filter(isTerminal).sort();
  assert.deepEqual(terminal, ['iptal_musteri', 'iptal_uzman', 'kapandi', 'otomatik_dustu']);
  // İtiraz ve değerlendirme yolları AÇIK kalmalı.
  assert.equal(isTerminal('no_show_musteri'), false, 'itiraz hakkı kapatılmış');
  assert.equal(isTerminal('uyusmazlik'), false, 'uyuşmazlıkta değerlendirme kapatılmış');
});

test('her durumdan bir kapanışa ulaşılabiliyor — kilitlenen kayıt yok', () => {
  for (const bas of BOOKING_STATUSES) {
    const gorulen = new Set<string>([bas]);
    const kuyruk = [bas as string];
    let kapanis = false;
    while (kuyruk.length) {
      const s = kuyruk.shift()!;
      if (isTerminal(s as never)) {
        kapanis = true;
        break;
      }
      for (const h of ALLOWED_TRANSITIONS[s as never]) {
        if (!gorulen.has(h)) {
          gorulen.add(h);
          kuyruk.push(h);
        }
      }
    }
    assert.ok(kapanis, `${bas} durumundan kapanışa yol yok — kayıt kilitlenir`);
  }
});

test('geçersiz geçiş hata fırlatır', () => {
  assert.throws(() => assertTransition('kapandi', 'taslak'), InvalidTransitionError);
});

test('isBookingState yalnız bilinen durumları kabul eder', () => {
  assert.ok(isBookingState('depozito_bekliyor'));
  // Eski makinenin adları artık geçersiz — çakışma bırakılmadı.
  assert.equal(isBookingState('confirmed'), false);
  assert.equal(isBookingState('deposit_pending'), false);
  assert.equal(isBookingState('completed_pending'), false);
});

test('brief §4.7 — 3 saat eşiği tek yerden okunuyor', () => {
  assert.equal(IPTAL_ESIGI_SAAT, 3);
  const simdi = Date.parse('2026-08-31T12:00:00Z');
  assert.equal(esikGecti(simdi + 4 * 3600_000, simdi), false, '4 saat varken eşik geçmiş sayıldı');
  assert.equal(esikGecti(simdi + 2 * 3600_000, simdi), true, '2 saat kala eşik geçmedi sayıldı');
  // Tam sınır: 3 saat "az kala" değildir.
  assert.equal(esikGecti(simdi + 3 * 3600_000, simdi), false);
});
