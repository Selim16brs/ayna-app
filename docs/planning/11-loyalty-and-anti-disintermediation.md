# AYNA — Sadakat (Rewards) & Uygulama-Dışı Kaçışı Önleme

> Kurucu hedefi: kullanıcı ve işletmeyi uygulama içinde tutmak (komisyon koruması), tekrar randevuyu uygulamadan almak. Aşağıdaki yöntemler pazaryeri/güzellik sektörü en iyi pratiklerine dayanır (kaynaklar altta).

## Problem

İşletme ve kullanıcı, komisyondan kaçmak için 2. randevuyu uygulama dışında ayarlayabilir ("platform leakage / disintermediation"). Hedef: iki tarafı da uygulamada tutmak.

## A. Kullanıcı sadakati (AYNA Rewards)

- **Puan yalnızca uygulama-içi TAMAMLANAN randevudan** kazanılır (+ doğrulanmış değerlendirme, arkadaş daveti, öncesi-sonrası foto, grup randevusu). Bakiye ledger ile (EK E loyalty_ledger).
- **Kademe (tier):** Bronz/Gümüş/Altın/Platin — tamamlanan uygulama-içi randevu/harcamaya göre; üst kademe = öncelikli saat, ekstra indirim, AYNA Plus.
- **Çekiliş (raffle):** her uygulama-içi tamamlanan randevu = çekiliş hakkı; periyodik (haftalık/aylık) ödüllü çekiliş. Daha çok uygulama-içi randevu → daha çok hak. (Kurucu fikri, profesyonelleştirildi.)
- **Kullanım:** puanlar yalnızca uygulama içinde (randevu indirimi, ücretsiz ek bakım, AYNA Plus, hediye kartı).
- Uygulama-dışı davranış tespitinde puan/çekiliş hakkı iptal edilebilir.

## B. Kaçışı önleme (platform leakage)

- **İletişim (telefon/adres) yalnızca onay sonrası açılır** (zaten EK A/24).
- **Yorum + AYNA Score yalnızca doğrulanmış uygulama-içi randevudan** → sosyal kanıt platforma bağlı (güçlü tutucu).
- Puan, kampanya, çekiliş, kapora koruması, ücretsiz iptal **yalnızca uygulama-içi**.
- Uygulama-içi mesajlaşma; sohbet'te telefon/numara/link maskeleme + uyarı/ceza.
- **Tek dokunuş "tekrar randevu"** + hatırlatma → 2. randevuyu uygulamada yakala (işletmenin "ikinci randevuda kaçırması" engellenir).
- Kapora/ödeme uygulama-içi; komisyon kaynakta.

## C. İşletme tarafı teşvikleri (işletme de uygulamada kalsın)

- **Görünürlük/sıralama = uygulama-içi randevu hacmi + AYNA Score** → çok randevu = "Senin için öneriler" ve aramada üst sıra (kurucu fikri).
- **Kademeli komisyon:** yüksek uygulama-içi hacim → düşük komisyon (kalmayı ödüllendir).
- **Premium / Verified rozet + reklam/öne çıkarma** (ana ekran reklam banner + öneriler; admin panelden).
- **Değer katan SaaS:** CRM, takvim, analitik, hatırlatma → işletme bunları kaybetmemek için kaçmaz.
- Kanıtlı yönlendirmede ceza: puan/sıralama düşüşü, askıya alma.

## D. Güven / garanti

- AYNA garantisi (kapora koruması, ücretsiz iptal penceresi, sorun çözme) yalnızca uygulama-içi → kullanıcı uygulamayı tercih eder.

## Uygulanan (mobil — şimdilik)

- **Puanlarım ekranı** (`/rewards`): puan, kademe + ilerleme, çekiliş hakları + sonraki çekiliş, "nasıl kazanılır", "puanını kullan", "yalnızca uygulama-içi" notu.
- Reklam banner + "Senin için öneriler" premium işletme alanı (admin panelden yönetilecek).
- Backend bağlandığında: ledger, tier hesabı, çekiliş motoru, hacim-bazlı sıralama, leakage tespiti.

## Kaynaklar

- HBS Online — reducing disintermediation: https://online.hbs.edu/blog/post/disintermediation
- CometChat — platform leakage: https://www.cometchat.com/blog/platform-leakage
- Sharetribe — discourage off-platform payments: https://www.sharetribe.com/academy/how-to-discourage-people-from-going-around-your-payment-system/
- Booksy — salon loyalty program guide: https://biz.booksy.com/en-us/blog/the-ultimate-guide-to-creating-a-salon-loyalty-program-that-keeps-clients-coming-back
- Fresha — client loyalty: https://www.fresha.com/blog/client-loyalty
