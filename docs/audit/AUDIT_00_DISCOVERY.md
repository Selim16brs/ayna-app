# AUDIT 00 — Keşif (Faz 0)

**Denetim:** AYNA — İlk 30 Saniye (First-Session Retention Audit)
**Faz:** 0 — Keşif. Bu belgede **düzeltme yok**; yalnız mevcut durumun tespiti.
**Tarih:** 27.08.2026
**Kapı:** Bu belge onaylanmadan Faz 1'e geçilmez.

---

## 1. Stack ve build

|                |                                                              |
| -------------- | ------------------------------------------------------------ |
| Monorepo       | pnpm + Turborepo · 15 paket                                  |
| Mobil          | Expo SDK **54.0.35** · React Native 0.81.5 · React 19.1.0    |
| Yönlendirme    | expo-router 6 — dosya tabanlı, **94 ekran**                  |
| Durum          | Zustand 5 (AsyncStorage `persist`) + TanStack Query 5        |
| Sunucu         | NestJS + Prisma + PostgreSQL (Railway)                       |
| Bağımlılık     | 45 doğrudan                                                  |
| Dağıtım        | EAS Update `production` kanalı · runtime `exposdk:54.0.0`    |
| EAS profilleri | `preview` (internal APK), `production` — ikisi de aynı kanal |

**EAS build kaydı yok.** `eas build:list` boş dönüyor; TestFlight'taki yapı EAS dışında üretilmiş. Bu, madde **#18 (indirme boyutu)** için ölçüm zorluğu yaratıyor: mağaza boyutunu üretecek bir release build hattı bulunmuyor.

---

## 2. Ölçüm altyapısı — madde #20

> Denetim kuralı: #20 Faz 1'de **ilk** kurulur, çünkü diğer 19 maddeyi ölçmek için gerekli.

|                          | Durum                                                      |
| ------------------------ | ---------------------------------------------------------- |
| Crash raporlama          | **YOK** — Sentry / Crashlytics / Bugsnag paketi bulunmuyor |
| Analytics SDK            | **YOK**                                                    |
| `@ayna/analytics` paketi | **VAR ama mobil hiç içe aktarmıyor**                       |

`packages/analytics` gerçek bir gizlilik katmanı içeriyor: izinli event listesi (21 event) ve yasaklı alan denetimi (telefon, e-posta, koordinat, sağlık verisi → event **reddediliyor**). Yani politika yazılmış, **bağlanmamış**.

Sonuç: bugün üretimde **sıfır ölçüm** var. Açılış süresi, çökme oranı, ilk oturum hunisi, terk noktası — hiçbiri bilinmiyor. Kurucunun "10 saniye bekliyor" gözlemi tek veri kaynağı.

---

## 3. İzinler — madde #3

### Android (`app.json`)

```
RECORD_AUDIO, READ_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE,
READ_MEDIA_VISUAL_USER_SELECTED, READ_MEDIA_IMAGES,
READ_MEDIA_VIDEO, READ_MEDIA_AUDIO
```

Üç tespit:

1. **Liste birebir iki kez yazılmış** — aynı 7 izin ard arda tekrarlanıyor (14 girdi).
2. **`RECORD_AUDIO` gereksiz** — kod tabanında ses kaydı, mikrofon veya `expo-av` kullanımı **yok**. Denetim #3: _"Gerekmiyorsa manifest'ten kaldırılır."_
3. **`READ_MEDIA_VIDEO` / `READ_MEDIA_AUDIO`** — uygulama yalnız fotoğraf seçiyor; video/ses medyası kullanılmıyor.

### iOS

`app.json` içinde **hiç `infoPlist` kullanım açıklaması tanımlı değil**. Expo config plugin'leri (`expo-image-picker`, `expo-media-library`) varsayılan metin enjekte ediyor — ama bu metinler **İngilizce ve genel**. Denetim #19, izin açıklamalarının da üç dilde olmasını istiyor.

### Eklentiler

