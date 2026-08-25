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
      Build akışı: arkadaş Mac'i → `git pull && pnpm install && npx expo prebuild -p ios --clean && pod install` → Xcode arşiv → TestFlight. Build numarası `ios.buildNumber` (app.json) — her yüklemede artır.

## Update UX

"Kapat-aç ×2"e güvenme: kritik düzeltmede kullanıcıya uygulama içi "güncelleme hazır — yeniden başlat" davranışı eklenecekse `expo-updates` `checkForUpdateAsync/reloadAsync` akışı kullanılmalı (aday iş).
