# AYNA — Fark Analizi (Faz 0)

> **Tarih:** 26.08.2026
> **Karşılaştırılan:** iki bağlayıcı şartname ↔ mevcut kod
> — `AYNA_Gelir_Paket_Puanlama_Kacak_Onleme_Claude_Code_Sartnamesi.md`
> — `AYNA_Randevu_Yasam_Dongusu_Claude_Code_Sartnamesi.md`
>
> Mevcut durum belgeleri: `AYNA_MONETIZATION_CURRENT_STATE.md`,
> `AYNA_APPOINTMENT_CURRENT_STATE.md`

## Okuma kılavuzu

| İşaret | Anlamı                                                                      |
| ------ | --------------------------------------------------------------------------- |
| ✅     | Kodda var ve şartnameye uyuyor                                              |
| ⚠️     | Kısmen var; değiştirilmesi gerekiyor                                        |
| ❌     | Yok; sıfırdan kurulacak                                                     |
| 🔴     | **Çakışma** — mevcut davranış şartnameye aykırı, kullanıcı kararı gerekiyor |

---

## A · Randevu çekirdeği (Randevu şartnamesi)

| #   | Şartname maddesi                         | Durum | Not                                                                                 |
| --- | ---------------------------------------- | ----- | ----------------------------------------------------------------------------------- |
| A1  | Durum makinesi (31 durum)                | ⚠️    | 16 var; 15 eksik. `cancelled` tek — kimin iptal ettiği okunamıyor                   |
| A2  | Atomik slot tutma (`HELD`)               | ❌    | Hold kavramı hiç yok                                                                |
| A3  | Slot çakışma koruması                    | ❌    | `(proId, startAt)` benzersizlik kısıtı yok — **aynı saate iki randevu yazılabilir** |
| A4  | Oranlı kapora `clamp(×%10, 1k, 5k)`      | ⚠️    | Sabit 1.000 ₸. **Kullanıcı onayladı: formül uygulanacak**                           |
| A5  | Kapora dekont + karşılıklı teyit         | ✅    | sha256 tekrar koruması dahil                                                        |
| A6  | İade akışı (manuel, dekontlu)            | ✅    |                                                                                     |
| A7  | Bir kez adil erteleme hakkı              | ❌    | Erteleme var, "bir kez ücretsiz" kuralı yok                                         |
| A8  | No-show itiraz penceresi                 | ⚠️    | Kapora yakma **anında** oluyor; `NO_SHOW_REPORTED` ara durumu yok                   |
| A9  | Check-in / gecikme / yoldayım            | ❌    |                                                                                     |
| A10 | Hazırlık talimatı ve zorunlu formlar     | ❌    |                                                                                     |
| A11 | Karşılıklı tamamlama + final fiyat onayı | ⚠️    | `completed_pending` var ama **final fiyat girme/onaylama yok**                      |
| A12 | Ücretsiz bildirim kanalları              | ✅    | SMS/WhatsApp/ücretli e-posta yok — uyum tam                                         |
| A13 | Bildirim güvenilirliği (outbox)          | ❌    | Fire-and-forget; başarısız push kayboluyor                                          |
| A14 | Salon–uzman yetkilendirme                | ✅    | Salon uzmanın kişisel randevusunu detaysız görüyor                                  |

**A3 en acil olanı.** Bugün üretimde aynı uzmana aynı saate iki randevu
yazılabilir; ikisi de kapora ister. Bu hem para hem güven sorunu.

---

## B · Paket ve üyelik (Gelir şartnamesi §4, §4A)

| #   | Şartname maddesi                             | Durum | Not                                                                                                   |
| --- | -------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------- |
| B1  | Paket adları `AYNA Pro` / `AYNA Premium`     | 🔴    | Kodda `premium` / `platinum`. **Migration + mapping gerekiyor, geçmiş finans kayıtları değişmeyecek** |
| B2  | Paket durumları (7 durum enum)               | ⚠️    | 4 metin sabiti var, enum yok                                                                          |
| B3  | Abonelik ≠ hesap durumu ayrımı               | ❌    | `SUSPENDED_FINANCIAL` kavramı yok                                                                     |
| B4  | Paket fiyatı admin-parametrik                | 🔴    | Config **tanımlı ama okunmuyor**; servis sabit kullanıyor                                             |
| B5  | Ödeme durumları (`PAYMENT_REVIEW` vb.)       | ⚠️    | `pending/active/rejected/expired` var, eşleme gerekiyor                                               |
| B6  | Paket ödemesi komisyon borcunu kapatmamalı   | ✅    | Ayrı tablolar — zaten karışmıyor                                                                      |
| B7  | Müşteri ücretsiz üyeliği otomatik            | ⚠️    | `membershipTier='free'` varsayılan; entitlement kontrolü yok                                          |
| B8  | Müşteri Premium entitlement (W2W/takip/Boni) | ❌    | `403 PREMIUM_REQUIRED` kontrolü yok                                                                   |
| B9  | Üç paralel üyelik alanı tekilleştirilmeli    | 🔴    | `isPremium` + `membershipTier` + `membershipUntil`                                                    |

