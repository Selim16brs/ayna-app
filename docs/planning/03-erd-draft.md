# AYNA — ERD Taslağı (v0.1)

> EK M madde 4. EK E veri modelinin ilişkisel taslağı. Bağlayıcı değil; Prisma şemasına dönüştürülmeden önce gözden geçirilir. Tüm tarihler `timestamptz` (UTC). Hassas alanlar 🔒, finans alanları ⚖️.

## 1. Genel kurallar

- PK: `id uuid` (default `gen_random_uuid()`).
- Tüm tablolar `created_at`, `updated_at`.
- Soft-delete sadece gerekli yerlerde (`deleted_at`); hassas veride **hard delete + crypto-shredding**.
- Para: `NUMERIC(12,2)`, `currency CHAR(3)` default `KZT`. ⚖️
- Enum'lar Postgres native enum veya `varchar + check`.
- FK'ler `ON DELETE` davranışı açıkça tanımlı (çoğu `RESTRICT`; kullanıcı silmede PII haritası job'u).

## 2. Kimlik & Profil

```mermaid
erDiagram
    users ||--|| user_profiles : has
    users ||--o| user_preferences : has
    users ||--o{ user_consents : records
    users ||--o{ user_devices : owns
    users ||--o{ user_sessions : has
    users ||--o{ friend_connections : initiates
    users ||--o{ trusted_contacts : owns
    users ||--o| safety_settings : configures

    users {
        uuid id PK
        varchar phone_e164 "🔒 encrypted, unique"
        enum role "user|professional|salon|moderator|admin"
        enum status "active|suspended|deleted"
        varchar default_locale "kk|ru"
        varchar timezone "IANA"
        timestamptz created_at
    }
    user_profiles {
        uuid id PK
        uuid user_id FK
        varchar display_name
        varchar city
        text avatar_url "nullable"
        timestamptz created_at
    }
    user_consents {
        uuid id PK
        uuid user_id FK
        varchar consent_type "location|health|marketing|contacts"
        boolean granted
        varchar policy_version
        timestamptz granted_at
        timestamptz revoked_at "nullable"
    }
    friend_connections {
        uuid id PK
        uuid requester_id FK
        uuid addressee_id FK
        enum status "pending|accepted|blocked"
        timestamptz created_at
    }
    trusted_contacts {
        uuid id PK
        uuid owner_user_id FK
        uuid contact_user_id FK "nullable"
        varchar name
        varchar phone_e164 "🔒 encrypted"
        varchar relationship_label
        jsonb notification_channels
        int priority_order
        boolean is_verified
        boolean is_active
    }
    safety_settings {
        uuid id PK
        uuid user_id FK
        boolean auto_share_booking_details
        boolean share_for_first_visit_only
        boolean share_for_home_service_always
        boolean share_live_location
        int share_start_offset_minutes
        int raw_location_retention_hours
        jsonb trusted_contact_ids
    }
```

## 3. İşletme & Hizmet

```mermaid
erDiagram
    businesses ||--o{ branches : has
    businesses ||--o{ business_documents : provides
    branches ||--o{ professionals : employs
    professionals ||--o{ professional_documents : provides
    professionals ||--o{ professional_services : offers
    service_categories ||--o{ services : groups
    services ||--o{ professional_services : mapped
    professional_services ||--o{ service_price_rules : priced
    branches ||--o{ availability_slots : exposes

    businesses {
        uuid id PK
        varchar name
        enum verification_status "unverified|pending|verified|rejected"
        varchar tax_id "🔒"
        varchar city
        timestamptz created_at
    }
    branches {
        uuid id PK
        uuid business_id FK
        varchar name
        text address "🔒 exact address sensitive"
        decimal lat "nullable"
        decimal lng "nullable"
        jsonb working_hours
    }
    professionals {
        uuid id PK
        uuid branch_id FK "nullable (eve hizmet)"
        uuid user_id FK "nullable"
        varchar display_name
        int experience_years
        enum verification_status
        boolean home_service_enabled
    }
    services {
        uuid id PK
        uuid category_id FK
        varchar code
        jsonb name_i18n "kk|ru"
    }
    professional_services {
        uuid id PK
        uuid professional_id FK
        uuid service_id FK
        int avg_duration_minutes
    }
    service_price_rules {
        uuid id PK
        uuid professional_service_id FK
        decimal base_price "⚖️"
        char currency
        timestamptz valid_from
    }
    availability_slots {
        uuid id PK
        uuid branch_id FK
        uuid professional_id FK
        timestamptz start_at_utc
        timestamptz end_at_utc
        enum status "open|held|booked|blocked"
    }
```

