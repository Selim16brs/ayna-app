# AYNA

Kadın odaklı güvenilir güzellik & kişisel yaşam platformu (Kazakistan; kk/ru). Tek kaynak doküman: `AYNA_Claude_Code_Master_Spec.md`. Planlama ve mimari: [docs/README.md](docs/README.md).

## Durum

EPIC 1 — Foundation kuruldu. Üretim feature kodu henüz yok (P0 epic'ler sırada).

## Yapı (monorepo — pnpm + Turborepo, ADR-0001)

```
apps/
  api/        NestJS + Prisma backend (sağlık, audit, feature flag, request-id, hata formatı)
  mobile/     React Native + Expo (placeholder — EPIC 2+)
  web-pro/    Next.js salon/uzman paneli (placeholder)
  web-admin/  Next.js admin/moderasyon (placeholder)
packages/
  config/     tsconfig + eslint + Zod env şeması
  types/      paylaşılan TS tipleri
  validation/ paylaşılan Zod şemaları
  domain/     saf iş mantığı (booking state machine, loyalty ledger) + testler
  i18n/       kk/ru metinler + parite testi
  analytics/  PII-güvenli analytics wrapper
infrastructure/docker/  Postgres + Redis + MinIO (compose)
```

## Geliştirme

```bash
# 1) Bağımlılıklar
pnpm install

# 2) Yerel servisler (Docker gerekli)
docker compose -f infrastructure/docker/docker-compose.yml up -d

# 3) Ortam
cp .env.example .env

# 4) Veritabanı
pnpm --filter @ayna/api db:generate
pnpm --filter @ayna/api db:migrate

# 5) Çalıştır / doğrula
pnpm --filter @ayna/api dev      # http://localhost:3000/api/v1/health
pnpm build && pnpm typecheck && pnpm lint && pnpm test
```

## Kurallar

Bkz. [docs/planning/06-coding-standards.md](docs/planning/06-coding-standards.md), [07-api-conventions.md](docs/planning/07-api-conventions.md), [08-definition-of-done.md](docs/planning/08-definition-of-done.md). Gizlilik: PII/sağlık/ham konum asla log/analytics'e ([docs/security/03](docs/security/03-data-classification.md)).
