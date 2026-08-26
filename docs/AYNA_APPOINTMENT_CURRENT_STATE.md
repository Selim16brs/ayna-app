# AYNA — Randevu Yaşam Döngüsünün Mevcut Durumu (Faz 0)

> **Belge türü:** Keşif raporu · **Tarih:** 26.08.2026 · **Kaynak:** kod incelemesi
> **Şartname:** `AYNA_Randevu_Yasam_Dongusu_Claude_Code_Sartnamesi.md` §1
>
> Kodda **gerçekte ne olduğunu** anlatır; her iddia dosya:satır ile kanıtlıdır.

## Tek cümlelik özet

Randevu akışı büyük ölçüde çalışıyor ve kapora/iade/itiraz döngüsü sunucuya
taşınmış durumda — ama **slot tutma (hold) hiç yok** ve veritabanında **aynı
saate iki randevu yazılmasını engelleyen hiçbir kısıt yok.**

---

## 1. Durum makinesi

Sunucu enum'u **16 durum** taşıyor (`schema.prisma:202-220`):

```
confirmed · pending · completed · cancelled · awaiting_provider
alternative_proposed · no_show · waitlist · deposit_pending
deposit_submitted · refund_pending · refund_submitted · disputed
reassigned_pending · expired · completed_pending
```

İstemcide bir tane daha var: `sync_conflict` — yalnız yerel
(`apps/mobile/src/data.ts:877`), çevrimdışı kaydın sunucuda dolu slota
çakışmasını anlatıyor.

**Şartname 31 durum istiyor.** Eksik olanların işlevsel karşılığı da yok:

| Eksik durum                                 | Neyi kaybediyoruz                                                   |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `HELD`                                      | Slot tutma kavramı yok — ödeme sırasında saat kimseye kilitlenmiyor |
| `DEPOSIT_REVIEW`                            | Dekont incelenirken ayrı durum yok                                  |
| `PREPARATION_REQUIRED` · `READY`            | Hazırlık talimatı akışı yok                                         |
| `CUSTOMER_ON_THE_WAY` · `CUSTOMER_ARRIVED`  | Yola çıktım / geldim yok                                            |
| `IN_PROGRESS`                               | Hizmetin başladığı an kaydedilmiyor                                 |
| `RESCHEDULE_REQUESTED`                      | Erteleme talebi ayrı durum değil                                    |
| `NO_SHOW_REPORTED`                          | Uzman "gelmedi" dediğinde itiraz penceresi yok                      |
| `PAYMENT_REJECTED`                          | Reddedilen dekont ayrı durum değil                                  |
| `CUSTOMER_CANCELLED` / `PROVIDER_CANCELLED` | Tek `cancelled` var; **kimin iptal ettiği durumdan okunamıyor**     |

Son madde önemli: iptal politikası (kim iptal etti → kapora kime kalır) durumdan
türetilemiyor, ayrı alanlardan çıkarılmak zorunda.

---

## 2. Slot ve eşzamanlılık — en büyük boşluk

| Konu                   | Durum                                                       | Kanıt                                  |
| ---------------------- | ----------------------------------------------------------- | -------------------------------------- |
| Müsaitlik hesabı       | `computeDaySlots` saf fonksiyon, test edilmiş               | `packages/domain/src/booking/slots.ts` |
| Kapalı gün             | Destekleniyor                                               | `catalog.service.ts`                   |
| **Slot tutma (hold)**  | **YOK** — `HELD`, `holdUntil` gibi hiçbir kavram bulunamadı | grep: 0 sonuç                          |
| **Slot benzersizliği** | **YOK** — `(proId, startAt)` üzerinde kısıt yok             | `schema.prisma:224-276`                |
| Advisory lock          | Yalnız medya taşımada var, randevuda **yok**                | `media-migration.scheduler.ts:35`      |

`Booking` modelindeki tek benzersizlik kısıtı `receiptHash`
(`schema.prisma:267`) — dekont tekrarını engelliyor, slot çakışmasını değil.

**Pratik sonuç:** iki müşteri aynı anda aynı saate randevu oluşturursa ikisi de
başarılı olur, ikisi de kapora göndermeye yönlendirilir. Şartname §5.3-5.4 bunu
atomik tutma ve eşzamanlılık testi ile zorunlu kılıyor.

---

## 3. Kapora

| Konu             | Durum                                              | Kanıt                        |
| ---------------- | -------------------------------------------------- | ---------------------------- |
| Tutar            | **Sabit**, `rate.deposit_kzt` (varsayılan 1000)    | `quotes.service.ts:445-446`  |
| Oranlı hesap     | **YOK**                                            | —                            |
| Dekont yükleme   | Var, sha256 hash ile tekrar koruması               | `schema.prisma:267-268`      |
| Karşılıklı teyit | Var (`deposit_submitted` → uzman onayı)            | —                            |
| İade akışı       | Var (`refund_pending` → `refund_submitted` → onay) | —                            |
| Süre yönetimi    | Var, 60 saniyelik zamanlayıcı                      | `bookings.scheduler.ts:29`   |
| Geç iptal        | Kapora yakma, 3 saat penceresi                     | `bookings.policy.ts:4,23-27` |

Kapora tarafı şaşırtıcı derecede sağlam — dekont tekrarı, karşılıklı teyit ve
süre dolumu hepsi sunucuda. **Eksik olan tek şey tutarın oranlı hesaplanması**
(kullanıcı kararı: `clamp(fiyat × %10, 1.000, 5.000)`).

---

## 4. Zamanlayıcılar

| Zamanlayıcı                       | Aralık | Ne yapıyor                                                   |
| --------------------------------- | ------ | ------------------------------------------------------------ |
| `bookings.scheduler.ts:29`        | 60 sn  | Yanıt/dekont süresi dolumu, tamamlanma, no-show kapora yakma |
| `quotes.scheduler.ts:18`          | 5 dk   | Bayat dalgaları genişletme                                   |
| `media-migration.scheduler.ts:25` | 10 dk  | base64 → nesne depolama                                      |

Üçü de süreç içi `setInterval` ve `JOBS_ENABLED=false` ile kapatılabiliyor.
Yalnız medya taşıma advisory lock kullanıyor — **diğer ikisi çok örnekli
dağıtımda iki kez çalışabilir.**

---

## 5. Bildirim

Push + uygulama içi merkez var (`push.templates.ts`, tr/kk/ru sözlüğü).
Şartname §0.2'nin yasakladığı ücretli servislerden **hiçbiri kullanılmıyor** —
SMS, WhatsApp, ücretli e-posta yok. Bu tarafta uyum tam.

Ancak bildirimler **fire-and-forget**: `void this.push.sendToUser(...)`
(`quotes.service.ts:208` deseni). Başarısız push sessizce kayboluyor, tekrar
denenmiyor, kaydı tutulmuyor. Şartname §10.3 bunu outbox ile istiyor.

---

## 6. Şartnamenin zaten karşılanan maddeleri

Bunları yeniden yazmaya gerek yok:

- Sunucu tarafı kapora/iade/itiraz durum geçişleri
- Dekont sha256 tekrar koruması
- Kapalı gün ve çalışma saati desteği
- 60 saniyelik süre dolumu işleri
- Push + uygulama içi bildirim (ücretsiz kanallar)
- Salon–uzman takvim görünürlük kuralı (salon uzmanın kişisel randevusunu
  detaysız görüyor: `app/salon/agenda.tsx:154-177`)
- Audit log altyapısı (kullanımı zayıf olsa da mevcut)
