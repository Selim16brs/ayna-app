# AYNA API — Railway/bulut deploy. pnpm monorepo'dan yalnız @ayna/api + bağımlılıklarını kurar/derler.
FROM node:20-bookworm-slim

# Prisma engine için openssl + sertifikalar
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# pnpm (repo ile aynı sürüm)
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Tüm monorepo (deploy'da .dockerignore gereksizleri eler)
COPY . .

# "@ayna/api..." = api + BAĞIMLILIKLARI (config/domain/i18n/types/validation/analytics).
# Böylece mobile/web-admin'in ağır bağımlılıkları kurulmaz. (pnpm: sondaki ... = bağımlılıklar)
RUN pnpm install --frozen-lockfile --filter "@ayna/api..."

# ÖNCE Prisma client üretilir — tsc, generated model tiplerine ihtiyaç duyar; yoksa sorgular
# 'any' döner ve callback'ler TS7006 verir (taze kurulumda @prisma/client generate edilmemiş gelir).
# SONRA bağımlı paketler + api pnpm ile topolojik sırayla derlenir (deps önce, api sonra).
RUN pnpm --filter @ayna/api exec prisma generate \
    && pnpm --filter "@ayna/api..." run build

ENV NODE_ENV=production
WORKDIR /app/apps/api

# Başlangıçta: şemayı buluttaki boş DB'ye uygula (idempotent) → API'yi başlat.
CMD ["sh", "-c", "pnpm exec prisma db push --skip-generate && node dist/main.js"]
