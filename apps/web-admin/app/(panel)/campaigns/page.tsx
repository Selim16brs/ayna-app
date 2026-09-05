'use client';
import { useState } from 'react';
import { LangTabs, buildI18n, type Lang } from '@/app/_components/LangTabs';
import { useAsync } from '@/app/_lib/useAsync';
import { useDiyalog } from '@/app/ui/Diyalog';
import { api, type Campaign } from '@/app/lib/api';

/**
 * KAMPANYALAR — keşif vitrini.
 *
 * Ekleme kartı listenin üstünde HEP AÇIK duruyor ve öyle kalıyor: tek
 * satırlık bir form (başlık + alt başlık + rozet + görsel), ayrı bir
 * "/campaigns/yeni" rotasına bölmeye değmeyecek kadar küçük. Duyuru
 * gönderiminin aksine geri alınabilir bir işlem — yanlış kampanya
 * eklendiyse aynı ekrandan pasife alınıp silinebiliyor.
 *
 * §14.5 — dil sekmesi (tr kaynak, kk/ru çeviri) yerel useState olarak
 * kalıyor: URL'e taşınacak bir gezinme durumu değil, formun kendi hâli.
 */
export default function CampaignsSayfasi() {
  const { onayla } = useDiyalog();
  const { data, reload } = useAsync<Campaign[]>(() => api.campaigns(), []);
  const empty = {
    title: '',
    subtitle: '',
    titleKk: '',
    subtitleKk: '',
    titleRu: '',
    subtitleRu: '',
    badge: '',
    image: '',
    category: '',
  };
  const [form, setForm] = useState(empty);
  const [lang, setLang] = useState<Lang>('tr');
  const tKey = (
    lang === 'tr' ? 'title' : lang === 'kk' ? 'titleKk' : 'titleRu'
  ) as keyof typeof form;
  const sKey = (
    lang === 'tr' ? 'subtitle' : lang === 'kk' ? 'subtitleKk' : 'subtitleRu'
  ) as keyof typeof form;
  const create = async () => {
    if (form.title.length < 2 || !form.image) return; // tr (kaynak) zorunlu
    await api.createCampaign({
      title: form.title,
      subtitle: form.subtitle || undefined,
      i18n: buildI18n({
        title: { kk: form.titleKk, ru: form.titleRu },
        subtitle: { kk: form.subtitleKk, ru: form.subtitleRu },
      }),
      badge: form.badge || undefined,
      image: form.image,
      category: form.category || undefined,
    });
    setForm(empty);
    setLang('tr');
    reload();
  };
  return (
    <>
      <h1 className="page-title">Kampanyalar</h1>
      <p className="page-sub">Keşif vitrinindeki kampanyaları yönet</p>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-inline">
          <LangTabs
            lang={lang}
            setLang={setLang}
            filled={(l) =>
              l === 'kk' ? !!form.titleKk || !!form.subtitleKk : !!form.titleRu || !!form.subtitleRu
            }
          />
          <input
            className="input"
            placeholder={lang === 'tr' ? 'Başlık (TR — kaynak)' : `Başlık (${lang.toUpperCase()})`}
            value={form[tKey]}
            onChange={(e) => setForm({ ...form, [tKey]: e.target.value })}
          />
          <input
            className="input"
            placeholder={lang === 'tr' ? 'Alt başlık (TR)' : `Alt başlık (${lang.toUpperCase()})`}
            value={form[sKey]}
            onChange={(e) => setForm({ ...form, [sKey]: e.target.value })}
          />
          <input
            className="input"
            placeholder="Rozet (örn. %25) — dilden bağımsız"
            value={form.badge}
            onChange={(e) => setForm({ ...form, badge: e.target.value })}
          />
          <input
            className="input"
            placeholder="Kategori kodu (örn. hair)"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <input
            className="input full"
            placeholder="Görsel URL (https://...)"
            value={form.image}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
          />
          <button className="btn-sm btn-ok full" onClick={create}>
            + Kampanya ekle
          </button>
        </div>
      </div>
      <div className="card">
        {!data || data.length === 0 ? (
          <div className="empty">Kampanya yok</div>
        ) : (
          data.map((c) => (
            <div key={c.id} className="list-row">
              {c.image ? <img className="thumb" src={c.image} alt="" /> : <div className="thumb" />}
              <div className="grow">
                <div className="name">
                  {c.badge ? `${c.badge} · ` : ''}
                  {c.title}
                </div>
                <div className="meta">
                  {c.subtitle}
                  {c.category ? ` · ${c.category}` : ''}
                </div>
              </div>
              <button
                className={`switch ${c.active ? 'on' : 'off'}`}
                onClick={async () => {
                  await api.setCampaignActive(c.id, !c.active);
                  reload();
                }}
              >
                {c.active ? 'Aktif' : 'Pasif'}
              </button>
              <button
                className="btn-sm btn-danger"
                onClick={async () => {
                  if (
                    await onayla({
                      baslik: 'Kampanyayı sil',
                      mesaj: 'Bu kampanya kalıcı olarak silinecek.',
                      onayEtiket: 'Sil',
                      tehlikeli: true,
                    })
                  ) {
                    await api.deleteCampaign(c.id);
                    reload();
                  }
                }}
              >
                Sil
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
