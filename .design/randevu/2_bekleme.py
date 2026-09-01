# -*- coding: utf-8 -*-
from _kabuk import yaz, geri, cizelge, nabiz, avatar, bekleme_karti

BASLIK = """  <div class="card" style="flex-direction:row;align-items:center;gap:12px;padding:12px 16px">
    {av}
    <div class="grow"><div class="t-title">{ad}</div>
      <div class="t-cap soft num">{alt}</div></div>
    <div class="badge {ton}">{rozet}</div>
  </div>"""


def ust(ad, alt, ton, rozet, harf='A'):
    return BASLIK.format(av=avatar(harf), ad=ad, alt=alt, ton=ton, rozet=rozet)


PARA = """  <div class="card">
    <div class="between"><div class="t-cap soft">Toplam hizmet bedeli</div>
      <div class="t-bodys num">23.000 ₸</div></div>
    <div class="divider" style="margin:8px 0"></div>
    <div class="between"><div class="t-cap">Depozito (%10)</div>
      <div class="t-bodys num" style="color:{d_renk}">{d_metin}</div></div>
    <div class="between"><div class="t-cap">Hizmetten sonra uzmana</div>
      <div class="t-bodys num">20.700 ₸</div></div>
  </div>"""

# ── 2. ONAY BEKLİYOR (müşteri) — §4.2 ───────────────────────────────────
yaz('OnayBekliyor.dc.html', f"""
<div class="screen">
{geri('Randevum')}
<div class="main">
{ust('Aigerim Nurlanova', 'Saç kesimi + Saç boyama · 12 Eylül, 14:00', 'b-bekleme', 'Uzman onayı bekleniyor')}

  <div class="card">
    <div class="row" style="gap:10px;padding-bottom:2px">
      <svg class="ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#905E1D"
        stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="8.4"/>
        <path d="M12 7.6V12l3 1.8"/></svg>
      <div class="t-caps" style="color:var(--gold)">Uzmanın yanıt süresi</div>
      <div class="grow"></div>
      <div class="t-h2 num" style="color:var(--gold)">2:14:08</div>
    </div>
    <div class="t-cap soft">Süre dolarsa talep düşer ve saat serbest kalır — bir şey yapman
      gerekmez, haber veririz.</div>
  </div>

{bekleme_karti('Uzmanın yanıtı bekleniyor',
               'Aigerim talebini gördü. Yanıtladığı an bildirim göndereceğiz — '
               'bu ekranı açık tutmana gerek yok.')}

  <div class="card">
{cizelge(1)}
  </div>

{PARA.format(d_renk='var(--ink)', d_metin='2.300 ₸')}

  <div class="card" style="background:var(--sunken);box-shadow:none">
    <div class="row" style="gap:10px">
      <svg class="ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A2A55"
        stroke-width="1.7" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="4"/>
        <path d="M8 3v4M16 3v4M3.5 10h17"/></svg>
      <div class="t-caps grow" style="color:var(--accent)">Saatin senin için kilitli</div>
    </div>
    <div class="t-cap" style="color:var(--inkSoft)">Talebi gönderdiğin an 12 Eylül 14:00
      kapandı. Bu saati başka kimse talep edemez.</div>
  </div>

  <div style="flex:1;min-height:8px"></div>
  <div class="btn-quiet">
    <svg class="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6F666C"
      stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="8.6"/>
      <path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6"/></svg>
    Randevuyu iptal et
  </div>
</div>
</div>
""")

# ── 3. UZMAN AYNASI — §4.3 ──────────────────────────────────────────────
yaz('UzmanOnay.dc.html', f"""
<div class="screen">
{geri('Gelen talep')}
<div class="main">
{ust('Dana K.', 'Yeni müşteri · 2 randevu geçmişi', 'b-bekleme', 'Yanıtın bekleniyor', 'D')}

  <div class="card urgent">
    <div class="row" style="gap:10px;padding-bottom:2px">
      <svg class="ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A93E4D"
        stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="8.4"/>
        <path d="M12 7.6V12l3 1.8"/></svg>
      <div class="t-caps" style="color:var(--danger)">Yanıt için kalan süre</div>
      <div class="grow"></div>
      <div class="t-h2 num" style="color:var(--danger)">0:41:22</div>
    </div>
    <div class="t-cap soft">Yanıtsız kalan talepler kalite puanına işler.</div>
  </div>

  <div class="card">
    <div class="t-label">Talep edilen</div>
    <div class="between" style="padding-top:4px"><div class="t-body">Saç kesimi</div>
      <div class="t-body num">8.000 ₸</div></div>
    <div class="between"><div class="t-body">Saç boyama</div>
      <div class="t-body num">15.000 ₸</div></div>
    <div class="hr"></div>
    <div class="between"><div class="t-cap soft">12 Eylül Cuma · 14:00–16:30</div>
      <div class="t-bodys num">23.000 ₸</div></div>
  </div>

  <div class="card">
{cizelge(1)}
  </div>

{bekleme_karti('Müşteri yanıtını bekliyor',
               'Dana bu saati senin için tutuyor; sen yanıtlayana kadar başka '
               'kimse talep edemiyor.', 'var(--rose)')}

  <div style="flex:1;min-height:8px"></div>
  <button class="cta">Onayla</button>
  <button class="btn2">Farklı saat öner</button>
  <div class="btn-quiet">Reddet</div>
</div>
</div>
""")
print('2 ekran yazıldı')