---

## C · Sıralama ve teklif dağıtımı (§5)

| #   | Şartname maddesi                   | Durum | Not                                         |
| --- | ---------------------------------- | ----- | ------------------------------------------- |
| C1  | Uygunluk filtresi (10 koşul)       | ⚠️    | Şehir + rol + KYC var; paket/borç/limit yok |
| C2  | Dalga dağıtımı                     | ✅    | 5'lik dalga, 30 dk, maks 4 dalga            |
| C3  | Premium head-start (120 sn)        | ❌    | **Satılıyor ama yok**                       |
| C4  | Pro görünürlük kotası (min %30)    | ❌    |                                             |
| C5  | Altı bileşenli `eligibility_score` | ❌    | Sunucuda `orderBy rating desc`              |
| C6  | `fair_exposure_factor`             | ❌    | Aynı yüksek puanlı uzman hep önde kalabilir |
| C7  | Kullanıcı sıralama seçenekleri     | ✅    | Önerilen/fiyat/mesafe/puan var              |
| C8  | Sponsorlu etiketi                  | ✅    | Etiketli gösteriliyor                       |

---

## D · AYNA Score ve rozetler (§6)

| #   | Şartname maddesi                         | Durum                          |
| --- | ---------------------------------------- | ------------------------------ |
| D1  | 6 bileşenli 0–100 skor                   | ❌                             |
| D2  | Bayes/Wilson düzeltmesi                  | ❌                             |
| D3  | Performans seviyeleri (4 kademe)         | ❌                             |
| D4  | Rozet yaşam döngüsü + `valid_until`      | ❌ (rozetler elle veriliyor)   |
| D5  | "Yeni uzman" etiketi (yetersiz örneklem) | ⚠️ (mobilde var, sunucuda yok) |

Ham veri toplanıyor (`respondedAt`, `responseDeadline`, iptal/no-show kayıtları)
ama hiçbiri bir skora dönüşmüyor. **Skor altyapısı sıfırdan kurulacak.**

---

## E · Komisyon (§7, §11, §12)

| #   | Şartname maddesi                       | Durum | Not                                                                   |
| --- | -------------------------------------- | ----- | --------------------------------------------------------------------- |
| E1  | Matrah = nihai hizmet bedeli           | ✅    | `booking.price` üzerinden                                             |
| E2  | Seviyeye göre oran matrisi (%8,5–10)   | 🔴    | Tek global oran. **%8,5 satılıyor ama uygulanmıyor**                  |
| E3  | `commission_rate_snapshot`             | ❌    | Oran randevuya yazılmıyor; geçmiş oran değişince bozulur              |
| E4  | Randevu başına fatura                  | ✅    | 31.08 (K3): tamamlanma anında fatura + uzmana bildirim                |
| E5  | Tahsilat penceresi                     | ✅    | 31.08 kurucu kuralı: 45 dk ödeme + 15 dk son uyarı → askı; ikisi ayar |
| E6  | Tek seferlik %20 gecikme bedeli        | ❌    | Parasal ceza yok                                                      |
| E7  | Otomatik askıya alma                   | ✅    | 60. dk'da askı + bildirim; yeniden açılış borcun 2 katı               |
| E8  | KDV (`vat_rate_snapshot`)              | ❌    | Hiç yok                                                               |
| E9  | `DISPUTED_HOLD`                        | ❌    |                                                                       |
| E10 | Fatura tekilliği (unique)              | 🔴    | Read-then-write; **çift fatura mümkün**                               |
| E11 | İki komisyon motorunun birleştirilmesi | 🔴    | Panel ve fatura farklı yuvarlıyor                                     |
| E12 | Reward subsidy kredisi                 | ✅    | **PR #20 ile eklendi**                                                |

---

## F · Sadakat ve indirim (§8)

| #   | Şartname maddesi                               | Durum | Not                                                         |
| --- | ---------------------------------------------- | ----- | ----------------------------------------------------------- |
| F1  | Hoş geldin +200                                | ✅    |                                                             |
| F2  | Referans +300, ilk tamamlanan randevudan sonra | ⚠️    | 300 veriliyor ama **kayıt anında**, tamamlanmayı beklemiyor |
| F3  | Tamamlanan randevudan %1 kazanım               | ❌    | Hizmet başına puan yok                                      |
| F4  | Harcama tavanı: randevunun %5'i                | 🔴    | **Kodda %50** — komisyon ekonomisini tüketiyor              |
| F5  | Sübvansiyon tavanı: net komisyonun %50'si      | ✅    | **PR #20 ile eklendi**                                      |
| F6  | `funding_source` zorunlu                       | ✅    | **PR #20 ile eklendi**                                      |
| F7  | Katmanların gerçek avantaj vermesi             | ❌    | Katman hesaplanıyor ama hiçbir şey yapmıyor                 |
| F8  | Puan sunucu kurallarıyla kazanılır             | ✅    | **PR #19 ile kapatıldı**                                    |

