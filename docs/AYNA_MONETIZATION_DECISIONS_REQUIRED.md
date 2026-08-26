# AYNA — Karar Bekleyenler (Faz 0)

> **Tarih:** 26.08.2026
> Şartname §24: _"Sessiz varsayım yapma. Hukuk, muhasebe veya Kaspi sözleşmesi
> gerektiren her noktayı `DECISION_REQUIRED` olarak raporla."_
>
> Bu listedeki hiçbir madde onay alınmadan uygulanmayacak.

## Karar verilmiş olanlar

| #   | Konu                    | Karar                                                                                                                                                                | Tarih  |
| --- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| K1  | Kapora tutarı           | `clamp(fiyat × %10, 1.000 ₸, 5.000 ₸)` — admin config. Gelir belgesi §10.1'deki "1.000 ₸" örneği **düzeltilmiş sayılır** (20.000 ₸'lik hizmette kapora 2.000 ₸ olur) | 26.08  |
| K2  | Faz sırası              | **Randevu çekirdeği önce.** Komisyon faturası `COMPLETED` olayıyla doğduğu için gelir tarafı randevu durum makinesine dayanıyor                                      | 26.08  |
| K3  | Komisyon oranı (mevcut) | %10 — kod ve panel bu değerde                                                                                                                                        | önceki |
| K4  | **Para puan modeli**    | Şartname §8.4 yerine kurucunun modeli geçerli — aşağıda D1                                                                                                           | 26.08  |
| K5  | Gecikme penceresi       | **Hemen 45 dakika.** 7 günlük kısıtlı mod kaldırılıyor — aşağıda D2                                                                                                  | 26.08  |
| K6  | Karşılıksız vaatler     | **Ekrandan kaldırılacak** — aşağıda D10                                                                                                                              | 26.08  |
| K7  | Migration yaklaşımı     | Şartname §"Mevcut migration dosyalarını değiştirme veya silme" bağlayıcı — aşağıda D8                                                                                | 26.08  |

---

## D1 · Para puan modeli — **KARAR VERİLDİ (K4)**

Kurucu kararı şartname §8.4'ün yerine geçer. §8.4'teki "%5 harcama tavanı"
**yürürlükten kalkmıştır.**

### Kural

| #    | Kural                                                                                          |
| ---- | ---------------------------------------------------------------------------------------------- |
| K4.1 | Kullanıcı tamamlanmış işlemden sonra **para puan** kazanır; bir sonraki alışverişinde kullanır |
| K4.2 | **Kullanım kilidi:** bakiye **5.000 ₸** üzerine çıkana kadar puan harcanamaz (aşağıya bak)     |
| K4.3 | **Harcama tavanı:** her ödemede, ödenecek tutarın en çok **%25'i** puanla kapatılır            |
| K4.4 | **Son kullanma:** kazanılan puan **3 ay** içinde kullanılmazsa yanar                           |
| K4.5 | Bu dört kural da kullanıcıya ekranda açıkça gösterilir                                         |

### Eşik neden 50.000 değil 5.000

Karar önce **50.000 ₸** olarak verilmişti. Uygulama sırasında K4.2 ile K4.4'ün
birbirini kilitlediği ortaya çıktı:

Puanlar 90 günde yandığı için bakiye **birikmiyor** — eşiğe ulaşmak, 50.000
puanı **3 ay içinde** kazanmak demek. %3 geri kazanımla:

| Ortalama sepet | Gereken harcama (90 günde) | Gereken randevu |
| -------------- | -------------------------: | --------------: |
| 10.000 ₸       |                1.666.667 ₸ |             167 |
| 15.000 ₸       |                1.666.667 ₸ |             111 |
| 25.000 ₸       |                1.666.667 ₸ |              67 |

Yani kilit **matematiksel olarak hiç açılmıyordu**; puan sistemi kurulur kurulmaz
ölü doğardı.

