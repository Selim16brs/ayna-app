# AYNA — İlk Kullanıcı Gözüyle UX Denetimi

**Tarih:** 31.08.2026
**Faz:** 1 — tespit. Rapor yazılırken hiçbir kod değiştirilmedi.
**Durum:** Kurucu onayıyla **B1–B6 uygulandı.** Uygularken raporun üç yerinin yanlış/eksik olduğu çıktı — bkz. §9.

---

## 0. Önce dürüst olmam gereken şey: nasıl test ettim

İstediğin şey açıktı: _"kodu okuyarak 'muhtemelen çalışıyor' deme."_ Bunu tam olarak yapamadım ve nedenini baştan söylüyorum.

**Uygulamayı gözle açamadım.** Üç yol da kapalı:

| yol                 | durum                                                      |
| ------------------- | ---------------------------------------------------------- |
| iOS simülatörü      | Expo Go kurulu değil (`openurl` 60 numaralı hatayla düştü) |
| Yerel native yapı   | `ios/` klasörü yok                                         |
| Tarayıcıda çalıştır | `react-native-web` kurulu değil                            |

Ayrıca bunu zorlamak, senin sorduğun token kotasını gerçekten bitirirdi.

**Onun yerine yaptığım şey** — ve bunlar gerçek çalıştırma, okuma değil:

- **Üretim sunucusuna gerçek istek attım** (`/auth/register`, katalog uçları) ve dönen gerçek yanıtları okudum.
- **Yönlendirme grafiğini gerçek yol kodundan kurdum** — kaç ekran, hangi sırayla.
- **Kullanıcının gerçekten gördüğü 2062 metni** i18n dosyasından okuyup taradım.
- **Her bulguyu ikinci kez doğruladım.** Aşağıda ikisini yanlış alarm diye eledim.

**Bu yöntemin göremediği:** hiyerarşi, boşluk, hizalama, dokunma hedefi boyutu, animasyon akıcılığı, gerçek açılış hızı. Yani **görselin gözle bakılması gereken kısmı denetlenmedi.** Rapordaki hiçbir yerde "güzel görünüyor" ya da "kötü duruyor" demiyorum, çünkü bilmiyorum.

---

## 1. Kapsam tablosu

| alan                                  | durum           | nasıl / neden                                         |
| ------------------------------------- | --------------- | ----------------------------------------------------- |
| Kayıt akışı (müşteri + uzman)         | **test edildi** | sunucu yanıtı + ekran kodu birlikte                   |
| Misafir → randevu akışı               | **test edildi** | yol grafiği uçtan uca çıkarıldı                       |
| Misafir → talep akışı                 | **test edildi** | yol grafiği uçtan uca çıkarıldı                       |
| Yükleniyor / boş / hata durumları     | **test edildi** | 8 ana ekran, düzeltilmiş tarama                       |
| İşlem geri bildirimi                  | **kısmen**      | 56 yazma eylemi tarandı, **örneklem** doğrulandı (§4) |
| Metin ve terim tutarlılığı            | **test edildi** | 2062 metin tarandı                                    |
| Görsel tasarım / hizalama / boşluk    | **BAKILMADI**   | uygulama görsel olarak açılamadı (§0)                 |
| Gerçek açılış hızı                    | **BAKILMADI**   | cihazda ölçüm gerekiyor; ölçüm SDK'sı hâlâ yok        |
| Dokunma hedefi boyutları              | **BAKILMADI**   | aynı sebep                                            |
| Uzman / salon panelleri derinlemesine | **BAKILMADI**   | denetimin odağı ilk kullanıcı; kapsam dışı bıraktım   |

---

## 2. Yüksek etkili bulgular

### B1 · Randevularım yüklenirken "randevunuz yok" diyor — **yüksek**

**Ekran:** Randevular sekmesi
**Sorun:** Sekme, veriyi Zustand store'undan okuyor. Başlangıç değeri `bookings: []`, sunucudan `hydrateBookings()` dolduruyor — ve **arada yükleniyor bayrağı yok.** Ekran `bookings.length === 0` görünce boş durumu çiziyor.

Doğrulama: `src/store.ts:438` başlangıç `bookings: []` · `app/_layout.tsx` açılışta `hydrateBookings()` · `app/(tabs)/bookings.tsx:96-98` `showEmpty` yalnız uzunluğa bakıyor · store'da `bookingsLoading` diye bir alan **yok**.

