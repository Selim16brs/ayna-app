import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { birincilAksiyon, ikincilAksiyonlar } from './booking-flow';

/**
 * 01.09.2026 — kurucunun TELEFONDAN, çalışan uygulamada bulduğu hatalar.
 * Üçü de yalnız gerçek kullanımda görünüyordu.
 */

const oku = (...p: string[]) => readFileSync(join(import.meta.dirname, ...p), 'utf8');

test('§4.6 — erteleme önerisi KİLİTLENMİYOR', () => {
  // Kurucu: "uzman erteleme öneriyor, müşteri 'Erteleme önerildi' görüyor ama
  // kabul/red yok." Sebep: öneren bilinmiyorsa (alan gelmediyse) HİÇBİR
  // tarafta düğme çıkmıyordu. Bilinmezlikte açmak güvenli — sunucu önerenin
  // kendi önerisini yanıtlamasını OWN_PROPOSAL ile reddediyor.
  for (const rol of ['musteri', 'uzman'] as const) {
    assert.ok(
      birincilAksiyon('erteleme_onerildi', rol, {}),
      `${rol}: öneren bilinmiyorken düğme yok — randevu kilitli`,
    );
  }
  // Öneren biliniyorsa yalnız KARŞI taraf yanıtlar.
  assert.equal(birincilAksiyon('erteleme_onerildi', 'uzman', { ertelemeyiOneren: 'uzman' }), null);
  assert.ok(birincilAksiyon('erteleme_onerildi', 'musteri', { ertelemeyiOneren: 'uzman' }));
});

test('§4.6 — öneriyi yanıtlayan REDDEDEBİLİYOR', () => {
  // Yalnız "Kabul et" göstermek, kabul etmekten başka yol bırakmamaktı.
  const ik = ikincilAksiyonlar('erteleme_onerildi', 'musteri', { ertelemeyiOneren: 'uzman' });
  assert.ok(
    ik.some((a) => a.eylem === 'erteleme_red'),
    'red yolu yok',
  );
});

test('sunucunun HATA MESAJI kullanıcıya ulaşıyor', () => {
  // Ekranda "POST /bookings/... → 400" yazıyordu: istemci sunucunun kodunu
  // okuyup İNSAN OKUR mesajını atıyordu. Kullanıcı ne yapacağını bilemiyordu.
  const api = oku('api.ts');
  assert.match(api, /message\?: string/, 'hata gövdesinde mesaj tipi yok');
  assert.match(api, /mesaj \|\| `POST \$\{path\}/, 'POST hatasında mesaj kullanılmıyor');
  assert.match(api, /mesaj \|\| `\$\{yontem\} \$\{path\}/, 'diğer hatalarda mesaj kullanılmıyor');
});

test('ESKİ üyeye "üyeliğin yükseltildi" bildirimi GİTMİYOR', () => {
  // Koşul `!wasPremium && premium` idi: yerelin BİLMEMESİNİ "az önce
  // yükseltildi" sanıyordu. Taze kurulumda ve çıkış-girişte eski üyeye
  // kutlama gidiyordu.
  const store = oku('store.ts');
  assert.match(
    store,
    /if \(oncekiBiliniyor && !wasPremium/,
    'önceki katman bilinmeden kutlama atılıyor',
  );
  assert.match(store, /uyelikOgrenildi: s\.uyelikOgrenildi/, 'bayrak kalıcı değil');
});

test('durum rozeti içinde nabız yok — yazı sıkışmıyor', () => {
  // Nabız rozetin içine konmuştu; metni `flex: 1` ile çizdiği için dar
  // rozette metin sıfır genişliğe düşüyor, geriye hap içinde bir daire
  // kalıyordu.
  const liste = oku('..', 'app', '(tabs)', 'bookings.tsx');
  // Yorumda geçmesi serbest; RENDER edilmemeli.
  assert.ok(!/<BeklemeNabzi/.test(liste), 'rozetin içinde hâlâ nabız çiziliyor');
  assert.match(liste, /bekleyenNokta/, 'bekleme işareti hiç yok');
});