**Kurucu kararı (26.08): eşik 5.000 ₸.** %3 kazanım ve 15.000 ₸ sepetle ≈11
randevu — düzenli müşteri için 3 ayda ulaşılabilir. Diğer üç kural (%25 tavan,
90 gün, %3 geri kazanım) aynen kaldı. Eşik admin ayarı: `rate.points_unlock_kzt`.

### Geri kazanım oranı

**%3 (kurucu onayı).** Bu oran uygulamada zaten yazılıydı
(`rewards.rules.earn`: "Her tamamlanan hizmette %3 geri kazan") ama karşılığını
veren hiçbir kod yoktu — kazanım kaynakları hoş geldin, referans, blog, yorum,
ilk randevu ve W2W beğenisiydi; hizmet bedelinden geri kazanım hiç yoktu.
Vaat artık karşılanıyor. Oran admin ayarı: `rate.points_earn_pct`.

Maliyet: komisyon %10 iken her 100 ₸ komisyonun ~30 ₸'si puana gidiyor.

### Mevcut sistemden farkı

| Konu              | Bugün kodda                                | Yeni model                                |
| ----------------- | ------------------------------------------ | ----------------------------------------- |
| Harcama tavanı    | %50 (`payment.split.ts:4`)                 | **%25**                                   |
| Kullanım kilidi   | Yok — 1 puan bile harcanabiliyor           | **5.000 ₸ eşiği**                         |
| Son kullanma      | 12 ay; ikisi hiç yanmıyordu                | **90 gün**, her kazanımda garanti         |
| Hizmetten kazanım | Vaat ediliyor, **verilmiyor**              | **%3**, tamamlanan her randevuda          |
| Bakiye hesabı     | Yanan puan bakiyeyi **eksiye** düşürüyordu | FIFO parti motoru; negatif imkânsız       |
| Görünürlük        | Bakiye var, kural metni yok                | Dört kural da ekranda, sunucu sayılarıyla |

### Uygulama varsayımları

Kurucu kararı iki noktada yoruma açık; şöyle uygulanacak, aksi söylenirse
değiştirilir:

| Varsayım | Seçim                                                                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **V1**   | Kilit **bir defalık açılır**: bakiye ilk kez eşiği geçtiğinde `pointsUnlockedAt` yazılır ve bir daha kapanmaz (harcayınca altına düşmek kilitlemez) |
| **V2**   | Son kullanma **kayıt bazlı (FIFO)**: her kazanım kendi 90 gününü taşır ve harcama partilerden düşülür. Süresi **en yakın** parti önce harcanır      |

V1'in gerekçesi: "eşiğin üzerine çıktıktan sonra kullanım açılır" cümlesi
kilidin açılmasını anlatıyor, sürekli bir eşik kontrolünü değil. Aksi hâlde
eşiğin hemen altında bakiyesi olan kullanıcı hiç harcayamaz duruma düşer.

V2'nin gerekçesi: bakiye bütününe tek son kullanma tarihi verilirse, her yeni
kazanım eski puanların ömrünü uzatır ve "3 ay" kuralı işlevsizleşir.

Yanan puan için deftere ayrı bir kayıt **yazılmaz**; bakiye partilerden türetilir.
Hem yazsak hem türetsek çift sayım olurdu. En yakın süreli partinin önce
harcanması kullanıcının lehinedir — ters sıra, yeni puanı harcayıp eskisini
yakardı.

Bu motor yol üstünde **gerçek bir hatayı** da kapattı: harcama kaydı hangi
kazanımdan düşüldüğünü taşımadığı için, kazanımın süresi dolduğunda bakiye
**eksiye** düşüyordu (`earn +100` yanınca `spend -100` kalıyor → −100). Bugün
canlıda 12 aylık ömür var, yani ilk kazanımlar dolduğunda ortaya çıkacaktı.

---

## D2 · Gecikme penceresi — **KARAR VERİLDİ (K5)**

**Karar: hemen 45 dakikaya geçilecek — UYGULANDI.** 7 günlük sabit kaldırıldı;
süre `rate.commission_grace_minutes` (varsayılan 45) ayarından okunuyor.

