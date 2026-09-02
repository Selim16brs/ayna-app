# iOS TestFlight hattı — tek seferlik kurulum

GitHub'ın macOS makinesi uygulamayı derleyip doğrudan App Store Connect'e
yükler. **Expo'nun bulutu devrede değil**, Mac gerekmiyor, Xcode gerekmiyor.

Aşağıdaki sekiz sırrı **bir kez** GitHub'a koyduktan sonra yeni TestFlight
sürümü üretmek tek tıka düşer:

> **Actions → iOS TestFlight → Run workflow**

---

## Neden bir kerelik yardım gerekiyor

Uygulama (`com.yemreeke.template`) Yunus Emre Eke'nin Apple hesabında kayıtlı.
Apple'a yükleme yapan her şeyin o hesaba ait olduğunu **kanıtlaması** gerekir.
Kanıt = sertifika + profil + API anahtarı. Bunları bir kez alıp GitHub'a
koyduğunda bir daha kimseye ihtiyacın olmaz.

Sertifikalar **yılda bir** yenilenir; tek bakım noktası budur.

---

## 1 · Yunus'un vereceği üç şey

### a) App Store Connect API anahtarı

Yükleme yetkisi. Yalnız hesap sahibi/yönetici üretebilir.

1. https://appstoreconnect.apple.com → **Users and Access**
2. **Integrations** sekmesi → **App Store Connect API**
3. **+** → ad ver (ör. `github-actions`) → erişim: **App Manager**
4. **Generate** → `AuthKey_XXXXXXXX.p8` dosyasını indirir
   — **bir kez indirilir**, kaybolursa yenisi üretilir
5. Aynı ekrandan **Key ID** ve **Issuer ID**'yi de kopyalar

Sana gönderecekleri: `.p8` dosyası + Key ID + Issuer ID.

### b) Dağıtım sertifikası

Kendi Mac'inde **Anahtar Zinciri (Keychain Access)** uygulamasında:

1. **Sertifikalarım** → `Apple Distribution: Yunus Emre Eke (...)` bul
2. Sağ tık → **Dışa Aktar** → biçim **Kişisel Bilgi Değişimi (.p12)**
3. Bir parola belirler (bunu da sana söyleyecek)

Sana gönderecekleri: `.p12` dosyası + parolası.

### c) Provisioning profile

1. https://developer.apple.com/account/resources/profiles
2. `com.yemreeke.template` için **App Store** dağıtım profili
   (yoksa **+** ile oluşturur: Distribution → App Store Connect)
3. **Download** → `.mobileprovision` dosyası

Sana gönderecekleri: `.mobileprovision` dosyası.

> **Not:** Bu dosyalar imza yetkisidir; e-posta yerine güvenli bir yolla
> (şifreli arşiv, geçici bağlantı) paylaşılması daha doğrudur. GitHub'a
> girdikten sonra elindeki kopyaları silmen iyi olur.

---

## 2 · Dosyaları metne çevir

GitHub sırları dosya değil metin tutar. Üç ikili dosyayı base64'e çevir.
Terminal'de, dosyaların bulunduğu klasörde:

```bash
base64 -i AuthKey_XXXXXXXX.p8 | pbcopy     # panoya kopyalar
```

Her dosya için ayrı ayrı çalıştır, her seferinde ilgili sırra yapıştır:

| dosya              | gideceği sır               |
| ------------------ | -------------------------- |
| `.p8`              | `ASC_KEY_P8`               |
| `.p12`             | `IOS_DIST_CERT_P12`        |
| `.mobileprovision` | `IOS_PROVISIONING_PROFILE` |

---

## 3 · GitHub'a sekiz sır ekle

https://github.com/Selim16brs/ayna-app/settings/secrets/actions/new

| sır                        | değer                                   |
| -------------------------- | --------------------------------------- |
| `IOS_TEAM_ID`              | `9439532MU5`                            |
| `IOS_BUNDLE_ID`            | `com.yemreeke.template`                 |
| `IOS_DIST_CERT_P12`        | `.p12` dosyasının base64'ü              |
| `IOS_DIST_CERT_PASSWORD`   | Yunus'un `.p12` için belirlediği parola |
| `IOS_PROVISIONING_PROFILE` | `.mobileprovision` dosyasının base64'ü  |
| `ASC_KEY_ID`               | API anahtarının Key ID'si               |
| `ASC_ISSUER_ID`            | API anahtarının Issuer ID'si            |
| `ASC_KEY_P8`               | `.p8` dosyasının base64'ü               |

Eksik sır varsa iş akışı **ilk adımda** durur ve hangilerinin eksik olduğunu
yazar — 40 dakikalık derlemenin sonunda öğrenmek istemezsin.

---

## 4 · Yapı üret

**Actions → iOS TestFlight → Run workflow**

- **Yapı numarası:** boş bırak (app.json'daki kullanılır). App Store Connect'e
  yüklenmiş **son numaradan büyük** olmalı; Apple aynı ya da küçük numarayı
  reddeder. İkinci yapıda buraya bir sonraki sayıyı yazman gerekebilir.

Derleme ~20–40 dakika sürer. Bitince App Store Connect'te işlenmesi 10–30
dakika daha alır; ardından TestFlight'a düşer. Telefonunda **Otomatik
Güncellemeler açık** olduğu için kendiliğinden iner.

---

## Hangi değişiklik hangi yoldan gider

| değişiklik                                             | yol                | otomatik mi         |
| ------------------------------------------------------ | ------------------ | ------------------- |
| Ekran, metin, mantık, hata düzeltmesi                  | OTA (`deploy.yml`) | **evet**, merge ile |
| İzinler (infoPlist), eklenti listesi, bağımlılık, ikon | Bu hat             | hayır, elle tetikle |

Şüphedeysen: **`app.json` ya da `package.json` değiştiyse** yeni yapı gerekir.
Yalnız `src/` ve `app/` altındaki kod değiştiyse OTA yeter.

---

## Sorun çıkarsa

| belirti                                  | sebep                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------- |
| "Şu sırlar tanımlı değil"                | Adım 3 eksik; hata mesajı eksik olanları sayar                        |
| `No signing certificate`                 | `.p12` yanlış hesaptan ya da süresi dolmuş                            |
| `Provisioning profile ... doesn't match` | Profil `com.yemreeke.template` için değil                             |
| `The bundle version must be higher`      | Yapı numarası ASC'deki son yapıdan küçük — girdi alanına büyüğünü yaz |
| Yükleme geçti ama TestFlight'ta yok      | Apple işliyor; 10–30 dakika bekle                                     |
