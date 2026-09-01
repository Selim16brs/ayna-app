# AYNA — Özellikler

Bu belge **koddan çıkarıldı**, tasarım niyetinden değil: aşağıdaki her madde
depoda çalışan bir ekrana, bir API ucuna ya da bir veri modeline karşılık
geliyor. Sayılar (`%10`, `3 saat`, `200.000 ₸`) varsayılan değerlerdir ve
admin panelinden değiştirilebilir.

**Ölçek:** 94 ekran · 305 API ucu · 57 veri modeli · 3 dil (tr kaynak, kk, ru)

---

## 1 · AYNA ne yapıyor

Kazakistan pazarı için **kadın odaklı güzellik ve kişisel bakım pazar yeri**.
İki tarafı buluşturuyor:

- **Müşteri** — uzman/salon arar, randevu alır, depozito öder, hizmeti alır,
  değerlendirir.
- **Uzman / Salon** — talepleri görür, randevuyu onaylar, takvimini yönetir,
  kazancını takip eder, reklam vererek öne çıkar.

Aradaki güveni AYNA kuruyor: depozito, kimlik doğrulama, anonim yorum,
konum gizliliği ve uyuşmazlık hakemliği platformun kendi işi.

---

## 2 · Randevu akışı (çekirdek)

Randevunun **18 durumu** var ve geçişler sunucuda bir durum makinesiyle
korunuyor — geçersiz geçiş kabul edilmiyor.

`taslak → onay_bekliyor → degisiklik_onerildi / karsi_oneri →
depozito_bekliyor → kesinlesti → erteleme_onerildi → hizmet_gunu →
odeme_bekliyor → tamamlandi → degerlendirme → kapandi`

Ayrılan yollar: `iptal_musteri`, `iptal_uzman`, `otomatik_dustu`,
`no_show_musteri`, `no_show_uzman`, `uyusmazlik`.

### Kurallar

