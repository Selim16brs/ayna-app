import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { asPlanTier, PLAN_TIERS } from './plan';

/**
 * PAKET ROZETİ.
 *
 * Kurucu: _"rozetler ve paketler daha gösterişli şekilde gösterilmeli...
 * müşteri uzmana baktığında hangi rozete ve üye paketine sahip olduğunu
 * görmeli. ayrıca müşteri kendi paketini de görmeli."_
 */

test("bilinmeyen değer free'ye düşüyor", () => {
  // Sunucu yarın 'gold' eklerse kod onu geçerli sanıp META[tier]'a giderse
  // undefined döner ve ekran patlar. Yanlış rozet göstermektense hiç
  // göstermemek doğru.
  for (const v of ['gold', 'PREMIUM', '', ' premium', null, undefined]) {
    assert.equal(asPlanTier(v as string), 'free', `${JSON.stringify(v)} free olmalıydı`);
  }
  assert.equal(asPlanTier('premium'), 'premium');
  assert.equal(asPlanTier('platinum'), 'platinum');
});

const rozet = readFileSync(join(import.meta.dirname, 'ui', 'PlanBadge.tsx'), 'utf8');

test('her kademenin kendi ikonu ve etiketi var', () => {
  const ikonlar = new Set<string>();
  for (const tier of PLAN_TIERS) {
    const m = new RegExp(
      `${tier}: \\{ icon: '([\\w-]+)', label: '([\\w.]+)', proLabel: '([\\w.]+)'`,
    ).exec(rozet);
    assert.ok(m, `${tier} için META girdisi yok`);
    ikonlar.add(m[1]);
    // Uzman etiketi ayrı olmalı: uzman profilinde "Premium üye" yazmak,
    // bakan kişiye KENDİ üyeliğini gösteriyormuş gibi okunuyor.
    assert.notEqual(m[2], m[3], `${tier}: müşteri ve uzman etiketi aynı`);
  }
  assert.equal(
    ikonlar.size,
    PLAN_TIERS.length,
    `ikonlar tekrar ediyor: ${[...ikonlar].join(', ')}`,
  );
});

test('kademeler görsel olarak ayrışıyor', () => {
  // Aynı gradyanı paylaşan iki kademe "daha koyu" olur, daha DEĞERLİ değil.
  assert.match(rozet, /tier === 'free'/, 'free ayrı çizilmiyor');
  const prem = /premium: \['(#[0-9A-Fa-f]{6})', '(#[0-9A-Fa-f]{6})'\]/.exec(rozet);
  const plat = /platinum: \['(#[0-9A-Fa-f]{6})', '(#[0-9A-Fa-f]{6})'\]/.exec(rozet);
  assert.ok(prem && plat, 'amblem renkleri tanımlı değil');
  assert.notDeepEqual([prem[1], prem[2]], [plat[1], plat[2]], 'iki kademe aynı ombreyi paylaşıyor');
  assert.match(
    rozet,
    /tier === 'platinum' \? <View style=\{styles\.parilti\}/,
    'platinum parıltısı yok',
  );
  // free dolgusuz: ödemeyen, ödeyenle aynı gösterişte görünmemeli.
  assert.match(rozet, /free: \{\s*backgroundColor: 'transparent'/, 'free dolgulu çiziliyor');
});

test('amblem renkleri temaya bağlı DEĞİL', () => {
  // İlk sürümüm `[colors.accent, colors.ink]` kullanıyordu. `ink` bir METİN
  // rengi ve koyu temada AÇIK renge dönüyor — Platinum rozeti koyu modda
  // bembeyaz oluyordu. Palet bu hatayı zaten yazılı olarak uyarıyor.
  const govde = /const EMBLEM = \{[\s\S]*?\n\};/.exec(rozet);
  assert.ok(govde, 'EMBLEM sabiti yok');
  assert.doesNotMatch(govde[0], /colors\./, "amblem tema token'ı kullanıyor — koyu modda döner");
  // Yazı da sabit olmalı: tema `onAccent`i koyu temada KOYU renge dönüyor.
  assert.match(rozet, /const ON_EMBLEM = '#[0-9A-Fa-f]{6}';/, 'amblem yazı rengi sabit değil');
  assert.doesNotMatch(rozet, /tone="onAccent"/, 'amblemde tema yazı tonu kullanılmış');
});

test('amblem yazısı her iki uçta da okunuyor', () => {
  // Gerçek ölçüm — yorumda yazan sayıya güvenmek, sayının eskimesine izin verir.
  const lum = (h: string) => {
    const v = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(v[0]) + 0.7152 * f(v[1]) + 0.0722 * f(v[2]);
  };
  const kon = (a: string, b: string) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const yazi = /const ON_EMBLEM = '(#[0-9A-Fa-f]{6})';/.exec(rozet)![1];
  for (const m of rozet.matchAll(
    /(premium|platinum): \['(#[0-9A-Fa-f]{6})', '(#[0-9A-Fa-f]{6})'\]/g,
  )) {
    for (const uc of [m[2], m[3]]) {
      const r = kon(yazi, uc);
      assert.ok(r >= 4.5, `${m[1]} ${uc} üzerinde yazı ${r.toFixed(2)}:1 — 4.5 altı`);
    }
  }
});

test('paket İKİ yerde de çiziliyor', () => {
  const kok = join(import.meta.dirname, '..', 'app');

  // Müşteri kendi paketini görüyor.
  const profil = readFileSync(join(kok, '(tabs)', 'profile.tsx'), 'utf8');
  assert.match(profil, /<PlanBadge tier=\{planTier\}/, 'müşteri kendi paketini görmüyor');
  assert.match(profil, /asPlanTier\(/, 'ham string doğrudan rozete veriliyor');

  // Müşteri uzmanın paketini görüyor.
  const uzman = readFileSync(join(kok, 'professional', '[id].tsx'), 'utf8');
  assert.match(uzman, /<PlanBadge[^>]*role="pro"/, 'uzman profilinde paket yok');
  assert.match(
    uzman,
    /pro\.membershipTier !== 'free'/,
    'ücretsiz uzmanda da rozet çiziliyor — "Standart" bilgi vermez, ödeyeni sulandırır',
  );
});

test('sunucu paketi süre kontrolüyle gönderiyor', () => {
  const svc = readFileSync(
    join(import.meta.dirname, '..', '..', 'api', 'src', 'catalog', 'catalog.service.ts'),
    'utf8',
  );
  assert.match(svc, /membershipTier, \/\/ §11/, 'DTO paketi göndermiyor');
  // Süre kontrolü atlanırsa iptal etmiş uzman sonsuza kadar Platinum görünür.
  assert.match(svc, /uyelikGecerli/, 'üyelik süresi kontrol edilmiyor');
  assert.match(
    svc,
    /!uyelik\.membershipUntil \|\| uyelik\.membershipUntil\.getTime\(\) > Date\.now\(\)/,
    'süre karşılaştırması liste ucundakiyle aynı değil',
  );
});
