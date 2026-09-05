'use client';
import { useState } from 'react';
import { useAsync } from '@/app/_lib/useAsync';
import { api, type Category } from '@/app/lib/api';

/**
 * HİZMETLER — kategori sırası (brief §7.3) + arz durumu (§7.4).
 *
 * Sıralama TASLAĞI (`sira`) bilerek useState olarak kalıyor: kaydedilmemiş
 * bir düzenleme, paylaşılabilir bir adres değil. URL'e taşımak, yarım kalmış
 * bir sırayı link olarak dolaştırmak anlamına gelirdi; "Vazgeç" de geri
 * tuşuyla karışırdı.
 */
export default function ServicesSayfasi() {
  const { data, reload } = useAsync<Category[]>(() => api.categories(), []);
  const [sira, setSira] = useState<string[] | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  // Sunucudan gelen sıra taslağın temeli; yönetici oynatana kadar aynısı.
  const liste = (() => {
    if (!data) return [];
    if (!sira) return data;
    const kod = new Map(data.map((c) => [c.code, c]));
    return sira.map((c) => kod.get(c)).filter((c): c is Category => !!c);
  })();
  const degisti = !!sira && data ? sira.join() !== data.map((c) => c.code).join() : false;

  const oynat = (i: number, yon: -1 | 1) => {
    const kodlar = liste.map((c) => c.code);
    const j = i + yon;
    if (j < 0 || j >= kodlar.length) return;
    [kodlar[i], kodlar[j]] = [kodlar[j]!, kodlar[i]!];
    setSira(kodlar);
  };

  const kaydet = async () => {
    if (!sira) return;
    setKaydediliyor(true);
    try {
      await api.reorderCategories(sira);
      setSira(null);
      reload();
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <>
      <h1 className="page-title">Hizmetler</h1>
      {/*
       * PANEL ARTIK GERÇEĞİ SÖYLÜYOR.
       *
       * Burada kategori ekleme formu ve ad düzenleme kutuları vardı;
       * üçü de sessizce hiçbir şey yapmıyordu:
       *   · ad değiştirmek → uygulama adları katalogdan okuyor, telefonda
       *     eski ad kalıyordu;
       *   · silmek → sunucu bir sonraki açılışta geri ekliyordu;
       *   · eklemek → uygulama listeyi katalogdan kuruyor, yeni kategori
       *     hiçbir ekranda görünmüyordu.
       *
       * Değiştirilebilen tek şey SIRA (brief §7.3) ve o gerçekten
       * uygulamaya yansıyor.
       */}
      <p className="page-sub">
        Kategoriler ve alt hizmetler <strong>hizmet kataloğunda</strong> tanımlı — adları buradan
        değişmez. Buradan <strong>sırayı</strong> değiştirebilirsin; uygulamada kategoriler bu
        sırayla görünür.
      </p>

      <div className="card">
        {!data ? (
          <div className="empty">Yükleniyor…</div>
        ) : liste.length === 0 ? (
          <div className="empty">Katalog boş</div>
        ) : (
          liste.map((c, i) => (
            <div key={c.code} className="list-row">
              <span className="pill" style={{ background: 'var(--line)', color: 'var(--muted)' }}>
                {i + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="name">{c.nameTr}</div>
                {/* Üç dil birden: kurucunun kk/ru karşılıklarını görmesi
                    için tek yer burası. */}
                <div className="meta">
                  {c.nameRu} · {c.nameKk} · <span style={{ opacity: 0.7 }}>{c.code}</span>
                </div>
              </div>
              {/*
               * ARZ DURUMU — brief §7.4. Hangi alt hizmette yayında uzman
               * var? Sıfırsa o kategori müşteriye "Yakında" rozetiyle
               * çıkıyor; yöneticinin nereye uzman bulması gerektiğini
               * görebileceği tek yer burası.
               */}
              <span
                className={`pill ${c.suppliedCount === 0 ? 'pending' : 'approved'}`}
                title="Yayında uzmanı olan alt hizmet / toplam"
              >
                {c.suppliedCount}/{c.serviceCount} hizmette uzman var
              </span>
              <button
                className="btn-sm"
                disabled={i === 0}
                onClick={() => oynat(i, -1)}
                aria-label="Yukarı taşı"
              >
                ↑
              </button>
              <button
                className="btn-sm"
                disabled={i === liste.length - 1}
                onClick={() => oynat(i, 1)}
                aria-label="Aşağı taşı"
              >
                ↓
              </button>
            </div>
          ))
        )}
      </div>

      {degisti ? (
        <div className="actions" style={{ marginTop: 16 }}>
          <button className="btn-sm" onClick={() => setSira(null)} disabled={kaydediliyor}>
            Vazgeç
          </button>
          <button
            className="btn-sm btn-primary"
            onClick={() => void kaydet()}
            disabled={kaydediliyor}
          >
            {kaydediliyor ? 'Kaydediliyor…' : 'Sırayı kaydet'}
          </button>
        </div>
      ) : null}
    </>
  );
}
