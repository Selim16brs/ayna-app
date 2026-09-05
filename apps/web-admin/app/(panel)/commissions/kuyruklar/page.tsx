'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useAsync } from '@/app/_lib/useAsync';
import { useDiyalog } from '@/app/ui/Diyalog';
import { api, type DekontSatiri, type IadeSatiri, type UzlasmaSatiri } from '@/app/lib/api';

// Randevu & ödeme kuyrukları: dekont doğrulama, iadeler, uzlaşma kayıtları.
/**
 * Brief §8 — RANDEVU KUYRUKLARI.
 *
 * Eski "Dönem faturaları" bölümü kaldırıldı: brief §4.4/§10 ikinci tahsilatı
 * tümden sildi (depozito zaten AYNA'nın komisyonu), dolayısıyla kesilecek
 * fatura da kalmadı. Yerine brief'in istediği üç kuyruk geldi.
 *
 * BÖLME NOTU: bu bölüm komisyon ekranının ortasına gömülüydü; artık kendi
 * rotası var (/commissions/kuyruklar) — bekleyen dekontu olan bir yönetici
 * doğrudan bu bağlantıyı paylaşabiliyor. Üç kuyruk (dekont / iade / uzlaşma)
 * birlikte çalışıldığı için aynı sayfada alt alta kaldı.
 */
