'use client';
import { PageHead } from '@/app/_components/ui';
import { UzmanFormu } from '../_UzmanFormu';

/**
 * YENİ UZMAN — "/professionals/yeni".
 *
 * Eskiden "+ Yeni uzman" düğmesi boş bir modal açıyordu; form artık kendi
 * rotasında, gövdesi düzenleme sayfasıyla ortak (`_UzmanFormu`).
 */
export default function YeniUzmanSayfasi() {
  return (
    <>
      <PageHead
        title="Yeni uzman"
        sub="Keşif listesindeki uzman/salonlar — ekle, düzenle, fiyat, öne çıkar, sil"
      />
      <UzmanFormu />
    </>
  );
}
