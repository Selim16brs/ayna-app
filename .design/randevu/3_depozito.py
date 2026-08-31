# -*- coding: utf-8 -*-
from _kabuk import yaz, geri, cizelge, nabiz, avatar

# ── 4. DEPOZİTO — §4.4 ──────────────────────────────────────────────────
yaz('Depozito.dc.html', f"""
<div class="screen">
{geri('Depozito öde')}
<div class="main">

  <div class="card urgent" style="gap:10px">
    <div class="row" style="gap:10px">
      <svg class="ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A93E4D"
        stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="8.4"/>
        <path d="M12 7.6V12l3 1.8"/></svg>
      <div class="t-caps grow" style="color:var(--danger)">Randevunu korumak için öde</div>
    </div>
    <div class="row" style="align-items:baseline;gap:10px">
      <div class="clock" style="color:var(--danger)">09:32</div>
      <div class="t-cap soft">içinde ödemezsen randevu düşer</div>
    </div>
    <div style="height:4px;border-radius:999px;background:var(--dangerSoft);overflow:hidden">
      <div style="width:95%;height:100%;background:var(--danger);border-radius:999px"></div>
    </div>
  </div>

  <div class="card">
    <div class="between" style="align-items:flex-start">
      <div class="col" style="gap:2px">
        <div class="t-cap soft">Ödenecek tutar</div>
        <div class="t-h1 num">1.150 ₸</div>
      </div>
      <div class="col" style="gap:2px;align-items:flex-end">
        <div class="t-cap soft" style="text-decoration:line-through">2.300 ₸</div>
        <div class="badge b-olumlu">1.150 puan indirildi</div>
      </div>
    </div>
    <div class="t-cap soft" style="padding-top:2px">Toplam 23.000 ₸ hizmet bedelinin %10’u</div>
  </div>

  <div class="card" style="flex-direction:row;align-items:flex-start;gap:12px">
    <svg class="ico" width="22" height="22" viewBox="0 0 24 24" fill="none" style="margin-top:1px">
      <rect x="3" y="3" width="18" height="18" rx="6" fill="#5A2A55"/>
      <path d="M8 12.3l2.6 2.6L16 9.5" stroke="#FBF8F6" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"/></svg>
    <div class="grow">
      <div class="t-bodys">1.150 puan kullan</div>
      <div class="t-cap soft">Biriken puanının en fazla %25’i kullanılabilir (1 puan = 1 ₸).</div>
    </div>
  </div>

  <div class="card">
    <div class="t-label">Ödeme yapılacak hesap</div>
    <div class="between" style="padding-top:6px">
      <div class="t-body" style="letter-spacing:.2px">SES INVEST TOO</div>
      <div class="row" style="gap:6px;color:var(--accent)">
        <svg class="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1.7"><rect x="9" y="9" width="11" height="11" rx="3"/>
          <path d="M15 6H6.5A2.5 2.5 0 004 8.5V17" stroke-linecap="round"/></svg>
        <div class="t-caps">Kopyala</div>
      </div>
    </div>
    <div class="t-cap soft">Banka ya da Kaspi ile transfer et, sonra dekontu yükle.</div>
  </div>

  <div style="border:1.5px dashed var(--lineStrong);border-radius:26px;padding:24px 16px;
    display:flex;flex-direction:column;align-items:center;gap:8px;background:var(--surface)">
    <svg class="ico" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#6F666C"
      stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 15.5V17a3 3 0 003 3h10a3 3 0 003-3v-1.5"/><path d="M12 15V4"/>
      <path d="M8 7.5L12 3.6 16 7.5"/></svg>
    <div class="t-body soft">Dekont yükle</div>
  </div>

  <div style="flex:1;min-height:4px"></div>
  <button class="cta">Dekontu gönder</button>
  <div class="t-cap soft" style="text-align:center;padding:2px 8px 0">
    Dekontu yüklediğin an randevun kesinleşir. Uzmanın onayını beklemene gerek yok.</div>
</div>
</div>
""")

# ── 5. KESİNLEŞTİ — §4.5 ────────────────────────────────────────────────
yaz('Kesinlesti.dc.html', f"""
<div class="screen">
{geri('Randevum')}
<div class="main">
  <div class="card" style="flex-direction:row;align-items:center;gap:12px;padding:12px 16px">
    {avatar('A')}
    <div class="grow"><div class="t-title">Aigerim Nurlanova</div>
      <div class="t-cap soft num">12 Eylül Cuma · 14:00–16:30</div></div>
    <div class="badge b-olumlu">
      <svg class="ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>
      Kesinleşti</div>
  </div>

  <div class="card" style="background:var(--successSoft);box-shadow:none;gap:8px">
    <div class="row" style="gap:10px">
      <svg class="ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4E6D5E"
        stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3l7.5 3v6c0 4.6-3.1 8-7.5 9.4C7.6 20 4.5 16.6 4.5 12V6z"/>
        <path d="M9 12.2l2.2 2.2L15.4 10"/></svg>
      <div class="t-caps grow" style="color:var(--success)">Depozito alındı</div>
    </div>
    <div class="t-cap" style="color:var(--inkSoft)">Randevun garanti altında. Doğrulama sonradan
      yapılır — senin yapman gereken bir şey yok.</div>
  </div>

  <div class="card">
{cizelge(3)}
    <div style="margin-top:4px">{nabiz('Randevu saatini bekliyorsun', 'var(--sage)')}</div>
  </div>

  <div class="card">
    <div class="between"><div class="t-cap soft">Ödendi · depozito</div>
      <div class="t-bodys num" style="color:var(--success)">2.300 ₸</div></div>
    <div class="between"><div class="t-cap">Hizmetten sonra uzmana</div>
      <div class="t-bodys num">20.700 ₸</div></div>
    <div class="hr"></div>
    <div class="t-cap soft">Kalan tutarı hizmet bittikten sonra doğrudan uzmana ödersin.</div>
  </div>

  <div class="card" style="gap:10px">
    <div class="t-label">Hatırlatmalar</div>
    <div class="row" style="gap:10px">
      <svg class="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#905E1D"
        stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.4"/><path d="M12 7.6V12l3 1.8"/></svg>
      <div class="t-cap grow" style="color:var(--inkSoft)">3 saat kala — ücretsiz iptal için son şans</div>
    </div>
    <div class="row" style="gap:10px">
      <svg class="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6F666C"
        stroke-width="1.8" stroke-linecap="round"><path d="M5.5 18.5h13M7.5 18.5v-6a4.5 4.5 0 019 0v6"/>
        <path d="M12 4.2v1.6"/></svg>
      <div class="t-cap grow" style="color:var(--inkSoft)">1 saat ve 30 dakika kala hatırlatma</div>
    </div>
  </div>

  <div style="flex:1;min-height:8px"></div>
  <button class="btn2">Ertele</button>
  <div class="btn-quiet">
    <svg class="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6F666C"
      stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="8.6"/>
      <path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6"/></svg>
    Randevuyu iptal et</div>
</div>
</div>
""")
print('2 ekran daha')
