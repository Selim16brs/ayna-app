'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * PANEL İÇİ DİYALOG — tarayıcının `prompt`/`alert`/`confirm` pencerelerinin yerine.
 *
 * Kurucu: "admin paneli rezil durumda hiç user friendly değil ve karışık.
 * bunu daha profesyonel ve kafa karıştırıcılıklardan uzak şekilde yapman
 * lazım. bir değişiklik olduğunda üstten açılan pencere ile değil admin
 * panelinden olsun."
 *
 * ── NEDEN TARAYICI PENCERESİ KÖTÜYDÜ ────────────────────────────────────
 *
 * Panelde 30 yerde `prompt`/`alert`/`confirm` vardı. Bunlar:
 *   · Tarayıcının kendi kutusu — panelin tasarımıyla hiç ilgisi yok, her
 *     tarayıcıda başka görünüyor ve ekranın tepesinden düşüyor.
 *   · TEK ALAN alıyor. Üye düzenlemek için ad, e-posta, şehir ve telefon
 *     ARKA ARKAYA DÖRT pencere açılıyordu; üçüncüde vazgeçen kişi ilk
 *     ikisini de kaybediyordu.
 *   · Bağlam göstermiyor: "Red sebebi:" diyor ama neyin reddedildiği
 *     ekranda kalmıyor.
 *   · Sayfayı KİLİTLİYOR; arkadaki bilgiye bakmak mümkün değil.
 *
 * Buradaki diyalog panelin içinde açılıyor, çok alanlı olabiliyor, başlık ve
 * açıklama taşıyor ve yıkıcı işlemleri kırmızıyla ayırıyor.
 *
 * ── NEDEN PROMISE DÖNÜYOR ───────────────────────────────────────────────
 *
 * `confirm()` senkron bir cevap veriyordu ve çağrı yerleri buna göre
 * yazılmıştı. Aynı şekli koruyorum (`await onayla(...)`), böylece 30 çağrı
 * yerinin akışı yeniden kurgulanmıyor — yalnız `await` ekleniyor. Akışı
 * yeniden yazmak, gözden kaçan bir dalda yanlış kayıt üretme riski demekti.
 */

export interface DiyalogAlani {
  ad: string;
  etiket: string;
  deger?: string;
  ipucu?: string;
  tur?: 'text' | 'password' | 'email' | 'tel' | 'number' | 'uzun';
  /** Alanın altında görünen küçük açıklama. */
  not?: string;
  /** Boş bırakılamaz. */
  zorunlu?: boolean;
}

type OnayIstegi = {
  tur: 'onay';
  baslik: string;
  mesaj?: string;
  onayEtiket?: string;
  /** Silme/engelleme gibi geri alınamaz işlemler kırmızı görünür. */
  tehlikeli?: boolean;
};

type FormIstegi = {
  tur: 'form';
  baslik: string;
  mesaj?: string;
  alanlar: DiyalogAlani[];
  onayEtiket?: string;
};

type Istek = OnayIstegi | FormIstegi;

interface Bildirim {
  id: number;
  metin: string;
  hata: boolean;
}

interface DiyalogApi {
  /** Evet/hayır. `true` = onaylandı. */
  onayla: (i: Omit<OnayIstegi, 'tur'>) => Promise<boolean>;
  /** Çok alanlı form. `null` = vazgeçildi. */
  formAl: (i: Omit<FormIstegi, 'tur'>) => Promise<Record<string, string> | null>;
  /** Kısa bilgi şeridi — sayfayı kilitlemez. */
  bildir: (metin: string, hata?: boolean) => void;
}

const Ctx = createContext<DiyalogApi | null>(null);

export function useDiyalog(): DiyalogApi {
  const api = useContext(Ctx);
  if (!api) throw new Error('DiyalogSaglayici eksik');
  return api;
}

