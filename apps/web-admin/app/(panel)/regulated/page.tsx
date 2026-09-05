'use client';
import { Card, Loading } from '@/app/_components/ui';
import { useAsync } from '@/app/_lib/useAsync';
import { useDiyalog } from '@/app/ui/Diyalog';
import { api, type RegulatedServiceFlag } from '@/app/lib/api';

/**
 * Regüle hizmet uyarıları.
 *
 * ROTA NOTU: bu ekranın tek bir kuyruğu var — alt sekme, filtre ya da
 * detay paneli yok. Bu yüzden URL'e taşınacak iç durum da yok; kazanç
 * sadece ekranın artık kendi adresine (/regulated) sahip olması: uyarı
 * geldiğinde yöneticiye doğrudan bu link atılabiliyor.
 */
export default function RegulatedPage() {
  const { onayla } = useDiyalog();
  const { data, reload } = useAsync<RegulatedServiceFlag[]>(() => api.regulatedServices(), []);

  const karar = async (f: RegulatedServiceFlag, k: 'cleared' | 'removed') => {
    const kaldir = k === 'removed';
    if (
      await onayla({
        baslik: kaldir ? 'Hizmet kaldırıldı olarak işaretle' : 'Sorun yok',
        mesaj: kaldir
          ? `"${f.serviceName}" hizmeti için uzman uyarılacak ve kayıt iz olarak kalacak.`
          : `"${f.serviceName}" sorunsuz sayılacak ve bu ad bir daha kuyruğa düşmeyecek.`,
        onayEtiket: kaldir ? 'Kaldırıldı' : 'Sorun yok',
      })
    ) {
      await api.decideRegulatedService(f.id, k);
      reload();
    }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-ax-2xl font-extrabold leading-tight tracking-[-0.7px] text-ink">
          Regüle hizmet uyarıları
        </h1>
        <p className="mt-1 max-w-[70ch] text-ax-md leading-relaxed text-ink-3">
          Botoks, dolgu, mezoterapi, diş estetiği ve beslenme danışmanlığı lisans gerektirdiği için
          katalogda yok. Uzman bu işlemleri kendi yazdığı hizmet adına girerse satır buraya düşer.{' '}
          <strong className="font-bold text-ink">Kayıt engellenmedi</strong> — karar sende.
        </p>
      </div>
      <Card>
        {!data || data.length === 0 ? (
          <Loading label="Bekleyen uyarı yok" />
        ) : (
          data.map((f) => (
            <div key={f.id} className="border-b border-line-2 p-4 last:border-b-0">
              <div className="flex flex-wrap items-center gap-2 text-ax-md font-bold tracking-[-0.15px] text-ink">
                {f.proName || f.proId} <span className="pill pending">{f.reason}</span>
              </div>
              {/*
               * Uzmanın YAZDIĞI ad aynen gösteriliyor: yöneticinin kararı
               * buna dayanıyor. Özetlemek ya da kısaltmak, kararı verenden
               * kanıtı saklamak olurdu.
               */}
              <div className="mt-1 text-ax-sm text-ink-3">
                “{f.serviceName}”{f.city ? ` · ${f.city}` : ''} ·{' '}
                {new Date(f.createdAt).toLocaleDateString('tr-TR')}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-sm" onClick={() => void karar(f, 'cleared')}>
                  Sorun yok
                </button>
                <button className="btn-sm btn-primary" onClick={() => void karar(f, 'removed')}>
                  Kaldırıldı
                </button>
              </div>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
