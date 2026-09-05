'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Card, Loading, SectionTitle, Stat } from '@/app/_components/ui';
import { useAsync } from '@/app/_lib/useAsync';
import { TL, exportCsv } from '@/app/_lib/ortak';
import { useDiyalog } from '@/app/ui/Diyalog';
import { api, type Commissions } from '@/app/lib/api';

/**
 * KOMİSYONLAR — /commissions
 *
 * BÖLME NOTU: bu ekranın ortasında ayrı bir bölüm olarak <RandevuKuyruklari />
 * çiziliyordu; dekont/iade/uzlaşma işleri komisyon tablolarının arasında
 * kayboluyordu. Artık kendi rotasında (/commissions/kuyruklar), buradan da
 * bir bağlantıyla açılıyor. Geri kalan her şey kaynaktaki gibi.
 *
 * URL'e taşınmayanlar: `rateInput` (form girdisi) ve `busy` (kayıt kilidi).
 */
export default function KomisyonlarSayfasi() {
  const { formAl, bildir } = useDiyalog();
  const { data, loading, reload } = useAsync<Commissions>(() => api.commissions(), []);
  const [rateInput, setRateInput] = useState('');
  const [busy, setBusy] = useState(false);
  const saveRate = async () => {
    const v = parseInt(rateInput, 10);
    if (!Number.isFinite(v) || v < 0 || v > 100) return;
    setBusy(true);
    try {
      await api.setCommissionRate(v);
      setRateInput('');
      reload();
    } finally {
      setBusy(false);
    }
  };
  const stateLabel = (s: string) =>
    s === 'earned' ? 'Kazanıldı' : s === 'pending' ? 'Bekliyor' : 'İptal/Gelmedi';
  const statePill = (s: string) =>
    s === 'earned' ? 'approved' : s === 'pending' ? 'pending' : 'rejected';
  return (
    <>
      <div className="mb-6">
        <h1 className="flex flex-wrap items-center gap-2 text-ax-2xl font-extrabold leading-tight tracking-[-0.7px] text-ink">
          Komisyonlar{' '}
          {data ? (
            <button
              className="btn-sm"
              onClick={() =>
                exportCsv(
                  'ayna-komisyon.csv',
                  data.salons.map((r) => ({
                    uzman_salon: r.proName,
                    randevu: r.count,
                    ciro: r.gmv,
                    komisyon: r.earned,
                    bekleyen: r.pending,
                    tahsil: r.collected,
                    kalan: r.outstanding,
                  })),
                )
              }
            >
              ⬇ Excel
            </button>
          ) : null}
        </h1>
        <p className="mt-1 max-w-[70ch] text-ax-md leading-relaxed text-ink-3">
          App üzerinden alınan online randevulardan platform komisyonu (offline salon kayıtları
          hariç)
        </p>
      </div>
      {loading || !data ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat v={TL(data.totals.earned)} l="Kazanılan komisyon" />
            <Stat v={TL(data.totals.collected)} l="Tahsil edilen" />
            <Stat v={TL(data.totals.outstanding)} l="Açık alacak" />
            <Stat v={`%${data.rate}`} l={`Oran · ${data.totals.count} online randevu`} />
          </div>
          <SectionTitle>Komisyon oranı</SectionTitle>
          <Card>
            <div className="list-row">
              <div className="grow">
                <div className="name">Güncel oran: %{data.rate}</div>
                <div className="meta">
                  Her online randevu tutarının %{data.rate}'i platforma kalır (GMV:{' '}
                  {TL(data.totals.gmv)})
                </div>
              </div>
              <input
                className="input h-[34px] w-[90px]"
                type="number"
                min={0}
                max={100}
                placeholder={String(data.rate)}
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
              />
              <button className="btn-sm btn-ok" onClick={saveRate} disabled={busy || !rateInput}>
                Kaydet
              </button>
            </div>
          </Card>
          <SectionTitle>Salon bazında — alacak & tahsilat</SectionTitle>
          <Card>
            {data.salons.length === 0 ? (
              <Loading label="Online randevu yok" />
            ) : (
              data.salons.map((s) => (
                <div key={s.proId || s.proName} className="list-row">
                  <div className="grow">
                    <div className="name">{s.proName}</div>
                    <div className="meta">
                      Kazanılan {TL(s.earned)} · Tahsil {TL(s.collected)}
                      {s.pending > 0 ? ` · +${TL(s.pending)} bekleyen randevu` : ''}
                    </div>
                  </div>
                  {s.outstanding > 0 ? (
                    <span className="pill rejected">{TL(s.outstanding)} alacak</span>
                  ) : s.earned > 0 ? (
                    <span className="pill approved">Tahsil edildi</span>
                  ) : (
                    <span className="pill bg-line text-ink-3">Alacak yok</span>
                  )}
                  {s.outstanding > 0 ? (
                    <button
                      className="btn-sm btn-ok"
                      onClick={async () => {
                        const v = await formAl({
                          baslik: `${s.proName} — tahsilat`,
                          mesaj: `Ödenmemiş komisyon: ${s.outstanding.toLocaleString('tr-TR')} ₸`,
                          alanlar: [
                            {
                              ad: 'tutar',
                              etiket: 'Tahsil edilecek tutar (₸)',
                              tur: 'number',
                              deger: String(s.outstanding),
                              zorunlu: true,
                            },
                          ],
                          onayEtiket: 'Tahsilatı kaydet',
                        });
                        if (!v) return;
                        const amount = Number(v.tutar);
                        // Para kaydı: geçersiz tutar sessizce yazılmamalı.
                        if (!Number.isFinite(amount) || amount <= 0) {
                          bildir('Tutar geçerli bir sayı olmalı.', true);
                          return;
                        }
                        await api.addPayout({
                          proId: s.proId || s.proName,
                          proName: s.proName,
                          amount,
                        });
                        reload();
                      }}
                    >
                      Tahsil et
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </Card>
          {data.payouts.length > 0 ? (
            <>
              <SectionTitle>Tahsilat geçmişi</SectionTitle>
              <Card>
                {data.payouts.map((p) => (
                  <div key={p.id} className="list-row">
                    <div className="grow">
                      <div className="name">{p.proName}</div>
                      <div className="meta">
                        {new Date(p.createdAt).toLocaleDateString('tr-TR')}
                        {p.note ? ` · ${p.note}` : ''}
                      </div>
                    </div>
                    <div className="kv-v text-ok">{TL(p.amount)}</div>
                  </div>
                ))}
              </Card>
            </>
          ) : null}
          {/* Eskiden burada <RandevuKuyruklari /> gömülüydü — artık kendi rotasında. */}
          <SectionTitle>Randevu kuyrukları</SectionTitle>
          <Card>
            <div className="list-row">
              <div className="grow">
                <div className="name">Dekont doğrulama · İadeler · Uzlaşma</div>
                <div className="meta">
                  Randevu ödemelerinin elle işlenen kuyrukları ayrı sayfada
                </div>
              </div>
              <Link className="btn-sm" href="/commissions/kuyruklar">
                Kuyrukları aç
              </Link>
            </div>
          </Card>
          <SectionTitle>Randevu kayıtları ({data.items.length})</SectionTitle>
          <Card>
            {data.items.length === 0 ? (
              <Loading label="Kayıt yok" />
            ) : (
              data.items.map((it) => (
                <div key={it.id} className="list-row">
                  <div className="grow">
                    <div className="name">
                      {it.proName} · {it.service}
                    </div>
                    <div className="meta">
                      {it.dateLabel} · Tutar {TL(it.price)}
                    </div>
                  </div>
                  <div className="kv-v">{TL(it.commission)}</div>
                  <span className={`pill ${statePill(it.state)}`}>{stateLabel(it.state)}</span>
                </div>
              ))
            )}
          </Card>
        </>
      )}
    </>
  );
}
