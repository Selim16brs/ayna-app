'use client';
import Link from 'next/link';
import { PageHead, Toolbar, Card } from '@/app/_components/ui';
import { Gate } from '@/app/_components/Gate';
import { useAsync } from '@/app/_lib/useAsync';
import { useDiyalog } from '@/app/ui/Diyalog';
import { api, type BlogApplication, type ReviewApplication } from '@/app/lib/api';

/**
 * KULLANICI BLOG BAŞVURULARI — "/content/basvurular".
 *
 * Bölme öncesinde bu kuyruk blog editörünün ALTINDA duruyordu: onay
 * bekleyen başvuruya ulaşmak için her seferinde formu ve tüm yazı
 * listesini geçmek gerekiyordu. Kuyruk artık kendi adresinde —
 * başvuruyu inceleyecek kişi doğrudan buraya gelir.
 *
 * Onaylanan başvuru sunucuda yayına alınıyor; yazı listesi kendi
 * rotasında (/content) verisini baştan çektiği için burada yalnız
 * başvuru listesi tazeleniyor.
 */
export default function BlogBasvurulariSayfasi() {
  const { formAl } = useDiyalog();
  const {
    data: apps,
    loading,
    error,
    reload: reloadApps,
  } = useAsync<BlogApplication[]>(() => api.blogApplications(), []);

  const pending = (apps ?? []).filter((a) => a.status === 'pending');
  const reviewed = (apps ?? []).filter((a) => a.status !== 'pending');

  return (
    <>
      <PageHead
        title="Kullanıcı blog başvuruları"
        sub="Onaylanan başvuru otomatik yayına alınır ve yazara 200 puan verilir."
      />
      <Toolbar>
        <Link className="btn-sm" href="/content">
          ← Yazı listesi
        </Link>
      </Toolbar>
      {!apps ? (
        <Gate loading={loading} error={error} onRetry={reloadApps} />
      ) : (
        <Card>
          {pending.length === 0 ? (
            <div className="empty">Bekleyen başvuru yok</div>
          ) : (
            pending.map((a) => (
              <div key={a.id} className="list-col">
                <div className="name">{a.title}</div>
                <div className="meta">
                  {a.authorName} · {a.tag || 'Topluluk'} ·{' '}
                  {new Date(a.createdAt).toLocaleDateString('tr-TR')}
                </div>
                <div className="meta !mt-1.5">{a.excerpt || a.body[0]?.slice(0, 140)}</div>
                <div className="form-inline !mt-2.5">
                  <input
                    className="input"
                    placeholder="Kategori kodu (opsiyonel)"
                    id={`cat-${a.id}`}
                  />
                  <input
                    className="input"
                    placeholder="Görsel URL (opsiyonel)"
                    id={`img-${a.id}`}
                  />
                  <button
                    className="btn-sm btn-ok"
                    onClick={async () => {
                      const cat = (document.getElementById(`cat-${a.id}`) as HTMLInputElement)
                        ?.value;
                      const img = (document.getElementById(`img-${a.id}`) as HTMLInputElement)
                        ?.value;
                      const body: ReviewApplication = { decision: 'approve' };
                      if (cat) body.categoryCode = cat;
                      if (img) body.image = img;
                      await api.reviewApplication(a.id, body);
                      reloadApps();
                    }}
                  >
                    Onayla → yayınla + 200 puan
                  </button>
                  <button
                    className="btn-sm btn-danger"
                    onClick={async () => {
                      const v = await formAl({
                        baslik: 'Blog başvurusunu reddet',
                        alanlar: [
                          {
                            ad: 'not',
                            etiket: 'Red gerekçesi',
                            tur: 'uzun',
                            ipucu: 'İsteğe bağlı',
                          },
                        ],
                        onayEtiket: 'Reddet',
                      });
                      if (!v) return;
                      await api.reviewApplication(a.id, {
                        decision: 'reject',
                        note: (v.not ?? '').trim(),
                      });
                      reloadApps();
                    }}
                  >
                    Reddet
                  </button>
                </div>
              </div>
            ))
          )}
          {reviewed.length > 0 && (
            <div className="mt-3 opacity-70">
              {reviewed.map((a) => (
                <div key={a.id} className="list-row">
                  <div className="grow">
                    <div className="name">{a.title}</div>
                    <div className="meta">
                      {a.authorName} ·{' '}
                      {a.status === 'approved' ? `onaylandı (+${a.points} puan)` : 'reddedildi'}
                      {a.note ? ` · ${a.note}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </>
  );
}
