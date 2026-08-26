# AYNA — Gelir Sisteminin Mevcut Durumu (Faz 0)

> **Belge türü:** Keşif raporu · **Tarih:** 26.08.2026 · **Kaynak:** kod incelemesi
> **Şartname:** `AYNA_Gelir_Paket_Puanlama_Kacak_Onleme_Claude_Code_Sartnamesi.md` §1
>
> Bu belge kodda **gerçekte ne olduğunu** anlatır. Her iddia dosya:satır ile
> kanıtlanmıştır. Şartnamenin ne istediği ve aradaki fark ayrı belgededir
> (`AYNA_MONETIZATION_GAP_ANALYSIS.md`).

## Tek cümlelik özet

Gelir sistemi **mimari olarak var ama işlevsel olarak atıl**: komisyon tahakkuku,
gecikme takibi ve abonelik sona erdirme doğru yazılmış ama **hiçbirini bir
zamanlayıcı çağırmıyor** — üçü de yalnız admin panelinde bir düğmeye basılınca
çalışıyor.

> **Güncelleme (26.08):** gecikme taraması ve abonelik sona erdirme için
> `FinanceScheduler` yazıldı (5 dk, advisory lock). Komisyon tahakkuku hâlâ
> dönem kapanışına bağlı; şartname bunu `COMPLETED` olayına taşımayı istiyor,
> o iş komisyon fazında.

---

## 1. Abonelik ve paket

| Konu                    | Durum                                                             | Kanıt                                    |
| ----------------------- | ----------------------------------------------------------------- | ---------------------------------------- |
| Uzman/müşteri aboneliği | Tek `Subscription` modeli, ikisi de aynı tabloda                  | `schema.prisma:766-785`                  |
| Paket adları            | `premium`, `platinum` (serbest metin, enum değil)                 | `subscriptions.service.ts:7`             |
| Paket fiyatı            | Kodda sabit: `{ premium: 999, platinum: 1999 }`                   | `subscriptions.service.ts:7`             |
| Durum değerleri         | Enum yok; `pending`/`active`/`rejected`/`expired` metin sabitleri | `subscriptions.service.ts:40,86,110,130` |
| Satın alma              | Tamamen manuel: dekont yükle → admin onayla                       | `subscriptions.service.ts:36-52, 78-103` |
| Ödeme geçidi            | YOK (şartname de istemiyor)                                       | —                                        |

**Çelişki:** paket fiyatları hem `subscriptions.service.ts:7`'de sabit hem
`settings.dto.ts:10-11`'de admin-parametrik olarak tanımlı. **Servis config'i hiç
okumuyor** — admin panelden fiyat değiştirmek hiçbir şey yapmıyor.

**Üç paralel doğruluk kaynağı:** müşteri premium'u `User` üzerinde üç ayrı alanda
tutuluyor — `isPremium`, `membershipTier`, `membershipUntil`
(`schema.prisma:56,63,65`). `isPremium` aslında AI kotası bayrağıydı
(`schema.prisma:55` yorumu), sonradan üyelik bayrağı olarak da kullanılmış.

---

## 2. Komisyon

| Konu               | Durum                                                | Kanıt                                               |
| ------------------ | ---------------------------------------------------- | --------------------------------------------------- |
| Oran               | Tek global oran, varsayılan %10                      | `settings.dto.ts:5`, `commissions.service.ts:17-20` |
| Seviyeye göre oran | **Sunucuda YOK**                                     | —                                                   |
| Fatura modeli      | `CommissionInvoice` var                              | `schema.prisma:740-763`                             |
| Tahakkuk zamanı    | Randevu tamamlanınca değil, **elle dönem kapatınca** | `commissions.service.ts:45-100`                     |
| KDV                | **Hiç yok** (yalnız `vatPayer` kayıt bayrağı)        | `schema.prisma:377`                                 |
| Gecikme bedeli     | **Parasal ceza yok**; yalnız kapora yakma            | `bookings.policy.ts:23-27`                          |
| Askıya alma        | Var ama iki kopuk katman                             | `schema.prisma:29-33, 50-51`                        |

