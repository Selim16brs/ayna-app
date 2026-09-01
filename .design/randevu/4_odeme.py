# -*- coding: utf-8 -*-
from _kabuk import yaz, geri, cizelge, nabiz, avatar

# ── 6. ÖDEME EL SIKIŞMASI — §4.9 ────────────────────────────────────────
yaz('Odeme.dc.html', f"""
<div class="screen">
{geri('Randevum')}
<div class="main">
  <div class="card" style="flex-direction:row;align-items:center;gap:12px;padding:12px 16px">
    {avatar('A')}
    <div class="grow"><div class="t-title">Aigerim Nurlanova</div>
      <div class="t-cap soft">Hizmet tamamlandı · 16:28</div></div>
    <div class="badge b-bekleme">Ödeme bekleniyor</div>
  </div>

  <div class="card">
{cizelge(5)}
  </div>

  <div class="card" style="gap:10px">
    <div class="t-label">Kalan ödeme</div>
    <div class="row" style="align-items:baseline;gap:10px;padding-top:2px">
      <div class="t-h1 num">20.700 ₸</div>
      <div class="t-cap soft">doğrudan uzmana</div>
    </div>
    <div class="divider"></div>
    <div class="between" style="padding-top:2px">
      <div class="t-cap soft">Randevuda ödenen depozito</div>
      <div class="t-cap num" style="color:var(--success)">2.300 ₸ ✓</div></div>
    <div class="t-cap soft" style="padding-top:2px">Bu tutar uygulama dışında, uzmanın Kaspi
      hesabına ödenir. AYNA bu ödemeye taraf değildir.</div>
  </div>

  <div class="card" style="background:var(--accentSoft);box-shadow:none;gap:10px">
    <div class="t-label" style="color:var(--accent)">Nasıl işliyor</div>
    <div class="row" style="gap:10px;align-items:flex-start">
      <div style="width:20px;height:20px;border-radius:999px;background:var(--accent);
        color:var(--onAccent);font-size:11px;font-weight:600;display:flex;align-items:center;
        justify-content:center;flex:none;margin-top:2px">1</div>
      <div class="t-cap grow" style="color:var(--inkSoft)">Ödemeyi yaparsın ve
        <b style="font-weight:600">“Ödemeyi yaptım”</b> dersin.</div>
    </div>
    <div class="row" style="gap:10px;align-items:flex-start">
      <div style="width:20px;height:20px;border-radius:999px;background:var(--surface);
        border:1px solid var(--lineStrong);color:var(--muted);font-size:11px;font-weight:600;
        display:flex;align-items:center;justify-content:center;flex:none;margin-top:2px">2</div>
      <div class="t-cap grow" style="color:var(--inkSoft)">Uzman <b style="font-weight:600">“Ödemeyi
        aldım”</b> der; randevu tamamlanır ve puanın yüklenir.</div>
    </div>
  </div>

  <div style="flex:1;min-height:8px"></div>
  <button class="cta">Ödemeyi yaptım</button>
  <div class="t-cap soft" style="text-align:center;padding:2px 12px 0">
    Uzman 24 saat içinde yanıtlamazsa randevu otomatik tamamlanır.</div>
</div>
</div>
""")

# ── 7. TAMAMLANDI + DEĞERLENDİRME — §4.11 / §4.12 ──────────────────────
yildiz = lambda dolu: (
    '<svg class="ico" width="34" height="34" viewBox="0 0 24 24" '
    + ('fill="#905E1D" stroke="#905E1D"' if dolu else 'fill="none" stroke="#E8D5DD"')
    + ' stroke-width="1.5" stroke-linejoin="round"><path d="M12 3.4l2.6 5.4 5.9.8-4.3 4.2 1 5.9'
      '-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8z"/></svg>'
)

yaz('Tamamlandi.dc.html', f"""
<div class="screen">
{geri('Değerlendir')}
<div class="main">

  <div class="card" style="align-items:center;gap:10px;padding:24px 16px;
    background:linear-gradient(180deg,#FFFFFF 0%,#FDF7F9 100%)">
    <div style="width:64px;height:64px;border-radius:999px;background:var(--successSoft);
      display:flex;align-items:center;justify-content:center">
      <svg class="ico" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#4E6D5E"
        stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>
    </div>
    <div class="t-h2">Randevun tamamlandı</div>
    <div class="row" style="gap:8px;padding-top:2px">
      <div class="badge b-olumlu num" style="height:30px;padding:0 12px;font-size:14px">
        +230 puan kazandın</div>
    </div>
    <div class="t-cap soft" style="text-align:center;padding:0 8px">
      Hizmet bedelinin %1’i hesabına yüklendi. 12 ay geçerli.</div>
  </div>

  <div class="card" style="align-items:center;gap:12px;padding:20px 16px">
    <div class="t-title">Aigerim’i nasıl buldun?</div>
    <div class="row" style="gap:10px">
      {yildiz(True)}{yildiz(True)}{yildiz(True)}{yildiz(True)}{yildiz(True)}
    </div>
    <div class="t-cap soft">Değerlendirmen isimsiz görünür.</div>
  </div>

  <div class="card" style="gap:10px">
    <div class="t-label">Deneyimin</div>
    <div class="t-body" style="color:var(--inkSoft);padding:2px 0 6px">
      Rengi tam istediğim gibi çıktı, saatinde başladı. Salon çok temizdi.</div>
    <div class="row" style="gap:8px;flex-wrap:wrap">
      <div class="badge b-notr" style="background:var(--accentSoft);color:var(--accent)">Dakik</div>
      <div class="badge b-notr" style="background:var(--accentSoft);color:var(--accent)">Temiz</div>
      <div class="badge b-notr">Güler yüzlü</div>
      <div class="badge b-notr">Uygun fiyat</div>
    </div>
  </div>

  <div class="card" style="flex-direction:row;align-items:flex-start;gap:12px">
    <svg class="ico" width="22" height="22" viewBox="0 0 24 24" fill="none" style="margin-top:1px">
      <rect x="3.9" y="3.9" width="16.2" height="16.2" rx="5.2" stroke="#E8D5DD" stroke-width="1.8"/></svg>
    <div class="grow">
      <div class="t-bodys">Bu deneyimi W2W’da paylaş</div>
      <div class="t-cap soft">Yorumun isimsiz olarak Çemberde görünür. Karar senin — kapalıyken
        hiçbir şey paylaşılmaz.</div>
    </div>
  </div>

  <div style="flex:1;min-height:8px"></div>
  <button class="cta">Değerlendirmeyi gönder</button>
  <div class="t-cap soft" style="text-align:center;padding:2px 12px 0">
    Değerlendirme penceresi 7 gün açık. Uzmanın profiline 1 gün sonra yansır.</div>
</div>
</div>
""")
print('2 ekran daha')