export function DiyalogSaglayici({ children }: { children: ReactNode }) {
  const [istek, setIstek] = useState<Istek | null>(null);
  const [degerler, setDegerler] = useState<Record<string, string>>({});
  const [bildirimler, setBildirimler] = useState<Bildirim[]>([]);
  // Açık diyaloğun cevabını bekleyen çağıran taraf.
  const cozucu = useRef<((v: unknown) => void) | null>(null);
  const sayac = useRef(0);

  const kapat = useCallback((sonuc: unknown) => {
    cozucu.current?.(sonuc);
    cozucu.current = null;
    setIstek(null);
    setDegerler({});
  }, []);

  const onayla = useCallback<DiyalogApi['onayla']>(
    (i) =>
      new Promise<boolean>((res) => {
        cozucu.current = res as (v: unknown) => void;
        setIstek({ ...i, tur: 'onay' });
      }),
    [],
  );

  const formAl = useCallback<DiyalogApi['formAl']>(
    (i) =>
      new Promise((res) => {
        cozucu.current = res as (v: unknown) => void;
        setDegerler(Object.fromEntries(i.alanlar.map((a) => [a.ad, a.deger ?? ''])));
        setIstek({ ...i, tur: 'form' });
      }),
    [],
  );

  const bildir = useCallback<DiyalogApi['bildir']>((metin, hata = false) => {
    const id = ++sayac.current;
    setBildirimler((b) => [...b, { id, metin, hata }]);
    // Kendiliğinden kaybolur: `alert` gibi tıklama beklemez, iş akışını kesmez.
    setTimeout(() => setBildirimler((b) => b.filter((x) => x.id !== id)), 4200);
  }, []);

  const api = useMemo(() => ({ onayla, formAl, bildir }), [onayla, formAl, bildir]);

  // ESC ile vazgeçme: tarayıcı penceresinde çalışan alışkanlık burada da
  // çalışmalı, yoksa kullanıcı sıkıştığını hisseder.
  useEffect(() => {
    if (!istek) return;
    const f = (e: KeyboardEvent) => {
      if (e.key === 'Escape') kapat(istek.tur === 'onay' ? false : null);
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [istek, kapat]);

  const eksikZorunlu =
    istek?.tur === 'form' && istek.alanlar.some((a) => a.zorunlu && !(degerler[a.ad] ?? '').trim());

  return (
    <Ctx.Provider value={api}>
      {children}

      {istek ? (
        <div
          className="dlg-perde"
          onMouseDown={(e) => {
            // Yalnız PERDEYE tıklayınca kapanır; kutunun içinde sürüklerken
            // yanlışlıkla kapanması veri kaybı olurdu.
            if (e.target === e.currentTarget) kapat(istek.tur === 'onay' ? false : null);
          }}
        >
          <div className="dlg" role="dialog" aria-modal="true" aria-label={istek.baslik}>
            <h2 className="dlg-baslik">{istek.baslik}</h2>
            {istek.mesaj ? <p className="dlg-mesaj">{istek.mesaj}</p> : null}

            {istek.tur === 'form' ? (
              <form
                className="dlg-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!eksikZorunlu) kapat(degerler);
                }}
              >
                {istek.alanlar.map((a, i) => (
                  <label key={a.ad} className="dlg-alan">
                    <span className="dlg-etiket">
                      {a.etiket}
                      {a.zorunlu ? <em className="dlg-zorunlu"> *</em> : null}
                    </span>
                    {a.tur === 'uzun' ? (
                      <textarea
                        className="input dlg-uzun"
                        value={degerler[a.ad] ?? ''}
                        placeholder={a.ipucu ?? ''}
                        onChange={(e) => setDegerler((d) => ({ ...d, [a.ad]: e.target.value }))}
                        autoFocus={i === 0}
                      />
                    ) : (
                      <input
                        className="input"
                        type={a.tur ?? 'text'}
                        value={degerler[a.ad] ?? ''}
                        placeholder={a.ipucu ?? ''}
                        onChange={(e) => setDegerler((d) => ({ ...d, [a.ad]: e.target.value }))}
                        autoFocus={i === 0}
                      />
                    )}
                    {a.not ? <span className="dlg-not">{a.not}</span> : null}
                  </label>
                ))}
                <div className="dlg-eylem">
                  <button type="button" className="btn-sm btn-ghost" onClick={() => kapat(null)}>
                    Vazgeç
                  </button>
                  <button type="submit" className="btn-sm btn-primary" disabled={eksikZorunlu}>
                    {istek.onayEtiket ?? 'Kaydet'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="dlg-eylem">
                <button type="button" className="btn-sm btn-ghost" onClick={() => kapat(false)}>
                  Vazgeç
                </button>
                <button
                  type="button"
                  className={`btn-sm ${istek.tehlikeli ? 'btn-danger' : 'btn-primary'}`}
                  onClick={() => kapat(true)}
                  autoFocus
                >
                  {istek.onayEtiket ?? 'Onayla'}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {bildirimler.length ? (
        <div className="bildirim-yigin" aria-live="polite">
          {bildirimler.map((b) => (
            <div key={b.id} className={`bildirim ${b.hata ? 'bildirim-hata' : ''}`}>
              {b.metin}
            </div>
          ))}
        </div>
      ) : null}
    </Ctx.Provider>
  );
}