### 2.1 Satılan ama var olmayan özellik

Mobil uygulama ve i18n metinleri **"Platinum'da komisyon %8,5"** vaat ediyor
(`apps/mobile/src/data.ts:1904-1905`, `packages/i18n/src/messages/tr.ts:1575`).
Sunucuda komisyon hesaplanırken `membershipTier` **hiç okunmuyor**. Yani bu
avantaj satılıyor ama uygulanmıyor.

### 2.2 İki ayrı komisyon motoru

Aynı sayıyı iki farklı kod yolu hesaplıyordu:

- Faturalama: `commissions.calc.ts:6` → `Math.round(gross * rate) / 100`
- Panel: `admin.service.ts:242` → `Math.round(Math.round(price*100) * rate) / 100`

> **Kesinleştirme (26.08):** ilk sürüm "yuvarlamaları farklı, er ya da geç
> tutmayacak" diyordu — doğru ama belirsizdi. Sayısal olarak ölçüldü:
> **tam sayı oranlarda ikisi birebir aynı**, kesirli oranlarda 1 tiyn ayrışıyor
> (1.000.000 rastgele örnekte 1.955 sapma, hepsi %8,5 gibi oranlarda).
>
> Yani bugün (%10) hiçbir fark yok; ayrışma **D4'ün oran matrisi (%8,5/%9/%9,5)
> devreye girdiği gün** başlayacaktı. İki yol tek fonksiyonda birleştirildi.

### 2.3 Fatura tekilliği garanti değil — ÇÖZÜLDÜ

`closePeriod()` aynı dönem için fatura var mı diye **önce okuyup sonra
yazıyordu**; `(proId, periodStart, periodEnd)` üzerinde unique constraint yoktu.
Eşzamanlı iki çağrı çift fatura — yani aynı borcu iki kez — üretebilirdi.

Kısıt veritabanına eklendi; üç paralel kapanış çağrısıyla doğrulandı.

### 2.4 Dönem filtresi yanlış alandaydı — GELİR SIZINTISI

`closePeriod()` randevuları **`createdAt`** ile filtreliyordu. Haziranda oluşup
ağustosta tamamlanan bir randevu:

- haziran dönemi kapatıldığında henüz `completed` değil → sayılmaz,
- ağustos döneminde `createdAt` penceresi dışında → yine sayılmaz.

Yani **hiçbir dönemde faturalanmıyordu.** `bookings.completed_at` eklendi ve
dönem artık tamamlanma tarihine göre belirleniyor. Geçmiş kayıtlar için
`completed_at = created_at` dolduruldu: kapanmış dönemleri retroaktif olarak
yeniden hesaplamak çift ya da eksik fatura üretirdi.

### 2.6 Para float'ta toplanıyordu — ÇÖZÜLDÜ

CLAUDE.md bağlayıcı kuralı: _"Para: NUMERIC(12,2), KZT, asla float."_ Dönem
kapanışı ve admin paneli fiyatları `Number(price)` olarak **topluyordu**.

Ölçüldü: 4000 dönemin **150'sinde (%3,75)** komisyon tutarı farklı çıkıyor.
Float toplamı yuvarlama sınırının hemen altına düşüyor
(`1360443.4499999993` ≠ `1360443.45`) ve `Math.round` aşağı yuvarlıyor.

Sapma 1 tiyn — ama asıl sorun tutar değil: **fatura yeniden hesaplanamıyordu.**
Aynı randevulardan aynı sayı çıkmıyordu.

Ayrıca panel ile fatura **farklı sırayla** topluyordu: panel randevu başına
yuvarlayıp topluyordu (`sum(round(x))`), fatura toplamdan hesaplıyordu
(`round(sum(x))`). Bu iki yol yapısal olarak ayrışır — örnek:
`[20244.86, 47936.39, 22172.25]` %8,5'te fatura **7.680,05**, eski panel
**7.680,04**.

Toplama artık tam sayı kuruş (tiyn) üzerinden; komisyon her iki yolda da
kova cirosundan **tek kez** hesaplanıyor.

