'use client';
import Link from 'next/link';
import { PageHead, Toolbar, Card } from '@/app/_components/ui';
import { Gate } from '@/app/_components/Gate';
import { useAsync } from '@/app/_lib/useAsync';
import { useDiyalog } from '@/app/ui/Diyalog';
import { api, type BlogArticle } from '@/app/lib/api';

/**
 * §12.6 İçerik Yönetimi — BLOG YAZILARI, "/content".
 *
 * ROTA NOTU: bölme öncesinde tek bir `ContentView` DÖRT işi birden
 * yapıyordu — yazı listesi, yazı formu, kullanıcı blog başvuruları ve
 * haftalık W2W teması. Hepsi aynı URL'deydi: forma girmek adresi
 * değiştirmiyor, "şu başvuruya bak" denilemiyor, sayfa yenilenince
 * düzenlenen yazı kayboluyordu. Artık her iş kendi rotasında:
 *
 *   /content                    → yayındaki yazılar (bu dosya)
 *   /content/yeni               → yeni yazı formu
 *   /content/guncelle?id=X      → yazıyı düzenleme
 *   /content/basvurular         → kullanıcı blog başvuruları
 *   /content/temalar            → haftalık W2W teması
 *
 * Eski `editId` state'i kalktı: "yeni mi, düzenleme mi" ayrımı artık
 * rotanın kendisi.
 */
export default function IcerikSayfasi() {
  const { onayla } = useDiyalog();
  const {
    data: articles,
    loading,
    error,
    reload: reloadArticles,
  } = useAsync<BlogArticle[]>(() => api.blogArticles(), []);

  return (
    <>
      <PageHead
        title="Blog & tema"
        sub="AYNA Blog editörü · kullanıcı başvuruları (onayla → puan) · haftalık W2W teması"
      />
      <Toolbar>
        <Link className="btn-sm btn-ok" href="/content/yeni">
          + Yeni yazı
        </Link>
        <Link className="btn-sm" href="/content/basvurular">
          Kullanıcı başvuruları
        </Link>
        <Link className="btn-sm" href="/content/temalar">
          Haftalık W2W teması
        </Link>
      </Toolbar>
      {!articles ? (
        <Gate loading={loading} error={error} onRetry={reloadArticles} />
      ) : (
        <Card>
          {articles.length === 0 ? (
            <div className="empty">Yazı yok</div>
          ) : (
            articles.map((a) => (
              <div key={a.id} className="list-row">
                {a.image ? (
                  <img className="thumb" src={a.image} alt="" />
                ) : (
                  <div className="thumb" />
                )}
                <div className="grow">
                  <div className="name">
                    {a.tag} · {a.title}
                  </div>
                  <div className="meta">
                    {a.excerpt}
                    {a.categoryCode ? ` · CTA: ${a.categoryCode}` : ''} · {a.readMin} dk
                  </div>
                </div>
                <button
                  className={`switch ${a.published ? 'on' : 'off'}`}
                  onClick={async () => {
                    await api.updateArticle(a.id, { published: !a.published });
                    reloadArticles();
                  }}
                >
                  {a.published ? 'Yayında' : 'Taslak'}
                </button>
                {/* Düzenle artık `setEditId` değil, gerçek bir adres. */}
                <Link className="btn-sm" href={`/content/guncelle?id=${a.id}`}>
                  Düzenle
                </Link>
                <button
                  className="btn-sm btn-danger"
                  onClick={async () => {
                    if (
                      await onayla({
                        baslik: 'Yazıyı sil',
                        mesaj: 'Bu blog yazısı kalıcı olarak silinecek.',
                        onayEtiket: 'Sil',
                        tehlikeli: true,
                      })
                    ) {
                      await api.deleteArticle(a.id);
                      reloadArticles();
                    }
                  }}
                >
                  Sil
                </button>
              </div>
            ))
          )}
        </Card>
      )}
    </>
  );
}
