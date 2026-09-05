'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useAsync } from '@/app/_lib/useAsync';
import { exportCsv } from '@/app/_lib/ortak';
import { useDiyalog } from '@/app/ui/Diyalog';
import { api, type AdminUser } from '@/app/lib/api';

// Rol kodları → Türkçe etiket. Kısıtlı hesaplar ekranıyla aynı sözlük;
// bölme sonrası her rota kendi kopyasını taşıyor.
const ROLE_TR: Record<string, string> = {
  user: 'Kullanıcı',
  professional: 'Uzman',
  salon: 'Salon',
  moderator: 'Moderatör',
  admin: 'Admin',
};

// Rol filtresinin kaynaktaki varsayılanı. URL'de `rol` yoksa bu geçerli,
// bu değer seçilince de parametre yazılmaz — adres gereksiz uzamasın.
const VARSAYILAN_ROL = 'all';

/**
 * ÜYELER.
 *
 * Rol filtresi `?rol=`, arama kutusu `?ara=` sorgusuna taşındı: sayfa
 * yenilenince "Hepsi"ne geri dönmüyor ve "Almatı'daki uzmanlar" gibi bir
 * görünüm link olarak paylaşılabiliyor. Adres `replace` ile yazılıyor —
 * her harf geri tuşuna bir adım eklemesin.
 *
 * Form içerikleri (parola, düzenleme diyaloğu) URL'e TAŞINMAZ.
 */
