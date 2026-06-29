# AYNA — Çelişkiler, Eksik Kararlar ve Teknik Riskler

> EK M madde 2. Spec'i uygulamaya geçirirken karar verilmesi gereken noktalar. Her madde için **öneri** sunulmuştur; ⛔ işaretliler kod yazılmadan netleşmelidir.

## 1. Çelişkiler

### Ç1 — Geliştirme aracı tutarsızlığı
Spec başında "İlk geliştirme aracı: Codex / İkinci denetim: Claude Code" (%80/%20) deniyor (Bölüm 20), ama EK M Claude Code'a doğrudan tüm planlama + foundation görevini veriyor.
**Öneri:** Bu repoda Claude Code birincil geliştirici olarak çalışıyor. "Codex" notları tarihsel; Claude Code hem üretim hem denetim yapar. Çelişki dokümantasyon kaynaklı, teknik engel değil.

### Ç2 — React Native + Expo vs "RN veya Flutter"
Bölüm 21 "React Native veya Flutter" derken EK D.1/D.2 kesin olarak **React Native + Expo** seçiyor.
**Öneri:** EK D bağlayıcıdır (daha yeni/detaylı). Flutter elenmiştir — gerekçe: monorepo'da TypeScript paylaşımı (`packages/types`, `validation`, `i18n`) Expo ile mümkün, Flutter ile değil.

### Ç3 — "Anonim ama doğrulanmış" + işletme performans raporu
Yorum kullanıcıya/işletmeye anonim (9.4), fakat özel bildirim "işletme performans raporunda anonim olarak gösterilebilir" (9.4) ve "toplulaştırılmış tema olarak aktarılabilir" (C.5).
**Çelişki riski:** Küçük salonlarda tek bir özel bildirim bile kullanıcıyı ifşa edebilir.
**Öneri:** İşletme paneline **yalnızca k-anonimlik eşiği (k≥5) sağlandığında** toplulaştırılmış tema gösterilir. Altındaysa hiç gösterilmez. → [security/01](../security/01-anonymous-review-threat-model.md)

### Ç4 — Komisyon oranı
Bölüm 12.3 "%7–12 komisyon", EK yerlerde net oran yok.
**Öneri:** Konfigüre edilebilir; `system_settings`'te şehir/kategori bazlı oran. MVP default **%10**. ⛔ İş kararı — kurucu onayı gerekli.

## 2. Eksik kararlar ⛔

### EK1 — Ödeme sağlayıcısı (Kazakistan)
Spec "yerel ödeme altyapısı" diyor ama sağlayıcı belirtmiyor. Adaylar: Kaspi Pay, Halyk (ePay), Cloudpayments KZ.
**Etki:** Kapora/iade/webhook tasarımı buna bağlı.
**Öneri:** `PaymentProvider` abstraction (EK D.3) ile sağlayıcı bağımsız geliştir; MVP'de **bir sandbox sağlayıcı** ile mock. Gerçek seçim pilot öncesi. ⛔

