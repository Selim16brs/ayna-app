'use client';
import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHead, Toolbar, Loading } from '@/app/_components/ui';
import { Gate } from '@/app/_components/Gate';
import { useAsync } from '@/app/_lib/useAsync';
import { api, type BlogArticle } from '@/app/lib/api';
import { YaziFormu } from '../_YaziFormu';

/**
 * BLOG YAZISINI DÜZENLE — "/content/guncelle?id=X".
 *
 * Eski `editId` state'inin yerini bu rota aldı: düzenlenen yazı artık
 * adreste duruyor, sayfa yenilenince kaybolmuyor, "şu yazıya bak" diye
 * link atılabiliyor.
 *
 * DİNAMİK SEGMENT YOK: panel `output: 'export'` ile statik üretiliyor,
 * `[id]` klasörü derleme anında bilinmeyen kayıtlar için sayfa üretemezdi.
 * Kimlik bu yüzden query string'de.
 */
export default function YaziGuncelleSayfasi() {
  // useSearchParams istemcide çözülür; statik dışa aktarımda Suspense sınırı şart.
  return (
    <Suspense fallback={<Loading />}>
      <Duzenle />
    </Suspense>
  );
}

function Duzenle() {
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  /*
   * Tekil yazı endpoint'i yok (api yalnız `blogArticles()` listesini
   * veriyor); listeyi çekip id ile buluyoruz. Tekil uç eklenirse burası
   * tek satırda `api.blogArticle(id)` olur.
   */
  const { data, loading, error, reload } = useAsync<BlogArticle[]>(() => api.blogArticles(), []);
  const yazi = (data ?? []).find((a) => a.id === id) ?? null;

  return (
    <>
      <PageHead title="Yazıyı düzenle" sub={yazi ? `${yazi.tag} · ${yazi.title}` : undefined} />
      <Toolbar>
        <Link className="btn-sm" href="/content">
          ← Yazı listesi
        </Link>
      </Toolbar>
      {!id ? (
        <div className="empty">
          Yazı seçilmedi. <Link href="/content">Listeye dön</Link>
        </div>
      ) : !data ? (
        <Gate loading={loading} error={error} onRetry={reload} />
      ) : !yazi ? (
        <div className="empty">
          Yazı bulunamadı. <Link href="/content">Listeye dön</Link>
        </div>
      ) : (
        <YaziFormu mevcut={yazi} />
      )}
    </>
  );
}
