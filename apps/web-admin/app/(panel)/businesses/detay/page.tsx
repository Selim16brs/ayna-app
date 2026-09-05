'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Card, KV, Loading } from '@/app/_components/ui';
import { Gate } from '@/app/_components/Gate';
import { useAsync } from '@/app/_lib/useAsync';
import { useDiyalog } from '@/app/ui/Diyalog';
import { api, type BizVerification } from '@/app/lib/api';

/**
 * SALON BAŞVURUSU — detay.
 *
 * Eskiden listenin üstünde açılan bir modaldı; artık kendi rotası var:
 * `/businesses/detay?id=32`. Kayıt kimliği SORGUDA taşınıyor, `[id]` klasörü
 * açılmıyor — panel `output: 'export'` ile statik derleniyor ve derleme
 * anında bilinmeyen başvuru kimlikleri için sayfa üretilemez.
 *
 * Karar verildiğinde (onay / red / ek belge / incelemeye al) listeye
 * dönülüyor: kayıt zaten o kuyruktan çıkıyor, ekranda kalmasının anlamı yok.
 */
const ENTITY_LABEL: Record<string, string> = {
  llp: 'ТОО / LLP (tüzel kişi)',
  ip: 'ИП (bireysel girişimci)',
  freelance: 'Serbest uzman',
  branch: 'Salon şubesi',
};
const VERIFY_CHECKS: { key: keyof BizVerification; label: string }[] = [
  { key: 'identity', label: 'Kimlik' },
  { key: 'business', label: 'İşletme' },
  { key: 'bin', label: 'BİN' },
  { key: 'address', label: 'Adres' },
  { key: 'social', label: 'Sosyal medya' },
];

