# AYNA — Marka Varlıkları (eklenecek dosyalar)

Aşağıdaki dosyaları bu klasöre (`apps/mobile/assets/`) ekle. Eklendikten sonra
bana "dosyalar hazır" de; ben `app.json` (icon/splash) ve karşılama ekranını bağlayacağım.

Tema kararı: **açık tema + altın marka** (logonun krem/açık varyantı).

## Gerekli dosyalar

| Dosya               | Boyut                              | İçerik                                                             | Nerede kullanılır                                        |
| ------------------- | ---------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- |
| `icon.png`          | 1024×1024, **şeffaf değil** (kare) | App icon — koyu yuvarlak kare + altın işaret (logodaki 5. varyant) | iOS/genel app icon                                       |
| `adaptive-icon.png` | 1024×1024, **şeffaf** zemin        | Sadece altın işaret, ortalı                                        | Android adaptive icon (ön katman)                        |
| `splash-icon.png`   | ~1024×1024, **şeffaf**             | Altın işaret (yalnız mark)                                         | Açılış (splash) — zemin krem `#FBF6F1`                   |
| `logo-mark.png`     | ~600×600, **şeffaf**               | Altın işaret (iki profil + A)                                      | Karşılama ekranı + başlıklar                             |
| `logo-wordmark.png` | ~1200×400, **şeffaf** (opsiyonel)  | "AYNA" altın wordmark                                              | Opsiyonel; şu an wordmark yazı (Cormorant) ile çiziliyor |

## Notlar

- Açık zeminde kullanılacağı için işaretin **altın (krem değil)** varyantını ver; krem zeminde altın okunur.
- PNG tercih; vektör (SVG) verirsen daha iyi (react-native-svg ile keskin).
- Dosyalar gelince: `app.json` → `icon`, `android.adaptiveIcon`, `splash` ayarlanır;
  `app/index.tsx` ve başlıklara `logo-mark.png` eklenir.