`expo-router`, `expo-localization`, `expo-font`, `datetimepicker`, `expo-image-picker`, `expo-media-library`, `expo-notifications`.

`expo-localization` **kurulu ama kullanılmıyor** (bkz. §5).

---

## 4. Onboarding ve ilk ekran — madde #2, #5, #6

**Onboarding ekranı yok.** `app/` altında `onboarding`/`welcome`/`intro` yolu bulunmuyor. İlk açılışta `app/index.tsx` çiziliyor:

- Logo + slogan + 3 değer maddesi
- Dil seçimi (tr / kk / ru)
- **İki düğme: "Giriş yap" ve "Kayıt ol"**

**Misafir yolu yok.** Karşılama ekranından Keşfet'e, uzman profillerine veya fiyatlara giden bir çıkış bulunmuyor. Oturum varsa role göre yönlendirme yapılıyor (`/discover`, `/seller/reports`, `/salon/home`); oturum yoksa tek seçenek kayıt/giriş.

Bu, denetim **#2'nin (önce kayıt duvarı) doğrudan ihlali** ve maddenin kabul kriteri olan _"customer Keşfet'i giriş yapmadan gezebilir"_ karşılanmıyor.

`(tabs)/_layout.tsx` içinde oturum kapısı yok — yani ekranlar teknik olarak korumasız; kapı yalnız karşılama ekranındaki yönlendirmede.

---

## 5. i18n yapısı — madde #19

|                  |                                                                                  |
| ---------------- | -------------------------------------------------------------------------------- |
| Diller           | `tr` · `kk` · `ru` — üçü de **2040+ anahtarla tam** (parite testi çift yönlü)    |
| Varsayılan       | `DEFAULT_LOCALE = 'tr'`                                                          |
| Cihaz dili okuma | **YOK** — `expo-localization` kurulu ama `getLocales()` hiçbir yerde çağrılmıyor |

Uygulama **her zaman Türkçe açılıyor**. Telefonu Rusça olan bir Almatı kullanıcısı, uygulamayı okuyamadığı bir dilde karşılıyor.

Denetim #19 kabul kriteri: _"Cihaz dili → uygulama dili otomatik; üçünün dışındaysa RU."_

> **Çelişki bildirimi (denetim kuralı §0.1 gereği):** `CLAUDE.md` Türkçeyi _geliştirme_ kaynak dili olarak tanımlıyor. Bu, üretimde açılış dilinin Türkçe olmasını gerektirmiyor; ama varsayılanı değiştirmek bir ürün kararı. Faz 2'de dokunulmadan önce onay gerekiyor.

---

## 6. Dayanıklılık — madde #9, #10

|                                       | Durum                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------ |
| `ErrorBoundary` / `componentDidCatch` | **YOK** — yakalanmamış render hatası uygulamayı kapatır                              |
| Ağ durumu izleme (`NetInfo`)          | **YOK**                                                                              |
| Çevrimdışı bandı                      | **YOK**                                                                              |
| Çevrimdışı davranış                   | Katalog "offline-first" (API düşerse yerel veriye düşüyor); geri kalanı denetlenmedi |

Denetim #9 kurtarma ekranı, #10 çevrimdışı bandı istiyor; ikisi de bulunmuyor.

---

## 7. Boyut — madde #18

|                      |                                                                     |
| -------------------- | ------------------------------------------------------------------- |
| `assets/` toplam     | **7,4 MB**                                                          |
| 1 MB üstü tek görsel | 1 adet — `boni-cat.png` **3,2 MB**                                  |
| Sonraki en büyükler  | `logo-mark.png` 0,9 MB · `icon.png` 0,8 MB · `logo-ayna.png` 0,6 MB |

Görseller PNG; WebP kullanılmıyor. Gerçek mağaza boyutu ölçülemedi (§1 — release build hattı yok).

---

## 8. Ölçülen gecikme (bu fazda yapılan tek ölçüm)

