import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import {
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
  return data && data.length > 0 ? data : PROFESSIONALS;
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

export function useProfessionalDetail(id: string): ProfessionalDetail {
  const { data } = useQuery({
    queryKey: ['professional', id],
    queryFn: () => api.professional(id),
    retry: 1,
    staleTime: 60_000,
  });
  return data ?? getProfessionalDetail(id);
}