**Kullanıcıya etkisi:** Randevusu olan kullanıcı, sekmeyi açtığı ilk anda "hiç randevun yok" görüyor. Sunucu yavaşsa (Almatı→Amsterdam turu yarım saniyeden başlıyor) bu yanlış mesaj gözle görülür süre ekranda kalıyor. Kullanıcı randevusunun silindiğini sanabilir.

**Not:** Bu, bu oturumda Keşfet'te düzelttiğim hatanın **birebir aynısı.** Orada düzeltip burada aynısını bırakmışım — sınıfı değil, tek örneği düzeltmişim.

**Önerilen çözüm:** Store'a `bookingsLoading` ekle; `showEmpty`'yi `!bookingsLoading && length === 0` yap. Keşfet'te zaten `ListSkeleton` var, aynısı kullanılabilir.

---

### B2 · Kayıttan sonra kullanıcı tekrar giriş yapmak zorunda — **yüksek**

**Ekran:** Kayıt ol (müşteri ve uzman, ikisi de)
**Sorun:** Sunucu kayıt sonunda **tam bir oturum döndürüyor** — `auth.service.ts` `register()` metodu `return this.session(user)` ile bitiyor, istemci tipi de bunu biliyor: `register: (input) => post<AuthSession>('/auth/register', input)`. Ama iki kayıt ekranı da bu oturumu **kullanmadan atıyor** ve `router.replace('/auth/login')` yapıyor.

Doğrulama: `apps/api/src/auth/auth.service.ts` · `apps/mobile/src/api.ts:839` · `app/auth/customer.tsx:132` ve `app/auth/expert.tsx`.

**Kullanıcıya etkisi:** Kullanıcı telefonunu ve şifresini yeni yazmış; uygulama onu giriş ekranına atıp **aynı iki bilgiyi tekrar yazdırıyor.** Bu, huninin en kırılgan yerinde tamamen gereksiz bir adım — kayıt olan biri burada şifresini yanlış hatırlarsa ya da sıkılırsa, hesabı açılmış ama uygulamaya hiç girmemiş oluyor.

**Önerilen çözüm:** Kayıt yanıtındaki oturumu doğrudan store'a yaz, kullanıcıyı rolüne göre ana ekrana gönder. Sunucu tarafında değişiklik gerekmiyor — veri zaten geliyor.

---

### B3 · Kimlik belgesi gönderiminde hiçbir onay yok — **yüksek**

**Ekran:** Uzman → KYC / kimlik doğrulama
**Sorun:**

```ts
await api.submitKyc(token, { docType, documents: docs });
setDocs([]);
await load();
```

Belge sunucuya gidiyor, liste temizleniyor — **kullanıcıya hiçbir şey söylenmiyor.**

**Kullanıcıya etkisi:** Uzman kimlik belgesini yüklüyor, ekran sessizce boşalıyor. Gönderildi mi, silindi mi, hata mı oldu — anlaşılmıyor. Bu hem güven kıran hem tekrar göndermeye iten bir sessizlik; üstelik **kimlik belgesi** gibi kullanıcının en tedirgin olduğu yerde.

**Önerilen çözüm:** Gönderim sonrası açık onay ("Belgelerin alındı, inceleme 1–2 iş günü sürüyor") ve listede "inceleniyor" durumu.

---

### B4 · Para dekontu yüklemede hiçbir onay yok — **yüksek**

**Ekran:** Uzman → Komisyonlar
**Sorun:**

```ts
await api.uploadCommissionReceipt(token, inv.id, uri);
await load();
```

Aynı sessizlik, ama bu sefer **ödeme kanıtı** yükleniyor.

**Kullanıcıya etkisi:** Uzman komisyon borcunu ödediğinin dekontunu yüklüyor ve karşılığında hiçbir şey görmüyor. Para söz konusu olduğunda bu sessizlik en pahalı olanı: uzman ödediğini kanıtlayamadığını düşünüp desteğe yazar, ya da ikinci kez yükler.

**Önerilen çözüm:** B3 ile aynı — açık onay + faturada "dekont alındı, doğrulanıyor" durumu.

---

## 3. Orta etkili bulgular

