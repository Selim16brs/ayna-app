# AUDIT #15 — Karanlık Mod

**Denetim:** AYNA — İlk 30 Saniye
**Madde:** #15 — Karanlık mod yok
**Tarih:** 27.08.2026

> **Denetim kuralı (madde #15):** _"Durum tespiti sonrası uygulama kararı Selim'e aittir. Faz 1'de yalnızca raporla; koyu tema geliştirmesine kendi başına başlama."_
>
> Bu belgede **hiçbir düzeltme yapılmadı.** Aşağıdaki bulgular ölçümdür; hangisinin düzeltileceği kurucunun kararı.

---

## 1. Sonuç

Denetim üç kabul edilebilir durum tanımlıyor:

|     | durum                                            | AYNA                          |
| --- | ------------------------------------------------ | ----------------------------- |
| (a) | Tam koyu tema desteği                            | **Bu.** Ama üç somut kusurla. |
| (b) | Bilinçli yalnız açık tema, hiçbir şey bozulmuyor | değil                         |
| (c) | Yarım destek — **kabul edilemez**                | değil                         |

**AYNA (a) kategorisinde.** Koyu tema baştan tasarlanmış: her renk iki temada da tanımlı, sistem teması dinleniyor ve anında uygulanıyor. Aşağıdaki üç kusur bu tabloyu değiştirmiyor ama düzeltilmeleri gerekiyor.

---

## 2. Altyapı — sağlam

|                   |                                                                    |
| ----------------- | ------------------------------------------------------------------ |
| Palet             | `lightColors` / `darkColors` — **her token iki temada da tanımlı** |
| Sistem teması     | `Appearance.getColorScheme()` + değişiklik dinleyicisi ✓           |
| Anında uygulama   | Yeniden başlatma gerekmiyor ✓                                      |
| Kullanıcı tercihi | Profil → tema seçici (sistem / açık / koyu) ✓                      |
| Marka görselleri  | `logo-mark` `tintColor: colors.ink` ile temaya uyuyor ✓            |

Palette ayrıca geçmiş bir hatanın kaydı var: _"Eskiden zemin olarak `colors.ink` — yani METİN rengi — kullanılıyordu; ink koyu temada açık renge döndüğü için bu yüzeyler bozuluyordu."_ Bunun için `inverse` / `onInverse` token'ları eklenmiş. Yani bu hata sınıfı bir kez yaşanmış ve çözülmüş.

---

## 3. Bulgular

### 3.1 · Acil kart koyu temada okunmuyor — **P1**

`src/ui/HomeUrgent.tsx` beyaz yazıyı tema token'ı olan zeminlerde kullanıyor. Ölçülen kontrast:

| değişken                | zemin           | açık tema  | koyu tema  |
| ----------------------- | --------------- | ---------- | ---------- |
| kritik (`cardCritical`) | `colors.rose`   | **2,98:1** | **2,27:1** |
| sakin (`cardCalm`)      | `colors.accent` | 10,47:1 ✓  | **2,27:1** |

Yazı boyutları: başlık **20pt** (eşik 3,0), sayaç **15pt** (eşik 4,5).

- Koyu temada **her ikisi de eşiğin altında** — kart okunmuyor.
- Açık temada kritik varyantın başlığı da sınırda kalıyor (2,98 < 3,0).

Sebep: `#FFFFFF` sabit yazılmış ama zemin temayla değişiyor. Koyu temada `rose` ve `accent` **açık renge** dönüyor, beyaz yazı üstünde kayboluyor.

Bu ekran, kullanıcının randevusuyla ilgili **acil** bilgiyi taşıyor (dekont bekleniyor, saat çakıştı). Okunmaması en kötü yerde.

### 3.2 · Durum çipleri açık temada sınırda — **P2**

| yazı / zemin              | açık     | koyu   |
| ------------------------- | -------- | ------ |
| `gold` / `goldSoft`       | **4,48** | 5,37 ✓ |
| `success` / `successSoft` | **4,25** | 4,94 ✓ |
| `danger` / `dangerSoft`   | **4,48** | 4,61 ✓ |

Üçü de **açık temada** 4,5 eşiğinin hemen altında (67 kullanım). Koyu temada sorun yok. Küçük bir ton koyulaştırması yeterli; bu bir koyu mod sorunu değil, açık modun kusuru — denetim maddesi taraması sırasında çıktı.

### 3.3 · Tema tercihi kalıcı değil — **P2**

`src/theme-context.tsx` kendi yorumunda söylüyor:

> `// null = sistemi izle. Şimdilik bellekte; ileride kalıcı saklanabilir.`

Kullanıcı profilden "koyu" seçiyor, uygulamayı kapatıp açınca **sistem temasına geri dönüyor**. Seçim hiçbir yere yazılmıyor.

Bu, bu oturumda dil seçiminde bulunan hatanın **aynısı** (o düzeltildi, bu duruyor).

---

## 4. Yanlış alarm — kayda geçiyorum

Token çiftlerini tararken `onPastel / accentSoft` çiftini koyu temada **1,13:1** ölçtüm ve ciddi bir hata sandım.

Kullanımı kontrol edince: `onPastel` yalnız `app/quote/index.tsx`'te ve orada zemin **temadan bağımsız bir gradyan** — yani doğru kullanım. Çifti ben kurgulamıştım, kodda geçmiyor.

Raporlamadan önce doğrulamasaydım var olmayan bir hatayı bildirmiş olacaktım.

---

## 5. Denetim dışı ama aynı sınıf: yazı ölçeği

Denetim #15 bonus olarak soruyor: _"Sistem yazı boyutu büyük ayarındayken layout kırılıyor mu?"_

`src/ui/Text.tsx` içinde `maxFontSizeMultiplier` **tanımlı değil**. Yani sistem yazı ölçeği %200'e alındığında metinler sınırsız büyüyor. Sabit yükseklikli kaplar (44pt düğmeler, 56pt `Button`) bunu taşımayabilir.

Bu ölçülmedi — cihazda test gerektiriyor.

---

## 6. Özet

| bulgu                       | öncelik | koyu tema mı      |
| --------------------------- | ------- | ----------------- |
| Acil kart beyaz yazı 2,27:1 | **P1**  | evet              |
| Durum çipleri 4,25–4,48     | P2      | hayır (açık tema) |
| Tema tercihi kalıcı değil   | P2      | evet              |
| Yazı ölçeği sınırı yok      | P3      | hayır (ölçülmedi) |

**Altyapı sağlam, üç nokta düzeltme istiyor.** Denetimin (c) "yarım destek" kategorisine düşmüyor.

---

## 7. Karar bekleyen

1. **3.1 düzeltilsin mi?** Koyu temada acil kart okunmuyor — bence evet, P1.
2. **3.2 için:** açık temadaki üç çipin tonu koyulaştırılsın mı? Marka renklerine dokunmak gerekiyor.
3. **3.3 için:** tema tercihi kalıcı yapılsın mı? (Dil seçiminde aynısını yaptık.)
4. **Yazı ölçeği** ayrı bir iş olarak ele alınsın mı?

_Onay verirsen düzeltmeleri Faz 2 kapsamında yaparım._
