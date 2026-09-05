'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Card, KV, Loading } from '@/app/_components/ui';
import { Gate } from '@/app/_components/Gate';
import { useAsync } from '@/app/_lib/useAsync';
import { useDiyalog } from '@/app/ui/Diyalog';
import { api, type SpecialistDetail } from '@/app/lib/api';

/**
 * UZMAN DETAYI — "/specialists/detay?id=…".
 *
 * Eskiden listenin üstüne düşen bir modaldı. Doğrulama kararı verilen ekran
 * paylaşılabilir bir adrese sahip değildi: yönetici sertifikayı incelerken
 * bağlantıyı kimseye gönderemiyor, sayfayı yenileyince en baştan aramaya
 * başlıyordu. Modal artık kendi rotası; "← Listeye dön" geri götürüyor.
 *
 * Dinamik `[id]` klasörü YOK — panel statik dışa aktarımla derleniyor,
 * kayıt kimliği sorgu dizisinde taşınıyor.
 */

// §uzman onboarding — admin uzman doğrulama kontrol listesi
const SP_ENTITY_LABEL: Record<string, string> = {
  freelance: 'Serbest çalışan',
  ip: 'ИП (kayıtlı bireysel girişimci)',
};
// Kimlik = KYC (ayrı kuyruk, salt-okunur burada). Sertifika + Sosyal = admin işaretler.
const SP_VERIFY_CHECKS: { key: 'cert' | 'social'; label: string }[] = [
  { key: 'cert', label: 'Sertifika' },
  { key: 'social', label: 'Sosyal medya' },
];

function UzmanDetayi() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  const { onayla } = useDiyalog();
  // Kimlik yoksa istek de atılmıyor: boş `id` ile sunucuya gitmek 404 üretir.
  const { data, loading, error, reload } = useAsync<SpecialistDetail | null>(
    () => (id ? api.specialistDetail(id) : Promise.resolve(null)),
    [id],
  );
  /*
   * Doğrulama çipleri yerel kopya üzerinde çalışıyor: modaldeyken de böyleydi
   * (`setDetail({...detail, verification})`). Sunucu cevabı tek bir alanı
   * döndürdüğü için kaydı baştan çekmek yerine kopyayı güncelliyoruz.
   */
  const [detail, setDetail] = useState<SpecialistDetail | null>(null);
  useEffect(() => setDetail(data), [data]);
  const [busy, setBusy] = useState(false);

  const toggleVerify = async (key: 'cert' | 'social', on: boolean) => {
    if (!detail) return;
    const r = await api.verifySpecialist(detail.id, { [key]: on });
    setDetail({
      ...detail,
      verification: {
        ...detail.verification,
        cert: r.verification.cert,
        social: r.verification.social,
      },
      aynaVerified: detail.verification.identity && (r.verification.cert || r.verification.social),
    });
  };

  /*
   * HESAP AÇ / KAPAT. Rozetlerden ayrı bir karar: rozet "neyi doğruladık",
   * bu ise "çalışabilir mi". Kapatma onay ister — uzman katalogdan düşüyor.
   * İşlem bitince listeye dönülüyor, çünkü karar verilen kayıt artık başka
   * bir kuyrukta.
   */
  const durumDegistir = async () => {
    if (!detail) return;
    if (detail.status === 'approved') {
      if (
        !(await onayla({
          baslik: 'Uzman hesabını kapat',
          mesaj: `${detail.name} katalogdan düşecek ve yeni randevu alamayacak. Mevcut randevuları etkilenmez.`,
          onayEtiket: 'Kapat',
        }))
      )
        return;
      setBusy(true);
      try {
        await api.setSpecialistStatus(detail.id, 'rejected');
      } finally {
        setBusy(false);
      }
    } else {
      setBusy(true);
      try {
        await api.setSpecialistStatus(detail.id, 'approved');
      } finally {
        setBusy(false);
      }
    }
    router.push('/specialists');
  };

  if (!id)
    return (
      <div className="empty">
        Kayıt seçilmedi. <Link href="/specialists">Listeye dön</Link>
      </div>
    );
  if (!detail) return <Gate loading={loading} error={error} onRetry={reload} />;

  return (
    <>
      <div className="mb-4">
        <Link className="btn-sm" href="/specialists">
          ← Listeye dön
        </Link>
      </div>
      <Card className="p-6">
        <div className="modal-head">
          <div>
            <div className="page-title" style={{ fontSize: 20 }}>
              {detail.name} {detail.aynaVerified ? '🛡️ AYNA Onaylı' : ''}
            </div>
            <span className={`pill ${detail.kycStatus === 'approved' ? 'approved' : 'pending'}`}>
              KYC: {detail.kycStatus}
            </span>
          </div>
          <button
            className={`btn-sm ${detail.status === 'approved' ? 'btn-ghost' : 'btn-ok'}`}
            disabled={busy}
            onClick={durumDegistir}
          >
            {detail.status === 'approved' ? 'Kapat' : 'Hesabı aç'}
          </button>
        </div>
        <div className="kv-grid">
          <KV k="Uzman türü" v={SP_ENTITY_LABEL[detail.entityType] ?? detail.entityType} />
          <KV k="IIN" v={detail.iin || '—'} />
          <KV k="Şehir" v={detail.city || '—'} />
          <KV k="Sertifika sayısı" v={String(detail.certificates.length)} />
          <KV k="Instagram" v={detail.socialInstagram || '—'} />
          <KV k="Sosyal doğrulama kodu" v={detail.socialVerifyCode || '—'} />
          <KV k="Bio" v={detail.bio || '—'} />
        </div>
        <h3 className="section-head" style={{ marginTop: 14 }}>
          Doğrulama kontrol listesi
        </h3>
        <p className="page-sub" style={{ marginTop: 0 }}>
          Kimlik, KYC kuyruğundan onaylanır. Sertifika ve sosyal medyayı burada işaretle.
        </p>
        <div className="verify-grid">
          <div className={`verify-chip ${detail.verification.identity ? 'on' : ''}`}>
            {detail.verification.identity ? '✓' : '○'} Kimlik (KYC)
          </div>
          {SP_VERIFY_CHECKS.map((vc) => {
            const on = detail.verification[vc.key];
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
        {detail.certificates.length > 0 ? (
          <div className="cert-thumbs">
            {detail.certificates.map((c, i) => (
              <a key={i} href={c} target="_blank" rel="noreferrer">
                <img
                  src={c}
                  alt={`sertifika ${i + 1}`}
                  style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }}
                />
              </a>
            ))}
          </div>
        ) : null}
      </Card>
    </>
  );
}

export default function UzmanDetaySayfasi() {
  // useSearchParams istemci tarafında çözülür; Next bu sınırda Suspense ister.
  return (
    <Suspense fallback={<Loading />}>
      <UzmanDetayi />
    </Suspense>
  );
}
