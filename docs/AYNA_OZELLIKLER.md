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

### Üyelik paketleri

Üç katman var ve **her rol** satın alabiliyor — paketin içeriği role göre
değişiyor. Ödeme uygulama dışında (Kaspi), dekont yüklenir, admin onaylar;
onaylanınca ayrıcalıklar açılır. Otomatik yenileme yok, istenildiği zaman
bırakılır.

| Paket        | Ücret      |
| ------------ | ---------- |
| Free         | ücretsiz   |
| **Premium**  | 999 ₸/ay   |
| **Platinum** | 1.999 ₸/ay |

> **Not — düzeltilmesi gereken bir tutarsızlık.** Panelde `rate.premium_user_kzt`
> (999 ₸) ve `rate.premium_salon_kzt` (4.990 ₸) ayarları duruyor, ama abonelik
> servisi fiyatı koda gömülü tutuyor (`premium: 999`, `platinum: 1999`).
> Bugün panelden fiyatı değiştirmek tahsil edilen tutarı değiştirmiyor.
> Yukarıdaki tablo **gerçekten tahsil edilen** tutarı gösteriyor.

**Premium — uzman ve salon için.** _"İşini büyüt, daha çok müşteriye ulaş."_

- **Öne Çıkanlar'da görün** — keşfet ana sayfasında öne çıkarma adaylığı.
- **Sana Yakın ilk 3'te yer al** — konum bazlı ilk üç rotasyonunda görünürlük.
- **Fırsatlar vitrininde promosyon** — promosyonların Fırsatlar alanında yayınlanır.
- **Haftalık promosyon hakkı** — haftada 1 promosyon oluşturma.

**Premium — müşteri için.** _"Bakım yolculuğun için kişisel destek."_

- **Boni** — AI güzellik danışmanı; cilde, saça ve rutine göre kişisel öneriler.
- **Cut-out profil fotoğrafı.**
- **Taleplerin önce görünür** — teklif isteğin uzmanların listesinde en üstte.
- **Öncelikli destek** — destek talebin kuyruğun başına geçer.

**Platinum.** _"Premium + sadık müşteri portföyü."_

- Premium'un tamamı, üstüne:
- **Always** — müşterilerle karşılıklı bağ ve toplu bildirim hakkı.

### Reklam paketleri (ücretli vitrin)

Üyelikten ayrı bir ürün: uzman ya da salon keşfet ekranında bir **vitrin**
satın alıyor. İki yerleşim var, ikisi de aynı fiyata:

| Yerleşim         | Nerede görünür                       |
| ---------------- | ------------------------------------ |
| **Fırsatlar**    | Keşfet'teki Fırsatlar şeridi         |
| **Öne Çıkanlar** | Keşfet'teki Senin İçin Seçtiklerimiz |

**Süre ve ücret**

- Aylık **200.000 ₸** — yönetim panelinden değiştirilebilir (`rate.ad_monthly_kzt`).
- **1 – 12 ay** arası satın alınabilir; tutar `aylık ücret × ay`.
- **1 ay = 30 gün.** Takvim ayı kullanılsaydı şubatta alan 28 gün alırdı.
- Fiyat **sipariş anında dondurulur** — sonradan zam gelse bile sipariş eski
  fiyattan kapanır.

**Reklamın yolu**

1. Uzman görseli, başlığı ve alt başlığını girer; yerleşimi ve süreyi seçer.
2. Kaspi ile öder, dekontu yükler.
3. Admin **Reklamlar** kuyruğunda dekontu doğrular.
4. Onaylanınca reklam yayına girer — **dekontsuz onay sunucuda reddedilir**,
   ödenmemiş reklam vitrine düşemez.
5. Yayın penceresi sunucuda tutulur; satın alınan süre bitince reklam
   kendiliğinden düşer.

**Yayındayken**

- Uzman ana ekranında sayaç: **"Reklamın yayında · 1/30. gün"**.
- Vitrinde **Sponsorlu** etiketi zorunlu — ücretli yerleşim gizlenmez.

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
