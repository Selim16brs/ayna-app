# AYNA — Definition of Done

> EK L. Bir ticket bu maddeler tamamlanmadan **"Done" sayılamaz**.

## Checklist

- [ ] Acceptance criteria karşılandı.
- [ ] Unit test yazıldı.
- [ ] Gerekliyse integration test yazıldı.
- [ ] Kritik akışta E2E test yazıldı (EK J).
- [ ] Database migration eklendi (Prisma).
- [ ] OpenAPI güncellendi.
- [ ] Kazakça (kk) ve Rusça (ru) i18n anahtarları eklendi.
- [ ] Loading, empty, error ve permission-denied durumları tasarlandı (UI).
- [ ] Audit log gereksinimi uygulandı (gerekiyorsa).
- [ ] Privacy etkisi kontrol edildi ([security/03](../security/03-data-classification.md)).
- [ ] Analytics event güvenli eklendi **veya** neden eklenmediği yazıldı.
- [ ] Dokümantasyon güncellendi.
- [ ] Feature flag kararı verildi.
- [ ] Kod review edildi.

## Hassas/finans ticket'ları için ek (🔒/⚖️)

- [ ] Ham konum / PII / sağlık verisi log/analytics'e yazılmadığı test edildi.
- [ ] İlgili gizlilik testleri (EK J.5) geçti.
- [ ] Finans işlemi idempotent + ledger tutarlılığı testli.
- [ ] Abuse/rate-limit senaryosu test edildi (EK J.6).

## Epic kapanış gate'i

- [ ] İlgili EK acceptance criteria'nın **tamamı** geçti (örn. EPIC 5 → EK A.6, EPIC 6 → EK B.13, EPIC 7 → EK C.15).
- [ ] CI yeşil (lint, typecheck, unit, integration, build).
