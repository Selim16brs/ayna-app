'use client';
import { useState } from 'react';
import { Card } from '@/app/_components/ui';
import { useAsync } from '@/app/_lib/useAsync';
import { api, type AcilisMesajSatiri, type AcilisRaporSatiri } from '@/app/lib/api';

/**
 * AÇILIŞ MESAJLARI — brief §7.2 (yönetim) + §7.3 (analitik).
 *
 * ── ROTA ────────────────────────────────────────────────────────────────
 *
 * Ekran "/splash" adresinde. Düzenleme kartı bilerek URL'e taşınmadı:
 * mesaj sayısı az ve düzenleme aynı ekranda, listenin altında yapılıyor —
 * /splash/[code] açmak paylaşılabilir bir şey kazandırmadan ekranı ikiye
 * bölerdi. Seçili mesaj bu yüzden yerel state olarak kaldı.
 *
 * ── TABLO BOŞ GÖRÜNMEZ ──────────────────────────────────────────────────
 *
 * Uygulama kataloğu kendi içinde taşıyor; bu tablo yalnız "uzaktan
 * değiştirme" katmanı. Panel boş açılsaydı yönetici "mesajlar nerede,
 * bozuldu mu?" diye sorardı. Boşken ne olduğu YAZIYOR ve tek tuşla
 * paketi tabloya alabiliyor.
 *
 * ── ÜÇ DİL ZORUNLU ──────────────────────────────────────────────────────
 *
 * Kaydet düğmesi üç dil dolmadan çalışmıyor. Eksik dil, o dildeki
 * kullanıcıya BOŞ açılış ekranı demek olurdu.
 */
