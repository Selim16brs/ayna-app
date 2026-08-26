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

---

## D1 · Puan harcama tavanı — **acil, her gün gelir sızdırıyor**

**Durum:** Kodda bir müşteri randevunun **%50'sini** puanla ödeyebiliyor
(`payment.split.ts:4`). Şartname §8.4 bunu **%5** ile sınırlıyor.

**Örnek:** 10.000 ₸'lik randevu → bugün 5.000 ₸ puanla ödenebiliyor, şartnameye
göre 500 ₸.

**Neden karar gerekiyor:** mevcut kullanıcıların biriken bakiyesi ve bu bakiyeyi
nasıl harcayacaklarına dair beklentisi var. Tavanı bir gecede %50'den %5'e
indirmek, "puanımı kullanamıyorum" şikâyeti üretir.

**Seçenekler:**

|     | Yaklaşım                                                    | Sonuç                                                      |
| --- | ----------------------------------------------------------- | ---------------------------------------------------------- |
| a   | Hemen %5'e indir                                            | Gelir sızıntısı bugün durur; mevcut kullanıcı tepkisi olur |
| b   | Duyuruyla kademeli indir (%50 → %25 → %10 → %5)             | Yumuşak geçiş, sızıntı birkaç ay sürer                     |
| c   | Mevcut bakiyeler eski tavanla, yeni kazanımlar yeni tavanla | En adil, en karmaşık — bakiyeyi iki havuza ayırmak gerekir |

**Önerim:** (b) — 30 günlük duyuru + tek adımda %5. Kademeli üç adım, sistemi
gereksiz karmaşıklaştırır.

---

## D2 · 7 günlük kısıtlı mod

**Durum:** Vade + 7 gün gecikmede uzman "kısıtlı mod"a giriyor
(`commissions.service.ts:186-224`). Gelir şartnamesi §0.1.3: _"eski dönemsel
faturalama, 7 günlük kısıtlı mod ve Premium/Platinum paket adları bu belgedeki
yeni kurallarla değiştirilmiştir."_

Yeni kural: **45. dakikada** otomatik `SUSPENDED_FINANCIAL`.

**Karar gereken:** 7 günden 45 dakikaya geçiş, uzmanlar için çok sert bir
değişiklik. Sözleşmede açık hüküm gerekiyor (§22).

**Seçenekler:** hemen geç · sözleşme güncellemesinden sonra geç · geçiş
döneminde daha uzun pencere (örn. 24 saat) uygula.

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

## D8 · Migration klasörü sapması — teknik borç kararı

**Durum:** `migrations/` klasörü ile `schema.prisma` birbirini tutmuyor.
Kanıt: `commission_invoices` migration'larda oluşturuluyor ama **`payments`
oluşturulmuyor**; üretim `db push` ile dağıtılmış.

**Bu, PR #20'de koşulsuz bir `ALTER TABLE "payments"` yazdığımda boş bir
veritabanında `relation does not exist` hatasıyla patlayarak kendini gösterdi.**

**Seçenekler:**

|     | Yaklaşım                                     | Sonuç                                                   |
| --- | -------------------------------------------- | ------------------------------------------------------- |
| a   | Migrations'ı şemaya göre yeniden temellendir | Temiz kurulum mümkün olur; bir defalık iş               |
| b   | Migrations'ı bırak, `db push` tek yol olsun  | En az iş; ama şema geçmişi ve geri dönüş kaydı kaybolur |
| c   | Şimdilik koşullu migration yazmaya devam et  | Bugünkü çözüm; borç birikir                             |

**Önerim:** (a) — finans tablolarına dokunmaya başlamadan önce. Para sisteminde
geri dönebilmek şart ve bu ancak güvenilir bir migration geçmişiyle olur.

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

## D10 · "%8,5 komisyon" ve "öncelikli talepler" vaatleri

**Durum:** İkisi de ekranda satılıyor, ikisinin de sunucuda karşılığı yok
(`data.ts:1905`, `seller/premium.tsx:21`).

**Karar gereken:** matris ve premium head-start uygulanana kadar bu vaatleri
ekrandan kaldıralım mı?

**Önerim:** evet. Ödediği şeyi alamayan uzman, hiç vaat edilmemiş olmasından çok
daha fazla güven kaybeder.
