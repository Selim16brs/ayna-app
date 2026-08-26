import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aynaFundedDiscount, rewardSubsidyCredit } from './reward-subsidy';

test('uzmanın kendi finanse ettiği indirim mahsup EDİLMEZ', () => {
  const sum = aynaFundedDiscount([
    { pointsUsed: 500, fundingSource: 'EXPERT_FUNDED' },
    { pointsUsed: 300, fundingSource: 'AYNA_COMMISSION' },
  ]);
  assert.equal(sum, 300, 'yalnız AYNA kaynaklı indirim sayılır');
});

test('kampanya ve partner bütçesi de uzmanın alacağını düşürmez', () => {
  const sum = aynaFundedDiscount([
    { pointsUsed: 100, fundingSource: 'CAMPAIGN_BUDGET' },
    { pointsUsed: 200, fundingSource: 'PARTNER_FUNDED' },
  ]);
  assert.equal(sum, 300);
});

test('bilinmeyen kaynak mahsup üretmez — funding source belirtilmeden indirim geçmez', () => {
  assert.equal(aynaFundedDiscount([{ pointsUsed: 999, fundingSource: '' }]), 0);
  assert.equal(aynaFundedDiscount([{ pointsUsed: 999, fundingSource: '__proto__' }]), 0);
});

test('kredi sübvansiyon tavanıyla sınırlı (§8.4)', () => {
  // 2.000 ₸ komisyon, 1.500 ₸ AYNA indirimi, tavan %50 → en fazla 1.000 ₸
  assert.equal(rewardSubsidyCredit(2000, 1500, 0.5), 1000);
});

test('indirim tavanın altındaysa tamamı mahsup edilir', () => {
  assert.equal(rewardSubsidyCredit(2000, 400, 0.5), 400);
});

test('kredi komisyonu NEGATİFE düşürmez — AYNA uzmana para ödemez', () => {
  assert.equal(rewardSubsidyCredit(500, 10000, 1), 500);
  assert.ok(rewardSubsidyCredit(500, 10000, 1) <= 500);
});

test('indirim yoksa veya komisyon yoksa kredi sıfırdır', () => {
  assert.equal(rewardSubsidyCredit(2000, 0, 0.5), 0);
  assert.equal(rewardSubsidyCredit(0, 1000, 0.5), 0);
  assert.equal(rewardSubsidyCredit(-5, 1000, 0.5), 0);
});

test('SENARYO: 10.000 ₸ hizmet, 5.000 ₸ puanla ödendi, %10 komisyon', () => {
  const commissionNet = 10000 * 0.1; // 1.000 ₸ — matrah TAM fiyat (değişmez)
  const funded = aynaFundedDiscount([{ pointsUsed: 5000, fundingSource: 'AYNA_COMMISSION' }]);
  const credit = rewardSubsidyCredit(commissionNet, funded, 0.5);
  assert.equal(credit, 500, 'tavan: komisyonun %50si');
  // Düzeltme öncesi: uzman 5.000 nakit alıp 1.000 komisyon ödüyordu → net 4.000
  // Düzeltme sonrası: 5.000 nakit, 500 komisyon → net 4.500
  assert.equal(commissionNet - credit, 500);
});
