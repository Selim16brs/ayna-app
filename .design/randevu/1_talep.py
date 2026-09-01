# -*- coding: utf-8 -*-
from _kabuk import yaz, geri, avatar, takvim


# §4.1.2 — uzmanın SEÇİLEN GÜNDEKİ tam takvimi.
# 'dar' = boş ama arkasındaki dolu bloğa 150 dk sığmıyor; dokunulamaz olduğu
# görünür ama gizlenmez — gizlemek kullanıcıyı "neden yok?" diye düşündürürdü.
SLOTLAR = [
    ('09:00', 'bos'),  ('09:30', 'bos'),  ('10:00', 'bos'),  ('10:30', 'dar'),
    ('11:00', 'dolu'), ('11:30', 'dolu'), ('12:00', 'dolu'), ('12:30', 'dar'),
    ('13:00', 'dar'),  ('13:30', 'dar'),  ('14:00', 'secili'), ('14:30', 'bos'),
    ('15:00', 'bos'),  ('15:30', 'dar'),  ('16:00', 'dolu'), ('16:30', 'dolu'),
    ('17:00', 'bos'),  ('17:30', 'bos'),  ('18:00', 'dar'),  ('18:30', 'dar'),
]

HIZMETLER = [
    ('Saç kesimi', 60, 8000, True),
    ('Saç boyama', 90, 15000, True),
    ('Fön', 30, 4000, False),
]

def kutu(secili: bool) -> str:
    if secili:
        return ('<svg class="ico" width="22" height="22" viewBox="0 0 24 24" fill="none">'
                '<rect x="3" y="3" width="18" height="18" rx="6" fill="#5A2A55"/>'
                '<path d="M8 12.3l2.6 2.6L16 9.5" stroke="#FBF8F6" stroke-width="2" '
                'stroke-linecap="round" stroke-linejoin="round"/></svg>')
    return ('<svg class="ico" width="22" height="22" viewBox="0 0 24 24" fill="none">'
            '<rect x="3.9" y="3.9" width="16.2" height="16.2" rx="5.2" stroke="#E8D5DD" '
            'stroke-width="1.8"/></svg>')

satirlar = []
for i, (ad, dk, fiyat, sec) in enumerate(HIZMETLER):
    ust = '' if i == 0 else 'border-top:1px solid var(--line);'
    satirlar.append(f"""  <div class="row" style="{ust}padding:12px 0;min-height:44px">
    {kutu(sec)}
    <div class="grow"><div class="t-body">{ad}</div>
      <div class="t-cap soft num">{dk} dk</div></div>
    <div class="t-bodys num">{fiyat:,} ₸</div>
  </div>""".replace(',', '.'))

secili = [h for h in HIZMETLER if h[3]]
toplam_sure = sum(h[1] for h in secili)
toplam = sum(h[2] for h in secili)
ozet = '\n'.join(
    f'  <div class="between"><div class="t-body grow" style="min-width:0;'
    f'overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{ad}</div>'
    f'<div class="t-body num">{f"{fiyat:,}".replace(",", ".")} ₸</div></div>'
    for ad, dk, fiyat, sec in secili
)

GOVDE = f"""
<div class="screen">
{geri('Randevu al')}
<div class="main">

  <div class="card" style="flex-direction:row;align-items:center;gap:12px;padding:12px 16px">
    {avatar('A')}
    <div class="grow"><div class="t-title">Aigerim Nurlanova</div>
      <div class="t-cap soft">Saç &amp; Renk · Almatı, Bostandık</div></div>
    <svg class="ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#905E1D"
      stroke-width="1.6"><path d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4
      5.7-.8z" stroke-linejoin="round"/></svg>
    <div class="t-caps num" style="margin-left:-4px">4,9</div>
  </div>

  <div class="t-label" style="padding:4px 4px 0">Hizmetler</div>
  <div class="card" style="padding:4px 16px">
{chr(10).join(satirlar)}
  </div>

  <div class="t-label" style="padding:4px 4px 0">Tarih ve saat</div>
  <div class="card" style="padding:14px 16px;gap:0">
    <div class="between" style="padding-bottom:12px">
      <div class="row" style="gap:10px">
        <svg class="ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A2A55"
          stroke-width="1.6" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15"
          rx="4"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>
        <div class="t-bodys num">12 Eylül Cuma</div>
      </div>
      <div class="row" style="gap:4px;color:var(--accent)">
        <svg class="ico" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>
        <svg class="ico" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>
      </div>
    </div>
    <div class="divider" style="margin-bottom:12px"></div>
    <div class="between" style="padding-bottom:10px">
      <div class="t-cap soft">Aigerim’in bu günkü takvimi</div>
      <div class="t-micro num" style="color:var(--accent)">150 dk gerekiyor</div>
    </div>
    {takvim(SLOTLAR, 150)}
    <div class="divider" style="margin:14px 0 10px"></div>
    <div class="row" style="gap:10px">
      <svg class="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4E6D5E"
        stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>
      <div class="t-caps grow num" style="color:var(--success)">14:00 – 16:30 seçildi</div>
    </div>
  </div>

  <div class="t-label" style="padding:4px 4px 0">Özet</div>
  <div class="card">
{ozet}
    <div class="hr"></div>
    <div class="between"><div class="t-cap soft">Toplam süre</div>
      <div class="t-body num">{toplam_sure} dk</div></div>
    <div class="between"><div class="t-bodys">Toplam tutar</div>
      <div class="t-h2 num">{f"{toplam:,}".replace(",", ".")} ₸</div></div>
  </div>

  <div style="background:var(--accentSoft);border-radius:26px;padding:16px;
    display:flex;flex-direction:column;gap:10px">
    <div class="row" style="gap:8px">
      <svg class="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5A2A55"
        stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l7.5 3v6c0 4.6-3.1 8-7.5 9.4C7.6
        20 4.5 16.6 4.5 12V6z"/><path d="M9 12.2l2.2 2.2L15.4 10" stroke-linecap="round"/></svg>
      <div class="t-label" style="color:var(--accent)">Ödeme ve iptal</div>
    </div>
    <div class="t-cap" style="color:var(--inkSoft)">Şimdi <b style="font-weight:600">2.300 ₸</b>
      depozito ödersin — toplam tutarın %10’u. Kalan <span class="num">20.700 ₸</span> hizmetten
      sonra doğrudan uzmana.</div>
    <div class="t-cap" style="color:var(--inkSoft)">Randevuya 3 saatten az kala iptal edersen
      depozito iade edilmez.</div>
  </div>

  <div style="height:4px"></div>
  <button class="cta">Talebi gönder</button>
  <div class="t-cap soft" style="text-align:center;padding:2px 12px 0">
    Uzmanın yanıtlaması için 3 saati var. Saatin bu süre boyunca senin için kilitli.</div>

</div>
</div>
"""
yaz('Main.dc.html', GOVDE)
print('Main.dc.html yazıldı')