export default function SplashSayfasi() {
  const { data, reload } = useAsync<AcilisMesajSatiri[]>(() => api.acilisMesajlari(), []);
  const { data: rapor } = useAsync<AcilisRaporSatiri[]>(() => api.acilisRapor(30), []);
  const [duzenlenen, setDuzenlenen] = useState<AcilisMesajSatiri | null>(null);
  const [form, setForm] = useState({ tr: '', kk: '', ru: '' });
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);

  const oranlar = new Map((rapor ?? []).map((r) => [r.code, r]));
  const eksikDil = !form.tr.trim() || !form.kk.trim() || !form.ru.trim();

  const ac = (m: AcilisMesajSatiri) => {
    setDuzenlenen(m);
    setForm({ tr: m.tr, kk: m.kk, ru: m.ru });
    setHata(null);
  };

  const kaydet = async () => {
    if (!duzenlenen || eksikDil) return;
    setHata(null);
    try {
      /*
       * KOŞULLAR OLDUĞU GİBİ GERİ GÖNDERİLİYOR. Yalnız metni yollasaydık
       * sunucu eksik alanları varsayılana çeker ve mesajın saat/pencere
       * koşulları sessizce SİLİNİRDİ.
       */
      const m = duzenlenen;
      await api.acilisMesajKaydet(m.code, {
        grup: m.grup,
        etiket: m.etiket,
        metin: { tr: form.tr.trim(), kk: form.kk.trim(), ru: form.ru.trim() },
        active: m.active,
        sira: m.sira,
        ...(m.saatBas !== null && m.saatSon !== null ? { saat: [m.saatBas, m.saatSon] } : {}),
        ...(m.haftaSonu ? { haftaSonu: true as const } : {}),
        ...(m.gunler.length > 0 ? { gunler: m.gunler } : {}),
        ...(m.pencereBasAy !== null &&
        m.pencereBasGun !== null &&
        m.pencereSonAy !== null &&
        m.pencereSonGun !== null
          ? {
              pencere: {
                bas: [m.pencereBasAy, m.pencereBasGun],
                son: [m.pencereSonAy, m.pencereSonGun],
              },
            }
          : {}),
        ...(m.oncelikliOzelGun ? { oncelikliOzelGun: true as const } : {}),
        ...(m.adGerekli ? { adGerekli: true as const } : {}),
        ...(m.dogumGunu ? { dogumGunu: true as const } : {}),
        ...(m.davranis ? { davranis: m.davranis } : {}),
      });
      setDuzenlenen(null);
      reload();
    } catch (e) {
      setHata(String((e as Error).message));
    }
  };

  const durumDegistir = async (m: AcilisMesajSatiri) => {
    await api.acilisMesajDurum(m.code, !m.active);
    reload();
  };

  const aktar = async () => {
    const r = await api.acilisPaketiAktar();
    setBilgi(`${r.eklenen} mesaj tabloya alındı. Var olan kayıtlara dokunulmadı.`);
    reload();
  };

  return (
    <>
      <h2 className="section-head">Açılış mesajları</h2>
      {!data || data.length === 0 ? (
        <Card className="p-5">
          <div className="max-w-[70ch] text-left leading-relaxed text-ink-2">
            <b className="text-ink">Tablo boş — bu normal.</b>
            <br />
            Uygulama 54 mesajı kendi içinde taşıyor ve internetsiz de çalışıyor. Bu ekran yalnızca
            uzaktan değiştirme katmanı: bir mesajı düzenlemek ya da pasife almak istediğinizde
            paketi tabloya alın.
          </div>
          <button className="btn-sm btn-ok mt-4" onClick={aktar}>
            Paketi tabloya al
          </button>
          {bilgi && <div className="mt-2 text-ax-sm text-ok">{bilgi}</div>}
        </Card>
      ) : (
        <Card>
          {data.map((m) => {
            const r = oranlar.get(m.code);
            return (
              <div key={m.code} className="list-col">
                <div className="name">
                  {m.code} · {m.grup}
                  {m.active ? '' : ' · PASİF'}
                </div>
                <div className="mt-1 text-ax-sm text-ink-2">{m.tr}</div>
                <div className="mt-1.5 text-ax-sm text-ink-3">
                  {/*
                    Gösterimi olmayan mesaja oran YAZILMIYOR. "%0 atlanıyor"
                    deseydik hiç gösterilmemiş bir mesaj en başarılı görünür,
                    ayıklama yanlış mesajı korurdu.
                  */}
                  {r && r.skipOrani !== null
                    ? `${r.gosterim} gösterim · %${Math.round(r.skipOrani * 100)} atlandı`
                    : 'Henüz gösterim verisi yok'}
                </div>
                <div className="mt-2 flex gap-2">
                  <button className="btn-sm" onClick={() => ac(m)}>
                    Düzenle
                  </button>
                  <button className="btn-sm" onClick={() => durumDegistir(m)}>
                    {m.active ? 'Pasife al' : 'Aktif et'}
                  </button>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {duzenlenen && (
        <Card className="mt-3 p-5">
          <h2 className="section-head">{duzenlenen.code} — üç dil zorunlu</h2>
          {(['tr', 'kk', 'ru'] as const).map((d) => (
            <textarea
              key={d}
              className="input full mb-2"
              rows={2}
              placeholder={d.toUpperCase()}
              value={form[d]}
              onChange={(e) => setForm({ ...form, [d]: e.target.value })}
            />
          ))}
          <div className="mt-2 flex gap-2">
            <button className="btn-sm btn-ok" disabled={eksikDil} onClick={kaydet}>
              Kaydet
            </button>
            <button className="btn-sm" onClick={() => setDuzenlenen(null)}>
              Vazgeç
            </button>
          </div>
          {eksikDil && (
            <div className="mt-2 text-ax-sm text-ink-3">
              Üç dil de dolmadan kaydedilemez — eksik dil, o dildeki kullanıcıya boş açılış ekranı
              demek.
            </div>
          )}
          {hata && <div className="mt-2 text-ax-sm text-err">Kaydedilemedi: {hata}</div>}
        </Card>
      )}
    </>
  );
}
