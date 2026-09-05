'use client';
import { useState } from 'react';
import { PageHead, Card } from '@/app/_components/ui';
import { Gate } from '@/app/_components/Gate';
import { useAsync } from '@/app/_lib/useAsync';
import { api, type ApiKeyStatus, type CategoryConfig, type SystemSettings } from '@/app/lib/api';

/**
 * AYARLAR — /system · §12.9 Sistem Ayarları
 *
 * Parametrik oranlar + Kaspi ödeme bağlantısı + API anahtarları + şehir
 * yönetimi + kategori ayarları. Dört bölüm de aynı ekranda hep açıktı —
 * aralarında sekme yoktu — bu yüzden URL'e taşınacak bir iç durum yok;
 * taşınan tek şey rotanın kendisi. Girdi alanları (rateEdits, keyEdits,
 * kaspiEdit, cityActive/citySoon, tests) geçici olduğu için useState'te
 * kaldı.
 *
 * <CategorySection /> yalnızca bu sayfada kullanılıyor; kaynakta olduğu gibi
 * aynı dosyada, hemen altta duruyor.
 */
export default function AyarlarSayfasi() {
  const { data, loading, error, reload } = useAsync<SystemSettings>(() => api.systemSettings(), []);
  const [rateEdits, setRateEdits] = useState<Record<string, string>>({});
  const [keyEdits, setKeyEdits] = useState<Record<string, string>>({});
  const [tests, setTests] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [cityActive, setCityActive] = useState('');
  const [citySoon, setCitySoon] = useState('');
  const [kaspiEdit, setKaspiEdit] = useState('');
  const saveRate = async (key: string) => {
    const raw = rateEdits[key];
    if (raw === undefined || raw === '') return;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) return;
    await api.setRate(key, Math.round(value));
    setRateEdits((s) => ({ ...s, [key]: '' }));
    reload();
  };
  const saveKey = async (provider: string) => {
    const value = keyEdits[provider] ?? '';
    await api.setApiKey(provider, value);
    setKeyEdits((s) => ({ ...s, [provider]: '' }));
    reload();
  };
  const saveKaspi = async () => {
    // Boş kaydetmek özelliği KAPATIR — bilinçli bir seçenek: bağlantı bozulursa
    // düğmeyi gizlemek, müşteriyi çalışmayan bir yola göndermekten iyidir.
    await api.setKaspiLink(kaspiEdit.trim());
    setKaspiEdit('');
    reload();
  };
  const test = async (provider: string) => {
    const res = await api.testApiKey(provider);
    setTests((s) => ({ ...s, [provider]: res }));
  };
  const saveCities = async () => {
    const active = cityActive
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    const soon = citySoon
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    if (active.length === 0) return;
    await api.setCities(active, soon);
    setCityActive('');
    setCitySoon('');
    reload();
  };
  return (
    <>
      <PageHead
        title="Ayarlar"
        sub="Parametrik oranlar · dış servis anahtarları · şehir yönetimi"
      />
      {/* Parametrik oranlar */}
      <h2 className="section-head">Ceza / depozito tutarları ve oranlar</h2>
      <p className="page-sub">Değişiklikler app&apos;e `/config` üzerinden yansır.</p>
      <Card className="mb-7">
        {!data ? (
          <Gate loading={loading} error={error} onRetry={reload} />
        ) : (
          data.rates.map((r) => (
            <div key={r.key} className="list-row">
              <div className="grow">
                <div className="name">{r.label}</div>
                <div className="meta">
                  {r.key} · güncel: {r.value} {r.suffix}
                </div>
              </div>
              <input
                className="input"
                style={{ width: 120 }}
                type="number"
                placeholder={String(r.value)}
                value={rateEdits[r.key] ?? ''}
                onChange={(e) => setRateEdits((s) => ({ ...s, [r.key]: e.target.value }))}
              />
              <button className="btn-sm btn-ok" onClick={() => saveRate(r.key)}>
                Kaydet
              </button>
            </div>
          ))
        )}
      </Card>
      {/* §4.4 — Kaspi ödeme bağlantısı */}
      <h2 className="section-head">Kaspi ile ödeme</h2>
      <p className="page-sub">
        SES INVEST QR kodunun içeriği (bir bağlantı). Doluysa müşteri depozito ekranında “Kaspi ile
        öde” düğmesini görür; boşsa düğme hiç görünmez.
      </p>
      <Card className="mb-7">
        <div className="list-row">
          <div className="grow">
            <div className="name">Ödeme bağlantısı</div>
            <div className="meta">
              {data?.kaspi.configured
                ? `Tanımlı · ${data.kaspi.url}`
                : 'Tanımlı değil — düğme gizli'}
            </div>
            <div className="meta" style={{ marginTop: 4 }}>
              Bağlantı tutarı destekliyorsa <code>{'{tutar}'}</code>, randevu referansını
              destekliyorsa <code>{'{ref}'}</code> yazın; uygulama bunları doldurur. Hangi biçimin
              çalıştığını telefonda deneyerek doğrulayın.
            </div>
          </div>
          <input
            className="input"
            style={{ width: 360 }}
            placeholder="https://kaspi.kz/pay/..."
            value={kaspiEdit}
            onChange={(e) => setKaspiEdit(e.target.value)}
          />
          <button className="btn-sm btn-ok" onClick={saveKaspi}>
            Kaydet
          </button>
        </div>
      </Card>
      {/* API anahtarları */}
      <h2 className="section-head">API anahtarları</h2>
      <p className="page-sub">
        Maskeli görünüm — değer asla panele/app&apos;e dönmez. &quot;Test Et&quot; biçim/varlık
        kontrolü yapar.
      </p>
      <Card className="mb-7">
        {!data ? (
          <Gate loading={loading} error={error} onRetry={reload} />
        ) : (
          data.apiKeys.map((k: ApiKeyStatus) => (
            <div key={k.provider} className="list-col">
              <div className="name">{k.label}</div>
              <div className="meta">
                {k.configured ? `Tanımlı: ${k.masked}` : 'Tanımsız'}
                {tests[k.provider] && (
                  <span
                    style={{ color: tests[k.provider]!.ok ? 'var(--success)' : 'var(--danger)' }}
                  >
                    {' '}
                    · {tests[k.provider]!.ok ? '✓' : '✗'} {tests[k.provider]!.message}
                  </span>
                )}
              </div>
              <div className="form-inline" style={{ marginTop: 10 }}>
                <input
                  className="input"
                  placeholder="Yeni anahtar (boş = temizle)"
                  value={keyEdits[k.provider] ?? ''}
                  onChange={(e) => setKeyEdits((s) => ({ ...s, [k.provider]: e.target.value }))}
                />
                <button className="btn-sm btn-ok" onClick={() => saveKey(k.provider)}>
                  Kaydet
                </button>
                <button className="btn-sm" onClick={() => test(k.provider)}>
                  Test Et
                </button>
              </div>
            </div>
          ))
        )}
      </Card>
      {/* Şehir yönetimi */}
      <h2 className="section-head">Şehir yönetimi</h2>
      <p className="page-sub">Aktif şehirler + &quot;yakında&quot; listesi (virgülle ayır).</p>
      <Card>
        {!data ? (
          <Gate loading={loading} error={error} onRetry={reload} />
        ) : (
          <>
            <div className="list-col">
              <div className="name">Aktif şehirler</div>
              <div className="meta">{data.cities.active.join(', ') || '—'}</div>
            </div>
            <div className="list-col">
              <div className="name">Yakında</div>
              <div className="meta">{data.cities.soon.join(', ') || '—'}</div>
            </div>
            <div className="form-inline">
              <input
                className="input"
                placeholder={`Aktif (örn. ${data.cities.active.join(', ')})`}
                value={cityActive}
                onChange={(e) => setCityActive(e.target.value)}
              />
              <input
                className="input"
                placeholder={`Yakında (örn. ${data.cities.soon.join(', ')})`}
                value={citySoon}
                onChange={(e) => setCitySoon(e.target.value)}
              />
              <button className="btn-sm btn-ok full" onClick={saveCities}>
                Şehirleri güncelle
              </button>
            </div>
          </>
        )}
      </Card>
      <CategorySection />
    </>
  );
}

