'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PageHead, Card } from '@/app/_components/ui';
import { LangTabs, buildI18n, type Lang } from '@/app/_components/LangTabs';
import { useDiyalog } from '@/app/ui/Diyalog';
import { api, type AnnouncementSegment } from '@/app/lib/api';

const SEGMENTS: { id: AnnouncementSegment; label: string }[] = [
  { id: 'all', label: 'Tüm kullanıcılar' },
  { id: 'premium', label: 'Premium üyeler' },
  { id: 'platinum', label: '💎 Platinum üyeler' },
  { id: 'professionals', label: 'Uzmanlar' },
  { id: 'salons', label: 'Salonlar' },
  { id: 'city', label: 'Şehir bazlı' },
];

/**
 * YENİ DUYURU — §12.10 Bildirim Merkezi, gönderim formu.
 *
 * Kendi rotasında: gönderilen duyuru geri alınamıyor, bu yüzden forma
 * girmek artık bilinçli bir adım ("+ Yeni duyuru") — listeyi açan herkesin
 * önünde hazır bekleyen bir "gönder" düğmesi değil.
 *
 * Gönderim sonrası "/announcements" listesine dönülüyor: yeni kayıt zaten
 * geçmişin başında görünüyor, ayrıca liste kendi verisini baştan çekiyor.
 */
export default function YeniDuyuruSayfasi() {
  const router = useRouter();
  const { onayla } = useDiyalog();
  const empty = {
    title: '',
    body: '',
    titleKk: '',
    bodyKk: '',
    titleRu: '',
    bodyRu: '',
    segment: 'all' as AnnouncementSegment,
    city: '',
  };
  const [form, setForm] = useState(empty);
  const [lang, setLang] = useState<Lang>('tr');
  const [sent, setSent] = useState<string | null>(null);
  // aktif dile göre başlık/gövde alan adları
  const tKey = (
    lang === 'tr' ? 'title' : lang === 'kk' ? 'titleKk' : 'titleRu'
  ) as keyof typeof form;
  const bKey = (lang === 'tr' ? 'body' : lang === 'kk' ? 'bodyKk' : 'bodyRu') as keyof typeof form;
  const send = async () => {
    if (form.title.length < 2 || form.body.length < 2) return; // tr (kaynak) zorunlu
    if (form.segment === 'city' && !form.city) return;
    if (
      !(await onayla({
        baslik: 'Duyuruyu gönder',
        mesaj: `"${form.title}" duyurusu seçili segmente gönderilecek. Gönderilen duyuru geri alınamaz.`,
        onayEtiket: 'Gönder',
      }))
    )
      return;
    const i18n = buildI18n({
      title: { kk: form.titleKk, ru: form.titleRu },
      body: { kk: form.bodyKk, ru: form.bodyRu },
    });
    const res = await api.sendAnnouncement({
      title: form.title,
      body: form.body,
      i18n,
      segment: form.segment,
      city: form.segment === 'city' ? form.city : undefined,
    });
    setSent(`Gönderildi — ${res.recipientCount} alıcı`);
    setForm(empty);
    setLang('tr');
    router.push('/announcements');
  };
  return (
    <>
      <PageHead
        title="Yeni duyuru"
        sub="Segment bazlı toplu duyuru — app bildirim listesine düşer"
      />
      <Card className="mb-5">
        <div className="form-inline">
          <LangTabs
            lang={lang}
            setLang={setLang}
            filled={(l) =>
              l === 'kk' ? !!form.titleKk || !!form.bodyKk : !!form.titleRu || !!form.bodyRu
            }
          />
          <input
            className="input full"
            placeholder={
              lang === 'tr' ? 'Duyuru başlığı (TR — kaynak)' : `Başlık (${lang.toUpperCase()})`
            }
            value={form[tKey]}
            onChange={(e) => setForm({ ...form, [tKey]: e.target.value })}
          />
          <textarea
            className="input full"
            placeholder={
              lang === 'tr' ? 'Duyuru metni (TR — kaynak)' : `Metin (${lang.toUpperCase()})`
            }
            rows={3}
            value={form[bKey]}
            onChange={(e) => setForm({ ...form, [bKey]: e.target.value })}
          />
          <select
            className="input"
            value={form.segment}
            onChange={(e) => setForm({ ...form, segment: e.target.value as AnnouncementSegment })}
          >
            {SEGMENTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          {form.segment === 'city' && (
            <input
              className="input"
              placeholder="Şehir (örn. Almatı)"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          )}
          <button className="btn-sm btn-ok full" onClick={send}>
            📣 Duyuruyu gönder
          </button>
          {sent && <div className="full text-ax-sm font-semibold text-ok">{sent}</div>}
        </div>
      </Card>
      <Link href="/announcements" className="btn-sm">
        ← Duyuru geçmişine dön
      </Link>
    </>
  );
}
