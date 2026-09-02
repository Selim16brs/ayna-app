# AYNA e-posta sistemi

AIVIO'nun maling sistemi kapatıldı, yerine AYNA'nınki kuruldu. Bu belge
sistemin ne yaptığını ve **çalışması için ne gerektiğini** anlatıyor.

## Şu an ne durumda

Kod `main`'de ve testleri geçiyor, ama **hiç posta göndermiyor**: gerekli üç
ayar tanımlanmadan gönderim yapılmıyor (bilinçli — varsayılan kapalı).

| Ayar               | Ne için             | Yoksa ne olur                          |
| ------------------ | ------------------- | -------------------------------------- |
| `RESEND_API_KEY`   | Sağlayıcı anahtarı  | Posta çıkmaz, konsola yazılır          |
| `EMAIL_FROM`       | Gönderen adresi     | `AYNA <merhaba@ayna.salon>` varsayılır |
| `MAIL_CRON_SECRET` | Zamanlayıcıyı korur | **Uç hiç çalışmaz**                    |

`ayna.salon` alan adının Resend'de doğrulanması da gerekiyor (SPF/DKIM);
doğrulanmadan gönderilen posta spam'e düşer.

## Kimlere gidiyor

AYNA'da kayıt **telefonla**; e-posta zorunlu değil. Yani bu sistem yalnız
adresini vermiş kullanıcılara ulaşır. Adresi olmayan sessizce atlanır — bu
bir hata değil.

## Yaşam döngüsü serisi

Zamanlayıcı `/cron/mail` ucundan tetikleniyor (saatte bir yeterli).

| Şablon               | Kime                           | Tür       |
| -------------------- | ------------------------------ | --------- |
| `hosgeldin`          | Kayıttan hemen sonra           | pazarlama |
| `ilk_randevu`        | 2 gün geçmiş, hiç randevu yok  | pazarlama |
| `randevu_onaylandi`  | Randevu kesinleşti             | işlemsel  |
| `depozito_bekliyor`  | Depozito ödenmeyi bekliyor     | işlemsel  |
| `randevu_hatirlatma` | Yarın randevusu olan           | işlemsel  |
| `degerlendirme`      | Hizmet biteli 1 gün, yorum yok | pazarlama |
| `depozito_iadesi`    | İade hazır, hesap bilgisi yok  | işlemsel  |
| `teklif_geldi`       | Talebine teklif geldi          | işlemsel  |
| `puan_hatirlatma`    | Puanı dolmak üzere             | pazarlama |
| `geri_kazanim`       | 60 gündür randevu yok          | pazarlama |
| `uzman_talep`        | Uzmana yeni talep düştü        | işlemsel  |
| `reklam_yayinda`     | Uzmanın reklamı yayına girdi   | işlemsel  |

Beşi zamanlayıcıdan gidiyor (`ilk_randevu`, `randevu_hatirlatma`,
`degerlendirme`, `depozito_iadesi`, `geri_kazanim`); kalanlar ilgili modülden
tetiklenecek.

**Pazarlama** postalarında abonelikten çıkma bağlantısı var, **işlemsel**
olanlarda yok — randevu hatırlatmasından "çık" denmez.

## Logo

E-postada logo göstermenin tek güvenilir yolu HTTP adresi: Gmail `data:` URI'li
görselleri siliyor, Outlook SVG çizmiyor. Logo API'den servis ediliyor
(`apps/api/public/brand/`), `EMAIL_ASSET_URL` ile adresleniyor ve
`setGlobalPrefix`ten ÖNCE tanımlanıyor — adres API sürümüne bağlanmasın.

## Kullanıcıyı bunaltmama

E-posta yorgunluğunun bedeli tek bir postanın okunmaması değil: insanlar spam
işaretliyor, gönderim itibarı düşüyor ve sonra **önemli** posta da ("iaden
hazır") kutuya düşmüyor. Yani bunaltmak en çok işe yarayan postayı öldürüyor.

Politika `MailerService` içinde, gönderim yolunun **tek geçidinde** — çağıran
modüle bırakılsaydı biri unutur, sınır sessizce delinirdi.

| Sınır             | Değer            | Kimi kapsar                |
| ----------------- | ---------------- | -------------------------- |
| Günlük tavan      | 3                | kritikler hariç herkes     |
| Pazarlama aralığı | 7 gün            | yalnız pazarlama postaları |
| Tekilleştirme     | anahtar başına 1 | hepsi                      |

**Kritikler tavana takılmaz:** `depozito_bekliyor`, `depozito_iadesi`,
`randevu_onaylandi`. Üçü de kullanıcının parasına ya da o an bekleyen işine
dair; susturmak zarar verir. Tavan "bilgi" postalarını kısmak için.

Bir şablon hem pazarlama hem kritik olamaz — test bunu kontrol ediyor.

## Tekrar neden olmuyor

Tekilleştirme `(user_id, dedupe_key)` **benzersiz** kısıtıyla. Anahtar iki
biçimde olabilir:

| Anahtar         | Anlamı                                 | Örnek                        |
| --------------- | -------------------------------------- | ---------------------------- |
| `sablon`        | Kullanıcı başına **ömür boyu bir kez** | `hosgeldin`                  |
| `sablon:olayId` | **Olay başına** bir kez                | `randevu_hatirlatma:abc-123` |

Bu ayrım şart: önce yalnız şablon adına bakılıyordu ve ikinci randevunun
onayı ile hatırlatması **hiç gitmiyordu** — şablon "zaten gönderilmiş"
sayılıyordu.

Kısıt veritabanında, uygulamada değil: iki eşzamanlı koşu "önce oku sonra
yaz" kontrolünü birlikte geçebilirdi.

> **Şablon anahtarını değiştirmeyin.** `email_log` o anahtarı saklıyor;
> yeniden adlandırmak, postayı almış herkese ikinci kez göndermek demektir.

### Teklifler neden tek posta

Her teklif geldiğinde posta atmak kullanıcıyı bunaltırdı. `teklif_geldi`
talep başına **bir kez** gidiyor ve metin bunu kullanıcıya açıkça söylüyor:
sonrakiler için ayrıca posta yok, hepsi uygulamada birikiyor. Söylemeseydik
kullanıcı ikinci teklifi kutusunda beklerdi.

## Zamanlayıcıyı bağlama

```bash
curl -H "Authorization: Bearer $MAIL_CRON_SECRET" https://<api>/cron/mail
```

GET de POST da çalışır (çoğu zamanlayıcı düz GET atıyor). Sır sabit zamanda
karşılaştırılıyor; tanımlı değilse uç yetkisiz döner.

## AIVIO tarafı

`~/Desktop/umly` (aivio deposu) — sistem **silinmedi, kapatıldı**:

- `vercel.json`'daki saatlik cron kaldırıldı.
- `src/lib/email/mailer.ts` içinde `MAILING_KAPALI = true` — tek gönderim
  değil, toplu gönderim de kapalı.

Geri açmak: anahtarı `false` yap ve cron'u `vercel.json`'a geri ekle.