function Uyeler() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { onayla, formAl, bildir } = useDiyalog();
  const { data, reload } = useAsync<AdminUser[]>(() => api.users(), []);
  const q = params.get('ara') ?? '';
  const role = params.get('rol') ?? VARSAYILAN_ROL;
  // Tek yazıcı: iki filtre de aynı sorgu dizesini güncelliyor ki biri
  // diğerini silmesin (rol seçince arama kaybolmasın).
  const setParam = (ad: 'ara' | 'rol', deger: string, varsayilan: string) => {
    const p = new URLSearchParams(params.toString());
    if (!deger || deger === varsayilan) p.delete(ad);
    else p.set(ad, deger);
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const list = (data ?? []).filter(
    (u) =>
      (role === 'all' || u.role === role) &&
      (!q ||
        u.name.toLowerCase().includes(q.toLowerCase()) ||
        (u.email ?? '').toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <>
      <h1 className="page-title">Üyeler</h1>
      <p className="page-sub">
        Uygulamaya kayıtlı herkes — kullanıcı, uzman, salon. Üyelik seviyesi + parola yönetimi (
        {data?.length ?? 0} kayıt)
      </p>
      <div className="toolbar">
        {['all', 'user', 'salon', 'professional', 'moderator', 'admin'].map((r) => (
          <button
            key={r}
            className={`chip ${role === r ? 'on' : ''}`}
            onClick={() => setParam('rol', r, VARSAYILAN_ROL)}
          >
            {r === 'all' ? 'Hepsi' : ROLE_TR[r]}
          </button>
        ))}
        <input
          className="input"
          style={{ height: 34, maxWidth: 220 }}
          placeholder="Ara (isim / e-posta)"
          value={q}
          onChange={(e) => setParam('ara', e.target.value, '')}
        />
        <button
          className="btn-sm"
          onClick={() =>
            exportCsv(
              'ayna-uyeler.csv',
              list.map((u) => ({
                isim: u.name,
                rol: u.role,
                sehir: u.city ?? '',
                eposta: u.email ?? '',
                uyelik: u.membershipTier ?? 'free',
                durum: u.status,
              })),
            )
          }
        >
          ⬇ Excel
        </button>
      </div>
      <div className="card">
        {list.length === 0 ? (
          <div className="empty">Kullanıcı yok</div>
        ) : (
          list.map((u) => (
            <div key={u.id} className="list-row">
              <div className="grow">
                <div className="name">
                  {u.name || '—'}
                  {u.membershipTier === 'platinum'
                    ? ' · 💎'
                    : u.membershipTier === 'premium' || u.isPremium
                      ? ' · ⭐'
                      : ''}
                  {u.status !== 'active' ? ' · ⛔' : ''}
                </div>
                <div className="meta">
                  {u.email ?? '—'} · {u.city ?? '—'}
                  {u.phoneVerified ? ' · ✓ telefon' : ''}
                  {u.adminApproved ? ' · ✓ elle onaylı' : ''}
                  {u.gender === 'female' ? ' · Kadın' : ''}
                </div>
                {/*
                  RANDEVU KAPISI. Doğrulanmamış ve onaylanmamış müşteri
                  randevu VEREMİYOR: numarası doğrulanmamış bir hesap için
                  uzman hazırlanıp bekliyor, gelen olmuyor ve ulaşılacak
                  numara da yok.
                */}
                {u.role === 'user' && !u.phoneVerified && !u.adminApproved ? (
                  <div className="meta" style={{ color: 'var(--danger)' }}>
                    Randevu veremez — telefonu doğrulanmamış
                  </div>
                ) : null}
              </div>
              {u.role === 'user' && !u.phoneVerified ? (
                <button
                  className={`btn-sm ${u.adminApproved ? 'btn-ghost' : 'btn-ok'}`}
                  onClick={async () => {
                    await api.setUserApproved(u.id, !u.adminApproved);
                    reload();
                  }}
                  title="Telefon doğrulamasının alternatifi: SMS ulaşmayan gerçek müşteri için."
                >
                  {u.adminApproved ? 'Onayı kaldır' : 'Onayla'}
                </button>
              ) : null}
              <select
                className="input"
                style={{ height: 32, maxWidth: 130 }}
                value={u.role}
                onChange={async (e) => {
                  await api.setUserRole(u.id, e.target.value);
                  reload();
                }}
              >
                {['user', 'salon', 'professional', 'moderator', 'admin'].map((r) => (
                  <option key={r} value={r}>
                    {ROLE_TR[r]}
                  </option>
                ))}
              </select>
              <TierEditor user={u} onSaved={reload} />
              {/* §12.2 — kimlik bilgisi düzenleme. Panelde yalnız rol/durum/parola
                  değiştirilebiliyordu; e-postası bozulan bir üyeye dokunmanın yolu
                  veritabanına doğrudan bağlanmaktı. */}
              <button
                className="btn-sm"
                onClick={async () => {
                  /*
                   * TEK FORM — eskiden ARKA ARKAYA DÖRT tarayıcı penceresi
                   * açılıyordu (ad, e-posta, şehir, telefon). Üçüncüde
                   * vazgeçen kişi ilk ikisini de kaybediyordu ve hangi üyeyi
                   * düzenlediği ekranda görünmüyordu.
                   */
                  // Mevcut numara AYRI bir uçtan okunuyor: liste bilerek
                  // telefonsuz. Körlemesine düzenlemek yanlış hesabı
                  // düzeltmeye kapı bırakırdı.
                  let mevcutTel = '';
                  try {
                    mevcutTel = (await api.userPhone(u.id)).phone;
                  } catch {
                    // Okunamazsa akış durmasın; boş bırakılırsa dokunulmuyor.
                  }
                  const v = await formAl({
                    baslik: `${u.name || 'Üye'} — bilgileri düzenle`,
                    alanlar: [
                      { ad: 'name', etiket: 'Ad', deger: u.name ?? '', zorunlu: true },
                      {
                        ad: 'email',
                        etiket: 'E-posta',
                        deger: u.email ?? '',
                        tur: 'email',
                        not: 'Boş bırakırsan e-posta silinir.',
                      },
                      { ad: 'city', etiket: 'Şehir', deger: u.city ?? '' },
                      {
                        ad: 'phone',
                        etiket: 'Telefon',
                        deger: mevcutTel,
                        tur: 'tel',
                        // Telefon giriş kimliği; boşaltmak hesabı girişsiz
                        // bırakırdı, o yüzden silme yok — dokunmama var.
                        not: 'Değiştirmezsen dokunulmaz. Değiştirirsen numara "doğrulanmamış" olarak işaretlenir.',
                      },
                    ],
                  });
                  if (!v) return;
                  try {
                    await api.setUserProfile(u.id, {
                      name: (v.name ?? '').trim(),
                      email: (v.email ?? '').trim(),
                      city: (v.city ?? '').trim(),
                      ...((v.phone ?? '').trim() && (v.phone ?? '').trim() !== mevcutTel
                        ? { phone: (v.phone ?? '').trim() }
                        : {}),
                    });
                    bildir('Üye bilgileri güncellendi.');
                    reload();
                  } catch (e) {
                    // Sunucu e-posta/telefon çakışmasını REDDEDER; sessizce
                    // ezmek o hesabı girişsiz bırakırdı. Sebebi göster.
                    bildir(e instanceof Error ? e.message : 'Kaydedilemedi', true);
                  }
                }}
              >
                Düzenle
              </button>
              <button
                className="btn-sm"
                onClick={async () => {
                  const v = await formAl({
                    baslik: `${u.name || 'Üye'} — yeni parola`,
                    mesaj: 'Üye bir sonraki girişinde bu parolayı kullanacak.',
                    alanlar: [
                      {
                        ad: 'pw',
                        etiket: 'Yeni parola',
                        tur: 'password',
                        zorunlu: true,
                        not: 'En az 6 karakter.',
                      },
                    ],
                    onayEtiket: 'Parolayı değiştir',
                  });
                  if (!v) return;
                  if ((v.pw ?? '').trim().length < 6) {
                    bildir('Parola en az 6 karakter olmalı.', true);
                    return;
                  }
                  await api.setUserPassword(u.id, (v.pw ?? '').trim());
                  bildir('Parola güncellendi.');
                }}
              >
                Şifre
              </button>
              {u.status === 'active' && u.role !== 'admin' && (
                <button
                  className="btn-sm"
                  onClick={async () => {
                    const v = await formAl({
                      baslik: `${u.name || 'Üye'} — kısıtla`,
                      mesaj: 'Hesap 7 gün sayaçlı kısıtlı moda alınır.',
                      alanlar: [
                        {
                          ad: 'reason',
                          etiket: 'Gerekçe',
                          tur: 'uzun',
                          zorunlu: true,
                          not: 'Denetim kaydına yazılır.',
                        },
                      ],
                      onayEtiket: 'Kısıtla',
                    });
                    if (!v?.reason?.trim()) return;
                    await api.restrictUser(u.id, v.reason.trim());
                    bildir('Üye kısıtlandı.');
                    reload();
                  }}
                >
                  Kısıtla
                </button>
              )}
              {u.status === 'active' ? (
                <button
                  className="btn-sm btn-danger"
                  onClick={async () => {
                    if (u.role === 'admin') return bildir('Yönetici hesabı askıya alınamaz.', true);
                    if (
                      await onayla({
                        baslik: 'Üyeyi askıya al',
                        mesaj: `${u.name || 'Kullanıcı'} askıya alınacak; giriş yapamayacak.`,
                        onayEtiket: 'Askıya al',
                        tehlikeli: true,
                      })
                    ) {
                      await api.setUserStatus(u.id, 'suspended');
                      reload();
                    }
                  }}
                >
                  Askıya al
                </button>
              ) : (
                <button
                  className="btn-sm btn-ok"
                  onClick={async () => {
                    await api.setUserStatus(u.id, 'active');
                    reload();
                  }}
                >
                  Aktifleştir
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}

// §11 — Üyelik seviyesi düzenleyici: seç → "Kaydet" → anında backend'e işlenir (app senkronda yansıtır).
// Kullanıcı/salon/uzman (hepsi User) için aynı bileşen. onChange değil; kasıtlı Kaydet butonu.
// Yalnız Üyeler listesinin içinde kullanılır — ayrı rotası yok, bu yüzden burada duruyor.
function TierEditor({ user, onSaved }: { user: AdminUser; onSaved: () => void }) {
  const current: 'free' | 'premium' | 'platinum' =
    user.membershipTier ?? (user.isPremium ? 'premium' : 'free');
  const [tier, setTier] = useState<'free' | 'premium' | 'platinum'>(current);
  const [saving, setSaving] = useState(false);
  // reload sonrası (kaydedilen değer gelince) seçimi güncel değere çek → "kirli" durum sıfırlanır
  useEffect(() => setTier(current), [current]);
  const dirty = tier !== current;
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <select
        className="input"
        style={{ height: 32, maxWidth: 120 }}
        value={tier}
        onChange={(e) => setTier(e.target.value as 'free' | 'premium' | 'platinum')}
      >
        <option value="free">Normal</option>
        <option value="premium">Premium</option>
        <option value="platinum">Platinum</option>
      </select>
      <button
        className="btn-sm"
        disabled={!dirty || saving}
        style={{ opacity: dirty && !saving ? 1 : 0.5, fontWeight: 700 }}
        onClick={async () => {
          setSaving(true);
          try {
            await api.setUserTier(user.id, tier);
            onSaved();
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? '…' : 'Kaydet'}
      </button>
    </div>
  );
}

export default function UsersPage() {
  // useSearchParams istemci tarafında çözülür; Next bu sınırda Suspense ister.
  return (
    <Suspense fallback={<div className="empty">Yükleniyor…</div>}>
      <Uyeler />
    </Suspense>
  );
}
