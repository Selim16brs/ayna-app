import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import {
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

export function useProfessionalDetail(id: string): ProfessionalDetail {
  const { data } = useQuery({
    queryKey: ['professional', id],
    queryFn: () => api.professional(id),
    retry: 1,
    staleTime: 60_000,
  });
  return data ?? getProfessionalDetail(id);
}
