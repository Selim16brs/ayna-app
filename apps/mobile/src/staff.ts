import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useStore } from './store';

// Faz C — salonun GERÇEK kadrosu (davet koduyla bağlanan uzmanlar). Mock kadro
// (Madina/Aigerim/Saule) girişli salon panelinde ASLA gösterilmez; kadro yoksa
// ekranlar dürüst boş-durum + "davet koduyla uzman ekle" yönlendirmesi gösterir.
export interface SalonStaffMember {
  /** Uzman kaydının kimliği (`Specialist.id`) — eşleşme buna bakıyor. */
  id: string;
  name: string;
  image: string; // profil foto altyapısı gelene dek boş (ekranlar baş harfe düşer)
  bookings: number;
  /** Değerlendirme yoksa `null` — "0,0 puan" DEĞİL. */
  rating: number | null;
  /**
   * Uzmanın KENDİ panelinde tanımladığı hizmetler. Kadro ekranı bunları
   * koda gömülü bir ad→hizmet tablosundan okuyordu; artık sunucudan.
   * Liste boşsa ekran "hizmet tanımlanmamış" diyor, uydurmuyor.
   */
  services?: string[];
}

export function useSalonStaff(): { staff: SalonStaffMember[]; loading: boolean } {
  const token = useStore((s) => s.token);
  const role = useStore((s) => s.currentUser?.role);
  const { data, isLoading } = useQuery({
    queryKey: ['salon-staff'],
    enabled: !!token && role === 'salon',
    staleTime: 30_000,
    queryFn: async () => {
      const businesses = await api.myBusinesses(token!);
      const first = businesses[0];
      if (!first) return [];
      const rows = await api.businessStaff(token!, first.id);
      /*
       * PUAN HENÜZ YOK ≠ PUAN SIFIR.
       *
       * `rating: 0` yazılıyordu ve ekran bunu yıldız ikonunun yanında
       * "0.0" diye basıyordu: değerlendirilmemiş bir uzman, en kötü
       * puanı almış gibi görünüyordu. Bilinmeyen puan `null`.
       */
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        image: '',
        bookings: 0,
        rating: null,
        services: r.services ?? [],
      }));
    },
  });
  return { staff: data ?? [], loading: isLoading };
}

/**
 * §4.5 — uzmanı salon kadrosundan çıkarır (sunucuda).
 *
 * Uzmanın HESABI silinmiyor, yalnız salon bağı kopuyor: kendi kartı,
 * hizmetleri ve geçmişi duruyor, bağımsız uzman olarak devam ediyor.
 * Sunucu uzmana bildirim gönderiyor — sessiz silme yasak.
 *
 * Hook, çünkü kadro listesinin ÖNBELLEĞİ de geçersiz kılınmalı: yoksa
 * çıkarılan uzman ekranda 30 saniye daha duruyor ve kurucu "çıkmadı" diye
 * ikinci kez basıyordu.
 */
export function useKadrodanCikar(): (specialistId: string) => Promise<void> {
  const qc = useQueryClient();
  return async (specialistId: string) => {
    const token = useStore.getState().token;
    if (!token) throw new Error('oturum yok');
    const businesses = await api.myBusinesses(token);
    const first = businesses[0];
    if (!first) throw new Error('işletme yok');
    await api.removeStaff(token, first.id, specialistId);
    await qc.invalidateQueries({ queryKey: ['salon-staff'] });
  };
}
