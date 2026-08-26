// Admin panelini Railway'de yayınlayan küçük statik sunucu.
//
// NEDEN NEXT START DEĞİL: panel `output: 'export'` ile statik üretiliyor ve bu
// hâliyle test ediliyor. Sunucu kipine geçmek derleme yolunu değiştirirdi;
// gereken tek ek şey KAPI olduğu için statik çıktıyı olduğu gibi servis edip
// önüne kimlik doğrulama koyuyoruz.
//
// NEDEN KAPI: Railway servisleri de herkese açık bir URL alır. Panelin kendi
// giriş ekranı veriyi korur (API token ister), ama panelin kendisi ve tüm uç
// noktaları indirilebilir olurdu. Basic Auth, sayfa daha yüklenmeden durdurur.
//
// Bağımlılık yok: yalnız Node çekirdeği.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { timingSafeEqual } from 'node:crypto';

const PORT = Number(process.env.PORT) || 3100;
const KOK = join(import.meta.dirname, 'out');
const KULLANICI = process.env.ADMIN_BASIC_USER ?? '';
const SIFRE = process.env.ADMIN_BASIC_PASS ?? '';
// Tarayıcı kapısını kapatmak için: ADMIN_GATE_OFF=1
//
// İki kapı (tarayıcı kutusu + panelin kendi girişi) pratikte kafa karıştırdı:
// hangi kutuya hangi şifrenin gireceği belirsizleşti. Kapatınca tek giriş
// panelin kendi ekranı olur — veri yine korunur (API token ister), ama panelin
// dosyaları herkese açık hâle gelir.
//
// AYRI bir değişken gerekiyor: kimlik bilgisini silmek kapıyı açmaz (aşağıda
// fail-closed davranış korunuyor). Kapatmak BİLİNÇLİ bir hareket olmalı.
const KAPI_KAPALI = process.env.ADMIN_GATE_OFF === '1';

const TIPLER = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

/** Sabit süreli karşılaştırma — uzunluk farkı da sızdırmaz. */
function esit(a, b) {
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  if (x.length !== y.length) {
    // Yine de bir karşılaştırma yap: erken dönüş zamanlama farkı yaratır.
    timingSafeEqual(x, x);
    return false;
  }
  return timingSafeEqual(x, y);
}

function yetkili(req) {
  if (KAPI_KAPALI) return true;
  // Kimlik bilgisi TANIMLI DEĞİLSE kapıyı açık bırakmayız — kapatırız.
  // "Ayar unutulduğunda panel herkese açılsın" kabul edilemez bir varsayılan.
  if (!KULLANICI || !SIFRE) return false;
  const h = req.headers.authorization ?? '';
  if (!h.startsWith('Basic ')) return false;
  let cozulmus;
  try {
    cozulmus = Buffer.from(h.slice(6), 'base64').toString('utf8');
  } catch {
    return false;
  }
  const i = cozulmus.indexOf(':');
  if (i < 0) return false;
  return esit(cozulmus.slice(0, i), KULLANICI) && esit(cozulmus.slice(i + 1), SIFRE);
}

async function dosyaBul(yol) {
  // Dizin geçişi (../) engellenir: normalize sonrası kök dışına çıkan reddedilir.
  const temiz = normalize(yol).replace(/^(\.\.[/\\])+/, '');
  let tam = join(KOK, temiz);
  if (!tam.startsWith(KOK)) return null;
  try {
    const s = await stat(tam);
    if (s.isDirectory()) tam = join(tam, 'index.html');
  } catch {
    // Next statik dışa aktarımı /yol → /yol.html üretir.
    tam = `${tam}.html`;
  }
  try {
    return { tam, icerik: await readFile(tam) };
  } catch {
    return null;
  }
}

const sunucu = createServer(async (req, res) => {
  // Sağlık ucu kapının DIŞINDA: Railway'in servisi ayakta sayması için gerekli.
  if (req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    return res.end('ok');
  }

  if (!yetkili(req)) {
    res.writeHead(401, {
      'www-authenticate': 'Basic realm="AYNA Admin", charset="UTF-8"',
      'content-type': 'text/plain; charset=utf-8',
    });
    return res.end('Yetkisiz');
  }

  const yol = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const bulunan =
    (await dosyaBul(yol === '/' ? '/index.html' : yol)) ?? (await dosyaBul('/404.html'));
  if (!bulunan) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('Bulunamadı');
  }

  res.writeHead(200, {
    'content-type': TIPLER[extname(bulunan.tam)] ?? 'application/octet-stream',
    // Panel ARAMA MOTORLARINA girmesin.
    'x-robots-tag': 'noindex, nofollow',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
  });
  res.end(bulunan.icerik);
});

sunucu.listen(PORT, () => {
  if (!KULLANICI || !SIFRE) {
    // eslint-disable-next-line no-console
    console.warn('[admin] ADMIN_BASIC_USER/PASS tanımlı değil — panel KAPALI (401).');
  }
  // eslint-disable-next-line no-console
  console.log(`[admin] ${PORT} portunda`);
});
