# AYNA — Kayıt Akışları & Satıcı Tarafı

> Kurucu netleştirmesi (2026-06-29). Kullanıcı + satıcı kayıt modeli, güvenli çalışan doğrulaması ve satıcı raporları.

## 1. Kullanıcı kaydı (mobil)

- Standart kayıt: telefon (OTP) → ad → şehir → dil → izinler/consent.
- [docs/planning/03 EPIC 2] ile uyumlu; rol = `user`.

## 2. Satıcı kaydı (firma = ana kullanıcı)

Hizmet veren **firma ana hesaptır** (rol: `salon`/işletme). İki tür:

- **Salon (firma):** ana kullanıcı; altına birden çok uzman/çalışan ekler.
- **Bağımsız uzman:** tek kişilik; firma altında değil.

Kayıt sırasında alınacak bilgiler (zorunlu):

- İşletme adı, **sektör** (güzellik, kuaför, spa, kozmetoloji…) ve **alan/uzmanlık** (saç, tırnak, kaş, makyaj, spa…)
- **Adres** (şehir, bölge, açık adres) ve **telefon** (net iletişim)
- Vergi/şirket bilgisi, çalışma saatleri, hizmetler + fiyatlar, belgeler (lisans/hijyen), portföy
- Banka/ödeme bilgisi (komisyon/ödeme için)
- Sistemin ihtiyaç duyabileceği diğer tüm alanlar kayıt sırasında toplanır (eksik profil yayına alınmaz)

## 3. Güvenli çalışan doğrulama (KRİTİK)

Amaç: kimse gerçekte çalışmadığı bir firmanın altında görünemesin.

**Yöntem: tek kullanımlık firma davet kodu** (seçilen model).

1. Çalışan kayıtta firmasını **seçer**.
2. Firma (ana kullanıcı) panelden o çalışana özel **davet kodu** üretir.
3. Çalışan kodu girer; doğrulanınca firmaya **bağlanır**.

Güvenlik kuralları:

- Kod **tek kullanımlık**, **süreli** (ör. 24–72 saat), **iptal edilebilir**.
- Kod yalnızca firma ana kullanıcısı tarafından üretilir; tahmin edilemez (yüksek entropi), DB'de **hash**lenir.
- Bağlanma firma onayıyla kesinleşir; çalışan firmadan **çıkarılabilir** (bağ koparılır).
- Tüm bağlama/koparma olayları **audit log** üretir (EK H.5).
- Çalışan başka firmaya geçerse eski bağ pasifleşir; aynı anda tek aktif firma.

Veri modeli (öneri):

```text
businesses            # firma (ana hesap), sektör, alan, adres, telefon, belgeler
business_members      # firma ↔ çalışan (uzman) bağı; status: invited|active|removed
employee_invites      # code_hash, business_id, expires_at, used_at, revoked_at, created_by
```

## 4. Satıcı raporları (analytics)

Satıcı panelinde profesyonel metrikler:

- Kaç kişi **randevu aldı** (dönem bazlı), tamamlanan/iptal/no-show
- Kaç kişi **profil ziyareti** yaptı (görüntülenme), teklif→randevu dönüşümü
- Gelen teklif isteği / talep sayısı, kabul oranı
- Ortalama sepet, gelir, kampanya getirisi, tekrar müşteri oranı
- Uzman bazlı performans (salon içi), hizmet bazlı puan
- Gizlilik: analytics PII/ham veri içermez (EK I.2); anonim/aggregate.

## 5. Build planı

1. Kullanıcı kaydı (OTP + profil) — EPIC 2 ile birlikte
2. Satıcı firma kaydı (sektör/alan/adres/telefon/belgeler)
3. Çalışan daveti + kod doğrulama (güvenli)
4. Satıcı raporları ekranı

> Satıcı tarafı: web-pro (Next.js) + mobilde "Randevularım". Önce mobilde özet, panelde tam.
