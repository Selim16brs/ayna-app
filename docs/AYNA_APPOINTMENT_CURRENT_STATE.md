# AYNA — Randevu Yaşam Döngüsünün Mevcut Durumu (Faz 0)

> **Belge türü:** Keşif raporu · **Tarih:** 26.08.2026 · **Kaynak:** kod incelemesi
> **Şartname:** `AYNA_Randevu_Yasam_Dongusu_Claude_Code_Sartnamesi.md` §1
>
> Kodda **gerçekte ne olduğunu** anlatır; her iddia dosya:satır ile kanıtlıdır.

## Tek cümlelik özet

Randevu akışı büyük ölçüde çalışıyor ve kapora/iade/itiraz döngüsü sunucuya
taşınmış durumda. İki gerçek boşluk var: randevunun doğduğu **üç yoldan birinde
hiç çakışma kontrolü yok** (ve o yol, ters-pazaryerinin ana müşteri yolu), ve
veritabanında **aynı saate iki randevu yazılmasını engelleyen hiçbir kısıt yok**
— korumanın tamamı uygulama katmanında.

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

**Şartname 31 durum istiyor** — ama sayı yanıltıcı. Şartnamenin kendisi
"kavramsal modelleri mevcut mimariye uyarlayarak" diyor, ve durumların bir kısmı
zaten **başka adla** var:

| Şartname durumu                   | Kodda karşılığı                                   |
| --------------------------------- | ------------------------------------------------- |
| `HELD`                            | ✅ `deposit_pending` — slotu tutar, süresi işler  |
| `DEPOSIT_REVIEW`                  | ✅ `deposit_submitted`                            |
| `COMPLETED_PENDING_CONFIRMATION`  | ✅ `completed_pending`                            |
| `NO_SHOW_REPORTED` / `_CONFIRMED` | ✅ `no_show` + `finalizeDeadline` teyit penceresi |
| `PAYMENT_REJECTED`                | ⚠️ ayrı durum yok; `deposit_pending`'e geri dönüş |

> **Düzeltme (26.08):** bu belgenin ilk sürümü "`HELD` yok, slot tutma kavramı
> yok" ve "uzman gelmedi dediğinde itiraz penceresi yok" diyordu. **İkisi de
> yanlıştı.** `deposit_pending` slotu tutuyor ve süresi doluyor; no-show'da
> kapora yakma anında değil, `policy.confirm_hours` penceresinin sonunda
> scheduler tarafından uygulanıyor (`bookings.service.ts:405-411`,
> `bookings.scheduler.ts:113`).

Gerçekten eksik olanlar:

| Eksik durum                                 | Neyi kaybediyoruz                                               |
| ------------------------------------------- | --------------------------------------------------------------- |
| `PREPARATION_REQUIRED` · `READY`            | Hazırlık talimatı akışı yok                                     |
| `CUSTOMER_ON_THE_WAY` · `CUSTOMER_ARRIVED`  | Yola çıktım / geldim yok                                        |
| `IN_PROGRESS`                               | Hizmetin başladığı an kaydedilmiyor                             |
| `RESCHEDULE_REQUESTED`                      | Erteleme talebi ayrı durum değil                                |
| `CUSTOMER_CANCELLED` / `PROVIDER_CANCELLED` | Tek `cancelled` var; **kimin iptal ettiği durumdan okunamıyor** |

Son madde önemli: iptal politikası (kim iptal etti → kapora kime kalır) durumdan
türetilemiyor, ayrı alanlardan çıkarılmak zorunda.

### Durum makinesi diye bir şey yoktu

`packages/domain/src/booking/state-machine.ts` bir durum makinesi taşıyor ama
**planlama belgesinin sözlüğüyle** yazılmış (`SCHEDULED`, `CHECK_IN_AVAILABLE`,
`CLOSED`…) ve Prisma enum'uyla hiç örtüşmüyor. **Sıfır tüketicisi vardı.**

Gerçek koruma `bookings.service.transition()` içindeki dört elemanlı bir kara
listeydi: yalnız `cancelled/completed/expired`'dan çıkış engelleniyordu (listede
`refunded` de vardı — Prisma enum'unda böyle bir durum yok, yani ölü madde).

Kara listenin bıraktığı boşluk: `deposit_pending → completed` serbestti. Yani
**kapora hiç ödenmeden randevu tamamlanmış sayılabiliyordu.**

---

## 2. Slot ve eşzamanlılık — en büyük boşluk

| Konu                 | Durum                                                                   | Kanıt                                  |
| -------------------- | ----------------------------------------------------------------------- | -------------------------------------- |
| Müsaitlik hesabı     | `computeDaySlots` saf fonksiyon, test edilmiş                           | `packages/domain/src/booking/slots.ts` |
| Kapalı gün           | Destekleniyor                                                           | `catalog.service.ts`                   |
| Slot tutma (hold)    | `HELD` adıyla yok ama **işlevsel olarak var**: `deposit_pending` + süre | `bookings.service.ts:466`              |
| **DB benzersizliği** | **YOK** — `(proId, startAt)` üzerinde kısıt yok                         | `schema.prisma:224-276`                |
| Uygulama içi koruma  | **İKİ yolda VAR** — advisory lock + `hasConflict`, ama **üçüncüde yok** | aşağıda                                |

