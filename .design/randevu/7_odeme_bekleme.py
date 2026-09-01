# -*- coding: utf-8 -*-
from _kabuk import yaz, geri, cizelge, bekleme_karti, avatar

# §4.9 adım 2→3 arası: müşteri "Ödemeyi yaptım" dedi, uzmanın teyidi bekleniyor.
# Paranın el değiştirdiği an — beklemenin en çok hissedilmesi gereken yer.
yaz('OdemeOnay.dc.html', f"""
<div class="screen">
{geri('Randevum')}
<div class="main">
  <div class="card" style="flex-direction:row;align-items:center;gap:12px;padding:12px 16px">
    {avatar('A')}
    <div class="grow"><div class="t-title">Aigerim Nurlanova</div>
      <div class="t-cap soft">Hizmet tamamlandı · 16:28</div></div>
    <div class="badge b-bekleme">Ödeme bekleniyor</div>
  </div>

{bekleme_karti('Uzmanın ödeme onayı bekleniyor',
               'Aigerim “Ödemeyi aldım” dediği an randevun tamamlanır ve puanın yüklenir. '
               '24 saat içinde yanıt gelmezse otomatik onaylanır.', 'var(--accent)')}

  <div class="card">
    <div class="t-label">Ödeme el sıkışması</div>
    <div class="col" style="gap:12px;padding-top:8px">
      <div class="row" style="gap:10px;align-items:flex-start">
        <div style="width:20px;height:20px;border-radius:999px;background:var(--success);
          display:flex;align-items:center;justify-content:center;flex:none;margin-top:2px">
          <svg class="ico" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FBF8F6"
            stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>
        </div>
        <div class="grow"><div class="t-caps">Ödemeyi yaptım</div>
          <div class="t-cap soft num">20.700 ₸ · 16:31’de bildirdin</div></div>
      </div>
      <div class="row" style="gap:10px;align-items:flex-start">
        <div style="width:20px;height:20px;border-radius:999px;background:var(--surface);
          border:2px solid var(--accent);flex:none;margin-top:2px;display:flex;
          align-items:center;justify-content:center">
          <span style="width:6px;height:6px;border-radius:999px;background:var(--accent);
            animation:nefes 1.6s ease-in-out infinite alternate"></span>
        </div>
        <div class="grow"><div class="t-caps" style="color:var(--accent)">Ödemeyi aldım</div>
          <div class="t-cap soft">Uzmanın onayı bekleniyor</div></div>
      </div>
    </div>
  </div>

  <div class="card">
{cizelge(5)}
  </div>

  <div class="card" style="background:var(--sunken);box-shadow:none;gap:8px">
    <div class="t-cap" style="color:var(--inkSoft)">Uzman “ödeme gelmedi” derse randevu
      uyuşmazlıkta kapanır. AYNA bu ödemede hakem değildir — %90’lık kısım doğrudan iki taraf
      arasındadır.</div>
  </div>

  <div style="flex:1;min-height:8px"></div>
  <div class="btn-quiet">Sorun mu var? Destek</div>
</div>
</div>
""")
print('OdemeOnay.dc.html yazıldı')
