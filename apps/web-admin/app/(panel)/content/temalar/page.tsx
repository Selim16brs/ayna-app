'use client';
import Link from 'next/link';
import { useState } from 'react';
import { PageHead, Toolbar, Card } from '@/app/_components/ui';
import { Gate } from '@/app/_components/Gate';
import { LangTabs, buildI18n, type Lang } from '@/app/_components/LangTabs';
import { useAsync } from '@/app/_lib/useAsync';
import { api, type WeeklyTheme } from '@/app/lib/api';

const BOS_TEMA = {
  title: '',
  prompt: '',
  titleKk: '',
  promptKk: '',
  titleRu: '',
  promptRu: '',
  weekStart: '',
};

/**
 * HAFTALIK W2W TEMASI — "/content/temalar".
 *
 * Blog editörünün en altındaydı: haftanın temasını değiştirmek için tüm
 * yazı listesini ve başvuru kuyruğunu kaydırmak gerekiyordu. Ayrı bir iş,
 * ayrı bir adres.
 *
 * Form girdileri ve dil sekmesi geçici — URL'e taşınmaz, useState kalır.
 */
export default function TemalarSayfasi() {
  const {
    data: themes,
    loading,
    error,
    reload: reloadThemes,
  } = useAsync<WeeklyTheme[]>(() => api.themes(), []);
  const [themeForm, setThemeForm] = useState(BOS_TEMA);
  const [themeLang, setThemeLang] = useState<Lang>('tr');

  // aktif dile göre başlık/soru alan adları
  const thT = (
    themeLang === 'tr' ? 'title' : themeLang === 'kk' ? 'titleKk' : 'titleRu'
  ) as keyof typeof themeForm;
  const thP = (
    themeLang === 'tr' ? 'prompt' : themeLang === 'kk' ? 'promptKk' : 'promptRu'
  ) as keyof typeof themeForm;

  const createTheme = async () => {
    if (themeForm.title.length < 2 || themeForm.prompt.length < 2) return; // tr (kaynak) zorunlu
    await api.createTheme({
      title: themeForm.title,
      prompt: themeForm.prompt,
      weekStart: themeForm.weekStart || new Date().toISOString(),
      i18n: buildI18n({
        title: { kk: themeForm.titleKk, ru: themeForm.titleRu },
        prompt: { kk: themeForm.promptKk, ru: themeForm.promptRu },
      }),
    });
    setThemeForm(BOS_TEMA);
    setThemeLang('tr');
    reloadThemes();
  };

  return (
    <>
      <PageHead
        title="Haftalık W2W teması"
        sub="App'te haftanın sorusu/teması. Tek tema aktif olabilir."
      />
      <Toolbar>
        <Link className="btn-sm" href="/content">
          ← Yazı listesi
        </Link>
      </Toolbar>
      <Card className="mb-5">
        <div className="form-inline">
          <LangTabs
            lang={themeLang}
            setLang={setThemeLang}
            filled={(l) =>
              l === 'kk'
                ? !!themeForm.titleKk || !!themeForm.promptKk
                : !!themeForm.titleRu || !!themeForm.promptRu
            }
          />
          <input
            className="input"
            placeholder={
              themeLang === 'tr'
                ? 'Tema başlığı (TR — kaynak)'
                : `Tema başlığı (${themeLang.toUpperCase()})`
            }
            value={themeForm[thT]}
            onChange={(e) => setThemeForm({ ...themeForm, [thT]: e.target.value })}
          />
          <input
            className="input full"
            placeholder={
              themeLang === 'tr'
                ? 'Soru / yönlendirme metni'
                : `Soru / yönlendirme (${themeLang.toUpperCase()})`
            }
            value={themeForm[thP]}
            onChange={(e) => setThemeForm({ ...themeForm, [thP]: e.target.value })}
          />
          <input
            className="input"
            type="date"
            value={themeForm.weekStart}
            onChange={(e) => setThemeForm({ ...themeForm, weekStart: e.target.value })}
          />
          <button className="btn-sm btn-ok" onClick={createTheme}>
            + Tema ekle
          </button>
        </div>
      </Card>
      {!themes ? (
        <Gate loading={loading} error={error} onRetry={reloadThemes} />
      ) : (
        <Card>
          {themes.length === 0 ? (
            <div className="empty">Tema yok</div>
          ) : (
            themes.map((th) => (
              <div key={th.id} className="list-row">
                <div className="grow">
                  <div className="name">{th.title}</div>
                  <div className="meta">
                    {th.prompt} · {new Date(th.weekStart).toLocaleDateString('tr-TR')}
                  </div>
                </div>
                {th.active ? (
                  <span className="switch on">Aktif</span>
                ) : (
                  <button
                    className="btn-sm"
                    onClick={async () => {
                      await api.activateTheme(th.id);
                      reloadThemes();
                    }}
                  >
                    Aktifleştir
                  </button>
                )}
              </div>
            ))
          )}
        </Card>
      )}
    </>
  );
}
