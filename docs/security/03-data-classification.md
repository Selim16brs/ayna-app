# AYNA — Veri Sınıflandırması & İşleme Kuralları

> EK M madde 11 + EK H. PII, sağlık ve ham konum verisinin log/analytics'e yazılmamasını garantileyen sınıflandırma.

## 1. Sınıflar

| Sınıf           | Tanım             | Örnekler                                                                                           | Log?         | Analytics?               | Şifreleme                      |
| --------------- | ----------------- | -------------------------------------------------------------------------------------------------- | ------------ | ------------------------ | ------------------------------ |
| **S3 — Hassas** | Sağlık/konum/özel | Regl, ruh hâli, alerji, sağlık notu, özel foto, ham konum, ev adresi, güvenilen kişi, tıbbi geçmiş | ❌ Asla      | ❌ Asla                  | ✅ Zorunlu (app-katmanı + KMS) |
| **S2 — PII**    | Kimlik bilgisi    | Telefon, ad, tam tarih+saat, vergi no, IP (ham)                                                    | ❌           | ⚠️ Sadece hash/anonim ID | ✅ Telefon/vergi şifreli       |
| **S1 — Dahili** | İş verisi         | Booking durumu, puan, kampanya                                                                     | ✅ safe_diff | ✅ internal ID           | —                              |
| **S0 — Public** | Açık              | Hizmet kategorisi, şehir, anonim yorum metni                                                       | ✅           | ✅                       | —                              |

## 2. Bağlayıcı kurallar (EK H.3)

- S3/S2: varsayılan paylaşım **kapalı**; açık rıza olmadan işlenmez.
- Reklam hedeflemesinde **kullanılmaz**.
- Salonlara **otomatik gönderilmez**.
- Kullanıcı **silebilir**.
- Log ve analytics'e **yazılmaz**.

## 3. Teknik uygulama

- **Log filtre middleware:** S3/S2 alan adları (telefon, koordinat, adres, sağlık) request/response/error loglarından otomatik redaksiyon (`[REDACTED]`). Allow-list yaklaşımı.
- **Analytics wrapper (`packages/analytics`):** event payload'ı whitelist'e karşı doğrular; S2/S3 alan varsa **derleme/runtime hatası**. Koordinat/sağlık/yorum/telefon/e-posta/exact-address asla (EK I.2).
- **`audit_logs.safe_diff`:** hassas alan diff'i tutmaz.
- **Şifreleme:** S3 koordinat + telefon uygulama katmanında, anahtar KMS'te; DB dump'ı şifreli kalır.
- **Crypto-shredding:** hesap/konum silmede anahtar imha = veri okunamaz (PITR/backup için R14 çözümü).

## 4. PII haritası (hesap silme job'u — EK F `DELETE /auth/account`)

Silme job'u şu tabloları tarar ve PII'yi hard-delete / anonimleştirir:
`users, user_profiles, trusted_contacts, location_share_*, reviews(user_id→null+anon koru), loyalty_ledger(anonimleştir), cycle_entries, mood_entries, vault_items, beauty_passports, friend_connections, consents`.

> Yorum içeriği kamu yararı için anonim kalabilir ama `user_id` bağı koparılır.

## 5. Gizlilik testleri (EK J.5)

- [ ] Salon Cycle verisini okuyamaz.
- [ ] Salon trusted-contacts endpoint'ine erişemez.
- [ ] İşletme review response'undan user_id alamaz.
- [ ] Public share endpoint'i internal ID döndürmez.
- [ ] Konum koordinatı application log'da bulunmaz.
- [ ] Hesap silme job'ı PII haritasını uygular.
