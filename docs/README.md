# AYNA Dokümantasyon İndeksi

Kaynak spec: `../../AYNA_Claude_Code_Master_Spec.md` (v2.0). Bu klasör EK M ilk planlama görevinin çıktısıdır. **Plan tamamlanmadan feature kodu yazılmaz.**

## Planning
- [00 — Epic/Feature/Ticket Backlog](planning/00-backlog-epics-features-tickets.md)
- [01 — Çelişkiler, Riskler, Açık Kararlar](planning/01-contradictions-risks-open-decisions.md) ⛔ açık kararlar burada
- [02 — Monorepo & Mimari Değerlendirme](planning/02-monorepo-architecture-review.md)
- [03 — ERD Taslağı](planning/03-erd-draft.md)
- [04 — Randevu State Machine](planning/04-booking-state-machine.md)
- [05 — 12 Haftalık MVP Planı](planning/05-mvp-12-week-plan.md)
- [06 — Kod Standartları](planning/06-coding-standards.md)
- [07 — API Conventions](planning/07-api-conventions.md)
- [08 — Definition of Done](planning/08-definition-of-done.md)

## Security
- [01 — Anonim Yorum Threat Model](security/01-anonymous-review-threat-model.md)
- [02 — AYNA Safe / Konum Privacy Threat Model](security/02-ayna-safe-privacy-threat-model.md)
- [03 — Veri Sınıflandırması & PII Haritası](security/03-data-classification.md)

## Architecture
- [ADR-0001 — Monorepo + stack onayı](architecture/adr/0001-monorepo-and-stack.md)

## EK M görev → çıktı eşlemesi
| EK M | Çıktı |
|------|-------|
| 1 ticket'lara ayır | planning/00 |
| 2 çelişki/risk | planning/01 |
| 3 monorepo değerlendir | planning/02 + ADR-0001 |
| 4 ERD | planning/03 |
| 5 state machine | planning/04 |
| 6 anonim yorum threat model | security/01 |
| 7 AYNA Safe threat model | security/02 |
| 8 12 haftalık plan | planning/05 |
| 9 standartlar/API/DoD | planning/06,07,08 |
| 10 docs/planning + docs/security | bu klasör |
| 11 hassas veri loglama yok | security/03 + planning/06 |
| 12 teknoloji değişikliği gerekçesi | ADR formatı (07 §10) |
| 13 plan bitmeden feature yok | bu nota uyuldu |

## Sonraki adım
Açık kararlar (planning/01 §4) kurucu onayı bekliyor. Onay sonrası **EPIC 1 — Foundation** (planning/05, Hafta 1) başlatılır.
