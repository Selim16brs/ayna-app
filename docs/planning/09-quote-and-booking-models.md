# AYNA — Teklif ve Randevu Modelleri (Çekirdek Akış)

> Kurucu netleştirmesi (2026-06-29). Bu doküman, uygulamanın **ana kullanıcı akışını** tanımlar ve EK A randevu state machine'i ile birleşir. Ana akış artık **teklif/talep odaklıdır**; "Keşfet/gözat" ikincil kalır.

## Taraflar

- **Admin** (web-admin): doğrulama, moderasyon, kategori, finans.
- **Satıcı** (web-pro + mobil Randevularım): teklif verir, randevu onaylar, online/offline takvim girer.
- **Kullanıcı** (mobil): teklif/talep oluşturur, seçer, randevu alır.

## Teklif Modeli 1 — Fotoğrafla teklif iste (broadcast)

1. Kullanıcı istediği modelin **fotoğrafını** yükler.
2. **Kategori** seçer (Saç, Tırnak, Kaş, Makyaj, Spa…).
3. (Opsiyonel) not/şehir ekler ve teklif ister.
4. İstek **o kategorideki tüm uygun satıcılara** yayınlanır.
5. Satıcılar **fiyat teklifi** gönderir.
6. Gelen teklifler kullanıcıya listelenir → **filtre: puana göre, fiyata göre**.
7. Kullanıcı uygun teklifi seçer → ortak randevu akışına geçer (aşağıda).

## Teklif Modeli 2 — Talep + kendi fiyatın (ters teklif)

1. Kullanıcı bir **talep** girer (açıklama + kategori).
2. **Ödemek istediği fiyatı** belirler (sabit bütçe).
3. Bu fiyata yapmak isteyen satıcılar **kabul bildirimi** gönderir.
4. Düşen bildirimler kullanıcıya listelenir.
5. Kullanıcı birini seçer → ortak randevu akışına geçer.

## Ortak Randevu Akışı (her iki modelde)

1. Kullanıcı satıcının **uygun saatlerine** bakar ve uygun saat(ler)i seçer.
2. Seçim **satıcıya bildirilir**.
3. Satıcı o saatte uygunsa **onaylar** (uygun değilse reddeder/alternatif).
4. Onay sonrası **teyit mesajı + tüm bilgiler** kullanıcıya gider: **adres ve telefon dahil**.
5. Durumlar EK A state machine ile izlenir (talep → onay → planlandı → tamamlandı → değerlendirme).

> Gizlilik: adres/telefon **yalnızca onay sonrası** açılır (EK 24 "uygulama dışı anlaşma" riski + EK A).

## Satıcı Takvimi — Online / Offline

- Satıcılar **tüm** randevularını sisteme girer:
  - **Online:** AYNA üzerinden alınan randevular (otomatik).
  - **Offline:** telefon/yüz yüze gelen dış randevular (elle girilir) — uygunluğun doğru olması için.
- Satıcı tarafında **"Randevularım"** bölümü; online/offline **ayrımıyla** listeler.
- Uygunluk hesabı online + offline birleşiminden türetilir (çift rezervasyon engeli, EK A R3).

## Veri modeli etkisi (EK E üzerine ekleme)

Yeni/etkilenen tablolar:

```text
quote_requests        # Model 1: foto + kategori + not + durum (broadcast)
quote_request_media   # yüklenen fotoğraf(lar), EXIF temizlenmiş (EK H.4)
quotes                # satıcı fiyat teklifleri (request'e bağlı, fiyat, süre, not)
demand_requests       # Model 2: açıklama + kategori + hedef fiyat
demand_offers         # satıcı kabulleri (bildirim)
availability_slots    # online+offline; source enum (online|offline)
bookings              # ortak randevu (quote/offer'dan türer), EK A status
```

- `quotes` ve `demand_offers` puan/fiyat ile **filtrelenebilir** (kullanıcı tarafı).
- Fotoğraf: signed upload, EXIF temizleme, moderasyon kuyruğu (EK H.4).
- Satıcı, anonimlik gerektirmez (teklif veren satıcı kimliği kullanıcıya görünür); kullanıcı kimliği teklif aşamasında **minimum** paylaşılır, iletişim bilgisi onay sonrası açılır.

## Ekran listesi (mobil, kullanıcı tarafı)

- Ana ekran: iki ana aksiyon — **"Fotoğrafla teklif al"** ve **"Talep oluştur"** + (ikincil) Keşfet
- Model 1: Teklif oluştur (foto + kategori) → Gelen teklifler (filtreli) → Teklif detay → Saat seç → Onay bekleniyor → Teyit
- Model 2: Talep oluştur (açıklama + bütçe) → Gelen kabuller → Seç → Saat seç → Onay → Teyit
- Randevular sekmesi (kullanıcı): aktif/geçmiş randevular

## Ekran listesi (satıcı tarafı — web-pro + mobil Randevularım)

- Gelen teklif istekleri (Model 1) → fiyat teklifi gönder
- Açık talepler (Model 2) → fiyatı kabul et
- Randevu onayları (saat seçimi gelenler)
- Takvim: online + offline randevu girişi
- Randevularım: online/offline ayrımlı liste

## MVP build sırası (premium, simülatörde)

1. Ana ekran iki aksiyon kartı (giriş noktaları)
2. Model 1: Teklif oluştur (foto + kategori + gönder)
3. Model 1: Gelen teklifler listesi + filtre (puan/fiyat)
4. Ortak: saat seçimi → onay bekleniyor → teyit
5. Model 2: Talep oluştur + gelen kabuller
6. Satıcı tarafı: teklif verme + Randevularım (online/offline)
