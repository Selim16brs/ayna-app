# AYNA — Monorepo & Mimari Değerlendirme

> EK M madde 3. EK D'deki önerilen yapının değerlendirilmesi ve onayı.

## 1. Karar: Önerilen monorepo onaylanır (küçük eklemelerle)

EK D.1'deki pnpm + Turborepo yapısı AYNA için **doğru tercihtir**. Gerekçe:

- 4 uygulama (mobile, web-pro, web-admin, api) **aynı domain tiplerini, Zod şemalarını ve i18n anahtarlarını** paylaşır → kod tekrarını ve drift'i önler.
- Tek PR'da API sözleşmesi + client tip güncellemesi atomik yapılabilir.
- Turborepo cache ile CI hızlanır.

## 2. Onaylanan yapı (+ eklemeler)

```text
ayna/
├── apps/
│   ├── mobile/              # React Native + Expo (Expo Router)
│   ├── web-pro/             # Next.js — salon/uzman paneli
│   ├── web-admin/           # Next.js — admin/moderasyon
│   └── api/                 # NestJS + Prisma
├── packages/
│   ├── ui/                  # design tokens + paylaşılan bileşenler
│   ├── types/               # ortak TS tipleri (API sözleşmesi)
│   ├── validation/          # Zod şemaları (API + client)
│   ├── config/              # eslint, tsconfig, env şeması
│   ├── i18n/                # kk, ru
│   ├── auth/                # token/oturum yardımcıları
│   ├── analytics/           # güvenli analytics wrapper (PII engelli)
│   ├── domain/   # ➕ EKLENDİ: saf domain mantığı (ledger, rating, state machine) — framework bağımsız
│   └── testing/             # factory + fixture
├── infrastructure/
│   ├── docker/   ├── terraform/   └── scripts/
├── docs/  (product, architecture, api, security, planning)
├── .github/workflows/
├── pnpm-workspace.yaml
└── turbo.json
```

**Eklemenin gerekçesi (`packages/domain`):** AYNA'nın en kritik mantığı (loyalty ledger, rating ağırlık algoritması, booking state machine, anonimlik kuralları) framework'ten (NestJS/React) bağımsız, saf ve yoğun test edilebilir olmalıdır. Bu mantığı `api` içine gömmek; birim testini zorlaştırır ve ileride farklı bir runtime'a taşımayı imkânsızlaştırır.

## 3. Katmanlı mimari (API içi) — EK D.4 kuralları

```
HTTP (Controller)  →  Application (Service / UseCase)  →  Domain (packages/domain)
                                    ↓
                          Repository (Prisma)  →  PostgreSQL
                                    ↓
                          Jobs/Events (BullMQ)  →  Side effects (SMS, push, retention)
```

Bağlayıcı kurallar:
- Controller'da iş mantığı **yok** — sadece DTO doğrulama + servis çağrısı.
- DTO doğrulama Zod (`packages/validation`) ile **zorunlu**.
- Repository katmanı domain servisinden **ayrı**.
- Tüm side-effect'ler (SMS, push, e-posta, retention, gecikmeli yorum yayını) **BullMQ job/event**'e taşınır → retry-safe.
- Ödeme webhook'ları + tüm POST'lar **idempotent**.
- Hassas özellikler önce **feature flag** ile internal beta.

## 4. Teknoloji onayı (EK D.2)

| Katman | Seçim | Karar |
|--------|-------|-------|
| Mobile | React Native + Expo + Expo Router | ✅ Onay |
| Mobil state | Zustand + TanStack Query | ✅ (Redux elendi, EK5) |
| Web | Next.js | ✅ Onay (App Router) |
| Backend | NestJS + Prisma | ✅ Onay |
| DB | PostgreSQL | ✅ Onay |
| Cache/Queue | Redis + BullMQ | ✅ Onay |
| Validation | Zod (paylaşımlı) | ✅ Onay |
| Storage | S3-compatible (MinIO→Yandex) | ✅ abstraction ile, ⛔ EK4 |
| API stili | REST + OpenAPI | ✅ (GraphQL gerekmiyor; MVP'de fazlalık) |

## 5. Sınır koşulları & gözden geçirme notları

- **GraphQL şimdilik hayır:** Spec "REST veya gerektiğinde GraphQL" diyor. MVP'nin sorgu desenleri (keşif filtreleri dahil) REST + cursor pagination ile karşılanır. GraphQL erken karmaşıklık getirir.
- **Realtime:** WebSocket/SSE sadece gerçek ihtiyaçta (örn. canlı konum güncellemesi için share link sayfası). MVP'de konum güncellemesi **polling** ile başlanabilir; SSE Faz 2.
- **Arama:** Başlangıçta PostgreSQL FTS + uygun indeksler yeterli. Ölçekte ayrı arama servisi (Meilisearch/Typesense) değerlendirilir; abstraction ile bağ kurulmaz.
- **Multi-tenant değil:** AYNA tek tenant, rol bazlı. Salon verisi `business_id` scoping + RBAC ile izole; ayrı şema/DB gerekmez.

## 6. Ortam & dağıtım (özet)

- **Local:** Docker Compose (Postgres, Redis, MinIO, MailHog).
- **Env doğrulama:** Boot'ta Zod ile; eksik/yanlış env → fail fast.
- **Migration:** Prisma migrate; CI'da "migration var mı + uygulanıyor mu" gate.
- **CI:** lint → typecheck → unit → integration → build (Turborepo cache).
- **Secrets:** repoya asla; `.env` örnekleri `*.env.example` ile.

> Sonuç: EK D mimarisi onaylanır; tek yapısal ekleme `packages/domain`. Diğer her şey spec ile uyumlu ilerler.
