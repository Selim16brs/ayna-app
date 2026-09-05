'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Loading, PageHead } from '@/app/_components/ui';
import { Gate } from '@/app/_components/Gate';
import { useAsync } from '@/app/_lib/useAsync';
import { api, type Pro } from '@/app/lib/api';
import { UzmanFormu } from '../_UzmanFormu';

/**
 * UZMANI DÜZENLE — "/professionals/guncelle?id=X".
 *
 * Kayıt kimliği sorgu dizesinde: panel `output: 'export'` ile statik
 * üretiliyor, dinamik segment (`[id]`) derleme anında bilinmeyen kayıtlar
 * için sayfa üretemez.
 *
 * NOT: API'de tekil uzman uç noktası yok (`/admin/professionals` yalnız
 * listeyi döner), bu yüzden düzenlenecek kayıt listeden süzülüyor.
 */
function Icerik() {
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  const { data, loading, error, reload } = useAsync<Pro[]>(() => api.professionals(), []);

  if (!id)
    return (
      <div className="empty">
        Kayıt seçilmedi. <Link href="/professionals">Listeye dön</Link>
      </div>
    );
  if (!data) return <Gate loading={loading} error={error} onRetry={reload} />;

  const pro = data.find((p) => p.id === id);
  if (!pro)
    return (
      <div className="empty">
        Uzman bulunamadı. <Link href="/professionals">Listeye dön</Link>
      </div>
    );

  return (
    <>
      <PageHead title="Uzmanı düzenle" sub={pro.name} />
      <UzmanFormu mevcut={pro} />
    </>
  );
}

export default function UzmanGuncelleSayfasi() {
  // useSearchParams istemci tarafında çözülür; Next bu sınırda Suspense ister.
  return (
    <Suspense fallback={<Loading />}>
      <Icerik />
    </Suspense>
  );
}
