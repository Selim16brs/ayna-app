# AYNA — Kod Standartları

> EK M madde 9. Tüm `apps/` ve `packages/` için bağlayıcı.

## 1. Dil & genel

- **TypeScript strict mode** her pakette zorunlu (`strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- `any` yasak; gerekiyorsa `unknown` + daraltma. ESLint `no-explicit-any` error.
- Tüm dış girdi (HTTP, job payload, env) **Zod** ile doğrulanır → tip çıkarımı `z.infer`.
- Saf domain mantığı `packages/domain`'de framework bağımsız.

## 2. İsimlendirme

- Dosya: `kebab-case.ts`; React bileşeni dosyası `PascalCase.tsx`.
- Tip/interface/enum: `PascalCase`. Değişken/fonksiyon: `camelCase`. Sabit: `UPPER_SNAKE`.
- Boolean: `is/has/can/should` öneki.
- DB tablo/kolon: `snake_case` (Prisma map ile).

## 3. Tarih & saat (kritik)

- DB'de **her zaman** `timestamptz`, değer **UTC**.
- Sunum kullanıcının **IANA timezone**'una göre (client veya `user_timezone`).
- Kod içinde tarih aritmetiği UTC; DST test fixture'ı zorunlu (R12).

## 4. Para & finans ⚖️

- `NUMERIC(12,2)`; kodda string/Decimal (asla float).
- Bakiyeler türetilir (ledger), yazılmaz.
- Tüm para mutasyonları idempotent + audit.

## 5. Hata yönetimi

- Domain hataları tipli (`InvalidTransitionError`, `NotEligibleError`...).
- API'de global exception filter → standart error format ([07-api-conventions](07-api-conventions.md)).
- Asla hassas veri exception mesajına koyma.

## 6. Gizlilik-by-design (zorunlu)

- S3/S2 alanları log/analytics'e **asla** ([security/03](../security/03-data-classification.md)).
- Yeni endpoint: response DTO **whitelist** (user_id gibi alanlar sızmaz).
- Yeni hassas alan: data classification güncellenir + consent kontrolü.

## 7. Async & side-effect

- Side-effect'ler (SMS, push, e-posta, retention, gecikmeli yayın) **BullMQ job**.
- Job'lar **retry-safe / idempotent**.
- Webhook handler'lar idempotency key kontrolü yapar.

## 8. i18n

- Kullanıcıya görünen **her** metin kk + ru anahtarı (`packages/i18n`).
- Hardcoded string yasak (ESLint kural + CI eksik anahtar kontrolü).

## 9. Test

- Domain mantığı: yoğun **unit** (state machine, ledger, rating, anonimlik).
- Servis/repo: **integration** (gerçek Postgres test container).
- Kritik akış: **E2E** (booking, location share, review — EK J).
- Test factory/fixture `packages/testing`'de.
- Coverage hedefi: `packages/domain` ≥ %90.

## 10. Git & PR

- Branch: `epic/<n>-<slug>` veya `feat/<ticket>-<slug>`.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
- PR şablonu: ne/neden, DoD checklist, gizlilik etkisi, migration var mı.
- `main`'e doğrudan push yok; review zorunlu.
- Commit mesajı sonu: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## 11. Yasaklar

- Secret repoya — yasak (`.env.example` kullan).
- `console.log` prod kodunda — yapılandırılmış logger kullan.
- Controller'da iş mantığı — yasak (EK D.4).
- Float ile para — yasak.
- Hassas veri log/analytics — yasak.
