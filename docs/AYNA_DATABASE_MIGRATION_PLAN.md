# AYNA — Veritabanı Değişiklik Planı (Faz 1-6, uygulandı)

Strateji: `prisma db push` (Railway otomatik) + YALNIZ EKLEYİCİ değişiklikler. Destructive migration yok; eski kod yeni şemayla, yeni kod eski veriyle uyumlu.

| Değişiklik                                                                             | Tür                    | Geriye uyum                                                                        |
| -------------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------- |
| BookingStatus += `expired`, `completed_pending`                                        | enum değeri ekleme     | Eski kod bu durumları üretmez; mobil bilinmeyen durumda rozet göstermese de çökmez |
| Booking += `receiptHash?` (unique), `refundReceiptHash?` (unique), `finalizeDeadline?` | nullable kolon         | NULL'lar çakışmaz; eski kayıtlar etkilenmez                                        |
| QuoteRequest += `notifyWave` (default 0), `waveAt?`                                    | default'lu kolon       | Eski satırlar dalga-0 kabul edilir                                                 |
| Specialist += `calendarPermission` (default create_requires_approval)                  | enum+default           | Mevcut davranışın aynısı varsayılan                                                |
| User += `locale` (default 'tr')                                                        | default'lu kolon       | Fallback zaten tr                                                                  |
| Setting anahtarları (rate._, policy._, slot._, marketplace._)                          | satır (koşullu okunur) | Yokken kod içi varsayılan kullanılır                                               |