function SalonDetayi() {
  const router = useRouter();
  const params = useSearchParams();
  const { formAl } = useDiyalog();
  const id = params.get('id') ?? '';
  const { data, loading, error, reload } = useAsync(() => api.businessDetail(id), [id]);
  const act = async (kind: 'approve' | 'reject') => {
    if (kind === 'approve') await api.approveBusiness(id);
    else {
      const v = await formAl({
        baslik: 'Salon başvurusunu reddet',
        mesaj: 'Gerekçe başvuru sahibine iletilir.',
        alanlar: [{ ad: 'sebep', etiket: 'Red sebebi', tur: 'uzun', zorunlu: true }],
        onayEtiket: 'Reddet',
      });
      if (!v) return;
      await api.rejectBusiness(id, (v.sebep ?? '').trim());
    }
    router.push('/businesses');
  };
  const decide = async (status: string, defaultReason?: string) => {
    let reason: string | undefined;
    if (status === 'needs_docs') {
      const v = await formAl({
        baslik: 'Eksik belge iste',
        mesaj: 'Hangi belgenin eksik olduğu başvuru sahibine iletilir.',
        alanlar: [
          {
            ad: 'belge',
            etiket: 'Eksik belge / açıklama',
            tur: 'uzun',
            deger: defaultReason ?? '',
            zorunlu: true,
          },
        ],
        onayEtiket: 'Gönder',
      });
      if (!v) return;
      reason = (v.belge ?? '').trim();
    }
    await api.decisionBusiness(id, status, reason);
    router.push('/businesses');
  };
  // İşaret sunucuda tutuluyor; kaynakta yerel kopya elle güncelleniyordu,
  // burada kaydı yeniden çekiyoruz — tek doğruluk kaynağı sunucu.
  const toggleVerify = async (key: keyof BizVerification, on: boolean) => {
    await api.verifyBusiness(id, { [key]: on });
    reload();
  };

  if (!id)
    return (
      <div className="empty">
        Kayıt seçilmedi. <Link href="/businesses">Listeye dön</Link>
      </div>
    );
  if (!data) return <Gate loading={loading} error={error} onRetry={reload} />;

  return (
    <>
      <div className="mb-6">
        <Link href="/businesses" className="meta">
          ← Salon başvuruları
        </Link>
        <div className="page-title" style={{ fontSize: 20, marginTop: 4 }}>
          {data.name}
        </div>
        <span className={`pill ${data.status}`} style={{ display: 'inline-block', marginTop: 8 }}>
          {data.status === 'pending'
            ? 'Onay bekliyor'
            : data.status === 'approved'
              ? 'Onaylı'
              : 'Reddedildi'}
        </span>
      </div>
      <Card className="p-5">
        <div className="kv-grid">
          <KV k="İşletme türü" v={ENTITY_LABEL[data.entityType ?? ''] ?? '—'} />
          <KV k="BİN / IIN" v={data.bin || '—'} />
          <KV k="Resmî ad" v={data.legalName || '—'} />
          <KV k="Yönetici" v={data.managerName || '—'} />
          <KV k="OKED" v={data.oked || '—'} />
          <KV k="KDV mükellefi" v={data.vatPayer ? 'Evet' : 'Hayır'} />
          <KV k="Sahip" v={data.ownerName} />
          <KV k="Sektör" v={data.sector} />
          <KV k="Telefon" v={data.phone} />
          <KV k="E-posta" v={data.email || '—'} />
          <KV k="Instagram" v={data.socialInstagram || '—'} />
          <KV k="Çalışma saatleri" v={data.workingHours || '—'} />
          <KV k="Adres" v={`${data.city} / ${data.district} ${data.address}`.trim()} />
          <KV k="Kategoriler" v={data.categories.join(', ') || '—'} />
          <KV k="Ekip (uzman)" v={String(data.specialistCount)} />
          <KV
            k="Belge"
            v={data.docUrl ? `Yüklendi${data.docType ? ' · ' + data.docType : ''}` : 'Yok'}
          />
        </div>
        {/* §3.3 — Katmanlı doğrulama kontrol listesi (admin işaretler) */}
        <h3 className="section-head" style={{ marginTop: 14 }}>
          Doğrulama kontrol listesi
        </h3>
        <div className="verify-grid">
          {VERIFY_CHECKS.map((vc) => {
            const on = data.verification?.[vc.key] ?? false;
            return (
              <button
                key={vc.key}
                className={`verify-chip ${on ? 'on' : ''}`}
                onClick={() => toggleVerify(vc.key, !on)}
              >
                {on ? '✓' : '○'} {vc.label}
              </button>
            );
          })}
        </div>
        {data.docUrl ? (
          <a
            className="btn-sm btn-ghost"
            href={data.docUrl}
            target="_blank"
            rel="noreferrer"
            style={{ marginTop: 8, display: 'inline-block' }}
          >
            Belgeyi aç ↗
          </a>
        ) : null}
        {data.reviewNote ? <p className="page-sub">Not: {data.reviewNote}</p> : null}
        {data.about ? <p className="about">{data.about}</p> : null}
        {data.rejectReason ? <p className="err">Red sebebi: {data.rejectReason}</p> : null}
        <div className="modal-actions">
          {data.status !== 'approved' ? (
            <button className="btn-sm btn-ok" onClick={() => act('approve')}>
              Onayla
            </button>
          ) : null}
          <button
            className="btn-sm btn-ghost"
            onClick={() => decide('needs_docs', 'Ek belge gerekli')}
          >
            Ek belge iste
          </button>
          <button className="btn-sm btn-ghost" onClick={() => decide('under_review')}>
            İncelemeye al
          </button>
          {data.status !== 'rejected' ? (
            <button className="btn-sm btn-danger" onClick={() => act('reject')}>
              Reddet
            </button>
          ) : null}
        </div>
      </Card>
    </>
  );
}

export default function SalonDetaySayfasi() {
  // useSearchParams istemci tarafında çözülür; Next bu sınırda Suspense ister.
  return (
    <Suspense fallback={<Loading />}>
      <SalonDetayi />
    </Suspense>
  );
}