### 2.5 Oran anlık görüntüsü yoktu — EKLENDİ

Fatura kesildikten sonra `commission.rate` değişince geçmiş faturaların tutarı
açıklanamaz hâle geliyordu: tutar eski orandan, panel yeni orandan hesaplardı.
`commission_invoices.commission_rate` artık faturaya yazılıyor.

---

## 3. Puan ve sadakat

| Konu              | Durum                                                             | Kanıt                                      |
| ----------------- | ----------------------------------------------------------------- | ------------------------------------------ |
| Ledger            | Var, append-only, bakiye türetiliyor                              | `schema.prisma:175-194`, `ledger.ts:26-36` |
| Kazanım kuralları | **Beş dosyaya dağılmış**, bir kısmı istemcide                     | aşağıda                                    |
| Harcama tavanı    | %50 sabit yazılmış                                                | `payment.split.ts:4`                       |
| Funding source    | **YOK** — PR #20 ile eklendi                                      | —                                          |
| Katmanlar         | `bronze/silver/gold` hesaplanıyor ama **hiçbir avantaj vermiyor** | `loyalty.service.ts:19-43`                 |

### 3.1 Kazanım kurallarının dağınıklığı

| Kaynak        |             Puan | Nerede                                  |
| ------------- | ---------------: | --------------------------------------- |
| Hoş geldin    |              200 | `auth.service.ts:84-91` (sunucu)        |
| Referans      | 300 (iki tarafa) | `referral.service.ts:6,86-105` (sunucu) |
| Blog katkısı  |      admin seçer | `content.service.ts:221-227` (sunucu)   |
| Uzman gelmedi |             1000 | `store.ts:1681` (**istemci**)           |
| Yorum         |               40 | `store.ts:1857` (**istemci**)           |
| İlk randevu   |              300 | `store.ts:1861` (**istemci**)           |
| W2W beğeni    |                1 | `store.ts:2078` (**istemci**)           |

Son dördü istemcide yaşıyordu ve sunucu bunları doğrulamadan yazıyordu — **bu bir
para basma açığıydı, PR #19 ile kapatıldı.**

### 3.2 Kullanılmayan config

`settings.dto.ts` şu ayarları tanımlıyor ve admin paneline gösteriyor, ama
**hiçbir tüketici bunları okumuyor** — her biri kendi sabitini kullanıyor:

- `rate.points_cap_pct` (varsayılan 50) → `payment.split.ts:4` 0.5 sabit
- `rate.late_cancel_pct` (varsayılan 3) → hiçbir hesapta kullanılmıyor
- `rate.raffle_cost` (varsayılan 500) → `loyalty.service.ts:12` 100 sabit
- `rate.premium_user_kzt` (varsayılan 999) → `subscriptions.service.ts:7` sabit

Yani admin panelinden bu değerleri değiştirmek **hiçbir şey yapmıyor.**

---

## 4. Sıralama ve teklif dağıtımı

| Konu              | Durum                                          | Kanıt                             |
| ----------------- | ---------------------------------------------- | --------------------------------- |
| Uzman sıralaması  | `orderBy: { rating: 'desc' }` — tek kriter     | `catalog.service.ts:95`           |
| Teklif sıralaması | İstemcide: `rating*20 − km*2 − fiyat/2000`     | `data.ts:1728`                    |
| Dalga dağıtımı    | **Var** — 5'lik dalga, 30 dk, en fazla 4 dalga | `quotes.service.ts:217-289`       |
| Dalga sırası      | KYC onaylı önce, sonra **kayıt tarihi**        | `quotes.service.ts:235-238`       |
| Premium önceliği  | **YOK**                                        | —                                 |
| Performans skoru  | **YOK**                                        | —                                 |
| Rozetler          | Yalnız admin elle veriyor                      | `admin.service.ts:1037,1058,1078` |

Dalga sıralaması bilinçli olarak kıdeme göre yapılmış; koddaki yorum
(`quotes.service.ts:216`) eşleştirmenin açıklanabilir olması gerektiğini
söylüyor. **`premium.b.demands` ("öncelikli talepler") satılıyor ama sunucuda
karşılığı yok.**

