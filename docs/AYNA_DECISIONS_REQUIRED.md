# AYNA — Kurucu Kararı Gerektiren Maddeler

_(Uygulanan varsayılanlar admin `Setting` ile değiştirilebilir — kod değişikliği gerekmez.)_

| #   | Karar                               | Uygulanan varsayılan                                                                                              | Ayar anahtarı                               |
| --- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1   | Kapora yüzdesi / min / max          | %20 · 1.000 ₸ · 5.000 ₸                                                                                           | `rate.deposit_pct/min/max`                  |
| 2   | Dekont (hold) penceresi             | 3 saat                                                                                                            | kod: approve() — istenirse Setting'e alınır |
| 3   | Tamamlandı/no-show itiraz penceresi | 24 saat                                                                                                           | `policy.confirm_hours`                      |
| 4   | Slot adımı / en erken rezervasyon   | 30 dk / 2 saat                                                                                                    | `slot.step_min` · `slot.lead_min`           |
| 5   | KYC'siz uzman kapora alabilir mi    | HAYIR (onay kaporasız kesinleşir)                                                                                 | `policy.require_kyc_for_deposit` (0=kapat)  |
| 6   | Talep dalga boyu                    | 5 uzman / dalga, 30 dk arayla, en çok 4 dalga                                                                     | `marketplace.wave_size`                     |
| 7   | Salon varsayılan takvim yetkisi     | Eklesin-onayımla (uzman değiştirebilir)                                                                           | Uzman uygulamadan seçer                     |
| 8   | Admin MFA + kişisel hesaplar/roller | UYGULANMADI — tek kullanıcı döneminde ertelendi; çok kişili operasyona geçmeden önce şart                         | —                                           |
| 9   | W2W erişim politikası               | Beyan (kayıtta cinsiyet seçimi); belge doğrulaması YOK                                                            | ürün/hukuk kararı                           |
| 10  | Veri saklama süreleri               | Matris taslağı `AYNA_DATA_RETENTION_MATRIX.md` — hukuk onayı gerekli                                              | —                                           |
| 11  | Gerçek SMS (Mobizon)                | Mock; `OTP_DEBUG_CODES` kapalı → üretimde 'şifremi unuttum' SMS anahtarına kadar kapalı (admin sıfırlama devrede) | env                                         |