### B5 · Aynı para iki farklı isimle anılıyor: "kapora" ve "depozito" — **orta**

**Ekran:** Randevu akışı, bildirimler, kurallar
**Sorun:** 2062 metnin taramasında aynı kavram iki ayrı kelimeyle geçiyor: **kapora 9 kez, depozito 19 kez** — ve ikisi **aynı `booking` ve `notif` önekleri altında** karışık kullanılıyor.

| kapora diyen                                        | depozito diyen                                  |
| --------------------------------------------------- | ----------------------------------------------- |
| `rules.deposit` "Kapora (randevuyu kesinleştirir)"  | `notif.deposit_expired` "Depozito süresi doldu" |
| `home.urgent.deposit` "Kapora dekontunu bekliyoruz" | `notif.late_cancel_b` "…depozito uzmanda kaldı" |
| `notif.late_cancel` "Geç iptal — kapora yandı"      | `quotes.confirm_b` "…depozito adımı"            |

Son iki satır dikkat çekici: **aynı olayın başlığı "kapora", gövdesi "depozito" diyor.**

**Kullanıcıya etkisi:** Kullanıcı para ödüyor ve ödediği şeyin adı ekrandan ekrana değişiyor. İki ayrı ücret olduğunu sanabilir. Para konusunda terim belirsizliği doğrudan güven sorunudur.

**Önerilen çözüm:** Birini seç, hepsini ona çevir. Bu bir **ürün/dil kararı** — hangisini istediğini söylemeni bekliyorum. (kk/ru çevirileri de aynı anda hizalanmalı.)

### B6 · Küçük terim dağınıklığı — **düşük**

Aynı taramada tek tük kalıntılar: "rezervasyon" 1 kez (148 "randevu"ya karşı), "istek" 2 kez (39 "talep"e karşı), "profesyonel" 2 kez (172 "uzman"a karşı), "bonus" 1 kez (54 "puan"a karşı).

**Etkisi düşük** ama düzeltmesi de neredeyse bedava — baskın terime çevrilir.

---

## 4. Doğrulayamadığım / yanlış çıkan şeyler

Bunları raporda tutuyorum çünkü rapordaki güveni ayarlıyorlar.

**İşlem geri bildirimi taraması eksik doğrulandı.** 56 yazma eylemi taradım, 27'si "ne onay ne yönlendirme" diye işaretlendi. **27'sinin hepsini tek tek doğrulamadım** — örneklem aldım ve sonuç şu oldu:

| doğruladığım              | sonuç                                                      |
| ------------------------- | ---------------------------------------------------------- |
| `submitKyc`               | **gerçek bulgu** → B3                                      |
| `uploadCommissionReceipt` | **gerçek bulgu** → B4                                      |
| `registerSpecialist`      | **YANLIŞ ALARM** — onay veriyor, tarama penceresi kısaymış |
| `startSafetySession`      | **bulgu değil** — arayüz durumu zaten geri bildirim        |

Yani işaretlenen 27'nin **kabaca yarısı yanlış alarm olabilir.** "27 ekranda geri bildirim yok" diye yazmadım, çünkü bilmiyorum. Kalan 23'ün tek tek doğrulanması ayrı bir iş.

**Çevrimdışı bandını bulgu sanıp eledim.** Store'da içi boş `catch` blokları görüp "hatalar sessizce yutuluyor" diye yazacaktım. Kontrol edince: bunlar yorumla açıklanmış kasıtlı çevrimdışı yedekleri, **ve** çevrimdışı bandı `app/_layout.tsx:178`'de gerçekten çiziliyor. Bulgu değil.

**Tarama yöntemim bir kez beni yanılttı.** İlk yükleniyor-durumu taramam "hiçbir ekranda yükleniyor göstergesi yok" dedi. Yanlıştı: desenim `\bloading` camelCase'te (`prosLoading`) eşleşmiyordu. Düzeltilmiş taramada Keşfet'in `ListSkeleton`'ı göründü. **Düzeltmeseydim var olmayan bir hatayı bildirmiş olacaktım** — bu oturumda aynı sınıf hatayı birden çok kez yaptım.

**Kendi kodum hakkında:** B1 doğrudan benim eksiğim (Keşfet'i düzeltip Randevular'ı bırakmışım). Savunmuyorum, en yüksek önceliğe koydum.

