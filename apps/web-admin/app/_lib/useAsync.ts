'use client';
import { useCallback, useEffect, useState } from 'react';

/**
 * Panel geneli veri çekme kancası.
 *
 * §admin — hatayı YÜZEYE çıkarır. Eskiden hata sessizce yutuluyordu ve ekran
 * sonsuza kadar "Yükleniyor…" yazıyordu; artık `error` dolduğunda <Gate>
 * gerçek nedeni ve bir "Tekrar dene" düğmesi gösteriyor.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(() => {
    setLoading(true);
    setError(null);
    fn()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        setData(null);
        setError(e instanceof Error ? e.message : 'Bağlantı hatası');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(run, [run]);
  return { data, loading, error, reload: run };
}