| Kural                    | Varsayılan                            |
| ------------------------ | ------------------------------------- |
| Uzmanın yanıt süresi     | **3 saat** — geçerse randevu düşer    |
| Depozito                 | Hizmet bedelinin **%10**'u            |
| Depozito ödeme süresi    | **10 dakika** — geçerse randevu düşer |
| Ücretsiz iptal penceresi | Randevuya **3 saatten** fazla varsa   |
| Geç iptal                | Depozito **yanar** (iade yok)         |
| Erteleme hakkı           | Randevu başına **1 kez**              |
| AYNA komisyonu           | **%10** (Platinum'da düşer)           |

### Kimin sırası olduğu her zaman belli

Ekran hangi tarafın ne yapacağını söylüyor: sırası gelen tarafta tek bir
birincil düğme, karşı tarafta "bekleniyor" nabzı. Geri sayımlar görünür —
görünmez zaman sınırı yok.

---

## 3 · Ödeme ve para

- **Depozito Kaspi ile.** Uygulama Kaspi'yi açar, alıcı (SES INVEST TOO)
  hazır gelir. Tutarı müşteri elle girer (Kaspi işyeri QR'ı tutar taşımıyor),
  açıklamaya **ödeme kodunu** yazar (`AYNA-XXXXX`). Kod ödemeyi randevuyla
  eşleştirir; admin panelinde de aynı kod görünür.
- **Dekont yüklendiği an randevu kesinleşir.** Admin doğrulaması sonradan
  gelir ve yalnız sahte dekontu geri alır.
- **Aynı dekont iki kez kullanılamaz** (içerik özeti benzersiz saklanır).
- **Kalan tutar hizmetten sonra**, doğrudan uzmana. Müşteri "ödedim" der,
  uzman "aldım" diye teyit eder.
- **İade** — hakkı doğduğunda müşteri hesap bilgisini girer, AYNA öder.
  Bilgi yalnız iadeyi yapan ekiple paylaşılır; uzmana gitmez.
- Para **NUMERIC(12,2)**, KZT, asla ondalık kayan sayı. Bakiye **ledger**'dan
  türetilir.

---

## 4 · Müşteri tarafı

### Keşfet

Marka başlığı, şehir seçici, mesaj ve bildirim; karşılama + AYNA puanı ve
sadakat seviyesi; arama; üç hızlı eylem (**Randevu Al**, **Dileğini Anlat**,
**Haritada Keşfet**); 10 hizmet kategorisi; depozito iade bandı; bekleyen
randevu kartı (aşama + ilerleme + Ertele/Yaz/Yol); **Senin İçin Seçtiklerimiz**
(ücretli vitrin); **Fırsatlar**; **Bu Hafta Trend**; **Yakınındaki Salonlar**.

### Randevu alma

- **Doğrudan** — uzman seç, hizmet(ler) seç, takvimden boş saat seç.
  Dolu saatler görünür ve seçilemez; slot çakışması veritabanı düzeyinde
  engellenir.
- **Dileğini Anlat** — fotoğraf ve bütçeyle talep aç, uzmanlar teklif
  gönderir, en uygununu seç.
- **Salon üzerinden** — salon seç, kadrodan uzman seç.

### Randevularım

Yaklaşan · Talepler · Geçmiş. Her kartta durum, sıradaki eylem ve bekleyen
tarafın işareti.

### Bakım (kişisel alan)

Bakım skoru ve tutarlılık; rutinler (periyodik hatırlatma); özel günler;
kişisel günlük ve anlar; **Boni** — AI güzellik danışmanı.

### AYNA W2W (topluluk)

Kadından kadına soru-cevap; **anonim paylaşım** (salon ve uzman yorum
sahibini göremez); kaydedilenler; takip; faydalı işareti; moderasyon ve
şikâyet; **AYNA Life** yazıları.

### Profil

Üyelik, adresler, takip ettiklerim, değerlendirmelerim, bildirim tercihleri,
gizlilik, **güvenlik pasaportu**, bütçe, yardım, dil, görünüm (sistem/açık/koyu).

### Güven ve güvenlik

- **Güvenlik seansı** — randevu boyunca güvenilen kişiye durum paylaşımı.
- **Güvenilen kişiler** — konum ve durum yalnız onlarla.
- **Konum izinsiz paylaşılmaz.** Uzman müşterinin numarasını görmez;
  salon adresi onay sonrası açılır.
- **Engelleme ve şikâyet** — kullanıcı, yorum ve gönderi düzeyinde.

### Sadakat

- Harcamanın **%1'i** puan olarak kazanılır.
- Puan **12 ayda** dolar.
- Bakiye **5.000 ₸**'ye ulaşınca kullanılabilir.
- Bir ödemede biriken puanın en fazla **%25'i** kullanılır.
- **Çekiliş** — 500 puan = 1 bilet.
- Bronz / Gümüş / Altın seviyeleri.

---

## 5 · Uzman ve salon tarafı

### Uzman ana ekranı

Tarih ve selam, rol rozeti; **Canlı Özet** (yaklaşan, tamamlanan, gelmeyen
oranı, tamamlanan gelir, ödenecek komisyon); paket tanıtımı; **Talepler** ve
**Takvimim**; **reklam durumu**; **Yanıt & Kalite** (ort. yanıt süresi,
bekleyen dekont, tamamlanma); **Performans** (hafta/ay/tümü); **Neden
görünüyorsun** — sıralamayı belirleyen etkenler açıkça yazılı, gizli puan yok.

### Yönetim ekranları

Hizmet listesi ve fiyatlar · çalışma saatleri · ajanda ve bloklar ·
gelen talepler · galeri · yorumlar ve yanıtlar · kazançlar · promosyonlar ·
kampanyalar · davet kodları · yeniden kazanım · paylaşım kartı (QR) ·
kimlik doğrulama (KYC) · salona katılma · takvim izni · çevrimdışı mod.

### Salon

Salon ana ekranı, kadro yönetimi, salon ajandası, profil ve düzenleme.
Salon uzmanın hizmetlerini **yalnız görüntüler**, değiştiremez.

### Üyelik

Free · **Premium** (999 ₸/ay) · **Platinum** (4.990 ₸/ay salon).
Premium keşifte öne çıkarır; Platinum sadık müşteri portföyü ve düşük
komisyon verir. Ödeme Kaspi + dekont, admin onaylar.

### Reklam (ücretli vitrin)

- Uzman/salon **Fırsatlar** ya da **Öne çıkanlar** vitrinini satın alır.
- **200.000 ₸/ay** (panelden değiştirilebilir), 1/3/6 ay.
- Ödeme Kaspi + dekont; admin onaylayınca yayına girer.
- Yayın penceresi sunucuda: süre bitince reklam kendiliğinden düşer.
- Uzman ana ekranında **"Reklamın yayında · 1/30. gün · 29 gün kaldı"**.
- Vitrinde **Sponsorlu** etiketi zorunlu.

---

## 6 · Yönetim paneli

24 bölüm: Genel Bakış · İstatistik · Salon Onayları · Uzman Doğrulama ·
Kimlik (KYC) · Destek Talepleri · Profil Değişiklikleri · Abonelik
Dekontları · Depozito İtirazları · Yorum İtirazları · W2W Moderasyon ·
Tüm Üyeler · Ceza Takibi · Canlı Talepler · Keşfet Kataloğu · Hizmet
Kategorileri · Taban Fiyatlar · Blog & Tema · Duyurular · Kampanyalar ·
Reklamlar · **Randevu & Ödeme Kuyrukları** · Komisyon Takibi · Puan Ekonomisi.

Panoda bekleyen iş sayaçları: her kuyruk tıklanabilir bir kart.

### Panelden yönetilen değerler

`commission.rate` · `rate.deposit_pct` · `rate.cancel_window_h` ·
`policy.free_reschedules` · `policy.hold_minutes` · `policy.response_hours` ·
`rate.late_cancel_pct` · `rate.points_cap_pct` · `rate.points_unlock_kzt` ·
`rate.points_expiry_days` · `rate.points_earn_pct` · `rate.premium_user_kzt` ·
`rate.premium_salon_kzt` · `rate.ad_monthly_kzt` · `rate.raffle_cost`

---

## 7 · Platformun kendi kuralları

- **Gizlilik tasarımdan** — hassas veri, konum, anonim yorum ve sağlık
  bilgisi ayrı ele alınır; PII, sağlık ve ham konum **log'a ve analytics'e
  asla** gitmez.
- **Üç dil** — tr (kaynak), kk, ru. Ekranda tek bir sabit metin yok; parite
  testi üç dili senkron tutar.
- **Tarihler UTC**, kullanıcıya IANA saat dilimiyle.
- **Kritik eylemler denetim kaydına** yazılır; yazma uçları **idempotent**;
  finans ve sadakat **ledger** ile.
- **Çevrimdışı dayanıklılık** — işlem kuyruğa alınır, bağlantı gelince
  gönderilir; uygulama kapansa bile kaybolmaz.
- **Erişilebilirlik** — dokunma hedefleri ≥44pt, metin kontrastı ≥4.5:1
  (testlerle ölçülüyor), yazı ölçeği sınırlı.

---

## 8 · Teknik

**pnpm + Turborepo** tek depo · **React Native + Expo** (mobil) ·
**Next.js** (yönetim paneli) · **NestJS + Prisma + PostgreSQL** (API) ·
**Redis + BullMQ** (kuyruk) · `packages/domain` saf iş mantığı ·
`packages/i18n` üç dil.

**Dağıtım:** API Railway'de; mobil JS değişiklikleri **EAS Update (OTA)** ile
`main`'e her merge'de telefona iner. Native değişiklikler (izinler, eklenti,
ikon, SDK) yeni yapı gerektirir.

**Kalite:** 719 otomatik test — iş kuralları, rol ayrımı, kontrast, dokunma
hedefi, ölü kod, i18n bütünlüğü ve tasarım uyumu dahil.