## 4. Randevu (çekirdek)

```mermaid
erDiagram
    bookings ||--o{ booking_items : contains
    bookings ||--o{ booking_status_history : logs
    bookings ||--o| booking_checkins : has
    bookings ||--o| booking_completion_confirmations : has
    bookings ||--o{ booking_disputes : may_have
    bookings ||--o| reviews : yields
    bookings ||--o{ location_share_sessions : may_have

    bookings {
        uuid id PK
        uuid user_id FK
        uuid business_id FK
        uuid branch_id FK
        uuid professional_id FK
        uuid service_id FK
        enum status "see state machine"
        timestamptz start_at_utc
        timestamptz end_at_utc
        varchar user_timezone
        decimal list_price "⚖️"
        decimal campaign_discount "⚖️"
        decimal loyalty_discount "⚖️"
        decimal final_price "⚖️"
        char currency
        uuid campaign_id FK "nullable"
        uuid promo_code_id FK "nullable"
        decimal deposit_amount "⚖️"
        enum payment_status
        boolean safety_share_enabled
        int version "optimistic lock"
    }
    booking_status_history {
        uuid id PK
        uuid booking_id FK
        varchar old_status
        varchar new_status
        uuid actor_id
        varchar actor_role
        varchar reason_code
        varchar request_id
        jsonb metadata "🔒 no PII"
        timestamptz created_at
    }
    booking_checkins {
        uuid id PK
        uuid booking_id FK
        enum method "qr|otp|manual|staff|location"
        timestamptz checked_in_at
    }
```

> Unique constraint önerisi (R3): `availability_slots(professional_id, start_at_utc)` ve onaylı randevuda slot kilidi → çift rezervasyon engeli. 🧩

## 5. Güvenlik (AYNA Safe)

```mermaid
erDiagram
    location_share_sessions ||--o{ location_share_events : streams
    location_share_sessions ||--o{ safety_checkins : has
    location_share_sessions ||--o{ trusted_contact_notifications : sends

    location_share_sessions {
        uuid id PK
        uuid booking_id FK
        uuid user_id FK
        enum mode "info|route|live|home"
        enum status "scheduled|active|paused|stopped_by_user|expired|completed|revoked|failed"
        timestamptz starts_at
        timestamptz expires_at
        timestamptz stopped_at "nullable"
        varchar token_hash "🔒 hash only"
        jsonb trusted_contact_snapshot "🔒 encrypted"
        timestamptz raw_location_retention_until
    }
    location_share_events {
        uuid id PK
        uuid session_id FK
        bytea encrypted_coordinates "🔒"
        int accuracy_meters
        timestamptz recorded_at
        timestamptz expires_at "🔒 retention job"
    }
    safety_checkins {
        uuid id PK
        uuid session_id FK
        enum type "im_safe|running_late|help_requested"
        timestamptz created_at
    }
```

> `location_share_events` ayrı + kısa ömürlü + retention job ile silinir. Koordinat **asla** log/analytics'e. → [security/02](../security/02-ayna-safe-privacy-threat-model.md)

## 6. Değerlendirme

