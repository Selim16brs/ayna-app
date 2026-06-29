# AYNA — API Conventions

> EK M madde 9 + EK F.9. NestJS REST API için bağlayıcı kurallar.

## 1. Genel

- REST + JSON; base path `/api/v1`.
- OpenAPI **her değişiklikte** güncellenir (CI gate).
- Tüm endpoint'ler RBAC + resource ownership guard'lı.

## 2. Idempotency

- **Tüm POST** endpoint'leri `Idempotency-Key` header destekler.
- Ödeme webhook'ları idempotent (event_id unique).
- Aynı key + aynı payload → aynı sonuç (saklanan cevap döner).

## 3. Pagination

- **Cursor tabanlı** (offset değil).
- Query: `?limit=20&cursor=<opaque>`.
- Response: `{ data: [...], nextCursor: string | null }`.

## 4. Standart hata formatı

```json
{
  "error": {
    "code": "BOOKING_INVALID_TRANSITION",
    "message": "İnsan-okur mesaj (i18n anahtarı çözülmüş)",
    "details": [],
    "requestId": "req_..."
  }
}
```

- HTTP kodları: 400 (validation), 401, 403, 404, 409 (çakışma/geçersiz geçiş), 410 (süresi dolmuş link), 422, 429 (rate limit), 500.
- `code` makine-okur, stabil; `message` i18n.

## 5. Request ID & gözlemlenebilirlik

- Her istek `requestId` (gelen header veya üretilen) → log + audit + error.
- Tüm audit kayıtları `request_id` taşır.

## 6. Güvenlik & gizlilik

- Hassas alanlar role göre response'tan **çıkarılır** (whitelist DTO).
- `reviews.user_id`, trusted contacts, koordinat → asla yanlış role.
- **Public share endpoint** (`GET /share/:token`): rate limit + abuse koruması + minimum veri + `no-store` + `noindex` + süresi dolduysa **410**.
- Rate limit: OTP, share link, promo redeem, review submit üzerinde sıkı.

## 7. Versiyonlama

- URL versiyonu (`/api/v1`). Kırıcı değişiklik → `/v2`.
- Rating algoritması gibi iş kuralları ayrıca **veri-içi versiyon** (`rating_algorithm_versions`).

## 8. Endpoint kataloğu

Tam liste EK F'de. Ana gruplar: Auth/Profil (F.1), Trusted Contacts (F.2), Keşif (F.3), Randevu (F.4), Güvenlik (F.5), Yorum (F.6), Kampanya/Rewards (F.7), Circle (F.8).

## 9. DTO & doğrulama

- Gelen body/query/param → Zod şeması (`packages/validation`), paylaşımlı tip.
- Validation hatası → 400 + standart format + alan detayları.
- Bilinmeyen alanlar reddedilir (strict şema).

## 10. ADR (Architecture Decision Record)

Mimari kararlar `docs/architecture/adr/NNNN-baslik.md` altında:

```md
# ADR-0001: <Karar başlığı>
## Durum: Önerildi | Kabul | Reddedildi | Yerine geçti
## Bağlam
## Karar
## Sonuçlar (artı/eksi, migration etkisi)
```

Teknoloji değişikliği öneren her karar **gerekçe + migration etkisi** içermelidir (EK M madde 12).