### EK2 — Harita/geocoding sağlayıcısı
2GIS (Kazakistan'da baskın) vs Google Maps vs Yandex.
**Öneri:** 2GIS — yerel kapsama en iyi. `MapProvider` abstraction zaten var. ⛔ ticari anlaşma gerekebilir.

### EK3 — SMS sağlayıcısı (OTP kritik)
OTP teslimatı KZ operatörlerinde güvenilir bir SMS gateway gerektirir (Mobizon, kz SMS providers).
**Öneri:** `NotificationProvider.sendSms` abstraction; MVP'de mock + 1 gerçek sağlayıcı. ⛔

### EK4 — Object storage
EK D "S3-compatible" diyor. AWS S3 / Yandex Object Storage / MinIO (self-host).
**Öneri:** MVP local → MinIO; prod → Yandex Object Storage (veri ikametgâhı/KZ yakınlık). ⛔ veri ikametgâhı yasal kontrolü gerekli (bkz. R7).

### EK5 — State yönetimi (mobil): Zustand vs Redux Toolkit
EK D.2 ikisini de listeliyor.
**Öneri:** **Zustand** (daha az boilerplate) + sunucu durumu için TanStack Query. Redux gereksiz ağırlık.

### EK6 — Para birimi & finansal hassasiyet
`decimal` kullanılıyor ama precision/scale belirtilmemiş.
**Öneri:** Tüm para alanları `NUMERIC(12,2)`, KZT (kuruşsuz pratikte ama 2 ondalık tut), `currency CHAR(3)` default `KZT`. Asla float kullanma. ⚖️

### EK7 — Otomatik tamamlama timeout süresi
EK A "yapılandırılabilir süre" diyor, değer yok.
**Öneri:** COMPLETION_PENDING_USER → COMPLETED otomatik geçiş **72 saat** (puanlama hatırlatma penceresiyle uyumlu, EK G.3). Konfigüre edilebilir.

### EK8 — Yorum yayın penceresi & gecikme aralığı
"Rastgele gecikme" değer yok.
**Öneri:** Yorum penceresi 14 gün (EK C.3). Yayın gecikmesi: 0–72 saat arası rastgele. Küçük salon toplu yayın eşiği: k=5.

## 3. Teknik riskler ve önlemler

| # | Risk | Önem | Önlem |
|---|------|------|-------|
| R1 | **Anonim yorum deanonymization** (zaman + kategori + küçük salon korelasyonu) | 🔴 Kritik | k-anonimlik, gecikmeli yayın, tarih genelleştirme, alt→üst kategori. → [security/01](../security/01-anonymous-review-threat-model.md) |
| R2 | **Ham konum sızıntısı** (log/analytics/backup) | 🔴 Kritik | Koordinat şifreli + kısa ömürlü tablo, log filtresi, retention job, analytics'e asla. → [security/02](../security/02-ayna-safe-privacy-threat-model.md) |
| R3 | **Booking slot race condition** (çift rezervasyon) | 🟠 Yüksek | Postgres satır kilidi / `SELECT FOR UPDATE` veya unique constraint (professional_id, slot). 🧩 |
| R4 | **Ödeme webhook duplikasyonu** | 🟠 Yüksek | Idempotency key + `promo_code_redemptions`/`payments` unique event_id. ⚖️🧩 |
| R5 | **Loyalty bakiye tutarsızlığı** | 🟠 Yüksek | Bakiye asla yazılmaz, ledger toplamından türetilir; reversal kayıtları. ⚖️ |
| R6 | **OTP abuse / SMS bombing & maliyet** | 🟠 Yüksek | Rate limit (IP+telefon), exponential backoff, device sinyali, captcha eşiği. 🔒 |
| R7 | **Veri ikametgâhı / KZ kişisel veri yasası** | 🟠 Yüksek | Kazakistan kişisel veri kanunu yerel saklama gerektirebilir → storage/DB konumu hukuki kontrol gerekli. ⛔ |
| R8 | **Share link brute force** | 🟡 Orta | Uzun token (≥128 bit), hash saklama, rate limit, kısa TTL, 410 Gone. 🔒 |
| R9 | **Review bombing / organize saldırı** | 🟡 Orta | Cihaz/IP/ödeme korelasyonu, şüpheli yorumu puana katmama, bekletme. |
| R10 | **Kapsam genişlemesi (21 modül)** | 🟡 Orta | Katı MVP sınırı (EK 17.6), feature flag, modül bazlı teslim. |
| R11 | **i18n eksik anahtar prod'a kaçması** | 🟡 Orta | CI'da eksik kk/ru anahtar kontrolü; eksikse build fail/uyarı. |
| R12 | **Timezone hataları** (UTC saklama, IANA gösterim) | 🟡 Orta | DB hep `timestamptz` UTC; `user_timezone` ile sunum; test fixture'ları DST içermeli. |
| R13 | **Background location pil/izin reddi** | 🟡 Orta | Sadece aktif oturum, adaptive interval, izin yoksa statik paylaşım fallback. |
| R14 | **Hassas veri PITR/backup'ta kalması** | 🟠 Yüksek | Ham konum backup dışı; crypto-shredding (anahtar silerek silme) değerlendir. 🔒 |

## 4. Açık ürün/iş kararları (kurucu onayı) ⛔

1. Komisyon oranı kesinleştirme (Ç4).
2. AYNA Plus fiyatı (2.990–4.990 KZT aralığında tek değer).
3. Ödeme/harita/SMS/storage sağlayıcı sözleşmeleri (EK1–EK4).
4. Veri ikametgâhı yasal görüşü (R7).
5. KVKK/GDPR benzeri uyum kapsamı (KZ + olası AB kullanıcıları).
6. Kapora yüzdesi/sabit tutar politikası ve iade penceresi.
7. İçerik (AYNA Life) tıbbi onay süreci sahipliği.
