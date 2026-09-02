import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PAZARLAMA, SABLONLAR, sablonUret, type SablonAdi } from './sablonlar';

/**
 * AYNA E-POSTA SİSTEMİ.
 *
 * AIVIO'nun sistemi kapatılıp yerine bu kuruldu. Buradaki testler o geçişte
 * kolayca gözden kaçacak şeyleri tutuyor: eksik dil, kayıp abonelikten çıkma
 * bağlantısı, tekrar engellemeyi bozan anahtar değişikliği.
 */

const DILLER = ['tr', 'kk', 'ru'] as const;
const ADLAR = Object.keys(SABLONLAR) as SablonAdi[];
const girdi = {
  ad: 'Aigerim',
  site: 'https://ayna.salon',
  veri: { uzman: 'Aizhan', zaman: '14:00', tutar: '4.500 ₸' },
};

test('her şablon ÜÇ dilde de üretiliyor', () => {
  // Uygulamanın kuralı: tüm kullanıcı metinleri tr + kk + ru. E-posta da
  // kullanıcı metni; tek dilde şablon, o dili konuşmayana boş posta demek.
  for (const ad of ADLAR) {
    for (const dil of DILLER) {
      const s = sablonUret(ad, girdi, dil);
      assert.ok(s.konu.trim().length > 0, `${ad}/${dil}: konu boş`);
      assert.ok(s.html.includes('<!doctype html>'), `${ad}/${dil}: gövde kurulmamış`);
      assert.ok(s.metin.trim().length > 0, `${ad}/${dil}: düz metin yok`);
    }
  }
});

test('konu satırları diller arasında AYNI DEĞİL', () => {
  // Aynı konu üç dilde de çıkıyorsa çeviri yapılmamış, kopyalanmış demektir.
  for (const ad of ADLAR) {
    const konular = DILLER.map((d) => sablonUret(ad, girdi, d).konu);
    assert.equal(
      new Set(konular).size,
      3,
      `${ad}: konu satırı çevrilmemiş (${konular.join(' | ')})`,
    );
  }
});

test('düz metin YEDEĞİ gerçek — HTML etiketi taşımıyor', () => {
  // Bazı istemciler yalnız düz metni gösteriyor. İçine HTML sızarsa
  // kullanıcı "<strong>" görüyor.
  for (const ad of ADLAR) {
    for (const dil of DILLER) {
      const { metin } = sablonUret(ad, girdi, dil);
      assert.doesNotMatch(metin, /<[a-z/][^>]*>/i, `${ad}/${dil}: düz metinde HTML var`);
    }
  }
});

test('PAZARLAMA postalarında abonelikten çıkma bağlantısı VAR', () => {
  /*
   * Yasal ve etik zorunluluk: pazarlama postası çıkış yolu olmadan
   * gönderilemez. İşlemsel postada (randevu hatırlatma, iade) çıkış YOK —
   * onlar aboneliğe değil, kullanıcının kendi işlemine bağlı.
   */
  for (const ad of ADLAR) {
    const html = sablonUret(ad, { ...girdi, cikisUrl: 'https://ayna.salon/x' }, 'tr').html;
    const varMi = html.includes('https://ayna.salon/x');
    if (PAZARLAMA.has(ad)) assert.ok(varMi, `${ad}: pazarlama postası ama çıkış bağlantısı yok`);
  }
});

test('İŞLEMSEL postalarda çıkış bağlantısı YOK', () => {
  // Randevu hatırlatmasından "çık" diyemezsin — o abonelik değil.
  for (const ad of ADLAR) {
    if (PAZARLAMA.has(ad)) continue;
    const html = sablonUret(ad, { ...girdi, cikisUrl: 'https://ayna.salon/x' }, 'tr').html;
    assert.ok(
      !html.includes('https://ayna.salon/x'),
      `${ad}: işlemsel postada çıkış bağlantısı var`,
    );
  }
});

test('şablon anahtarları DEĞİŞMEZ — tekrar engelleme buna bağlı', () => {
  /*
   * `email_log.template` bu anahtarları saklıyor ve `(userId, template)`
   * benzersiz. Bir anahtarı yeniden adlandırmak, o postayı almış herkese
   * İKİNCİ KEZ göndermek demek: eski kayıt artık eşleşmez.
   */
  assert.deepEqual([...ADLAR].sort(), [
    'degerlendirme',
    'depozito_bekliyor',
    'depozito_iadesi',
    'geri_kazanim',
    'hosgeldin',
    'ilk_randevu',
    'puan_hatirlatma',
    'randevu_hatirlatma',
    'randevu_onaylandi',
    'reklam_yayinda',
    'teklif_geldi',
    'uzman_talep',
  ]);
});

