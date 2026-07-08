# AYNA API — Railway/bulut deploy. pnpm + Turborepo monorepo'dan yalnız @ayna/api'yi kurar/derler.
FROM node:20-bookworm-slim

# Prisma engine için openssl + sertifikalar
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# pnpm (repo ile aynı sürüm)
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Tüm monorepo (deploy'da .dockerignore gereksizleri eler)
COPY . .

# Yalnız @ayna/api + bağımlı workspace paketlerini kur (mobile/web-admin dev bağımlılıkları hariç)
RUN pnpm install --frozen-lockfile --filter "@ayna/api..."

# Bağımlı paketler + api derlenir (turbo bağımlılık grafiğine göre sıralar) + Prisma client üretilir
RUN pnpm turbo run build --filter=@ayna/api \
    && pnpm --filter @ayna/api exec prisma generate

ENV NODE_ENV=production
WORKDIR /app/apps/api

# Başlangıçta: şemayı buluttaki boş DB'ye uygula (idempotent) → API'yi başlat.
# Not: seed OTOMATİK çalışmaz (create tabanlı, tekrar-güvenli değil) — ilk deploy sonrası
# tek sefer elle çalıştırılır (pnpm db:seed).
CMD ["sh", "-c", "pnpm exec prisma db push --skip-generate && node dist/main.js"]
