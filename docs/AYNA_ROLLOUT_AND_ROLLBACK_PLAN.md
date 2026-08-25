# AYNA — Yayına Alma / Geri Alma (Faz 1-6)

## Yayına alma

Her faz ayrı PR olarak main'e merge edildi (PR #5-#10 + öncesi) → Railway otomatik: build + `prisma db push` (yalnız EKLEYİCİ değişiklikler: enum değerleri, nullable kolonlar, default'lu kolonlar — destructive migration YOK). Mobil: EAS Update `production`.

## Geri alma

- Sunucu: Railway'de önceki deploy'a "Redeploy" (şema ekleyici olduğundan eski kod yeni kolonlarla uyumlu — geri almada veri kaybı yok).
- Mobil: `eas update` ile önceki commit'ten yeniden yayın (`--branch production`), ya da EAS dashboard'dan önceki update'i yeniden yayınla.
- Ayarla kapatılabilenler: scheduler'lar `JOBS_ENABLED=false`; KYC kapora kapısı `policy.require_kyc_for_deposit=0`; kapora yüzdesi `rate.deposit_pct` vb. — kod geri almadan davranış geri alınabilir.