**Hukuki not (duruyor):** şartname §22 bu maddenin uzman sözleşmesinde açık
kabul gerektirdiğini söylüyor. Süre config olduğu için, sözleşme gerekçesiyle
pencereyi geçici olarak uzatmak kod değişikliği gerektirmiyor — panelden
10.080 (7 gün) yazmak eski davranışı geri getirir.

### Yol üstünde çıkan asıl sorun: pencere zaten hiç işlemiyordu

7 günü 45 dakikaya çekmek tek başına hiçbir şey değiştirmezdi, çünkü
**gecikme taramasını hiçbir zamanlayıcı çağırmıyordu** (Faz 0 bulgusu).
`runOverdue()` yalnız admin panelinde düğmeye basılınca çalışıyordu. Aynısı
abonelik sona erdirme için de geçerliydi: süresi dolan Premium/Platinum üyelik
`active` kalmaya devam ediyordu — yani ödemesi biten uzman ayrıcalıklarını
süresiz kullanıyordu.

`FinanceScheduler` bu boşluğu kapatıyor: 5 dakikada bir, advisory lock ile tekil
çalıştırma, iki iş birbirinden bağımsız (biri patlarsa diğeri yine çalışır).
Yerel Postgres'te 14 senaryoyla doğrulandı.

---

## D3 · Paket adları geçişi

**Durum:** Kodda `premium` / `platinum`. Şartname `AYNA Pro` / `AYNA Premium`.

**Eşleme önerisi:** `premium → AYNA Pro`, `platinum → AYNA Premium`.

**Karar gereken:** bu eşleme doğru mu? `platinum` bugün 1.999 ₸ ve "en üst
paket"; `AYNA Premium` de en üst paket, dolayısıyla eşleme mantıklı görünüyor —
ama fiyatlandırma da değişecek mi?

**Kesin olan:** geçmiş `Subscription` ve `CommissionInvoice` satırlarına
dokunulmayacak (§4).

---

## D4 · Komisyon matrisi ve seviye eşikleri

**Durum:** Sunucuda tek oran (%10). Mobilde "%8,5" satılıyor ama uygulanmıyor.

**Şartname varsayılanı:**

| Seviye  |   Pro | Premium |
| ------- | ----: | ------: |
| STARTER | %10,0 |   %10,0 |
| ACTIVE  |  %9,5 |    %9,5 |
| TRUSTED |  %9,0 |    %9,0 |
| ELITE   |  %9,0 |    %8,5 |

**Karar gereken:** bu oranlar ve §6.4'teki seviye eşikleri (90 günde 10/30/75
tamamlanmış randevu vb.) Kazakistan pazarı için doğru mu? Eşikler çok yüksekse
kimse TRUSTED olamaz; çok düşükse indirim herkese gider.

**Ayrıca:** bugün "%8,5" vaadi ekranda duruyor ve karşılığı yok. Matris
uygulanana kadar **bu vaadi ekrandan kaldırmalı mıyız?** (Yanlış vaat, uygulanan
yanlış orandan daha çok güven kaybettirir.)

---

## D5 · KDV — hukuk ve muhasebe onayı zorunlu

**Durum:** Sistemde KDV boyutu **hiç yok**.

**Şartname §7.1:** komisyon + yürürlükteki KDV uzmandan tahsil edilir; oran koda
sabit yazılmaz, her faturada `vat_rate_snapshot` saklanır.

**§22 kontrol listesi — SES Invest tarafından doğrulanacak:**

- KDV mükellefiyeti var mı?
- Yürürlükteki oran?
- Komisyonun KDV hariç gösterilmesi doğru mu?
- Fatura/akt/e-belge yükümlülüğü?

**Bu onay gelmeden KDV hesabı yazılamaz.** Mimari hazırlanır (snapshot alanı,
versioned config) ama oran boş bırakılır.

---

## D6 · %20 gecikme bedeli — hukuk onayı zorunlu

**Şartname §12.2:** ödenmemiş komisyon faturasına bir defalık %20.