---

## 5. Bulgu özeti

| #   | bulgu                                 | etki       | düzeltme maliyeti         |
| --- | ------------------------------------- | ---------- | ------------------------- |
| B1  | Randevular yüklenirken "randevun yok" | **yüksek** | küçük (istemci)           |
| B2  | Kayıttan sonra tekrar giriş zorunlu   | **yüksek** | küçük (istemci)           |
| B3  | Kimlik belgesi gönderiminde onay yok  | **yüksek** | küçük (istemci)           |
| B4  | Para dekontu yüklemede onay yok       | **yüksek** | küçük (istemci)           |
| B5  | "kapora" / "depozito" karışıklığı     | orta       | küçük ama **karar** ister |
| B6  | Tek tük terim kalıntıları             | düşük      | çok küçük                 |

Dördü de yüksek etkili olanların hepsi **istemci tarafında ve küçük.** Sunucu değişikliği gerektiren tek bulgu yok.

---

## 6. Bu denetimin dışında kalan, ama bilmen gereken engeller

Bunlar UX bulgusu değil, ama "bugün kullanıcıya verilir mi" sorusunun cevabını etkiliyor:

- **Sürüm numaraları TestFlight yapısını engelliyor:** `version: "0.0.0"`, `buildNumber: "3"`, Android `versionCode` tanımsız. Hangi numaraları istediğini sormuştum, cevap gelmedi.
- **Ölçüm yok:** Sentry hesabı hâlâ açılmadı (hesap açmayı ben yapamıyorum, DSN'i senden bekliyorum). Yani çökme oranı ve gerçek açılış süresi **bilinmiyor** — bu raporun "bakılmadı" satırlarının bir kısmı bu yüzden.
- **KYC kuyruğu:** 11 uzman kayıtlı, **0 doğrulanmış.** "Sonra bakarız" demiştin; ilk kullanıcı açısından bu, hiçbir uzmanın onay rozeti taşımaması demek.

---

## 7. Tek cümlelik dürüst değerlendirme

**Bugün geniş kullanıcıya verilmez** — ama sebebi bu rapordaki UX bulguları değil (dördü de küçük ve bir oturumda kapanır), sürüm numaralarının yapıyı engellemesi, sıfır çökme ölçümü ve doğrulanmış uzman bulunmaması; bu üçü çözülür ve B1–B4 düzeltilirse **kontrollü bir beta grubuna verilebilir.**

---

## 8. Onayını beklediğim

Faz 2'de **yalnız onayladıklarını** yapacağım:

1. **B1–B4** düzeltilsin mi? (Hepsi küçük, hiçbiri ürün kararı içermiyor.)
2. **B5** için hangi kelime kalsın — **"kapora"** mı **"depozito"** mu? Bu senin kararın, ben seçmiyorum.
3. **B6** kalıntıları baskın terime çevrilsin mi?
4. Geri bildirim taramasında kalan **23 aday** tek tek doğrulansın mı? (Ayrı iş; yarısı yanlış alarm çıkabilir.)

---

## 9. Uygulama sırasında çıkan düzeltmeler

Faz 2'de B1–B4'ü yazarken raporun kendisinde iki hata buldum. İkisini de burada
kayda geçiriyorum, çünkü raporun güvenilirliğini etkiliyorlar.

### 9.1 · B1'i eksik teşhis etmişim — sorun daha geniş

Raporda yalnız "sunucudan çekim sürerken" penceresini yazmıştım. Uygularken iki
şey daha çıktı:

1. **`bookings` kalıcı saklanıyor ama geri yükleme ASENKRON.** Store her soğuk
   açılışta `bookings: []` ile başlıyor ve AsyncStorage'dan sonra doluyor. Yani
   yanlış boş durum yalnız ilk girişte değil, **her soğuk açılışta** mümkün.
2. **`demands` hiç kalıcı saklanmıyor** (persist listesinde yok). Yani Talepler
   sekmesi **her açılışta**, çekim boyunca "talebin yok" diyordu. Bu, raporladığım
   randevu vakasından **daha kötü** ve raporda hiç geçmiyor.

Düzeltme ikisini de kapsıyor: `bookingsLoading` + `demandsLoading`, ikisi de
`true` başlıyor ve her çıkış yolunda (misafir / başarı / hata) iniyor.

### 9.2 · B2'de "sunucu zaten oturum döndürüyor" iddiam yalnız YARISI için doğruydu

Raporda şöyle yazmıştım: _"Sunucu tarafında değişiklik gerekmiyor — veri zaten
geliyor."_ Bunu `/auth/register` üzerinde doğrulamıştım ve müşteri için doğru.

**Uzman kaydı farklı uçtan geçiyor:** `/specialists` yalnız `{ token, specialist }`
döndürüyor — `user` yok. Yani uzman tarafı için iddiam yanlıştı; oturumu
kuramıyordum.

Çözüm olarak sunucudaki ortak kimlik eşleyicisini (`safe()`) dışarı çıkarmak
yerine istemcide `/auth/me` çağırdım. Gerekçe: o eşleyici **her girişte**
kullanılıyor ve şifreleme anahtarına bağlı; bir UX düzeltmesi için fazla geniş
bir yarıçap olurdu. Bedeli kayıt akışında **bir ek tur**. `/me` düşerse kayıt
yine başarılı sayılıyor ve kullanıcı eski yola (giriş ekranı) düşüyor —
kaybolmuyor.

### 9.3 · B3 ve B4 raporladığımdan biraz daha kötüydü

İkisini de "başarı onayı yok" diye yazmıştım. Kodu açınca **`catch` bloğu da
olmadığı** görüldü: istek düşerse kullanıcı yine hiçbir şey görmüyordu. Yani
sessizlik tek yönlü değil, **iki yönlüydü**. Düzeltme ikisini de kapsıyor.

### 9.4 · Kapsamı bir yerde genişlettim

B2'yi uygularken misafir duvarındaki "Kayıt ol" düğmesinin `next` niyetini
taşımadığını gördüm: kullanıcı "Randevu al" deyip kayıt olduğunda, otomatik
giriş sonrası aradığı uzmanı baştan bulmak zorunda kalacaktı. Otomatik girişi
ekleyip kullanıcıyı rastgele bir yere bırakmak yarım iş olacağı için niyeti
zincir boyunca (duvar → rol seçici → müşteri kaydı) taşıdım. Bu, onayladığın
dört maddenin dışında kalan **tek** ekleme.

### 9.5 · B6'yı raporda BÜYÜK ÖLÇÜDE yanlış yazmışım

Raporda dört "kalıntı" saymıştım. Uygularken gerçek cümlelere bakınca üçünün
kalıntı olmadığı çıktı:

| raporda dediğim  | gerçekte                                                                    |
| ---------------- | --------------------------------------------------------------------------- |
| "profesyonel" ×2 | **Eşanlamlı değil** — sıfat ("En profesyonel uzmanlar"), rolün adı değil    |
| "istek" ×2       | Aslında **18** metin; 10'u "isteğe bağlı" = _optional_, bambaşka bir kelime |
| Always "istek"i  | Ayrı bir kavram; "talep"e çevirmek pazaryeri talebiyle çakışırdı            |
| "teklif isteği"  | Kendi içinde **3/3 tutarlı**, CTA'sı "Teklif iste" fiili — dokunulmadı      |

İlk sayımım hem eksikti (çift tırnaklı metinler taramaya girmiyordu) hem de
kelimenin ANLAMINA bakmadan sayıyordu.

Gerçekten aykırı olan üç şey kaldı — ve biri raporda hiç yoktu:

1. `salon.quick.agenda` "Rezervasyon takvimi" → **Randevu** (randevu 148'e karşı 1)
2. `rewards.earn.welcome` "Hoş geldin bonusu" → **puanı** (üst başlığı zaten
   "Nasıl **puan** kazanırsın?" diyordu)
3. `notif.booking_sent` "Randevu **isteğin** gönderildi" → **talebin** — kardeş
   bildirim `notif.rejected` aynı nesneye "Randevu **talebin**" diyordu. **Bu
   raporda yoktu**; tek bildirim ailesinde iki ad.

kk'de ayrıca `брондау` (жазылу 135'e karşı 1) ve `бонус` (ұпай 50'ye karşı 1),
ru'da `бонус` (балл 49'a karşı 1) aykırıydı. ru'nun takvim metni zaten doğruydu.
