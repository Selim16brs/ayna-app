# AYNA — Epic / Feature / Ticket Backlog

> Kaynak: `AYNA_Claude_Code_Master_Spec.md` (v2.0). Bu doküman, spec'teki gereksinimleri uygulanabilir iş kalemlerine ayırır. Her ticket; bağımsız test edilebilir, tek bir branch/worktree'de tamamlanabilir ve [Definition of Done](08-definition-of-done.md)'a tabidir.

## Etiket sözlüğü

- **Öncelik:** `P0` (MVP zorunlu çekirdek), `P1` (MVP kapsamı), `P2` (Faz 2+).
- **Tahmin:** S (≤1 gün), M (2–3 gün), L (4–8 gün), XL (parçalanmalı).
- **Risk:** 🔒 gizlilik/güvenlik kritik, ⚖️ finans/ledger kritik, 🧩 dağıtık tutarlılık riski.

---

## EPIC 0 — Planning & Governance `P0`

| # | Ticket | Tahmin | Acceptance |
|---|--------|--------|-----------|
| 0.1 | Gereksinimleri epic/feature/ticket'a ayır (bu doküman) | M | Tüm spec bölümleri bir ticket'a maplenir |
| 0.2 | ERD taslağı | M | Tüm EK E tabloları ilişkilerle modellenir → [03-erd-draft](03-erd-draft.md) |
| 0.3 | Booking state machine | S | EK A durumları + geçiş kuralları → [04](04-booking-state-machine.md) |
| 0.4 | Threat model: anonim yorum | M | STRIDE + deanonymization vektörleri → [security/01](../security/01-anonymous-review-threat-model.md) |
| 0.5 | Threat model: AYNA Safe / konum | M | Konum yaşam döngüsü + retention → [security/02](../security/02-ayna-safe-privacy-threat-model.md) |
| 0.6 | Event catalog (analytics) | S | EK I event listesi + gizlilik kuralları |
| 0.7 | API conventions + ADR şablonu | S | → [07](07-api-conventions.md) |
| 0.8 | Data classification & PII haritası | M | → [security/03](../security/03-data-classification.md) |

## EPIC 1 — Foundation `P0` 🧩

| # | Ticket | Tahmin | Notlar |
|---|--------|--------|--------|
| 1.1 | pnpm monorepo + Turborepo | M | `pnpm-workspace.yaml`, `turbo.json` (EK D.1) |
| 1.2 | Shared `tsconfig`, ESLint, Prettier (`packages/config`) | S | strict mode zorunlu |
| 1.3 | Env şema doğrulama (Zod, `packages/config`) | S | Eksik env'de boot fail |
| 1.4 | Docker local stack (Postgres + Redis) | M | `infrastructure/docker` |
| 1.5 | Prisma init + ilk migration pipeline | M | migration zorunlu CI gate |
| 1.6 | NestJS API iskeleti + sağlık endpoint'i | M | modüler yapı, global exception filter |
| 1.7 | OpenAPI üretimi + lint | S | her PR'da güncel olmalı |
| 1.8 | `packages/i18n` (kk, ru) altyapısı | M | eksik anahtar CI uyarısı |
| 1.9 | `packages/types` + `packages/validation` (Zod) | S | API ↔ client paylaşımlı |
| 1.10 | CI (lint, typecheck, test, build) | M | GitHub Actions |
| 1.11 | Audit log altyapısı (`audit_logs`) | M | 🔒 EK H.5; hassas diff yasak |
| 1.12 | Feature flag servisi | S | internal beta gate |
| 1.13 | Standart error format + request-id middleware | S | EK F.9 |

## EPIC 2 — Auth & Profil `P0` 🔒

| # | Ticket | Tahmin | Notlar |
|---|--------|--------|--------|
| 2.1 | OTP iste/doğrula (`/auth/request-otp`, `/verify-otp`) | L | rate limit + device sinyali |
| 2.2 | Session + refresh token rotation | M | revoke desteği |
| 2.3 | `/auth/logout`, `/auth/account` (silme) | M | 🔒 silme job'u PII haritası uygular |
| 2.4 | User profile (`/me`, PATCH) | M | dil, şehir, timezone (IANA) |
| 2.5 | Preferences + consent kayıtları | M | 🔒 EK H; varsayılan gizli |
| 2.6 | Notification preferences | S | kategori + sessiz saat |
| 2.7 | RBAC + resource ownership guard | L | 🔒 rol: user/pro/salon/mod/admin |
| 2.8 | Admin MFA + profesyonel ek doğrulama | M | 🔒 |

