import { SLOT_HOLDING_STATES } from '@ayna/domain';
import { BookingStatus } from '@prisma/client';

/**
 * Slot İŞGAL EDEN durumlar — TEK KAYNAK.
 *
 * Brief §0: "Uzmanın online randevuları, offline randevuları ve kişisel blokları
 * TEK takvime yazılır. Müşteriye gösterilen boş slotlar bu takvimden hesaplanır."
 *
 * ÖNCEKİ KARAR TERSİNE ÇEVRİLDİ: `awaiting_provider` (yeni adıyla
 * `onay_bekliyor`) bilinçli olarak listeden ÇIKARILMIŞTI — gerekçe, ters
 * pazaryerinde aynı slota birden çok talep düşebilmesiydi. Brief §4.2 bunu
 * değiştiriyor:
 *
 *   "Talep gönderildiği an slot KİLİTLENİR (otobüs/sinema bileti modeli).
 *    Aynı slotu ikinci bir müşteri talep edemez; ekranda 'beklemede' görünür."
 *
 * Yani artık bekleyen talep de slot tutuyor. Kilit, uzmanın 3 saati dolunca
 * (`otomatik_dustu`) kendiliğinden açılır.
 *
 * Liste `@ayna/domain`den TÜRETİLİYOR; burada elle yazılsaydı iki listenin
 * ayrışması, bir kod yolunun dolu saydığı slotu diğerinin boş saymasına —
 * yani sessiz çift rezervasyona — yol açardı.
 */
export const SLOT_HOLDING_STATUSES: BookingStatus[] = SLOT_HOLDING_STATES.map(
  (s) => s as BookingStatus,
);