Kurucunun "10 saniye" gözlemini doğrulamak için üretim API'sine ölçüm yapıldı:

| İstek                               | İlk bayt    |
| ----------------------------------- | ----------- |
| `/categories` (200)                 | 0,88 sn     |
| `/professionals` (200)              | 1,07 sn     |
| `/care` (401 — **hiç iş yapmıyor**) | **0,51 sn** |

Ayrıntı: DNS 0,005 · TCP 0,19 · TLS 0,31 · ilk bayt 0,62 sn.

Sunucu **Amsterdam**'da (`x-railway-edge: ams1`). Hiç iş yapmayan bir isteğin bile yarım saniye sürmesi, gecikmenin **ağ mesafesinden** geldiğini gösteriyor. Almatı → Amsterdam turu bu ölçümün katı olur.

Bu bir **altyapı kararı** (Railway bölgesi) ve denetimin #1 maddesiyle doğrudan ilgili. Kod tarafında yapılabilecek olan tur _sayısını_ düşürmekti; PR #59'da açılış `loadContent` 4 turdan 1 tura indirildi ve yinelenen `/me` çağrısı kaldırıldı.

---

## 9. Faz 1'e giriş için hazır olma durumu

| Madde                            | Faz 1'de ölçülebilir mi    | Engel                                             |
| -------------------------------- | -------------------------- | ------------------------------------------------- |
| #20 ölçüm                        | Hayır → **önce kurulacak** | SDK yok                                           |
| #1 açılış süresi                 | Kısmen                     | Ölçüm SDK'sı yok; elle kronometre mümkün          |
| #9 çökme                         | Hayır                      | Crash raporlama yok                               |
| #18 boyut                        | Hayır                      | Release build hattı yok                           |
| #2 #3 #5 #6 #10 #11 #19          | Evet                       | —                                                 |
| #4 #7 #8 #12 #13 #14 #15 #16 #17 | Evet (cihazda elle)        | Simülatör açılmayacak → kurucu cihazı gerekebilir |

**Faz 1'in ilk işi #20 olmalı**; onsuz #1 ve #9 kanıtlanamaz.

---

## 10. Faz 0 özeti — sayılarla

- Ölçüm altyapısı: **0** (paket var, bağlı değil)
- Gereksiz izin: **en az 3** (`RECORD_AUDIO`, `READ_MEDIA_VIDEO`, `READ_MEDIA_AUDIO`) + liste **iki kez** yazılmış
- iOS izin açıklaması: **0 özel tanım**, üç dilde değil
- Misafir gezinti: **yok** — ilk ekran kayıt duvarı
- Cihaz dili eşlemesi: **yok** — herkes Türkçe açılıyor
- Hata sınırı / çevrimdışı bandı: **yok**
- 1 MB üstü görsel: **1** (3,2 MB)
- Ölçülen sunucu gecikmesi: iş yapmayan istekte **0,51 sn** (Amsterdam)

---

## 11. Onay bekleyen sorular

1. **Ölçüm SDK'sı seçimi** teknik karar (bana ait) ama **maliyet/hesap açma** gerektirir. Sentry ücretsiz katmanı yeterli; hesabı kim açacak?
2. **Açılış dili** — cihaz diline göre otomatik (üçü dışındaysa RU) yapılsın mı? Bu `CLAUDE.md`'deki Türkçe-öncelik kuralıyla çelişmiyor (o _geliştirme_ dili) ama açılış davranışını değiştiriyor.
3. **Misafir gezinti** (#2) uygulamanın giriş akışını değiştiriyor — kapsam onayı gerekiyor.
4. **Sunucu bölgesi** — Railway'de Kazakistan'a yakın bölgeye taşınsın mı? Gecikmenin ana kaynağı bu.

---

_Faz 1'e (denetim) geçmek için onay bekleniyor. Faz 1'de hiçbir düzeltme yapılmayacak; yalnız 20 maddenin her biri için mevcut durum + kanıt + sorun tespiti raporlanacak._
