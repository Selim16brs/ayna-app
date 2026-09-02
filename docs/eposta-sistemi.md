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

| Şablon               | Kime                                          | Ne zaman  |
| -------------------- | --------------------------------------------- | --------- |
| `ilk_randevu`        | Kayıttan 2 gün geçmiş, hiç randevu almamış    | pazarlama |
| `randevu_hatirlatma` | Yarın randevusu olan                          | işlemsel  |
| `degerlendirme`      | Hizmeti biteli 1 gün geçmiş, değerlendirmemiş | pazarlama |
| `depozito_iadesi`    | İade hakkı doğmuş, hesap bilgisi girmemiş     | işlemsel  |
| `geri_kazanim`       | 60 gündür randevu almamış                     | pazarlama |

`hosgeldin` seride değil: kayıt anında ilgili modülden tetiklenmeli.

**Pazarlama** postalarında abonelikten çıkma bağlantısı var, **işlemsel**
olanlarda yok — randevu hatırlatmasından "çık" denmez.

## Tekrar neden olmuyor

`email_log` tablosunda `(user_id, template)` **benzersiz**. Zamanlayıcı günde
on iki kez koşsa da her şablon kullanıcı başına bir kez gider. Kısıt
veritabanında, uygulamada değil: iki eşzamanlı koşu "önce oku sonra yaz"
kontrolünü birlikte geçebilirdi.

> **Şablon anahtarını değiştirmeyin.** `email_log` o anahtarı saklıyor;
> yeniden adlandırmak, postayı almış herkese ikinci kez göndermek demektir.

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
