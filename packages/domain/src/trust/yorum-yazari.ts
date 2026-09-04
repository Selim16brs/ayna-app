/**
 * ANONİM YORUM YAZARININ ETİKETİ — TEK KAYNAK.
 *
 * Bu dize üç yerde ayrı ayrı yazılıydı: sunucu yorumu kaydederken, uygulama
 * iyimser kaydı çizerken ve tohum verisinde. Ekranda gösterilen yazı
 * kullanıcının diline çevriliyor; çeviri KARŞILAŞTIRMAYLA yapıldığı için
 * üçünün birebir aynı olması şart. Ayrı yazılırsa biri değiştiğinde o
 * yorumlar çevrilmeden Türkçe kalır ve kimse fark etmez.
 *
 * Kayıtlı değer TÜRKÇE kalıyor: geçmiş satırlar veritabanında bu dizeyle
 * duruyor, değiştirmek onları kimliksiz bırakırdı.
 */
export const ANONIM_YAZAR_ETIKETI = 'Doğrulanmış üye';

/** Kullanıcının kendi yorumu için saklanan etiket. */
export const BEN_YAZAR_ETIKETI = 'Sen';