> **Düzeltme (26.08):** bu belgenin ilk sürümü "randevuda advisory lock yok"
> diyordu; yanlıştı. `bookings.service.ts:292` ve `:479` `pg_advisory_xact_lock`
> kullanıyor. Doğru tespit, korumanın **eksik** olması — yok olması değil.

### Korunan ve korunmayan yollar

| Randevu doğuş yolu            | Koruma                                                | Kanıt                         |
| ----------------------------- | ----------------------------------------------------- | ----------------------------- |
| Offline/salon kaydı           | ✅ advisory lock + `hasConflict`                      | `bookings.service.ts:284-317` |
| Uzmanın talebi onaylaması     | ✅ advisory lock + `hasConflict`                      | `bookings.service.ts:479-527` |
| **Müşterinin teklif seçmesi** | ❌ **hiçbir kontrol yok** — doğrudan `booking.create` | `quotes.service.ts:448-471`   |

Korumasız olan, ters-pazaryerinin **ana müşteri yolu**. İki müşteri aynı uzmanın
aynı saatine teklif seçerse ikisi de başarılı olur ve ikisi de kapora göndermeye
yönlendirilir.

Ayrıca korunan iki yolda da savunma yalnız **uygulama katmanında**: `startAt`
alanına doğrudan yazan herhangi bir yeni kod yolu (veya elle SQL) sessizce
çakışma üretir. `Booking` modelindeki tek benzersizlik kısıtı `receiptHash`
(`schema.prisma:267`) — dekont tekrarını engelliyor, slot çakışmasını değil.

`ACTIVE_SLOT_STATUSES` bilinçli olarak `awaiting_provider`'ı **dışarıda
bırakıyor** (`bookings.service.ts:22-26`) — ters-pazaryerinde aynı slota birden
çok bekleyen talep olabilir, uzman birini seçer. Bu doğru; kısıt yazılırken de
korunmalı.

Şartname §5.3-5.4 atomik tutma ve eşzamanlılık testi zorunlu kılıyor.

---

## 3. Kapora

| Konu             | Durum                                              | Kanıt                        |
| ---------------- | -------------------------------------------------- | ---------------------------- |
| Tutar            | Yola göre DEĞİŞİYOR — aşağıdaki düzeltmeye bak     | `quotes.service.ts:445-446`  |
| Oranlı hesap     | Onay yolunda var (%20), teklif yolunda yok         | `bookings.service.ts:462`    |
| Dekont yükleme   | Var, sha256 hash ile tekrar koruması               | `schema.prisma:267-268`      |
| Karşılıklı teyit | Var (`deposit_submitted` → uzman onayı)            | —                            |
| İade akışı       | Var (`refund_pending` → `refund_submitted` → onay) | —                            |
| Süre yönetimi    | Var, 60 saniyelik zamanlayıcı                      | `bookings.scheduler.ts:29`   |
| Geç iptal        | Kapora yakma, 3 saat penceresi                     | `bookings.policy.ts:4,23-27` |

Kapora tarafı şaşırtıcı derecede sağlam — dekont tekrarı, karşılıklı teyit ve
süre dolumu hepsi sunucuda.

> **Düzeltme (26.08):** "Tutar sabit" satırı yalnız **teklif seçme** yolu için
> doğruydu. Uzmanın onay yolu zaten oranlı hesap yapıyordu (%20, 100 ₸'ye
> yuvarlamalı, `bookings.service.ts:462`) — ama o hesabın okuduğu üç ayar
> panelde tanımlı değildi, yani hiç değiştirilemiyordu. Yani aynı fiyata iki
> yoldan iki farklı kapora isteniyordu.

**İki gerçek boşluk:**

1. Hesabın iki yerde ayrı yaşaması (K1 ile tek yere alındı).
2. **Teklif seçme yolu `depositDeadline` hiç yazmıyordu.** `deposit_pending`
   slotu işgal ettiği için, ödemeyen müşterinin randevusu o saati **süresiz**
   kilitliyordu: scheduler'ın sorgusu `depositDeadline: { lt: now }` arıyor,
   NULL olan kayda hiç değmiyor.

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

Bildirimler **fire-and-forget** idi: `void this.push.sendToUser(...)`
(`quotes.service.ts:208` deseni). Başarısız push sessizce kayboluyor, tekrar
denenmiyor, kaydı tutulmuyordu. Expo'nun yanıtı **hiç okunmuyordu** — 200 dönse
bile mesaj başına hata verebiliyor, dolayısıyla geçersiz bir cihaz token'ı
sonsuza kadar aynı hatayı üretiyordu.

> **Çözüldü (26.08):** §10.3 outbox'ı kuruldu. Her bildirim önce
> `notification_outbox`'a yazılıyor, sonra teslim ediliyor. Teslim başarısızsa
> satır `pending` kalıyor ve zamanlayıcı artan aralıklarla (1dk / 5dk / 15dk /
> 1sa / 6sa / 24sa) tekrar deniyor; hak bitince `dead` olup log'a ERROR düşüyor.
> `DeviceNotRegistered` dönen token'lar siliniyor. Teslim edilen satırlar 7 gün
> sonra budanıyor (title/body kullanıcı adı taşıyabilir).
>
> Çağıran akış yine bloklanmıyor ve push hatası randevu/mesaj akışını bozmuyor —
> değişen tek şey, hatanın artık kaybolmaması.

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