Ham veri toplanıyor ama hiç kullanılmıyor: `respondedAt`, `responseDeadline`
(`schema.prisma:264-265`), `experienceYears`, `reviewCount` — hiçbiri bir skora
dönüşmüyor.

---

## 5. Kaçak önleme

İki bağımsız ve **tutarsız** dedektör var:

| Yer                   | Ne yakalıyor                                             | Kanıt                     |
| --------------------- | -------------------------------------------------------- | ------------------------- |
| Mesajlar              | Yalnız **telefon rakamları**                             | `messaging.util.ts:53-55` |
| Teklif/kampanya metni | Telefon + URL + @kullanıcı + instagram/whatsapp/telegram | `offers.rules.ts:13-20`   |

Güçlü olan dedektör mesajlaşmada **kullanılmıyor**. Mesajlarda IBAN, kart, Kaspi
yönlendirmesi tespiti yok. Yorumlar, profil metinleri ve W2W gönderilerinde
hiçbir tarama yok.

**Risk/enforcement tablosu yok.** Bayraklanan mesajlar genel audit log'a
yazılıyor (`messaging.service.ts:162-167`). Bir kullanıcıyı sayılabilir ihlal
geçmişine bağlayan hiçbir yapı yok; `restrictedAt` tek bir zaman damgası, sayaç
veya sebebe bağlantı içermiyor.

---

## 6. Altyapı

| Konu                             | Durum                                                   | Kanıt                       |
| -------------------------------- | ------------------------------------------------------- | --------------------------- |
| Zamanlayıcılar                   | 3 adet, hepsi süreç içi `setInterval`                   | aşağıda                     |
| **Para işleri için zamanlayıcı** | **YOK**                                                 | —                           |
| Outbox / event bus               | **YOK**                                                 | —                           |
| Audit servisi                    | Var ama para servisleri **atlıyor**                     | `audit.service.ts:24-40`    |
| Para tipi                        | Şemada `Decimal(12,2)`, serviste **JS float'a düşüyor** | `commissions.service.ts:68` |
| Idempotency                      | Genel mekanizma **yok**                                 | —                           |

### 6.1 En kritik bulgu

```
closePeriod()  → yalnız admin HTTP çağrısı   (commissions-admin.controller.ts:22)
runOverdue()   → yalnız admin HTTP çağrısı   (commissions-admin.controller.ts:35)
expireDue()    → yalnız admin HTTP çağrısı   (subscriptions-admin.controller.ts:37)
```

Faturalama, gecikme takibi ve abonelik sona erdirme **yalnız bir insan düğmeye
bastığında** çalışıyor. `@nestjs/schedule` projede hiç kullanılmıyor.

### 6.2 Para servisleri en zayıf audit kaydını üretiyor

`CommissionsService`, `SubscriptionsService` ve `SettingsService` merkezi
`AuditService`'i kullanmak yerine kendi özel `audit()` yardımcılarını yazmış
(`commissions.service.ts:22-32` vb.) ve `requestId`, `ipHash`, `deviceHash`,
`safeDiff` alanlarını hiç doldurmuyor. Yani **parayı değiştiren eylemler
sistemdeki en izsiz eylemler.**

### 6.3 Decimal → float sızıntısı

Şemadaki her `Decimal` servis sınırında `Number()` ile JS float'a çevriliyor
(`commissions.service.ts:68`, `admin.service.ts:212`, `payment.service.ts:29`).
Şemanın ondalık hassasiyeti orada kayboluyor.

---

## 7. Bu keşifte bulunup düzeltilen iki açık

| Açık                                            | Etki                                              | Düzeltme       |
| ----------------------------------------------- | ------------------------------------------------- | -------------- |
| `POST /loyalty/earn` tutarı istemciden alıyordu | Her kullanıcı sınırsız para basabiliyordu         | PR #19 (merge) |
| Puan indirimini uzman sessizce finanse ediyordu | Uzman hem az nakit alıp hem tam komisyon ödüyordu | PR #20 (merge) |