test('şablonlar YAPI OLARAK da çeşitli', () => {
  /*
   * Kurucu: "mailing çeşitliliği yok." Doğruydu — altı şablon da aynı
   * iskeletteydi (başlık + paragraf + düğme), gelen kutusunda tek bir
   * postaya benziyorlardı.
   *
   * Artık her şablon işine göre farklı bir yapı kullanıyor. Bu test o
   * çeşitliliğin kaybolmamasını bekçiliyor: en az üç ayrı blok türü
   * kullanılmalı ve hiçbir tür TEK BAŞINA çoğunluğu oluşturmamalı.
   */
  const bloklar = { rakamBant: 0, kunye: 0, adimlar: 0, madde: 0, kutu: 0 };
  for (const ad of ADLAR) {
    const html = sablonUret(ad, girdi, 'tr').html;
    // Blokların ayırt edici imzaları — sınıf adı yok, satır içi stil var.
    if (html.includes('font-size:34px')) bloklar.rakamBant += 1;
    if (html.includes('border:1px solid #EFEBE9;border-radius:16px')) bloklar.kunye += 1;
    if (html.includes('border-radius:999px;background:#F5ECF6')) bloklar.adimlar += 1;
    if (html.includes('font-weight:700">•<')) bloklar.madde += 1;
    if (html.includes('background:#E3F2E8') || html.includes('background:#FDF3E7'))
      bloklar.kutu += 1;
  }
  const kullanilan = Object.entries(bloklar).filter(([, n]) => n > 0);
  assert.ok(kullanilan.length >= 4, `yapı çeşitliliği düşük: ${JSON.stringify(bloklar)}`);
  const enCok = Math.max(...Object.values(bloklar));
  assert.ok(enCok <= ADLAR.length * 0.6, `tek bir blok türü baskın: ${JSON.stringify(bloklar)}`);
});

test('her postada LOGO var', () => {
  // Kurucu: "ayna logosu yok." Yazıyla "AYNA" yazıyordu; artık gerçek logo.
  for (const ad of ADLAR) {
    const html = sablonUret(ad, girdi, 'tr').html;
    assert.match(html, /<img src="[^"]+ayna-logo-beyaz\.png"/, `${ad}: logo yok`);
    // Görselleri kapalı okuyan marka adını yine görmeli.
    assert.match(html, /alt="AYNA"/, `${ad}: logonun alt metni yok`);
  }
});

test('önizleme satırı BOŞ değil', () => {
  // Yoksa istemci gövdenin başını çekiyor ve gelen kutusunda çoğu zaman
  // "Merhaba" yazıyor — hiçbir şey anlatmayan bir satır.
  for (const ad of ADLAR) {
    const html = sablonUret(ad, girdi, 'tr').html;
    const m =
      /<div style="display:none;max-height:0;overflow:hidden;opacity:0">([^<]*)<\/div>/.exec(html);
    assert.ok(m && m[1]!.trim().length > 0, `${ad}: önizleme satırı boş`);
  }
});

test('ADSIZ kullanıcıda selamlama bozulmuyor', () => {
  // AYNA'da ad zorunlu değil: "Merhaba, ." çıkmamalı.
  for (const dil of DILLER) {
    const { html, metin } = sablonUret('hosgeldin', { ...girdi, ad: '' }, dil);
    /*
     * GÖRÜNEN metne bakılıyor, ham HTML'e değil: ilk hâli `rgba(255,240,245,.7)`
     * gibi CSS değerlerindeki virgül-noktayı "boş selamlama" sanıyordu.
     * Etiketleri ve stil bloklarını atınca kalan şey kullanıcının okuduğu şey.
     */
    const gorunen = html
      .replace(/<style[\s\S]*?<\/style>/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ');
    assert.doesNotMatch(gorunen, /,\s*\./, `${dil}: adsız selamlamada boş virgül`);
    assert.doesNotMatch(metin, /,\s*\./, `${dil}: düz metinde boş virgül`);
  }
});
