'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card } from '@/app/_components/ui';
import { LangTabs, type Lang } from '@/app/_components/LangTabs';
import { api, type ArticleInput, type BlogArticle, type I18nOverride } from '@/app/lib/api';

/**
 * BLOG YAZI FORMU — /content/yeni ve /content/guncelle ortak gövdesi.
 *
 * Bölme öncesi tek bir ContentView vardı ve "yeni yazı" ile "yazıyı düzenle"
 * arasındaki fark bir `editId` state'iydi: form listenin üstünde her zaman
 * açık duruyordu, düzenlemeye geçince URL değişmiyordu, sayfa yenilenince
 * düzenlenen yazı kayboluyordu. Artık ayrım rotada:
 *
 *   mevcut = null  →  /content/yeni             (createArticle)
 *   mevcut = yazı  →  /content/guncelle?id=X   (updateArticle)
 *
 * Dinamik segment ([id]) YOK: panel `output: 'export'` ile statik
 * üretiliyor, kimlik query string'de taşınıyor.
 *
 * Form gövdesi ikisinde de birebir aynı olduğu için burada tek yerde duruyor.
 * Alt çizgiyle başlayan dosya App Router'da rota üretmez.
 */

const BOS_FORM: ArticleInput = {
  title: '',
  tag: '',
  categoryCode: '',
  contentType: 'guide',
  readMin: 3,
  image: '',
  excerpt: '',
  body: [''],
  published: true,
};

// §14.5 — kk/ru override alanları (blog: title/tag/excerpt/body). body = satır bazlı metin.
const BOS_OV = {
  kk: { title: '', tag: '', excerpt: '', body: '' },
  ru: { title: '', tag: '', excerpt: '', body: '' },
};

type BField = 'title' | 'tag' | 'excerpt' | 'body';

/** Mevcut yazıyı forma çevirir (eski `edit(a)` fonksiyonunun form kısmı). */
function formaCevir(a: BlogArticle): ArticleInput {
  return {
    title: a.title,
    tag: a.tag,
    categoryCode: a.categoryCode ?? '',
    contentType: (a as { contentType?: string }).contentType ?? 'guide',
    readMin: a.readMin,
    image: a.image,
    excerpt: a.excerpt,
    body: a.body.length ? a.body : [''],
    published: a.published,
  };
}

/** §14.5 — mevcut kk/ru override'ları ön-doldurur (varsa). */
function ovCevir(a: BlogArticle): typeof BOS_OV {
  const i = a.i18n ?? {};
  const asStr = (v: unknown): string =>
    Array.isArray(v) ? v.join('\n') : typeof v === 'string' ? v : '';
  return {
    kk: {
      title: asStr(i.kk?.title),
      tag: asStr(i.kk?.tag),
      excerpt: asStr(i.kk?.excerpt),
      body: asStr(i.kk?.body),
    },
    ru: {
      title: asStr(i.ru?.title),
      tag: asStr(i.ru?.tag),
      excerpt: asStr(i.ru?.excerpt),
      body: asStr(i.ru?.body),
    },
  };
}

