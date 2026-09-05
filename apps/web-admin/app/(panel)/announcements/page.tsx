'use client';
import Link from 'next/link';
import { PageHead, Toolbar, Card, Loading } from '@/app/_components/ui';
import { useAsync } from '@/app/_lib/useAsync';
import { api, type Announcement, type AnnouncementSegment } from '@/app/lib/api';

// Gönderim formunun segment listesiyle aynı sözlük; geçmişteki kaydın
// segment kodunu okunur etikete çevirmek için burada da duruyor.
const SEGMENTS: { id: AnnouncementSegment; label: string }[] = [
  { id: 'all', label: 'Tüm kullanıcılar' },
  { id: 'premium', label: 'Premium üyeler' },
  { id: 'platinum', label: '💎 Platinum üyeler' },
  { id: 'professionals', label: 'Uzmanlar' },
  { id: 'salons', label: 'Salonlar' },
  { id: 'city', label: 'Şehir bazlı' },
];

/**
 * DUYURULAR — §12.10 Bildirim Merkezi, gönderim geçmişi.
 *
 * Toplu duyuru formu eskiden bu listenin ÜSTÜNDE hep açık duruyordu.
 * Geri alınamayan bir gönderimi her sayfa açılışında hazır bekletmek
 * hem riskliydi hem de geçmişi ekranın altına itiyordu; form artık
 * "/announcements/yeni" rotasında, bu sayfa yalnız geçmişi gösteriyor.
 */
export default function AnnouncementsSayfasi() {
  const { data } = useAsync<Announcement[]>(() => api.announcements(), []);
  const segLabel = (s: AnnouncementSegment) => SEGMENTS.find((x) => x.id === s)?.label ?? s;
  return (
    <>
      <PageHead title="Duyurular" sub="Segment bazlı toplu duyuru — app bildirim listesine düşer" />
      <Toolbar>
        <Link href="/announcements/yeni" className="btn-sm btn-ok">
          📣 Yeni duyuru
        </Link>
      </Toolbar>
      <h2 className="section-head">Gönderim geçmişi</h2>
      <Card>
        {!data || data.length === 0 ? (
          <Loading label="Henüz duyuru gönderilmedi" />
        ) : (
          data.map((a) => (
            <div key={a.id} className="list-col">
              <div className="name">{a.title}</div>
              <div className="meta !mt-1">{a.body}</div>
              <div className="meta !mt-1.5 tabular-nums">
                {segLabel(a.segment)}
                {a.city ? ` · ${a.city}` : ''} · {a.recipientCount} alıcı ·{' '}
                {new Date(a.createdAt).toLocaleString('tr-TR')}
              </div>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
