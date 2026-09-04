import { categoryLabel } from './data';

/**
 * UZMANIN ADI, UZMANLIĞI DEĞİLDİR.
 *
 * Kayıtta biyografi boş bırakılırsa sunucu `specialty` alanına uzmanın
 * ADINI yazıyor (`(input.bio ?? '').slice(0, 60) || input.name`). Canlıda
 * görülen sonuç: arama satırında ve harita kartında ad iki kez —
 * "Darina Serbu / Darina Serbu". Daha kötüsü randevu ekranı hizmet adı
 * bulamayınca aynı alana düşüyor ve randevunun hizmeti "Darina Serbu"
 * oluyordu.
 *
 * Ad tekrarı bir uzmanlık bilgisi taşımıyor. Onun yerine uzmanın KENDİ
 * seçtiği ana alanın adı yazılıyor — uydurma değil, kayıtta seçilmiş
 * bilgi — ve kullanıcının dilinde. Alan da tanınmıyorsa boş: yanlış bir
 * uzmanlık yazmaktansa hiç yazmamak doğru.
 */
export function uzmanlikYazisi(
  pro: { specialty?: string | null; name?: string | null; sector?: string | null },
  locale: string,
): string {
  const uzmanlik = (pro.specialty ?? '').trim();
  const ad = (pro.name ?? '').trim();
  if (uzmanlik && uzmanlik !== ad) return uzmanlik;
  return categoryLabel(pro.sector ?? '', locale);
}
