# -*- coding: utf-8 -*-
from _kabuk import yaz, geri, bekleme_karti

SAYAC = """  <div class="card urgent" style="gap:10px">
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
  </div>"""

TUTAR = """  <div class="card">
    <div class="between" style="align-items:flex-start">
      <div class="col" style="gap:2px">
        <div class="t-cap soft">Ödenecek tutar</div>
        <div class="t-h1 num">1.150 ₸</div>
      </div>
      <div class="col" style="gap:2px;align-items:flex-end">
        <div class="t-cap soft num" style="text-decoration:line-through">2.300 ₸</div>
        <div class="badge b-olumlu num">1.150 puan indirildi</div>
      </div>
    </div>
    <div class="t-cap soft" style="padding-top:2px">Toplam 23.000 ₸ hizmet bedelinin %10’u</div>
  </div>"""

# Kaspi'ye gidecek bilgilerin ÖNİZLEMESİ — kullanıcı uygulamadan çıkmadan
# neyin dolacağını görür. Referans kodu otomatik eşleşmenin anahtarı.
ONIZLEME = """  <div class="card" style="gap:0;padding:0;overflow:hidden">
    <div style="padding:14px 16px 12px;background:var(--accentSoft)">
      <div class="row" style="gap:8px">
        <svg class="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5A2A55"
          stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 4h4a2 2 0 012 2v4"/><path d="M20 4l-8.5 8.5"/>
          <path d="M20 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h4"/></svg>
        <div class="t-label grow" style="color:var(--accent)">Kaspi’de hazır gelecek</div>
      </div>
    </div>
    <div style="padding:14px 16px;display:flex;flex-direction:column;gap:12px">
      <div class="between"><div class="t-cap soft">Alıcı</div>
        <div class="t-bodys">SES INVEST TOO</div></div>
      <div class="divider"></div>
      <div class="between"><div class="t-cap soft">Tutar</div>
        <div class="t-bodys num">1.150 ₸</div></div>
      <div class="divider"></div>
      <div class="between"><div class="t-cap soft">Açıklama</div>
        <div class="t-bodys num" style="letter-spacing:.4px">AYNA-4F7K2</div></div>
    </div>
    <div style="padding:0 16px 14px">
      <div class="t-cap soft">Hiçbir bilgiyi elle yazmıyorsun. Açıklamadaki kod ödemeni bu
        randevuyla eşleştirir.</div>
    </div>
  </div>"""

# ── 4. DEPOZİTO — Kaspi ile tek dokunuş ─────────────────────────────────
yaz('Depozito.dc.html', f"""
<div class="screen">
{geri('Depozito öde')}
<div class="main">

{SAYAC}

{TUTAR}

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

{ONIZLEME}

  <div style="height:2px"></div>
  <button class="cta" style="gap:10px">
    <svg class="ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 4h6v6"/><path d="M20 4l-9 9"/>
      <path d="M19 14.5V18a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 013 18V7a2.5 2.5 0 012.5-2.5H9"/></svg>
    Kaspi ile öde · 1.150 ₸
  </button>
  <div class="t-cap soft" style="text-align:center;padding:2px 12px 0">
    Kaspi uygulaması açılır, tutar ve alıcı dolu gelir. Ödedikten sonra buraya dönersin.</div>

  <div class="row" style="gap:12px;padding:6px 4px 0">
    <div class="divider grow"></div>
    <div class="t-micro soft">veya elle transfer</div>
    <div class="divider grow"></div>
  </div>

  <div class="card" style="gap:10px">
    <div class="between">
      <div class="col" style="gap:2px">
        <div class="t-cap soft">Alıcı hesap</div>
        <div class="t-body">SES INVEST TOO</div>
      </div>
      <div class="row" style="gap:6px;color:var(--accent)">
        <svg class="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1.7"><rect x="9" y="9" width="11" height="11" rx="3"/>
          <path d="M15 6H6.5A2.5 2.5 0 004 8.5V17" stroke-linecap="round"/></svg>
        <div class="t-caps">Kopyala</div>
      </div>
    </div>
    <div class="divider"></div>
    <div class="t-cap soft">Banka ile gönderirsen açıklamaya
      <b class="num" style="font-weight:600;color:var(--inkSoft)">AYNA-4F7K2</b> yaz ve dönüşte
      dekontu yükle.</div>
  </div>

</div>
</div>
""")

# ── 4b. KASPİ'DEN DÖNÜŞ — ödeme doğrulanıyor ────────────────────────────
yaz('KaspiDonus.dc.html', f"""
<div class="screen">
{geri('Depozito öde')}
<div class="main">

  <div class="card" style="align-items:center;gap:10px;padding:22px 16px;
    background:linear-gradient(180deg,#FFFFFF 0%,#FDF7F9 100%)">
    <div style="width:56px;height:56px;border-radius:999px;background:var(--accentSoft);
      display:flex;align-items:center;justify-content:center">
      <svg class="ico" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#5A2A55"
        stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 4h6v6"/><path d="M20 4l-9 9"/>
        <path d="M19 14.5V18a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 013 18V7a2.5 2.5 0 012.5-2.5H9"/></svg>
    </div>
    <div class="t-h2">Kaspi’ye yönlendirildin</div>
    <div class="t-cap soft" style="text-align:center;padding:0 12px">
      SES INVEST TOO · <span class="num">1.150 ₸</span> · <span class="num">AYNA-4F7K2</span></div>
  </div>

{bekleme_karti('Ödemen doğrulanıyor',
               'Kaspi’den onay geldiği an randevun kesinleşir. Bu ekranda beklemene gerek yok — '
               'bildirim göndereceğiz.', 'var(--accent)')}

  <div class="card" style="background:var(--sunken);box-shadow:none;gap:8px">
    <div class="row" style="gap:10px">
      <svg class="ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#905E1D"
        stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="8.4"/>
        <path d="M12 7.6V12l3 1.8"/></svg>
      <div class="t-caps grow" style="color:var(--gold)">Sayaç durdu</div>
    </div>
    <div class="t-cap" style="color:var(--inkSoft)">Ödemeye başladığın an 10 dakikalık süre
      donduruldu. Doğrulama beklerken randevun düşmez.</div>
  </div>

  <div style="flex:1;min-height:8px"></div>
  <button class="btn2">Dekontu elle yükle</button>
  <div class="t-cap soft" style="text-align:center;padding:2px 12px 0">
    Kaspi’de ödeme yapmadıysan geri dönüp tekrar deneyebilirsin.</div>
</div>
</div>
""")
print('Kaspi ekranları yazıldı')
