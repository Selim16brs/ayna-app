'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PageHead, Toolbar, Card } from '@/app/_components/ui';
import { LangTabs, buildI18n, type Lang } from '@/app/_components/LangTabs';
import { useAsync } from '@/app/_lib/useAsync';
import { api, type Pro } from '@/app/lib/api';

/**
 * YENİ REKLAM FORMU — "/ads/yeni".
 *
 * Form eskiden listenin üstünde her zaman açık duran bir karttı: reklam
 * bandına bakmak isteyen herkes önce boş formu geçmek zorundaydı. Artık
 * kendi rotasında; kaydedince listeye dönüyor.
 *
 * Dil sekmesi (lang) ve form alanları URL'e TAŞINMAZ — geçici giriş durumu.
 */
export default function YeniReklamSayfasi() {
  const router = useRouter();
  const { data: pros } = useAsync<Pro[]>(() => api.professionals(), []);
  const empty = {
    proId: '',
    title: '',
    subtitle: '',
    titleKk: '',
    subtitleKk: '',
    titleRu: '',
    subtitleRu: '',
    image: '',
    placement: 'one_cikanlar' as 'firsatlar' | 'one_cikanlar',
    startsAt: '',
    endsAt: '',
  };
  const [form, setForm] = useState(empty);
  const [lang, setLang] = useState<Lang>('tr');
  const tKey = (
    lang === 'tr' ? 'title' : lang === 'kk' ? 'titleKk' : 'titleRu'
  ) as keyof typeof form;
  const sKey = (
    lang === 'tr' ? 'subtitle' : lang === 'kk' ? 'subtitleKk' : 'subtitleRu'
  ) as keyof typeof form;
  /*
   * TARİHLER ZORUNLU. Kurucu: "reklam girişleri yaparken başlangıç bitiş
   * tarihleri seçilmeli. seçilmediyse onay butonu çalışmamalı."
   *
   * Boş bırakılan reklam SINIRSIZ yayınlanıyordu: bir aylığına ödenmiş
   * vitrin, kapatmak unutulduğu sürece bedava yayında kalıyordu.
   */
  const tarihlerTamam =
    !!form.startsAt && !!form.endsAt && new Date(form.endsAt) > new Date(form.startsAt);
  const eklenebilir = !!form.proId && form.title.length >= 2 && !!form.image && tarihlerTamam;

  const create = async () => {
    if (!eklenebilir) return;
    await api.createAd({
      proId: form.proId,
      title: form.title,
      subtitle: form.subtitle || undefined,
      i18n: buildI18n({
        title: { kk: form.titleKk, ru: form.titleRu },
        subtitle: { kk: form.subtitleKk, ru: form.subtitleRu },
      }),
      image: form.image,
      placement: form.placement,
      // Boş bırakılırsa sınırsız yayın. Tarih girilirse süresi bitince
      // reklam KENDİLİĞİNDEN düşer — kapatmayı unutmak ödenmemiş reklamı
      // yayında bırakıyordu.
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    });
    // Kaydedilen reklam listede görünsün: eskiden aynı ekranda kalıp
    // reload() çağrılıyordu, artık listeye dönüyoruz.
    router.push('/ads');
  };

  return (
    <>
      <PageHead
        title="Yeni reklam"
        sub="Ücretli vitrin bandına elle reklam ekler. Başlangıç ve bitiş tarihi zorunlu: tarihsiz reklam süresiz yayında kalırdı."
      />
      <Toolbar>
        <Link className="btn-sm" href="/ads">
          ← Reklamlara dön
        </Link>
      </Toolbar>
      <Card className="mb-5">
        <div className="form-inline">
          <select
            className="input"
            value={form.proId}
            onChange={(e) => {
              const p = pros?.find((x) => x.id === e.target.value);
              setForm({ ...form, proId: e.target.value, title: form.title || (p?.name ?? '') });
            }}
          >
            <option value="">İşletme seç…</option>
            {(pros ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.sector}
              </option>
            ))}
          </select>
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
            placeholder="Görsel URL (https://...)"
            value={form.image}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
          />
          {/* HANGİ VİTRİN satın alındı. Aynı kartı iki bölümde birden
              göstermek ekranı tekrarlı gösterirdi; yerleşimi reklamı ödeyen
              seçiyor. */}
          <select
            className="input"
            value={form.placement}
            onChange={(e) =>
              setForm({ ...form, placement: e.target.value as 'firsatlar' | 'one_cikanlar' })
            }
          >
            <option value="one_cikanlar">Öne çıkanlar</option>
            <option value="firsatlar">Fırsatlar</option>
          </select>
          {/* YAYIN PENCERESİ — boş = sınırsız. */}
          <input
            className="input"
            type="date"
            title="Yayın başlangıcı (zorunlu)"
            value={form.startsAt}
            onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
          />
          <input
            className="input"
            type="date"
            title="Yayın bitişi (zorunlu)"
            value={form.endsAt}
            onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
          />
          <button className="btn-sm btn-ok full" disabled={!eklenebilir} onClick={create}>
            + Reklam ekle
          </button>
          {!tarihlerTamam && (
            <div className="col-span-full text-ax-sm leading-relaxed text-warn">
              Başlangıç ve bitiş tarihi zorunlu; bitiş başlangıçtan sonra olmalı. Tarihsiz reklam
              süresiz yayında kalırdı.
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
