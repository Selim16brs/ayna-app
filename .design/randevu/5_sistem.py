# -*- coding: utf-8 -*-
from _kabuk import yaz, cizelge

DURUMLAR = [
    ('Taslak', 'notr'), ('Uzman onayı bekleniyor', 'bekleme'),
    ('Değişiklik önerildi', 'bekleme'), ('Karşı öneri gönderildi', 'bekleme'),
    ('Depozito bekleniyor', 'bekleme'), ('Kesinleşti', 'olumlu'),
    ('Erteleme önerildi', 'bekleme'), ('Randevu günü', 'olumlu'),
    ('Ödeme bekleniyor', 'bekleme'), ('Tamamlandı', 'olumlu'),
    ('Değerlendirme açık', 'olumlu'), ('Kapandı', 'notr'),
    ('İptal edildi', 'notr'), ('Uzman iptal etti', 'notr'),
    ('Süre doldu', 'notr'), ('Gelmedi', 'tehlike'),
    ('Uzman gelmedi', 'tehlike'), ('Uyuşmazlık', 'tehlike'),
]

rozetler = '\n'.join(
    f'    <div class="badge b-{ton}">{ad}</div>' for ad, ton in DURUMLAR
)

TONLAR = [
    ('Bekleme', 'bekleme', '#905E1D', '#FAF2E6', 'Top karşı tarafta. Kehribar bekler, acele ettirmez.'),
    ('Olumlu', 'olumlu', '#4E6D5E', '#E1EDE6', 'İlerledi. Adaçayı onaylar.'),
    ('Tehlike', 'tehlike', '#A93E4D', '#F7E4E7', 'Müdahale gerekir. Mercan yalnız burada.'),
    ('Nötr', 'notr', '#6F666C', '#F5E6EB', 'Kapandı. Renk çekilir, olay biter.'),
]
ton_satir = '\n'.join(f"""    <div class="row" style="gap:12px;align-items:flex-start">
      <div style="width:44px;height:44px;border-radius:14px;background:{soft};flex:none;
        display:flex;align-items:center;justify-content:center">
        <div style="width:14px;height:14px;border-radius:999px;background:{renk}"></div></div>
      <div class="grow"><div class="t-bodys">{ad}</div>
        <div class="t-cap soft">{aciklama}</div></div>
    </div>""" for ad, k, renk, soft, aciklama in TONLAR)

yaz('DurumSistemi.dc.html', f"""
<div style="width:840px;background:var(--bg);padding:40px;display:flex;
  flex-direction:column;gap:28px">

  <div class="col" style="gap:6px">
    <div class="t-label">AYNA · Randevu</div>
    <div class="t-h1">Durum sistemi</div>
    <div class="t-body soft" style="max-width:560px">Akışın 18 durumu. Renk bir şey söylemek
      zorunda: dört ton, dört farklı anlam. Aynı kart iki rolde de aynı görünür —
      yalnız düğmeler değişir.</div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px">

    <div class="card" style="gap:14px;padding:20px">
      <div class="t-label">Durum rozetleri</div>
      <div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-start">
{rozetler}
      </div>
    </div>

    <div class="card" style="gap:16px;padding:20px">
      <div class="t-label">Ton anlamları</div>
{ton_satir}
    </div>

    <div class="card" style="gap:14px;padding:20px">
      <div class="t-label">Zaman çizelgesi</div>
      <div class="t-cap soft">Kargo takibi mantığı: nerede olduğunu değil, ne kaldığını söyler.</div>
      <div style="padding-top:6px">
{cizelge(3)}
      </div>
    </div>

    <div class="col" style="gap:20px">
      <div class="card" style="gap:14px;padding:20px">
        <div class="t-label">Bekleme nabzı</div>
        <div class="t-cap soft">Rozet durağan bir etikettir; kullanıcı bir şeyin işlediğinden emin
          olamaz. Nabız “sistem çalışıyor, sıra sende değil” der. Cihazda hareket azaltma açıksa
          sabit nokta çizilir.</div>
        <div class="col" style="gap:12px;padding-top:4px">
          <div class="pulse" style="color:var(--gold)">
            <div class="pulse-wrap"><div class="pulse-ring"></div><div class="pulse-dot"></div></div>
            <div class="t-cap soft">Uzmanın yanıtı bekleniyor</div></div>
          <div class="pulse" style="color:var(--sage)">
            <div class="pulse-wrap"><div class="pulse-ring"></div><div class="pulse-dot"></div></div>
            <div class="t-cap soft">Randevu saatini bekliyorsun</div></div>
        </div>
      </div>

      <div class="card" style="gap:12px;padding:20px">
        <div class="t-label">Tek birincil buton</div>
        <div class="t-cap soft">Kartta her an yalnızca BİR ana aksiyon vardır. İkincil eylemler
          asla aynı ağırlıkta çizilmez.</div>
        <button class="cta" style="margin-top:4px">Onayla</button>
        <button class="btn2">Farklı saat öner</button>
        <div class="btn-quiet">Randevuyu iptal et</div>
      </div>
    </div>

  </div>

  <div class="card" style="padding:20px;gap:10px;background:var(--accentSoft);box-shadow:none">
    <div class="t-label" style="color:var(--accent)">Tipografi ve renk</div>
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;padding-top:4px">
      <div class="col" style="gap:2px"><div class="t-h1">Onest</div>
        <div class="t-cap soft">400 · 500 · 600<br>Tek aile, ikinci gövde fontu yok</div></div>
      <div class="col" style="gap:6px">
        <div style="height:36px;border-radius:12px;background:linear-gradient(135deg,#6B3465,#5A2A55)"></div>
        <div class="t-micro soft">Mürdüm · CTA<br>#5A2A55</div></div>
      <div class="col" style="gap:6px">
        <div style="height:36px;border-radius:12px;background:#FBF8F6;border:1px solid var(--lineStrong)"></div>
        <div class="t-micro soft">Porselen · zemin<br>#FBF8F6</div></div>
      <div class="col" style="gap:6px">
        <div style="height:36px;border-radius:12px;background:#D97798"></div>
        <div class="t-micro soft">Gül · koyu temada eylem<br>#D97798</div></div>
    </div>
  </div>

</div>
""")
print('DurumSistemi.dc.html yazıldı')
