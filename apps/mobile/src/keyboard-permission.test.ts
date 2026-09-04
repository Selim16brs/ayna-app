import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * #12 KLAVYE ve #16 BİLDİRİM İZNİ.
 *
 * Faz 0 + bu turda ölçülenler:
 *   - 29 form ekranında klavye kaçınması YOKTU; yalnız 4'ü
 *     `KeyboardAvoidingView` kullanıyordu. Küçük telefonda klavye hem
 *     odaklanılan alanı hem gönder düğmesini örtüyordu.
 *   - `keyboardShouldPersistTaps` yalnız 3 dosyada vardı: klavye açıkken
 *     düğmeye basmak İKİ dokunuş gerektiriyordu (ilki yalnız klavyeyi
 *     kapatıyor).
 *   - Bildirim izni GİRİŞTEN HEMEN SONRA isteniyordu — kullanıcı kayıt olur
 *     olmaz, hiçbir bildirimin ne işe yarayacağını görmeden.
 */

const kok = join(import.meta.dirname, '..');

function tsx(): string[] {
  const out: string[] = [];
  const gez = (d: string) => {
    for (const ad of readdirSync(d)) {
      const t = join(d, ad);
      if (statSync(t).isDirectory()) gez(t);
      else if (ad.endsWith('.tsx')) out.push(t);
    }
  };
  gez(join(kok, 'app'));
  gez(join(kok, 'src'));
  return out;
}

test('#12 — klavye kaçınması ORTAK bileşende', () => {
  // 29 ekranı tek tek düzeltmek hem eksik kalırdı hem yeni ekranlar aynı
  // hatayla doğardı.
  const scr = readFileSync(join(kok, 'src/ui/Screen.tsx'), 'utf8');
  assert.match(scr, /<KeyboardAvoidingView/, 'Screen klavyeden kaçınmıyor');
  assert.match(scr, /keyboardAvoiding = true/, 'varsayılan kapalı — unutulan ekran bozuk kalır');
  // Android'de `adjustResize` zaten boyutlandırıyor; padding çift sayar.
  assert.match(scr, /Platform\.OS === 'ios' \? 'padding' : undefined/, 'Android ayrılmamış');
});

test('#12 — formlu ekranlarda tek dokunuş yetiyor', () => {
  const ihlal: string[] = [];
  for (const f of tsx()) {
    const s = readFileSync(f, 'utf8');
    if (!s.includes('<TextInput')) continue;
    // ScrollView YOKSA kısa ekran: Screen'in kaçınması yeter.
    if (!/<ScrollView(?=[\s\n])/.test(s)) continue;
    if (!s.includes('keyboardShouldPersistTaps')) ihlal.push(f.slice(kok.length + 1));
  }
  assert.deepEqual(
    ihlal,
    [],
    `Klavye açıkken düğmeye İKİ dokunuş gerekiyor:\n  ${ihlal.join('\n  ')}`,
  );
});

test('#16 — izin girişte İSTENMİYOR', () => {
  const n = readFileSync(join(kok, 'src/notifications.ts'), 'utf8');
  // `registerForRemotePush` izin diyaloğunu AÇMAMALI: girişten hemen sonra
  // çalışıyor ve ilk oturumda sistem diyaloğu çıkıyordu.
  const m = /export async function registerForRemotePush[\s\S]*?\n\}/.exec(n);
  assert.ok(m, 'registerForRemotePush yok');
  assert.match(m[0], /ensurePermission\(\)/, 'izin kontrolü yok');
  assert.doesNotMatch(m[0], /ensurePermission\(true\)/, 'kayıt sırasında izin İSTİYOR');
  // Varsayılan sormamak olmalı.
  assert.match(n, /async function ensurePermission\(sor = false\)/, 'varsayılan soruyor');
});

test('#16 — izin DEĞER belli olunca isteniyor', () => {
  const n = readFileSync(join(kok, 'src/notifications.ts'), 'utf8');
  assert.match(n, /export async function bildirimIzniIste/, 'ayrı istek yolu yok');
  // İlk talep yayınlandığında: "teklif gelince haber verelim mi?"
  const demand = readFileSync(join(kok, 'app/demand/new.tsx'), 'utf8');
  assert.match(demand, /bildirimIzniIste\(/, 'talep sonrası izin istenmiyor');
  // Reddedilirse tekrar tekrar sorulmamalı.
  assert.match(n, /if \(!sor \|\| permAsked\) return false;/, 'ret sonrası tekrar soruyor');
});

test('#12 — KLAVYE KAÇINMASI İKİ KEZ uygulanmıyor', () => {
  /*
   * Kurucu: "ekran görüntüsünde gördüğün gibi kayma var. kullanıcı ne
   * işlem yaptığını anlayamıyor, göremiyor bile."
   *
   * Altı ekranın KENDİ `KeyboardAvoidingView`i vardı ama `Screen`in
   * kaçınmasını KAPATMIYORLARDI: klavye açılınca içerik iki kez
   * itiliyor, ekran neredeyse klavye yüksekliği kadar fazladan yukarı
   * kayıyordu — başlık ekranın dışına çıkıyordu.
   */
  const ihlal: string[] = [];
  for (const f of tsx()) {
    const s = readFileSync(f, 'utf8');
    if (!s.includes('<KeyboardAvoidingView')) continue;
    if (!s.includes('<Screen')) continue;
    if (!s.includes('keyboardAvoiding={false}')) ihlal.push(f.slice(kok.length + 1));
  }
  assert.deepEqual(
    ihlal,
    [],
    `Klavye kaçınması İKİ KEZ uygulanıyor (içerik iki kat yukarı kayar):\n  ${ihlal.join('\n  ')}`,
  );
});

test('#12 — KAÇINMA güvenli alanın DIŞINDA', () => {
  /*
   * SafeAreaView alt güvenli alan payını zaten uyguluyor; içeride kalan
   * bir KAV klavye yüksekliğini pencere dibinden ölçüp o kadar dolgu
   * ekleyince alt pay İKİ KEZ sayılıyordu.
   */
  const scr = readFileSync(join(kok, 'src/ui/Screen.tsx'), 'utf8');
  const kav = scr.indexOf('<KeyboardAvoidingView');
  const safe = scr.indexOf('<SafeAreaView');
  assert.ok(kav > 0 && safe > 0, 'bileşenler bulunamadı');
  assert.ok(kav < safe, 'kaçınma güvenli alanın içinde — alt pay iki kez sayılıyor');
});