## EPIC 3 — İşletme & Uzman `P0`

| # | Ticket | Tahmin | Notlar |
|---|--------|--------|--------|
| 3.1 | Business + Branch CRUD | L | şube bazlı yetki |
| 3.2 | Professional CRUD | M | salon ↔ uzman ilişkisi |
| 3.3 | Belge yükleme (signed URL, EXIF temizleme, malware scan) | L | 🔒 EK H.4 |
| 3.4 | Doğrulama workflow (admin onayı, rozet) | L | AYNA Verified |
| 3.5 | Service + ServiceCategory + fiyat kuralları | L | ilk 5 kategori (EK 17.5) |
| 3.6 | Availability slot modeli | M | timezone-safe |

## EPIC 4 — Keşif `P0` 🧩

| # | Ticket | Tahmin | Notlar |
|---|--------|--------|--------|
| 4.1 | Arama + filtre (`/professionals`, `/businesses`) | L | EK 9.1 filtreleri |
| 4.2 | Uzman profili (hizmet bazlı puan, sosyal kanıt) | L | min örneklem kuralı (C.7) |
| 4.3 | Salon profili | M | salon vs uzman puanı ayrı |
| 4.4 | Arkadaş sinyali veri modeli (`friend_connections`) | L | 🔒 "3 arkadaşın gitti" |
| 4.5 | Availability sorgu (`/availability`, "bugün müsait") | M | |
| 4.6 | Arama indeksleme katmanı (Postgres FTS / ayrı) | M | EK 21 |

## EPIC 5 — Randevu `P0` 🧩 ⚖️

| # | Ticket | Tahmin | Notlar |
|---|--------|--------|--------|
| 5.1 | Booking create + DRAFT | M | |
| 5.2 | State machine + geçersiz geçiş reddi | L | EK A → [04](04-booking-state-machine.md) |
| 5.3 | Slot lock (race condition koruması) | L | 🧩 çakışan onaylı randevu yasak |
| 5.4 | Confirm / cancel / iptal politikası gösterimi | M | fiyat artışı = kullanıcı onayı |
| 5.5 | Check-in (QR/OTP/manuel) | M | konum opsiyonel |
| 5.6 | Start / complete-provider / complete-user | M | otomatik tamamlama timeout |
| 5.7 | Dispute akışı | M | salon ödemesi bekletme |
| 5.8 | Booking audit (`booking_status_history`) | S | 🔒 her geçiş |
| 5.9 | Ödeme webhook idempotency | L | 🧩⚖️ çift webhook = tek ödeme |

## EPIC 6 — AYNA Safe `P1` 🔒

| # | Ticket | Tahmin | Notlar |
|---|--------|--------|--------|
| 6.1 | Trusted contacts CRUD + verify | M | 🔒 telefon şifreli |
| 6.2 | Safety settings | M | EK B.4 |
| 6.3 | Randevu bilgisi paylaşımı (modlar) | L | EK B.5 |
| 6.4 | Expiring share link (hash token, 410 Gone) | L | 🔒 EK B.8 |
| 6.5 | Location session + events (kısa ömürlü) | L | 🔒 |
| 6.6 | Otomatik tetikleyiciler (T-30, yola çıktım) | M | BullMQ job |
| 6.7 | Safety check akışı + "Yardım istiyorum" | M | resmî makama otomatik bildirim YOK |
| 6.8 | Retention worker (ham koordinat silme) | M | 🔒 24s varsayılan |
| 6.9 | Background location entegrasyonu | L | sadece aktif oturumda |

## EPIC 7 — Yorum & Puan `P0` 🔒 ⚖️