export function YaziFormu({ mevcut }: { mevcut?: BlogArticle | null }) {
  const router = useRouter();
  const editId = mevcut?.id ?? null;
  const [form, setForm] = useState<ArticleInput>(() => (mevcut ? formaCevir(mevcut) : BOS_FORM));
  const [ov, setOv] = useState(() => (mevcut ? ovCevir(mevcut) : BOS_OV));
  // Dil sekmesi geçici bir görünüm tercihi — URL'e taşınmaz, state kalır.
  const [lang, setLang] = useState<Lang>('tr');

  const fieldVal = (f: BField): string => {
    if (lang === 'tr')
      return f === 'body' ? (form.body ?? []).join('\n') : ((form[f] as string) ?? '');
    return ov[lang][f];
  };
  const setFieldVal = (f: BField, v: string) => {
    if (lang === 'tr') {
      if (f === 'body') setForm({ ...form, body: v.split('\n') });
      else setForm({ ...form, [f]: v });
    } else {
      setOv({ ...ov, [lang]: { ...ov[lang], [f]: v } });
    }
  };
  const buildArticleI18n = (): I18nOverride | undefined => {
    const out: I18nOverride = {};
    for (const loc of ['kk', 'ru'] as const) {
      const o = ov[loc];
      const entry: Record<string, string | string[]> = {};
      if (o.title.trim()) entry.title = o.title.trim();
      if (o.tag.trim()) entry.tag = o.tag.trim();
      if (o.excerpt.trim()) entry.excerpt = o.excerpt.trim();
      const b = o.body
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean);
      if (b.length) entry.body = b;
      if (Object.keys(entry).length) out[loc] = entry;
    }
    return Object.keys(out).length ? out : undefined;
  };
  const save = async () => {
    const body = (form.body ?? []).map((p) => p.trim()).filter(Boolean);
    if (form.title.length < 3 || !form.tag || !form.excerpt || body.length === 0) return; // tr (kaynak) zorunlu
    const payload: ArticleInput = {
      ...form,
      body,
      i18n: buildArticleI18n(),
      categoryCode: form.categoryCode || null,
      contentType: form.contentType || 'guide',
    };
    if (editId) await api.updateArticle(editId, payload);
    else await api.createArticle(payload);
    // Eski `resetForm()` formu tek ekranda sıfırlıyordu; form artık kendi
    // rotasında olduğu için kaydedince listeye dönüyoruz.
    router.push('/content');
  };

  return (
    <Card className="mb-5">
      <div className="form-inline">
        <LangTabs
          lang={lang}
          setLang={setLang}
          filled={(l) => l !== 'tr' && Object.values(ov[l]).some((v) => !!v.trim())}
        />
        <input
          className="input"
          placeholder={lang === 'tr' ? 'Başlık (TR — kaynak)' : `Başlık (${lang.toUpperCase()})`}
          value={fieldVal('title')}
          onChange={(e) => setFieldVal('title', e.target.value)}
        />
        <input
          className="input"
          placeholder={lang === 'tr' ? 'Etiket (örn. Bakım)' : `Etiket (${lang.toUpperCase()})`}
          value={fieldVal('tag')}
          onChange={(e) => setFieldVal('tag', e.target.value)}
        />
        <input
          className="input"
          placeholder="Kategori kodu → Teklif al CTA (örn. hair)"
          value={form.categoryCode ?? ''}
          onChange={(e) => setForm({ ...form, categoryCode: e.target.value })}
        />
        <select
          className="input"
          value={form.contentType ?? 'guide'}
          onChange={(e) => setForm({ ...form, contentType: e.target.value })}
        >
          <option value="guide">Rehber</option>
          <option value="trend">Trend (Keşfet bandı)</option>
          <option value="care_plan">Bakım planı</option>
          <option value="expert_spotlight">Uzman vitrini</option>
          <option value="listicle">Listicle</option>
        </select>
        <input
          className="input"
          type="number"
          placeholder="Okuma dk"
          value={form.readMin ?? 3}
          onChange={(e) => setForm({ ...form, readMin: Number(e.target.value) })}
        />
        <input
          className="input full"
          placeholder="Görsel URL (https://...)"
          value={form.image ?? ''}
          onChange={(e) => setForm({ ...form, image: e.target.value })}
        />
        <input
          className="input full"
          placeholder={
            lang === 'tr' ? 'Özet (kart altında görünür)' : `Özet (${lang.toUpperCase()})`
          }
          value={fieldVal('excerpt')}
          onChange={(e) => setFieldVal('excerpt', e.target.value)}
        />
        <textarea
          className="input full"
          placeholder={
            lang === 'tr'
              ? 'İçerik — her satır bir paragraf'
              : `İçerik (${lang.toUpperCase()}) — her satır bir paragraf`
          }
          rows={6}
          value={fieldVal('body')}
          onChange={(e) => setFieldVal('body', e.target.value)}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={form.published ?? false}
            onChange={(e) => setForm({ ...form, published: e.target.checked })}
          />
          Yayında
        </label>
        <button className="btn-sm btn-ok" onClick={save}>
          {editId ? 'Kaydet' : '+ Yazı ekle'}
        </button>
        {/* Vazgeç artık formu sıfırlamak değil, listeye dönmek demek. */}
        <Link className="btn-sm" href="/content">
          Vazgeç
        </Link>
      </div>
    </Card>
  );
}