```mermaid
erDiagram
    reviews ||--o{ review_scores : has
    reviews ||--o{ review_tags : has
    reviews ||--o{ review_media : has
    reviews ||--o| review_visibility : configured
    reviews ||--o{ review_responses : answered
    reviews ||--o{ review_appeals : appealed
    reviews ||--o{ review_moderation_cases : moderated
    professionals ||--o{ rating_snapshots : aggregated
    rating_algorithm_versions ||--o{ rating_snapshots : versions

    reviews {
        uuid id PK
        uuid booking_id FK "unique"
        uuid user_id FK "🔒 never exposed publicly"
        uuid business_id FK
        uuid professional_id FK
        uuid service_id FK
        enum visibility "public_anon|ayna_private"
        enum status "draft|pending_safety_review|published|hidden|removed"
        boolean is_anonymous
        text comment "nullable, moderated"
        boolean would_return "nullable"
        boolean first_time_visit
        timestamptz published_at "nullable, delayed"
        jsonb original_score_summary
        jsonb current_score_summary
    }
    rating_snapshots {
        uuid id PK
        uuid professional_id FK "or business_id"
        uuid service_id FK "nullable (hizmet bazlı)"
        uuid algorithm_version_id FK
        decimal weighted_score
        int sample_size
        timestamptz computed_at
    }
    rating_algorithm_versions {
        uuid id PK
        varchar version
        jsonb weights "C.8: result35 repeat20 hygiene15 price10 time10 issue10"
        jsonb recency_weights "C.9"
        timestamptz active_from
    }
```

> Kritik: `reviews.user_id` hiçbir public/işletme response'unda dönmez. Hizmet bazlı puan ayrı snapshot. → [security/01](../security/01-anonymous-review-threat-model.md)

## 7. Kampanya & Sadakat ⚖️

```mermaid
erDiagram
    campaigns ||--o{ promo_codes : generates
    promo_codes ||--o{ promo_code_redemptions : redeemed
    referral_codes ||--o{ referrals : tracks
    users ||--o{ loyalty_ledger : earns
    users ||--o| loyalty_balances : has

    campaigns {
        uuid id PK
        uuid business_id FK "nullable (AYNA funded)"
        enum funding "salon|ayna|shared|sponsor"
        enum type "first_visit|referral|group|empty_slot|..."
        decimal budget "⚖️"
        timestamptz valid_from
        timestamptz valid_to
        jsonb constraints "min_spend, max_discount, new_customer_only, day_hour, combinable"
    }
    promo_code_redemptions {
        uuid id PK
        uuid promo_code_id FK
        uuid user_id FK
        uuid booking_id FK
        varchar idempotency_key "unique ⚖️"
        timestamptz redeemed_at
    }
    loyalty_ledger {
        uuid id PK
        uuid user_id FK
        enum transaction_type "earn|spend|expire|reversal"
        int amount "signed ⚖️"
        varchar source_type
        uuid source_id
        timestamptz expires_at "nullable"
        uuid reversal_of_id "nullable"
        timestamptz created_at
    }
```

> `loyalty_balances` sadece **türetilmiş/cache**; doğruluk kaynağı `loyalty_ledger` toplamıdır. ⚖️ (Risk R5)

## 8. Topluluk, Kişisel Yaşam, İçerik, Sistem (özet)

EK E.7–E.9 tabloları aynı prensiplerle modellenir:

- **Circle:** `circles`, `circle_members`, `posts`, `post_categories`, `post_visibility`, `post_reports`, `recommendations`, `recommendation_evidence`, `comments`.
- **Kişisel yaşam (Faz 3, 🔒):** `cycle_entries`, `mood_entries`, `vault_items` — varsayılan kapalı, ayrı şifreleme, reklam/analytics yasak, kullanıcı silebilir. `beauty_passports` + entries, `care_schedules`, `moments`, `ready_plans`, `budgets`.
- **İçerik:** `content_articles`, `content_categories`, `content_translations`, `expert_profiles`, `content_sources`, `content_bookmarks`.
- **Sistem:** `notifications`, `notification_preferences`, `moderation_cases`, `audit_logs`, `feature_flags`, `system_settings`.

### audit_logs (🔒 EK H.5)

```text
id, actor_id, actor_role, action, resource_type, resource_id,
request_id, timestamp, ip_hash, device_hash, safe_diff (🔒 no sensitive data)
```

## 9. Açık ERD soruları

1. `professionals.user_id` nullable mı? (Uzmanın AYNA hesabı olmadan salon tarafından eklenmesi senaryosu) → **Evet, nullable.**
2. Hizmet bazlı puan `rating_snapshots`'ta `service_id` ile mi, ayrı tablo mu? → Aynı tablo, `service_id` nullable (null = genel puan).
3. Şifreleme: alan-bazlı (pgcrypto) mı, uygulama-katmanı mı? → Telefon/koordinat **uygulama katmanı** (anahtar yönetimi KMS); → [security/03](../security/03-data-classification.md).
