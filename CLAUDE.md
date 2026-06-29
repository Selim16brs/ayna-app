# CLAUDE.md — AYNA

## Proje

AYNA: Kazakistan pazarı için kadın odaklı güvenilir güzellik & kişisel yaşam platformu. Birincil diller kk + ru. Teknik dil TypeScript.

## Tek kaynak doküman

`AYNA_Claude_Code_Master_Spec.md` (Desktop'ta, repo kökünün bir üstünde). Planlama çıktıları `docs/` altında — başlamadan [docs/README.md](docs/README.md) oku.

## Mevcut durum

EK M planlama görevi tamamlandı (docs/planning + docs/security). **Henüz üretim kodu yok.** Açık kararlar (docs/planning/01 §4) kurucu onayı bekliyor. Sonraki adım onay sonrası EPIC 1 — Foundation.

## Bağlayıcı kurallar (spec §"Zorunlu çalışma kuralları")

- Projeyi tek görevde üretme; epic→feature→ticket; her epic ayrı branch/worktree.
- Kod öncesi: veri modeli + akış + acceptance criteria.
- Privacy-by-design: hassas veri/konum/anonim yorum/sağlık.
- Konum izinsiz paylaşılmaz; salon/uzman anonim yorum sahibini ve güvenilen kişileri göremez.
- Tüm kullanıcı metinleri kk + ru i18n.
- Tüm backend tarihleri UTC; kullanıcıya IANA timezone ile.
- Kritik eylemler audit log; write endpoint'ler idempotent; finans/sadakat **ledger**.
- PII/sağlık/ham konum log'a ve analytics'e **asla**.
- Her özellik: unit + integration + kritik akışta E2E. DoD: docs/planning/08.

## Stack (ADR-0001)

pnpm + Turborepo · RN+Expo (Zustand, TanStack Query) · Next.js · NestJS+Prisma · PostgreSQL · Redis+BullMQ · Zod · REST+OpenAPI · `packages/domain` saf mantık.

## Geliştirme notları

- Para: NUMERIC(12,2), KZT, asla float. Bakiye ledger'dan türetilir.
- İletişim dili: Türkçe (kullanıcı tercihi).
- Commit sonu: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. `main`'e doğrudan push yok.
