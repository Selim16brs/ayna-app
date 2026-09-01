# AYNA — Yayın Kontrol Listesi (§26)

## Kanal/runtime stratejisi

- Tek kanal: `production` (app.json `updates.requestHeaders` — REPODA; her build otomatik gömer).
- Runtime: `sdkVersion` politikası (`exposdk:54.0.0`). SDK yükseltmesi = ZORUNLU yeni build; eski build'lere update gitmez (runtime uyuşmazlığı güvenli).

## Havadan (EAS Update) yeterli olanlar

JS/TS ekran-akış değişiklikleri, i18n metinleri, stil, iş mantığı (native modülsüz).

## YENİ BUILD gerektirenler (release checklist)

- [ ] Yeni native paket (`expo install …` sonrası ios/android klasörü etkileniyorsa)
- [ ] app.json: permissions, entitlements (push, data-protection), plugins, icon/splash
- [ ] Expo SDK / RN yükseltmesi
- [ ] `runtimeVersion` etkileyen her şey

## TestFlight yüklemesi — Apple hesabı bizde DEĞİL

Apple Developer üyeliği kurucuda yok; yüklemeyi üyeliği olan arkadaş yapıyor.
Akış onun Mac'inde:

```bash
git pull && pnpm install && npx expo prebuild -p ios --clean && cd ios && pod install
```

sonra Xcode → arşiv → App Store Connect → TestFlight.

### Değiştirilmemesi gereken üç alan (app.json)

Bunlar uygulamanın kimliği; biri değişirse yüklenen sürüm ARTIK BİZİM SÜRÜMÜMÜZ
OLMAZ ve düzeltmelerimiz o telefona hiç ulaşmaz:

| Alan                   | Değer                   | Değişirse                                                            |
| ---------------------- | ----------------------- | -------------------------------------------------------------------- |
| `extra.eas.projectId`  | `1896ed2e-…`            | OTA kanalı kopar; `main`'e giren hiçbir JS düzeltmesi telefona inmez |
| `updates.url`          | `u.expo.dev/1896ed2e-…` | aynı sonuç                                                           |
| `ios.bundleIdentifier` | `kz.ayna.app`           | App Store Connect'te BAŞKA bir uygulama kaydı olur                   |

Daha önce telefonda "AYNA" görünen ama açılışta çöken 1.0.0/114 sürümünün
bizim yapımız olmamasının muhtemel sebebi budur. Bir yapının bizim olduğunu
doğrulamanın yolu: yüklemeden sonra `main`'e küçük bir JS değişikliği girip
telefonda kapat-aç ile göründüğünü görmek.

### Build numarası

`ios.buildNumber` (app.json) — Apple aynı numarayı İKİ KEZ KABUL ETMEZ.
Her yüklemede artır; arşiv reddedilirse ilk bakılacak yer burasıdır.
Şu an: 115 (test edilen son sürüm 114'tü).

### Bir sonraki yapıda etkili olacak native değişiklikler

- `ios.infoPlist.ITSAppUsesNonExemptEncryption: false` — bu olmadan yapı,
  App Store Connect'te "ihracat kısıtlı şifreleme?" sorusunda elle yanıt
  bekler ve TestFlight'a düşmez. Yükleme başarılı görünür, test kullanıcısına
  hiçbir şey gitmez.

### EAS ile yapı (alternatif)

`eas build` yolu Apple sertifikası ister ve şu an EAS'te kurulu değil
(`Distribution Certificate is not validated`). Kurulumu ancak Apple Developer
hesabı olan kişi, kendi girişiyle yapabilir. GitHub'daki `Deploy` iş akışının
`native_yapi` seçeneği bu sertifikalar kurulana kadar çalışmaz; JS yayını
(OTA) ise sertifikasız çalışıyor ve `main`'e her merge'de otomatik gidiyor.

## Update UX

"Kapat-aç ×2"e güvenme: kritik düzeltmede kullanıcıya uygulama içi "güncelleme hazır — yeniden başlat" davranışı eklenecekse `expo-updates` `checkForUpdateAsync/reloadAsync` akışı kullanılmalı (aday iş).
