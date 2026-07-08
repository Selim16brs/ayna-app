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

# Bağımlı paketler + api pnpm ile topolojik sırayla derlenir (deps önce, api sonra) + Prisma client.
RUN pnpm --filter "@ayna/api..." run build \
    && pnpm --filter @ayna/api exec prisma generate

ENV NODE_ENV=production
WORKDIR /app/apps/api

# Başlangıçta: şemayı buluttaki boş DB'ye uygula (idempotent) → API'yi başlat.
CMD ["sh", "-c", "pnpm exec prisma db push --skip-generate && node dist/main.js"]
