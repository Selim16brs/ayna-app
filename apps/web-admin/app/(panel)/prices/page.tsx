'use client';
import { useState } from 'react';
import { useAsync } from '@/app/_lib/useAsync';
import { TL } from '@/app/_lib/ortak';
import { api, type Category, type MarketPrice } from '@/app/lib/api';

/**
 * TABAN FİYATLAR — kategori × şehir piyasa tabanı.
 *
 * "Kaydet / güncelle" kartı listenin üstünde hep açık: üç alanlık bir form
 * ve aynı kaydı ikinci kez yazmak da (upsert) zararsız. Ayrı rotaya bölmek
 * yalnızca tek bir sayı düzeltmek için fazladan gezinme olurdu.
 */
export default function PricesSayfasi() {
  const { data, reload } = useAsync<MarketPrice[]>(() => api.marketPrices(), []);
  const { data: cats } = useAsync<Category[]>(() => api.categories(), []);
  const [form, setForm] = useState({ category: '', city: '', basePrice: '' });
  const save = async () => {
    if (!form.category || !form.basePrice) return;
    await api.setMarketPrice({
      category: form.category,
      city: form.city || undefined,
      basePrice: Number(form.basePrice),
    });
    setForm({ category: '', city: '', basePrice: '' });
    reload();
  };
  const catName = (code: string) => cats?.find((c) => c.code === code)?.nameTr ?? code;
  return (
    <>
      <h1 className="page-title">Taban fiyatlar</h1>
      <p className="page-sub">
        Piyasa taban fiyatları (kategori × şehir) — teklif tabanı ve %40-altı uyarısı için. Uzman
        başlangıç fiyatları "Uzmanlar" bölümünden düzenlenir.
      </p>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-inline">
          <select
            className="input"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="">Kategori seç…</option>
            {(cats ?? []).map((c) => (
              <option key={c.id} value={c.code}>
                {c.nameTr}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Şehir (boş = genel)"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <input
            className="input"
            placeholder="Taban fiyat (KZT)"
            type="number"
            value={form.basePrice}
            onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
          />
          <button className="btn-sm btn-ok full" onClick={save}>
            Kaydet / güncelle
          </button>
        </div>
      </div>
      <div className="card">
        {!data ? (
          <div className="empty">Yükleniyor…</div>
        ) : data.length === 0 ? (
          <div className="empty">Fiyat kaydı yok</div>
        ) : (
          data.map((m) => (
            <div key={m.id} className="list-row">
              <div className="grow">
                <div className="name">{catName(m.category)}</div>
                <div className="meta">
                  {m.category} · {m.city || 'Genel'}
                </div>
              </div>
              <div className="kv-v">{TL(m.basePrice)}</div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
