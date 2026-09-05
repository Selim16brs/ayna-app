'use client';
import { useState } from 'react';
import { PageHead, Card, Loading } from '@/app/_components/ui';
import { Gate } from '@/app/_components/Gate';
import { useAsync } from '@/app/_lib/useAsync';
import { api, type FeatureFlag } from '@/app/lib/api';

/**
 * ÖZELLİKLER — /flags
 *
 * ROTA NOTU: kademeli yayın anahtarları. Ekranda filtre ya da seçili kayıt
 * yok, dolayısıyla URL'e taşınan tek şey rotanın kendisi. Yeni flag formu
 * iki girdilik ve hep "kapalı" olarak açtığı için geri alınamaz bir işlem
 * değil; ayrı bir /flags/yeni rotasına taşınmadı, `form` geçici girdi
 * olarak useState'te kaldı.
 */
export default function OzelliklerSayfasi() {
  const { data, loading, error, reload } = useAsync<FeatureFlag[]>(() => api.featureFlags(), []);
  const [form, setForm] = useState({ key: '', description: '' });
  const create = async () => {
    if (!form.key) return;
    await api.setFeatureFlag(form.key, false, form.description || undefined);
    setForm({ key: '', description: '' });
    reload();
  };
  return (
    <>
      <PageHead title="Özellikler" sub="Özellik açma/kapama (kademeli yayın)" />
      <Card className="mb-5">
        <div className="form-inline">
          <input
            className="input"
            placeholder="Anahtar (örn. new_booking_flow)"
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
          />
          <input
            className="input"
            placeholder="Açıklama"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <button className="btn-sm btn-ok full" onClick={create}>
            + Flag ekle (kapalı)
          </button>
        </div>
      </Card>
      <Card>
        {!data ? (
          <Gate loading={loading} error={error} onRetry={reload} />
        ) : data.length === 0 ? (
          <Loading label="Flag yok" />
        ) : (
          data.map((f) => (
            <div key={f.key} className="list-row">
              <div className="grow">
                <div className="name">{f.key}</div>
                <div className="meta">{f.description || 'Açıklama yok'}</div>
              </div>
              <button
                className={`switch ${f.enabled ? 'on' : 'off'}`}
                onClick={async () => {
                  await api.setFeatureFlag(f.key, !f.enabled);
                  reload();
                }}
              >
                {f.enabled ? 'Açık' : 'Kapalı'}
              </button>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
