/**
 * BÜTÇE — saf yardımcılar.
 *
 * Ekran dosyası react-native'i içeri çekiyor ve Node testinde açılamıyor;
 * bu iki kural saf olduğu için ayrı duruyor ve sınanabiliyor.
 */

/**
 * Girilen metinden aylık limit.
 *
 * Kullanıcı "80 000", "80.000 ₸" gibi yazıyor; rakam dışındaki her şey
 * atılıyor. 0 ve altı LİMİT DEĞİL (`null`): 0 ₸'lik bir limit tutulsaydı
 * çubuk her harcamada dolu görünür ve kullanıcı sürekli "limiti aştın"
 * uyarısı alırdı.
 */
export function limitiCoz(ham: string): number | null {
  const sadeceRakam = ham.replace(/[^\d]/g, '');
  if (sadeceRakam.length === 0) return null;
  const n = Number(sadeceRakam);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Ayın ilk gününün başlangıcı (cihaz yerel saati). */
export function ayBasi(simdi: Date): number {
  return new Date(simdi.getFullYear(), simdi.getMonth(), 1).getTime();
}
