import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * DAYANIKLILIK — denetim #9 (çökme), #14 (geri tuşu), #10 (internetsiz),
 * #3 (izinler), #18 (boyut).
 *
 * Faz 0'da bulunanlar: hata sınırı YOK, `BackHandler` HİÇ kullanılmıyor,
 * ağ durumu göstergesi YOK, isteklerde zaman aşımı YOK, izin listesi
 * iki kez yazılmış ve kullanılmayan izinler içeriyor, tek bir görsel
 * 3,2 MB.
 */

const kok = join(import.meta.dirname, '..');
const layout = readFileSync(join(kok, 'app/_layout.tsx'), 'utf8');
const api = readFileSync(join(kok, 'src/api.ts'), 'utf8');
const sinir = readFileSync(join(kok, 'src/ui/ErrorBoundary.tsx'), 'utf8');
const appJson = JSON.parse(readFileSync(join(kok, 'app.json'), 'utf8')) as {
  expo: {
    android: { permissions: string[] };
    ios: { infoPlist: Record<string, string> };
    plugins: (string | [string, unknown])[];
  };
};

test('#9 — hata sınırı EN DIŞTA', () => {
  // Sağlayıcıların dışında olmalı: tema/dil sağlayıcısı patlarsa da kurtarma
  // ekranı çizilebilmeli.
  const m = /<ErrorBoundary>[\s\S]*?<QueryClientProvider/.exec(layout);
  assert.ok(m, 'hata sınırı QueryClientProvider dışında değil');
  assert.match(sinir, /static getDerivedStateFromError/, 'sınır hatayı yakalamıyor');
  // Kullanıcıya stack trace GÖSTERİLMEZ (#11).
  assert.doesNotMatch(
    sinir,
    /\{this\.state\.error\.(message|stack)\}/,
    'teknik metin gösteriliyor',
  );
  // Kurtarma ekranı tema sağlayıcısına BAĞLI OLMAMALI.
  assert.doesNotMatch(sinir, /useTheme\(\)/, 'kurtarma ekranı tema sağlayıcısına bağlı');
});

test('#9 — async hatalar da yakalanıyor', () => {
  // Hata sınırı olay işleyicisi ve async hataları GÖREMEZ.
  assert.match(sinir, /setGlobalHandler/, 'küresel yakalayıcı yok');
  assert.match(layout, /kurGlobalHataYakalayici\(/, 'küresel yakalayıcı kurulmuyor');
});

test('#14 — sekme kökünde geri tuşu uygulamayı uyarısız kapatmıyor', () => {
  const geri = readFileSync(join(kok, 'src/use-back-exit.ts'), 'utf8');
  assert.match(geri, /hardwareBackPress/, 'geri tuşu dinlenmiyor');
  assert.match(geri, /return true;/, 'ilk basma yutulmuyor');
  assert.match(layout, /useBackExit\(kokYol\)/, 'sekme köklerinde bağlı değil');
  // iOS'ta donanım geri tuşu yok; programla kapatmak App Store kuralına aykırı.
  assert.match(geri, /Platform\.OS !== 'android'/, 'iOS ayrılmamış');
});

test('#10 — her istekte zaman aşımı var', () => {
  // `fetch` React Native'de varsayılan zaman aşımı taşımaz: ölü ağda istek
  // sonsuza kadar bekliyordu ve ekran sonsuza kadar dönüyordu.
  assert.match(api, /const ISTEK_ZAMAN_ASIMI_MS = /, 'zaman aşımı sabiti yok');
  assert.match(api, /new AbortController\(\)/, 'istek kesilemiyor');
  // Ham `fetch` YALNIZ yardımcının içinde kalmalı.
  const ham = [...api.matchAll(/await fetch\(/g)].length;
  assert.equal(ham, 1, `${ham} ham fetch var — hepsi zamanAsimliFetch'ten geçmeli`);
});

test('#10 — çevrimdışı bandı var ve kapatılamıyor', () => {
  const bant = readFileSync(join(kok, 'src/ui/OfflineBanner.tsx'), 'utf8');
  assert.match(layout, /<OfflineBanner \/>/, 'bant çizilmiyor');
  // Denetim "kapatılamayan" diyor: kapatılırsa kullanıcı neden veri
  // gelmediğini yine bilemez.
  //
  // YORUMLAR ELENİYOR: ilk sürümüm "kapatılamayan" kelimesini AÇIKLAMA
  // satırında bulup düştü — kod doğruydu. Bu oturumda aynı hatayı üçüncü
  // kez yaptım; kaynak taraması artık her zaman yorumsuz yapılmalı.
  const kod = bant.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(kod, /onPress|close|kapat/i, 'bant kapatılabiliyor');
  assert.match(api, /export const cevrimdisiDurumu/, 'durum kaynağı yok');
});

test('#3 — gereksiz izin yok, liste tekrarsız', () => {
  const izin = appJson.expo.android.permissions;
  assert.equal(new Set(izin).size, izin.length, 'izin listesi tekrar içeriyor');
  for (const yasak of [
    'RECORD_AUDIO',
    'READ_MEDIA_AUDIO',
    'READ_MEDIA_VIDEO',
    'WRITE_EXTERNAL_STORAGE',
  ]) {
    assert.ok(!izin.some((p) => p.includes(yasak)), `kullanılmayan izin isteniyor: ${yasak}`);
  }
});

test('#3 — iOS izin açıklamaları tanımlı', () => {
  // Tanımsızsa Expo'nun İngilizce genel metni gider; konum için açıklama
  // YOKSA iOS izin isteyince UYGULAMA ÇÖKER.
  const ip = appJson.expo.ios.infoPlist;
  for (const k of [
    'NSPhotoLibraryUsageDescription',
    'NSCameraUsageDescription',
    'NSLocationWhenInUseUsageDescription',
  ]) {
    assert.ok(ip[k] && ip[k].length > 20, `${k} yok ya da açıklayıcı değil`);
  }
  // `expo-location` kullanılıyor ama eklenti listesinde YOKTU.
  const eklentiler = appJson.expo.plugins.map((p) => (typeof p === 'string' ? p : p[0]));
  assert.ok(eklentiler.includes('expo-location'), 'expo-location eklenti listesinde yok');
});

test('#18 — paketlenen görsel çizildiğinden çok büyük değil', () => {
  // `boni-cat.png` 1024×1536 saklanıp 81×122 pt çiziliyordu: 16 kat fazla
  // piksel. Metro yalnız `require` edilen varlıkları paketler, yani bu
  // gerçekten kullanıcıya iniyordu.
  const sinirKB = 400;
  for (const ad of ['boni-cat.png', 'logo-mark.png', 'hero-user.png']) {
    const kb = statSync(join(kok, 'assets', ad)).size / 1024;
    assert.ok(kb < sinirKB, `${ad} ${Math.round(kb)} KB — ${sinirKB} KB üstü`);
  }
});