export default function RandevuKuyruklariSayfasi() {
  const { onayla, formAl } = useDiyalog();
  const dekont = useAsync<DekontSatiri[]>(() => api.dekontKuyrugu(), []);
  const iade = useAsync<IadeSatiri[]>(() => api.iadeKuyrugu(), []);
  const uzlasma = useAsync<UzlasmaSatiri[]>(() => api.uzlasmaKuyrugu(), []);
  // Geçici başarı mesajı — URL'e taşınmaz, ekran durumu değil bildirimdir.
  const [msg, setMsg] = useState<string | null>(null);
  const kzt = (n: number) => `${n.toLocaleString('tr-TR')} ₸`;
  return (
    <>
      <div className="mb-6">
        <Link href="/commissions" className="meta">
          ← Komisyonlar
        </Link>
        <h1 className="mt-1 text-ax-2xl font-extrabold leading-tight tracking-[-0.7px] text-ink">
          Randevu kuyrukları
        </h1>
        <p className="mt-1 max-w-[70ch] text-ax-md leading-relaxed text-ink-3">
          Dekont doğrulama, iadeler ve uzlaşma kayıtları
        </p>
      </div>
      {/* ── §8.1 Dekont doğrulama ── */}
      <div className="section-title">Dekont doğrulama ({dekont.data?.length ?? 0})</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="meta full" style={{ marginBottom: 8 }}>
          Randevu dekont yüklenince ZATEN kesinleşti. Bu kuyruk sahte dekontu sonradan yakalamak
          için. Reddedersen randevu iptal olur ve kullanıcı yasaklanır.
        </div>
        {!dekont.data?.length ? (
          <div className="empty">Bekleyen dekont yok</div>
        ) : (
          dekont.data.map((b) => (
            <div key={b.id} className="row">
              <div className="grow">
                <div>
                  <b>{b.proName}</b> · {b.service}
                </div>
                <div className="meta">
                  {new Date(b.startAt).toLocaleString('tr-TR')} · depozito {kzt(b.deposit)} /{' '}
                  {kzt(b.price)}
                </div>
                {/* ÖDEME KODU + RANDEVU NO. Dekont bir görselden ibaretti;
                    admin, banka ekstresindeki transferi hangi randevuya
                    yazacağını bulamıyordu. Müşterinin Kaspi açıklamasına
                    yazdığı kodun aynısı burada. */}
                <div className="meta">
                  kod <code>{b.odemeKodu}</code> · randevu <code>{b.id}</code>
                </div>
              </div>
              {b.depositReceiptUri ? (
                <a className="btn-sm" href={b.depositReceiptUri} target="_blank" rel="noreferrer">
                  Dekontu aç
                </a>
              ) : null}
              <button
                className="btn-sm btn-ok"
                onClick={async () => {
                  await api.dekontOnayla(b.id);
                  setMsg('Dekont doğrulandı');
                  dekont.reload();
                }}
              >
                Doğrula
              </button>
              <button
                className="btn-sm btn-danger"
                onClick={async () => {
                  // Yıkıcı: randevu iptal + hesap yasaklı. Onay istemek şart.
                  if (
                    !(await onayla({
                      baslik: 'Sahte dekont olarak işaretle',
                      mesaj:
                        'Randevu iptal edilecek ve kullanıcının hesabı yasaklanacak. Bu işlem geri alınamaz.',
                      onayEtiket: 'Sahte olarak işaretle',
                      tehlikeli: true,
                    }))
                  )
                    return;
                  await api.dekontReddet(b.id);
                  setMsg('Dekont reddedildi, kullanıcı yasaklandı');
                  dekont.reload();
                }}
              >
                Sahte
              </button>
            </div>
          ))
        )}
      </div>
      {/* ── §8.2 İadeler ── */}
      <div className="section-title">İadeler ({iade.data?.length ?? 0})</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="meta full" style={{ marginBottom: 8 }}>
          Müşteri iadeleri ve müşteri no-show'unda uzmana ödenecek %9 payı AYNI kuyruktan işlenir.
          İç hedef: 24 saat.
        </div>
        {!iade.data?.length ? (
          <div className="empty">Bekleyen iade yok</div>
        ) : (
          iade.data.map((r) => (
            <div key={r.id} className="row">
              <div className="grow">
                <div>
                  <b>{kzt(Number(r.amount))}</b> ·{' '}
                  {r.kind === 'musteri_iade' ? 'Müşteri iadesi' : 'Uzman payı (%9)'}
                </div>
                {/* PII: ödeme bilgisi yalnız burada görünür, log'a yazılmaz. */}
                <div className="meta">
                  {r.payoutInfo || 'hesap bilgisi girilmemiş'} ·{' '}
                  {new Date(r.createdAt).toLocaleString('tr-TR')}
                </div>
              </div>
              <button
                className="btn-sm btn-ok"
                onClick={async () => {
                  await api.iadeOdendi(r.id);
                  setMsg('İade ödendi olarak işaretlendi');
                  iade.reload();
                }}
              >
                Ödendi
              </button>
            </div>
          ))
        )}
      </div>
      {/* ── §8.3 Uzlaşma ── */}
      <div className="section-title">Uzlaşma kayıtları ({uzlasma.data?.length ?? 0})</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="meta full" style={{ marginBottom: 8 }}>
          "Gelmedi" ve ödeme itirazları. %90'lık doğrudan ödemede AYNA hakem DEĞİLDİR — o yüzden
          "karar yok" seçeneği var.
        </div>
        {!uzlasma.data?.length ? (
          <div className="empty">Bekleyen uzlaşma yok</div>
        ) : (
          uzlasma.data.map((u) => (
            <div key={u.id} className="row">
              <div className="grow">
                <div>
                  <b>{u.kind === 'no_show' ? 'Gelmedi itirazı' : 'Ödeme itirazı'}</b>
                </div>
                <div className="meta">{u.reason || 'gerekçe yazılmamış'}</div>
                {u.evidence.length ? (
                  <div className="meta">{u.evidence.length} kanıt eklendi</div>
                ) : null}
              </div>
              {(
                [
                  ['musteri_lehine', 'Müşteri lehine'],
                  ['uzman_lehine', 'Uzman lehine'],
                  ['karar_yok', 'Karar yok'],
                ] as const
              ).map(([k, etiket]) => (
                <button
                  key={k}
                  className="btn-sm"
                  onClick={async () => {
                    const v = await formAl({
                      baslik: `Uzlaşma — ${etiket}`,
                      mesaj: 'Karar denetim kaydına yazılır.',
                      alanlar: [
                        {
                          ad: 'not',
                          etiket: 'Telefon teyidi / not',
                          tur: 'uzun',
                          ipucu: 'İsteğe bağlı',
                        },
                      ],
                      onayEtiket: etiket,
                    });
                    if (!v) return;
                    await api.uzlasmaCoz(u.id, k, (v.not ?? '').trim());
                    setMsg('Uzlaşma çözüldü');
                    uzlasma.reload();
                  }}
                >
                  {etiket}
                </button>
              ))}
            </div>
          ))
        )}
      </div>
      {msg ? (
        <div className="meta full" style={{ color: 'var(--success)' }}>
          {msg}
        </div>
      ) : null}
    </>
  );
}
