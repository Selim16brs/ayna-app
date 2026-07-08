import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { useStore } from './store';

// Faz C — salonun GERÇEK kadrosu (davet koduyla bağlanan uzmanlar). Mock kadro
// (Madina/Aigerim/Saule) girişli salon panelinde ASLA gösterilmez; kadro yoksa
// ekranlar dürüst boş-durum + "davet koduyla uzman ekle" yönlendirmesi gösterir.
export interface SalonStaffMember {
  name: string;
  image: string; // profil foto altyapısı gelene dek boş (ekranlar baş harfe düşer)
  bookings: number;
  rating: number;
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
      // bookings/rating: yeni bağlanan uzman için dürüst sıfır (gerçek veri biriktikçe dolacak)
      return rows.map((r) => ({ name: r.name, image: '', bookings: 0, rating: 0 }));
    },
  });
  return { staff: data ?? [], loading: isLoading };
}
