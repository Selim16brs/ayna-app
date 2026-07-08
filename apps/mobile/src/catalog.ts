import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { useStore } from './store';
import { type AdBanner, type Campaign, type Professional, type ProfessionalDetail } from './data';

/**
 * İşletme kataloğu backend'den; API erişilemezse yerel veriye düşer (offline-first).
 * Böylece hem gerçek API hem de sunucu kapalıyken demo çalışır.
 */
export function useProfessionals(): Professional[] {
  const { data } = useQuery({
    queryKey: ['professionals'],
    queryFn: api.professionals,
    retry: 1,
    staleTime: 60_000,
  });
  const city = useStore((s) => s.currentUser?.city);
  // Faz B — SUNUCU CEVAP VERDİYSE o liste ESASTIR (boşsa boş: gerçek boş-durum görünür).
  // Yerel mock kataloğa yalnız girişsiz demo + sunucuya ulaşılamadığında düşülür.
  const base = data ?? []; // sunucu tek kaynak — demo katalog YOK
  if (!city) return base;
  return base.filter((p) => !p.city || p.city === city);
}

// §12 — aktif kampanyalar; API erişilemezse yerel yedeğe düşer
export function useCampaigns(): Campaign[] {
  const { data } = useQuery({
    queryKey: ['campaigns'],
    queryFn: api.campaigns,
    retry: 1,
    staleTime: 60_000,
  });
  return data ?? []; // demo kampanya YOK — yalnız admin içeriği
}

// Reklam banner'ları (admin yönetimli); API erişilemezse yerel yedeğe düşer
export function useAds(): AdBanner[] {
  const { data } = useQuery({
    queryKey: ['ads'],
    queryFn: api.ads,
    retry: 1,
    staleTime: 60_000,
  });
  return data ?? []; // demo reklam YOK — yalnız admin içeriği
}

// Yükleme/bulunamama durumunda SAHTE kişilik yerine boş iskelet döner (ekranlar kırılmaz)
const EMPTY_DETAIL: ProfessionalDetail = {
  id: '',
  name: '',
  specialty: '',
  sector: '',
  kind: 'independent',
  rating: 0,
  reviewCount: 0,
  priceFrom: 0,
  priceTo: 0,
  image: '',
  badge: 'verified', // iskelet hiç kart olarak çizilmez; alan zorunlu
  city: '',
  district: '',
  experienceYears: 0,
  isPremium: false,
  staff: [],
  about: '',
  serviceRatings: [],
  services: [],
  portfolio: [],
  promotions: [],
  reviews: [],
  starDist: [0, 0, 0, 0, 0],
  breakdown: [],
  certs: [],
  social: { instagram: '', tiktok: '' },
};

export function useProfessionalDetail(id: string): ProfessionalDetail {
  const { data } = useQuery({
    queryKey: ['professional', id],
    queryFn: () => api.professional(id),
    retry: 1,
    staleTime: 60_000,
  });
  // Sunucu yanıtı EMPTY_DETAIL üstüne bindirilir: eksik alan (certs/social/starDist…)
  // undefined kalıp ekranı ÇÖKERTEMEZ (Öne Çıkanlar → profil patlaması bununla çözüldü).
  return data ? { ...EMPTY_DETAIL, ...data } : EMPTY_DETAIL;
}
