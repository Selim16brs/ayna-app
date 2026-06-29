# AYNA — 12 Haftalık MVP Teslim Planı

> EK M madde 8. Hipotez (EK 17.1): *Kadınlar, arkadaş tavsiyesi ve doğrulanmış işlem verisi olan uzmanlara daha yüksek güvenle rezervasyon yapar mı?* Plan EK 25 (90 gün) ile uyumludur.

## Prensipler

- Modül modül; "AYNA'yı tamamen yap" komutu **yok** (EK 20.6).
- Her epic ayrı branch/worktree.
- Hassas özellikler önce feature flag + internal beta.
- Her hafta sonunda demo edilebilir bir artımlı çıktı.

## Yol haritası

| Hafta | Epic / Odak | Çıktı | DoD gate |
|-------|-------------|-------|----------|
| **0** | Planning (EPIC 0) | Bu dokümanlar; ADR'ler; threat model'ler onaylandı | Plan onayı |
| **1** | Foundation (EPIC 1) | Monorepo, CI, Docker stack, Prisma, i18n, audit altyapısı | CI yeşil |
| **2** | Auth & Profil (EPIC 2) | OTP, session, profil, consent, RBAC | OTP E2E + güvenlik testi |
| **3** | İşletme & Uzman (EPIC 3) | Business/Branch/Professional CRUD, belge upload, doğrulama | Doğrulama workflow demo |
| **4** | İşletme & Hizmet (EPIC 3 devam) | Service/kategori (5 kategori), fiyat, availability | Fiyat/slot testleri |
| **5** | Keşif (EPIC 4) | Arama, filtre, uzman/salon profili | Filtre + min-örneklem |
| **6** | Keşif + Arkadaş sinyali (EPIC 4) | friend_connections, "arkadaşın gitti", availability sorgu | Arkadaş sinyali gizlilik testi |
| **7** | Randevu I (EPIC 5) | Booking create, state machine, slot lock | State machine birim testleri |
| **8** | Randevu II (EPIC 5) | Check-in, completion, dispute, ödeme webhook (idempotent, mock) | Randevu E2E (EK J.1) |
| **9** | AYNA Safe (EPIC 6) | Trusted contacts, settings, share link, location session, retention | Konum E2E + privacy testleri (EK J.2/J.5) |
| **10** | Yorum & Puan (EPIC 7) | Eligibility, form, anonim yayın, gecikme, rating snapshot | Yorum E2E + deanonymization testleri (EK J.4) |
| **11** | Kampanya/Rewards + Circle temel (EPIC 8, 9) | Promo code, loyalty ledger, temel circle/tavsiye | Ledger tutarlılık + promo abuse |
| **12** | Admin + Care/Moments + sertleştirme (EPIC 12, 10) | Moderasyon paneli, doğrulama kuyruğu, care reminder, load/abuse testleri | Tam DoD + kapalı beta hazır |

## Paralelleştirme

- Mobil ve API ekipleri paylaşılan `types`/`validation` üzerinden sözleşme-öncelikli (contract-first) çalışır; OpenAPI mock ile mobil API'yi beklemez.
- web-admin (EPIC 12) erken iskelet, içerik H10–12'de dolar.

## Kapsam dışı (EK 17.6) — MVP'de YOK

Gelişmiş Cycle/Mood/Vault analizi, gelişmiş AI Concierge, tıbbi kozmetoloji, canlı konum takibinin ötesi, gelişmiş ödeme cüzdanı, ülke geneli lansman, marketplace, tam sosyal akış, gelişmiş influencer pazarı.

## Pilot çıkış kriterleri (EK 19, H61–90 ile uyum)

- 20–30 salon, 50–100 uzman, 300–500 kullanıcı (kapalı beta).
- Gerçek rezervasyon + doğrulanmış yorum akışı çalışıyor.
- Tüm P0 acceptance criteria + tüm gizlilik testleri geçiyor.

## Bağımlılık riskleri (zaman çizelgesini etkileyen)

- Ödeme/SMS/harita/storage sağlayıcı kararları (⛔ [01-contradictions](01-contradictions-risks-open-decisions.md) EK1–EK4) **H7'den önce** netleşmeli.
- Veri ikametgâhı yasal görüşü (R7) **H1'den önce** (storage konumu).