// §12.9 — kategori bakım periyodu (gün) + standart hizmet süresi (dk)
function CategorySection() {
  const { data, loading, error, reload } = useAsync<CategoryConfig>(() => api.categoryConfig(), []);
  const [edits, setEdits] = useState<CategoryConfig>({});
  const save = async () => {
    if (!data) return;
    await api.setCategoryConfig({ ...data, ...edits });
    setEdits({});
    reload();
  };
  const set = (cat: string, field: 'maintenanceDays' | 'serviceMin', v: string) => {
    const base = data?.[cat] ?? { maintenanceDays: 0, serviceMin: 0 };
    setEdits((s) => ({ ...s, [cat]: { ...base, ...s[cat], [field]: Number(v) } }));
  };
  const val = (cat: string, field: 'maintenanceDays' | 'serviceMin') =>
    edits[cat]?.[field] ?? data?.[cat]?.[field] ?? 0;
  return (
    <>
      <h2 className="section-head">Kategori ayarları — bakım periyodu & hizmet süresi</h2>
      <p className="page-sub">Bakım Takvimi periyodu (gün) + slot motoru varsayılan süresi (dk).</p>
      <Card>
        {!data ? (
          <Gate loading={loading} error={error} onRetry={reload} />
        ) : (
          <>
            {Object.keys(data).map((cat) => (
              <div key={cat} className="list-row">
                <div className="grow">
                  <div className="name">{cat}</div>
                </div>
                <label className="meta">
                  Bakım (gün)
                  <input
                    className="input"
                    style={{ width: 80 }}
                    type="number"
                    value={val(cat, 'maintenanceDays')}
                    onChange={(e) => set(cat, 'maintenanceDays', e.target.value)}
                  />
                </label>
                <label className="meta">
                  Süre (dk)
                  <input
                    className="input"
                    style={{ width: 80 }}
                    type="number"
                    value={val(cat, 'serviceMin')}
                    onChange={(e) => set(cat, 'serviceMin', e.target.value)}
                  />
                </label>
              </div>
            ))}
            <div style={{ padding: 16 }}>
              <button
                className="btn-sm btn-ok"
                onClick={save}
                disabled={Object.keys(edits).length === 0}
              >
                Kategori ayarlarını kaydet
              </button>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