| # | Ticket | Tahmin | Notlar |
|---|--------|--------|--------|
| 7.1 | Eligibility (`/bookings/:id/review-eligibility`) | M | sadece COMPLETED |
| 7.2 | Adım adım form (EK C.4) | L | |
| 7.3 | Anonim görünürlük + kimlik maskeleme | L | 🔒 user_id API'den sızmamalı |
| 7.4 | Gecikmeli yayın + tarih genelleştirme | M | 🔒 deanonymization önleme |
| 7.5 | Ciddi iddia → PENDING_SAFETY_REVIEW | M | |
| 7.6 | İşletme cevabı (`/reviews/:id/response`) | M | kimlik göremez |
| 7.7 | İtiraz akışı (EK C.13 durumları) | L | audit |
| 7.8 | Rating snapshot + algoritma versiyonu | L | ⚖️ C.8 ağırlıklar versiyonlu |
| 7.9 | Sahte yorum sinyalleri + bekletme | L | 🔒 |

## EPIC 8 — Kampanya & Rewards `P1` ⚖️

| # | Ticket | Tahmin | Notlar |
|---|--------|--------|--------|
| 8.1 | Campaign CRUD + finansman alanı | L | EK 9.8 |
| 8.2 | Promo code validate/redeem | L | ⚖️ idempotent redemption |
| 8.3 | Referral kodu | M | |
| 8.4 | Loyalty ledger + balance (türetilmiş) | L | ⚖️ bakiye = ledger toplamı |
| 8.5 | Kampanya analitiği | M | |

## EPIC 9 — Circle `P1`

| # | Ticket | Tahmin | Notlar |
|---|--------|--------|--------|
| 9.1 | Circle + membership | M | |
| 9.2 | Post + kategori + görünürlük | L | anonim seçenek 🔒 |
| 9.3 | Recommendation + evidence | M | |
| 9.4 | Report + moderasyon | M | |

## EPIC 10 — Care & Moments `P1`

| # | Ticket | Tahmin | Notlar |
|---|--------|--------|--------|
| 10.1 | Care schedule + reminder | M | |
| 10.2 | Moments (özel gün) | M | |
| 10.3 | Ready (temel plan) | M | |

## EPIC 11 — AYNA Life (CMS) `P1`

| # | Ticket | Tahmin | Notlar |
|---|--------|--------|--------|
| 11.1 | İçerik CMS + kategori | L | |
| 11.2 | Çeviri (kk/ru) + uzman onayı | M | |
| 11.3 | Bookmark + push | S | |

## EPIC 12 — Admin & Moderasyon `P0`

| # | Ticket | Tahmin | Notlar |
|---|--------|--------|--------|
| 12.1 | Verification queue | M | |
| 12.2 | Review moderation + appeal kararları | L | 🔒 |
| 12.3 | Circle moderation | M | |
| 12.4 | Content management | M | |
| 12.5 | Campaign control | M | |
| 12.6 | Audit log viewer | M | 🔒 |
| 12.7 | Finans raporu (komisyon, iade) | L | ⚖️ |

## EPIC 13 — Kişisel Yaşam (Faz 3) `P2`

Cycle, Mood, Vault, Passport (gelişmiş), Budget, Together, Concierge. MVP dışı — [05-mvp-12-week-plan](05-mvp-12-week-plan.md)'e bakınız.

---

## MVP zorunlu çekirdek (EK N) → ticket eşlemesi

| EK N maddesi | Epic/Ticket |
|---|---|
| 1. Kullanıcı kaydı/profil | 2.1–2.6 |
| 2. Salon/uzman doğrulama | 3.1–3.4 |
| 3. Hizmet keşfi | 4.1–4.6 |
| 4. Arkadaş tavsiyesi | 4.4, 9.3 |
| 5. Randevu & kapora | 5.1–5.9 |
| 6. Kullanıcı onaylı konum paylaşımı | 6.1–6.9 |
| 7. Güvenilen kişi | 6.1 |
| 8. Check-in & tamamlanma | 5.5–5.6 |
| 9. Doğrulanmış anonim puanlama | 7.1–7.9 |
| 10. Salon/uzman puanı ayrımı | 7.8, 4.2–4.3 |
| 11. Kampanya & tavsiye kodu | 8.1–8.3 |
| 12. Rewards ledger | 8.4 |
| 13. Temel Circle | 9.1–9.4 |
| 14. Care & özel gün | 10.1–10.2 |
| 15. Admin & moderasyon | 12.1–12.7 |