**F4 en kritik çakışma.** Bugün bir müşteri 10.000 ₸'lik randevunun 5.000 ₸'sini
puanla ödeyebiliyor. Şartname bunu 500 ₸ ile sınırlıyor. Mevcut kullanıcıların
biriken bakiyesi ve beklentisi var — geçiş kararı gerekiyor.

---

## G · Kaçak önleme (§9)

| #   | Şartname maddesi                               | Durum                                  |
| --- | ---------------------------------------------- | -------------------------------------- |
| G1  | Telefon maskeleme                              | ✅ (yalnız mesajlarda)                 |
| G2  | URL / @kullanıcı / IBAN / kart / Kaspi tespiti | ⚠️ Tekliflerde var, **mesajlarda yok** |
| G3  | Eğitici uyarı (ceza değil)                     | ✅ Mobilde eklendi                     |
| G4  | `circumvention_risk_event` tablosu             | ❌                                     |
| G5  | Kademeli yaptırım (5 aşama)                    | ❌                                     |
| G6  | `enforcement_case` + admin kuyruğu             | ❌                                     |
| G7  | Platform dışı işlemin puan/rozet üretmemesi    | ✅ (doğal olarak)                      |

---

## H · Altyapı (§13, §14)

| #   | Şartname maddesi                 | Durum | Not                                                                   |
| --- | -------------------------------- | ----- | --------------------------------------------------------------------- |
| H1  | **Para işleri için zamanlayıcı** | 🔴    | `closePeriod`, `runOverdue`, `expireDue` — **hiçbiri otomatik değil** |
| H2  | Outbox pattern                   | ❌    |                                                                       |
| H3  | Idempotency anahtarı             | ❌    | Yalnız `receiptHash`                                                  |
| H4  | Decimal'in float'a düşmemesi     | 🔴    | Her servis sınırında `Number()`                                       |
| H5  | Para eylemlerinin audit'i        | 🔴    | Para servisleri `AuditService`'i atlıyor                              |
| H6  | Reversal (ters kayıt)            | ❌    |                                                                       |
| H7  | 19 kavramsal tablo               | ⚠️    | 3'ü PR #17'de eklendi; 16'sı yok                                      |

---

## Öncelik sıralaması (şartname §24'ün öncelik listesine göre)

1. **A3 — slot çakışma koruması.** Aynı saate iki randevu yazılabiliyor. Veri
   kaybı/çift tahsilat riski; §24'ün 1. önceliği "finansal doğruluk".
2. **H1 — para zamanlayıcıları.** Gelir yalnız elle tanınıyor. Ama yeni model
   faturalamayı baştan değiştirdiği için **Faz 4'te doğru mimariyle** çözülmeli;
   mevcut `closePeriod`'a zamanlayıcı bağlamak birkaç hafta sonra silinecek bir
   iş olur.
3. **F4 — puan harcama tavanı.** Her gün komisyon geliri sızdırıyor.
4. **E10/E11 — fatura tekilliği ve iki motor.** Çift fatura ve panel-fatura
   uyuşmazlığı.
5. **A1/A4 — durum makinesi ve oranlı kapora.** Faz 1'in çekirdeği.

---

## Yıkıcı olmayan migration ve geri dönüş yaklaşımı

Şartname her iki belgede de yıkıcı migration'ı yasaklıyor. Uygulanacak kurallar:

1. **Sütun eklenir, silinmez.** Yeniden adlandırma yerine yeni sütun + geçiş
   dönemi + eski sütunun okunmayı bırakması.
2. **Enum genişletilir, daraltılmaz.** Yeni durumlar eklenir; eski durumlar
   kullanımdan kalkana kadar şemada kalır.
3. **Paket adı geçişi mapping ile:** `premium → AYNA Pro`, `platinum → AYNA
Premium`. **Geçmiş `Subscription` ve `CommissionInvoice` satırlarına
   dokunulmaz** (§4: "geçmiş finans kayıtlarını değiştirme").
4. **Her migration koşullu yazılır** (`IF EXISTS` / `IF NOT EXISTS`) — depoda
   migrations ile `schema.prisma` arasında önceden var olan sapma bulunduğu
   kanıtlandı: `commission_invoices` migration'larda var, `payments` yok.
5. **Her migration boş bir PostgreSQL'de sınanır** ve `migrate diff` farkı sıfır
   olmalıdır. (PR #17 ve #20'de uygulandı; #20'de koşulsuz ALTER'ın patladığı
   bu sayede yakalandı.)
6. **Geri dönüş:** her faz için ters SQL (`DROP COLUMN IF EXISTS`) hazırlanır ve
   PR'da belgelenir. Finans **verisi** hiçbir geri dönüşte silinmez — yalnız yeni
   sütunlar düşürülür.
7. **Sapmanın kendisi ayrı iş:** migrations klasörü ya şemaya göre yeniden
   temellendirilmeli ya da tamamen bırakılıp `db push` tek yol yapılmalı. Karar
   `AYNA_MONETIZATION_DECISIONS_REQUIRED.md` içinde.