**§22:** _"`%20` hükmü uzman sözleşmesinde açık kabul gerektirir ve hukuki
incelemeden geçmelidir."_

**Karar gereken:** uzman sözleşmesi bu hükmü içeriyor mu? İçermiyorsa
sözleşme güncellenmeden ceza uygulanamaz.

**Önerim:** mimariyi kur, **kapalı bayrakla** (feature flag) gönder, hukuk onayı
gelince aç.

---

## D7 · Kaspi ödeme bilgileri ve doğrulama

**Şartname §11.4-11.5:** SES Invest yasal unvanı, ödeme hedefi (versioned
`payment_destination`), dekont + manuel doğrulama.

**Karar gereken:**

- SES Invest'in Kaspi hesap bilgileri (koda yazılmaz, veritabanına girilir)
- Resmî merchant API sözleşmesi var mı? Yoksa manuel doğrulama kalıcı çözüm mü?

---

## D8 · Migration klasörü sapması — **KARAR VERİLDİ (K7)**

**Karar: şartnameye göre yapılacak.** Randevu şartnamesi §"Yasaklar" bu soruyu
zaten cevaplıyor:

> - Destructive migration yapma.
> - **Mevcut migration dosyalarını değiştirme veya silme.**
> - Yeni migration oluştur.

Yani "yeniden temellendirme" (a) **yasak** — geçmiş migration dosyalarına
dokunmayı gerektiriyor. `db push` tek yol (b) de yasak — şartname her fazın
migration + rollback planıyla kapanmasını istiyor (§"Her faz ayrı migration,
test, QA raporu ve rollback planıyla tamamlanmalıdır").

**Uygulanacak yol:** geçmişe dokunmadan, sapmayı kapatan **yeni bir uzlaştırma
migration'ı** yazılacak — eksik tabloları `CREATE TABLE IF NOT EXISTS` ile
kurar. Böylece:

- Hiçbir mevcut dosya değişmez veya silinmez (§ yasak korunur)
- Temiz veritabanında `prisma migrate deploy` şemayı eksiksiz kurar
- Üretimde hiçbir şey değişmez (tablolar zaten var, `IF NOT EXISTS` geçer)
- Bundan sonraki finans migration'ları koşulsuz yazılabilir

**Durum:** `commission_invoices` migration'larda oluşturuluyor ama **`payments`
oluşturulmuyor**; üretim `db push` ile dağıtılmış. Bu, PR #20'de koşulsuz bir
`ALTER TABLE "payments"` yazdığımda boş bir veritabanında
`relation does not exist` hatasıyla patlayarak kendini gösterdi.

---

## D9 · Referans puanının zamanlaması

**Durum:** Referans puanı (300) **kayıt anında** veriliyor
(`referral.service.ts:86-105`).

**Şartname §8.2:** _"yalnız davet edilen kişinin ilk tamamlanmış randevusundan
sonra"_.

**Karar gereken:** mevcut davranış sahte davet ekonomisine açık. Değiştirmek
kolay ama bekleyen davetler ne olacak?

**Önerim:** yeni davetler için kuralı hemen uygula; verilmiş puanlar geri
alınmaz.

---

## D10 · Karşılıksız vaatler — **KARAR VERİLDİ (K6)**

**Karar: vaatler ekrandan kaldırılacak.** İkisi de bugün ekranda satılıyor,
ikisinin de sunucuda karşılığı yok (`data.ts:1905`,
`seller/premium.tsx:21`).

| Vaat                        | Sunucuda karşılığı                    | Ne zaman geri gelir            |
| --------------------------- | ------------------------------------- | ------------------------------ |
| "Platinum'da komisyon %8,5" | Yok — `membershipTier` hiç okunmuyor  | Komisyon matrisi uygulanınca   |
| "Öncelikli talepler"        | Yok — dalga sırası KYC + kayıt tarihi | Premium head-start uygulanınca |

Yerlerine yalnız **bugün gerçekten verilen** avantajlar yazılacak. Vaat, karşılığı
kodda çalıştığı gün geri konur — daha önce değil.
