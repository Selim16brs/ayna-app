import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * MEVCUT FOTOĞRAFIN ARKA PLANINI TEMİZLEME.
 *
 * Kurucu: "ana sayfadaki kullanıcı profil fotoğrafı daire içinde olmasın
 * ve arka planı temizlenmiş olsun demiştim ama olmamış."
 *
 * Ekran doğru çalışıyordu: kesilmiş portre büyük ve çerçevesiz, ham
 * fotoğraf daire içinde. Eksik olan KESİMİN KENDİSİYDİ — yalnız YENİ
 * fotoğraf seçilirken çalışıyordu. Fotoğrafını bu özellikten önce yüklemiş
 * bir kullanıcının portresi sonsuza kadar ham kalıyordu.
 */

const yorumsuz = (x: string) =>
  x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const ekran = yorumsuz(readFileSync(join(__dirname, '..', 'app', 'profile', 'edit.tsx'), 'utf8'));

test('MEVCUT fotoğraf için temizleme yolu var', () => {
  assert.match(ekran, /const temizle = async \(\)/, 'temizleme eylemi yok');
  assert.match(ekran, /onPress=\{\(\) => void temizle\(\)\}/, 'düğmeye bağlanmamış');
});

test('ZATEN TEMİZLENMİŞ fotoğrafta düğme ÇIKMIYOR', () => {
  // Aynı işi ikinci kez yaptırmak remove.bg kredisini boşa harcardı.
  assert.match(
    ekran,
    /\{avatarUri && !portreKesilmis \? \(/,
    'temizlenmiş fotoda da düğme çıkıyor',
  );
});

test('KENDİLİĞİNDEN çalışmıyor — kredi kullanıcının haberi olmadan yanmıyor', () => {
  /*
   * Her açılışta ya da her ekranda otomatik kesim, kullanıcının haberi
   * olmadan para harcamak olurdu. Temizleme YALNIZ dokunuşla başlıyor:
   * `useEffect` içinden çağrılmamalı.
   */
  const efektler = [...ekran.matchAll(/useEffect\([\s\S]{0,400}?\}\s*,\s*\[/g)].map((m) => m[0]);
  for (const e of efektler) {
    assert.doesNotMatch(e, /temizle\(|applyProfileCutout\(/, 'kesim otomatik tetikleniyor');
  }
});

test('İŞLEM SÜRERKEN düğme kilitleniyor', () => {
  // İki kez basmak iki kredi yakardı.
  assert.match(ekran, /disabled=\{temizleniyor\}/, 'düğme çift basıma açık');
  assert.match(
    ekran,
    /if \(!avatarUri \|\| temizleniyor\) return;/,
    'eşzamanlı çağrı engellenmiyor',
  );
});

test('BAŞARISIZLIK sessizce geçilmiyor', () => {
  /*
   * Kullanıcı temizlendiğini sanıp ham fotoğrafla kalırsa neyin yanlış
   * gittiğini anlamaz. Üç sonucun üçü de kullanıcıya söyleniyor.
   */
  /*
   * SONUCUN ÜÇ DALI DA bildirilmeli. İlk sürümüm yalnız metinlerin
   * fonksiyonda geçtiğine bakıyordu; `else` dalını silmek testi
   * geçiriyordu çünkü aynı metin başka bir dalda da vardı.
   */
  const govde = ekran.slice(
    ekran.indexOf('const temizle = async'),
    ekran.indexOf('const onPhotoPicked'),
  );
  const dallar = govde.slice(govde.indexOf('await applyProfileCutout'));
  assert.match(dallar, /res === 'not_premium'\) Alert\.alert\(/, 'üyelik dalı bildirilmiyor');
  assert.match(dallar, /res === 'ok'\) Alert\.alert\(/, 'başarı bildirilmiyor');
  assert.match(dallar, /else Alert\.alert\(t\('cutout\.failed'\)\)/, 'başarısızlık dalı yok');
});

test('UZAK adresli fotoğrafta anlamlı hata', () => {
  // `http` adresli avatarı base64'e çeviremeyiz; sessizce başarısız olmak
  // yerine kullanıcıya söylüyoruz.
  assert.match(ekran, /if \(!m\) \{[\s\S]{0,120}cutout\.failed/, 'uzak adres sessizce düşüyor');
});
