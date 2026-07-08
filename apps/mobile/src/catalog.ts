import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { useStore } from './store';
import {
  type AdBanner,
  ADS,
  type Campaign,
  CAMPAIGNS,
  getProfessionalDetail,
  type Professional,
  type ProfessionalDetail,
  PROFESSIONALS,
} from './data';

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
  const token = useStore((s) => s.token);
  const city = useStore((s) => s.currentUser?.city);
  // Faz B — SUNUCU CEVAP VERDİYSE o liste ESASTIR (boşsa boş: gerçek boş-durum görünür).
  // Yerel mock kataloğa yalnız girişsiz demo + sunucuya ulaşılamadığında düşülür.
  const base = data ?? (token ? [] : PROFESSIONALS);
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
  return data && data.length > 0 ? data : CAMPAIGNS;
}

// Reklam banner'ları (admin yönetimli); API erişilemezse yerel yedeğe düşer
export function useAds(): AdBanner[] {
  const { data } = useQuery({
    queryKey: ['ads'],
    queryFn: api.ads,
    retry: 1,
    staleTime: 60_000,
  });
  return data && data.length > 0 ? data : ADS;
}

export function useProfessionalDetail(id: string): ProfessionalDetail {
  const { data } = useQuery({
    queryKey: ['professional', id],
    queryFn: () => api.professional(id),
    retry: 1,
    staleTime: 60_000,
  });
  return data ?? getProfessionalDetail(id);
}
