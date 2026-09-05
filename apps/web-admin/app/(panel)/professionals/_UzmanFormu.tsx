'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card, F } from '@/app/_components/ui';
import { useAsync } from '@/app/_lib/useAsync';
import { api, type Category, type Pro, type ProInput } from '@/app/lib/api';

/**
 * UZMAN FORMU — /professionals/yeni ve /professionals/guncelle ortak gövdesi.
 *
 * Bölme öncesi tek bir ProfessionalsView vardı ve "yeni uzman" ile "uzmanı
 * düzenle" arasındaki fark bir `edit` state'iydi: form bir modal içinde
 * açılıyordu, URL değişmiyordu, sayfa yenilenince düzenlenen kayıt
 * kayboluyordu. Artık ayrım rotada:
 *
 *   mevcut = null  →  /professionals/yeni             (createProfessional)
 *   mevcut = uzman →  /professionals/guncelle?id=X    (updateProfessional)
 *
 * Form gövdesi ikisinde de birebir aynı olduğu için burada tek yerde duruyor.
 * Alt çizgiyle başlayan dosya App Router'da rota üretmez.
 */

/** Boş form — "yeni uzman" bu değerlerle açılır (kaynaktaki EMPTY_PRO). */
const EMPTY_PRO: ProInput = {
  name: '',
  sector: 'hair',
  specialty: '',
  kind: 'salon',
  district: '',
  about: '',
  experienceYears: 0,
  priceFrom: 0,
  imageUrl: '',
};

/** Mevcut kaydı forma çevirir (eski "Düzenle" düğmesinin doldurduğu alanlar). */
function formaCevir(p: Pro): ProInput {
  return {
    name: p.name,
    sector: p.sector,
    specialty: p.specialty,
    kind: p.kind,
    district: p.district,
    about: p.about,
    experienceYears: p.experienceYears,
    priceFrom: p.priceFrom,
    imageUrl: p.imageUrl,
  };
}

export function UzmanFormu({ mevcut }: { mevcut?: Pro | null }) {
  const router = useRouter();
  const editId = mevcut?.id ?? null;
  // Sektör listesi katalogdan gelir; iki rotada da aynı seçenekler.
  const { data: cats } = useAsync<Category[]>(() => api.categories(), []);
  // Form girdileri geçici — URL'e taşınmaz, state kalır.
  const [form, setForm] = useState<ProInput>(() =>
    mevcut ? formaCevir(mevcut) : { ...EMPTY_PRO },
  );

  const save = async () => {
    if (!form.name || form.name.length < 2 || !form.sector) return;
    // Boş opsiyonel alanları gönderme (imageUrl .url() doğrulaması boş string'i reddeder)
    const payload: ProInput = { ...form };
    if (!payload.imageUrl) delete payload.imageUrl;
    if (!payload.specialty) delete payload.specialty;
    if (!payload.district) delete payload.district;
    if (!payload.about) delete payload.about;
    if (editId) await api.updateProfessional(editId, payload);
    else await api.createProfessional(payload);
    // Eski modal `setEdit(null)` ile kapanıp listeyi tazeliyordu; form artık
    // kendi rotasında olduğu için kaydedince listeye dönüyoruz.
    router.push('/professionals');
  };

  return (
    <Card className="mb-5">
      <div className="form-inline">
        <F label="Ad *">
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </F>
        <F label="Sektör *">
          <select
            className="input"
            value={form.sector}
            onChange={(e) => setForm({ ...form, sector: e.target.value })}
          >
            {(cats ?? []).map((c) => (
              <option key={c.id} value={c.code}>
                {c.nameTr} ({c.code})
              </option>
            ))}
          </select>
        </F>
        <F label="Uzmanlık">
          <input
            className="input"
            value={form.specialty ?? ''}
            onChange={(e) => setForm({ ...form, specialty: e.target.value })}
          />
        </F>
        <F label="Tür">
          <select
            className="input"
            value={form.kind ?? 'salon'}
            onChange={(e) => setForm({ ...form, kind: e.target.value })}
          >
            <option value="salon">Salon</option>
            <option value="independent">Bağımsız uzman</option>
          </select>
        </F>
        <F label="İlçe/Bölge">
          <input
            className="input"
            value={form.district ?? ''}
            onChange={(e) => setForm({ ...form, district: e.target.value })}
          />
        </F>
        <F label="Başlangıç fiyatı (KZT)">
          <input
            className="input"
            type="number"
            value={form.priceFrom ?? 0}
            onChange={(e) => setForm({ ...form, priceFrom: Number(e.target.value) })}
          />
        </F>
        <F label="Deneyim (yıl)">
          <input
            className="input"
            type="number"
            value={form.experienceYears ?? 0}
            onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) })}
          />
        </F>
        <F label="Görsel URL">
          <input
            className="input"
            value={form.imageUrl ?? ''}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          />
        </F>
        <F label="Hakkında" full>
          <input
            className="input"
            value={form.about ?? ''}
            onChange={(e) => setForm({ ...form, about: e.target.value })}
          />
        </F>
        <button className="btn-sm btn-ok full" onClick={save}>
          {editId ? 'Kaydet' : 'Uzman ekle'}
        </button>
        {/* Modalın "Kapat" düğmesinin yerini alan çıkış: listeye dön. */}
        <Link className="btn-sm" href="/professionals">
          Vazgeç
        </Link>
      </div>
    </Card>
  );
}
