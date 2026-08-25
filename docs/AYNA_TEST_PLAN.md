# AYNA — Test Planı (§31 matrisine karşılık)

## Mevcut otomatik kapsam

- API birim: 104 test (politikalar: iptal/kapora, şemalar, i18n localize, komisyon, kurallar)
- Domain: 29 test (slot motoru: çakışma, kilit, pencere üretimi) — concurrency mantığının saf çekirdeği
- Mobil: 15 test (gizlilik sıfırlama bekçisi: partialize↔reset senkronu)
- i18n parite: tr/kk/ru anahtar eşitliği
- Canlı kabul (deploy sonrası koşulan betikler): 49-adım uçtan uca + Faz-1/Faz-2 kabul betikleri (slots/izin günü; dinamik kapora; RECEIPT_REUSED; teyit penceresi)

## Eksik / sıradaki

- 20-paralel gerçek DB yarış testi (advisory lock kanıtı) — yerel Postgres'e karşı `test:integration` hedefi
- Yetkilendirme matrisi testleri (salon↔uzman detay erişimi; B hesabının A kuyruğu)
- Signed-URL süresi + zararlı medya (storage sertleştirmesiyle birlikte)
