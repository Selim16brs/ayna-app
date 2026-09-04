import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * "AYNA ONAYLI" KURALI TEK YERDE OLMALI.
 *
 * Kural üç serviste ayrı ayrı yazılıydı ve ikisi ayrışmıştı:
 *
 *   katalog (müşterinin gördüğü) : kimlik && (sertifika || sosyal || kayıtlı ИП)
 *   uzmanın kendi ekranı         : kimlik && (sertifika || sosyal)
 *   admin paneli                 : kimlik && (sertifika || sosyal)
 *
 * KYC'si onaylı, kayıtlı ИП ama sertifikasız uzman: müşteri profilinde
 * rozeti görüyordu, uzman kendi ekranında "Henüz AYNA Onaylı değilsin"
 * okuyordu, admin de doğrulanmamış sanıyordu. Üç ekran üç farklı gerçek.
 */

const api = join(import.meta.dirname, '..', '..', 'api', 'src');
const oku = (...yol: string[]) => readFileSync(join(api, ...yol), 'utf8');

const SERVISLER = [
  ['katalog', ['catalog', 'catalog.service.ts']],
  ['uzman doğrulama', ['specialists', 'specialists.service.ts']],
  ['admin', ['admin', 'admin.service.ts']],
] as const;

for (const [ad, yol] of SERVISLER) {
  test(`${ad}: rozeti kendi kuralıyla hesaplamıyor`, () => {
    const src = oku(...yol);
    assert.ok(src.includes('aynaOnayli('), `${ad} ortak kuralı çağırmıyor`);
    // Elle yazılmış "identity && (cert || social)" kalıbı kalmamalı.
    assert.doesNotMatch(
      src,
      /aynaVerified: *identity && \(/,
      `${ad} hâlâ kuralı elle yazıyor — ayrışabilir`,
    );
  });
}

test('kayıt kontrolü rozette tek yerden geliyor', () => {
  // İlk yazdığımda dosyada /^\d{12}$/ desenini TAMAMEN yasaklamıştım ve test
  // düştü — ama kodun hatası değildi: desen `hasIin` gösterim bayrağında ve
  // form doğrulamasında da geçiyor. Onlar ayrı bir iş; rozetle ilgileri yok.
  // Denetlenmesi gereken tek şey, ROZETİN ortak kontrolü kullanması.
  for (const [ad, yol] of SERVISLER) {
    const src = oku(...yol);
    assert.ok(src.includes('uzmanKayitli('), `${ad} ortak kayıt kontrolünü kullanmıyor`);
  }
});

test('liste ucu da rozeti ve paketi gönderiyor', () => {
  const src = oku('catalog', 'catalog.service.ts');
  // Müşteri aramada/keşifte kimin doğrulandığını görebilmeli; yoksa her
  // profili tek tek açmak zorunda.
  assert.match(src, /aynaVerified: \(\(\) => \{/, 'liste DTO rozeti göndermiyor');
  assert.match(src, /membershipTier: owner \? \(tierById/, 'liste DTO paketi göndermiyor');
  // Liste ve detay AYNI eşlemeyi kullanmalı — ayrışırsa aynı uzman listede
  // onaylı, profilinde onaysız görünür.
  const kez = [...src.matchAll(/guvenKatmanlari\(\{/g)].length;
  assert.equal(kez, 2, `guvenKatmanlari ${kez} yerde çağrılıyor, 2 bekleniyordu (liste + detay)`);
});

test('liste rozeti için YENİ sorgu açılmadı', () => {
  // Rozet uğruna N+1 açmak, listeyi her açılışta yavaşlatırdı.
  const src = oku('catalog', 'catalog.service.ts');
  const govde = /async professionals\(\)[\s\S]*?\n {2}\}/.exec(src);
  assert.ok(govde, 'professionals() bulunamadı');
  /*
   * ── SAYI DEĞİL, ŞEKİL ──────────────────────────────────────────────
   *
   * Burada sorgu SAYISI (≤5) sınanıyordu. Ama sayı N+1'in ölçüsü değil:
   * onay kapısı iki TOPLU sorgu daha ekleyince test kırıldı, oysa
   * eklenenlerin ikisi de satır başına değil tek seferlik. Tersi de
   * mümkündü — beş sorgunun biri döngü içinde olsaydı test geçerdi.
   *
   * Asıl kural: sorgu SATIR BAŞINA açılmasın. Onu sınıyoruz — döngü ya
   * da `map` gövdesinin içinde `this.prisma` çağrısı olmayacak.
   */
  const donguIci = /\.map\(\s*async[^)]*\)?\s*=>[\s\S]{0,400}?this\.prisma\./.exec(govde[0]);
  assert.equal(donguIci, null, 'satır başına sorgu (N+1) açılmış');
  assert.equal(
    /for \([^)]*\) \{[\s\S]{0,300}?await this\.prisma\./.exec(govde[0]),
    null,
    'döngü içinde sorgu (N+1) açılmış',
  );
  // Yine de bir üst sınır: toplu bile olsa her istekte onlarca sorgu
  // listeyi yavaşlatır.
  const sorgu = [...govde[0].matchAll(/this\.prisma\.\w+\.findMany/g)].length;
  assert.ok(sorgu <= 8, `${sorgu} toplu sorgu — liste sorgusu şişiyor`);
  // Ceza sorgusu GERÇEKTEN orada mı: silinirse cezalı uzman listede görünür.
  assert.match(govde[0], /hiddenUntil: \{ gt: new Date\(\) \}/, 'görünmezlik filtresi yok');
  // Onay kapısı da BURADA: onaysız uzman/salon listede görünmemeli.
  assert.match(govde[0], /status: \{ not: 'approved' \}/, 'onaysız sağlayıcı filtresi yok');
});

test('güven işareti ortak satırda çiziliyor', () => {
  // ProRow arama, favoriler, kategori ve yakındakiler ekranlarının ortak
  // satırı — tek yerde çözülüyor.
  const row = readFileSync(join(import.meta.dirname, '..', 'app', 'search.tsx'), 'utf8');
  assert.match(row, /pro\.aynaVerified \? \(/, 'güven işareti satırda yok');
  assert.match(
    row,
    /<PlanBadge tier=\{asPlanTier\(pro\.membershipTier\)\}/,
    'paket rozeti satırda yok',
  );
});
