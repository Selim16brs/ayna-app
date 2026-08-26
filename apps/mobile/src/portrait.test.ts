import assert from 'node:assert/strict';
import { test } from 'node:test';
import { medyaAnahtari } from './media-cache';

/**
 * ANA EKRANDAKİ FOTOĞRAF, PROFİLDEKİYLE AYNI OLMALI.
 *
 * Kurucu iki kez bildirdi: "profil fotoğrafımı değiştirdim ama ana ekranda
 * değişmedi", sonra "hâlâ farklı, düzelmemiş".
 *
 * İlk düzeltmem eksikti: `setAvatar` bundan SONRAKİ değişimlerde eski kesik
 * portreyi siliyordu, ama hesapta ZATEN duran bayat portreyi temizlemiyordu —
 * yani mevcut bozuk durum düzelmiyordu. Asıl sorun daha derindi: portreyi
 * hangi fotoğraftan üretildiğine bağlayan hiçbir şey yoktu, bayatlığı ANLAMANIN
 * bir yolu da yoktu.
 *
 * Çözüm: portre üretilirken kaynak fotoğrafın anahtarı saklanır; anahtar
 * eşleşmezse portre kullanılmaz. Bu test o karar mantığını kilitler.
 */

// selectPortrait'in kararı — store'u kurmadan aynı mantık.
function portre(s: {
  cutoutUri: string | null;
  cutoutFor: string | null;
  avatarUri: string | null;
}): string | null {
  if (s.cutoutUri && s.cutoutFor && s.cutoutFor === medyaAnahtari(s.avatarUri)) return s.cutoutUri;
  return s.avatarUri ?? null;
}

const FOTO_A = 'data:image/jpeg;base64,' + 'A'.repeat(4000) + 'zzz';
const FOTO_B = 'data:image/jpeg;base64,' + 'B'.repeat(4000) + 'yyy';

test('anahtar aynı görselde KARARLI', () => {
  assert.equal(medyaAnahtari(FOTO_A), medyaAnahtari(FOTO_A));
});

test('farklı görsel farklı anahtar üretir', () => {
  assert.notEqual(medyaAnahtari(FOTO_A), medyaAnahtari(FOTO_B));
});

test('data: öneki anahtarı değiştirmez — ham base64 ile aynı görsel', () => {
  const ham = FOTO_A.slice(FOTO_A.indexOf(',') + 1);
  assert.equal(medyaAnahtari(FOTO_A), medyaAnahtari(ham));
});

test('boş girdi anahtarsız', () => {
  assert.equal(medyaAnahtari(null), null);
  assert.equal(medyaAnahtari(''), null);
  assert.equal(medyaAnahtari('data:image/jpeg;base64,'), null);
});

// ── Kararın kendisi ─────────────────────────────────────────────────────────

test('portre GEÇERLİYSE kullanılır', () => {
  assert.equal(
    portre({ cutoutUri: 'kesik', cutoutFor: medyaAnahtari(FOTO_A), avatarUri: FOTO_A }),
    'kesik',
  );
});

test('BAYAT portre kullanılmaz — kurucunun bildirdiği hata', () => {
  // Fotoğraf B ile değişti, portre hâlâ A'dan üretilmiş olan.
  assert.equal(
    portre({ cutoutUri: 'eski-yuz', cutoutFor: medyaAnahtari(FOTO_A), avatarUri: FOTO_B }),
    FOTO_B,
  );
});

test('ANAHTARSIZ eski kayıt bayat sayılır', () => {
  // Bilinmeyeni geçerli varsaymak hatanın kendisiydi: bağ kurulmadan önce
  // yazılmış portreler tam da böyle ekranda kalıyordu.
  assert.equal(portre({ cutoutUri: 'eski-yuz', cutoutFor: null, avatarUri: FOTO_A }), FOTO_A);
});

test('fotoğraf kaldırıldıysa portre de gösterilmez', () => {
  assert.equal(portre({ cutoutUri: 'eski-yuz', cutoutFor: null, avatarUri: null }), null);
});

test('portre yoksa fotoğraf gösterilir', () => {
  assert.equal(portre({ cutoutUri: null, cutoutFor: null, avatarUri: FOTO_A }), FOTO_A);
});
