# Hızlı eylem görselleri

Keşfet ana sayfasındaki üç kartın fotoğrafları. Kurucunun kendi verdiği
görseller.

## Hazırlarken

**Kırpma. Sadece küçült.**

Kurucu: "kıprman degıl o ebada olabıldıgınce kucultmen lazımdı. ve sonra
kırpman gerekıyorsa kırpmalıydın."

Bir kez tam tersini yaptım: önce kart oranına kırpıp sonra küçülttüm.
Sonuç iki kat kayıp oldu — çünkü kart zaten `resizeMode="cover"` ile
çalışma anında kendi kırpmasını yapıyor. Benim kırpmam onun üstüne
biniyordu; tırnak fotoğrafında %15 yerine yaklaşık %28 içerik gitti.

Doğrusu:

```bash
sips --resampleWidth 440 kaynak.PNG --out hedef.png
```

Kırpma YOK. `cover` cihazın gerçek kart oranına göre en az kırpmayı
kendisi yapar; farklı ekran genişliklerinde kart oranı da değişiyor,
yani doğru kırpmayı burada peşinen bilemeyiz.

Ne görüneceğini önceden görmek istersen ASIL dosyayı bozmadan bir
kopyada dene:

```bash
cp hedef.png /tmp/onizleme.png
sips -c 560 440 /tmp/onizleme.png --out /tmp/onizleme.png
```

## Ölçü

440 px genişlik yeterli: kart ~110pt genişliğinde, 3x ekranda 330 px.
Yükseklik görselin kendi oranından gelir.
