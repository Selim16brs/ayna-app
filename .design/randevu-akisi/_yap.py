import pathlib
DIL = pathlib.Path('_dil.txt').read_text()
def yaz(ad, govde):
    pathlib.Path(f'{ad}.dc.html').write_text(f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
{DIL}
{govde}
</x-dc>
</body>
</html>
""")

def ok(d='left'):
    p = 'M15 18l-6-6 6-6' if d=='left' else 'M9 6l6 6-6 6'
    return (f'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E0E1B" '
            f'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="{p}"/></svg>')

def bas(t):
    return f'<div class="head">{f"<div class=\"back\">{ok()}</div>"}<div class="h1">{t}</div></div>'

def ikon(d, renk='#4A1942', boy=20):
    return (f'<svg width="{boy}" height="{boy}" viewBox="0 0 24 24" fill="none" stroke="{renk}" '
            f'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{d}</svg>')

I = {
 'saat':'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 'takvim':'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 11h18"/>',
 'para':'<path d="M12 3v18M8 7h6a3 3 0 0 1 0 6H8h8"/>',
 'onay':'<path d="M20 6L9 17l-5-5"/>',
 'uyari':'<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
 'yukle':'<path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
 'degis':'<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
 'kart':'<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/>',
}

# ── 1 · SAAT SEÇ (Main) ───────────────────────────────────────────────────
GUNLER = [('Çar','03',False),('Per','04',False),('Cum','05',True),('Cmt','06',False),('Paz','07',False)]
SAATLER = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30',
           '13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30']
DOLU = {'10:30','11:00','14:00','15:30'}
SEC = '15:00'
def saat(s):
    if s in DOLU:
        return ('<div style="padding:12px 0;text-align:center;border-radius:12px;background:var(--line);'
                f'color:var(--muted);font-weight:500;font-size:13px;text-decoration:line-through">{s}</div>')
    if s == SEC:
        return ('<div style="padding:12px 0;text-align:center;border-radius:12px;background:var(--accent);'
                f'color:var(--onAccent);font-weight:600;font-size:13px">{s}</div>')
    return ('<div style="padding:12px 0;text-align:center;border-radius:12px;background:var(--surface);'
            f'border:1px solid var(--line);font-weight:500;font-size:13px">{s}</div>')

saatSec = f'''<div class="screen">
  {bas('Saat seç')}

  <div class="sec">
    <div class="card20" style="display:flex;flex-direction:column;gap:14px">
      <div class="row" style="gap:8px">{ikon(I['takvim'],'#4A1942',18)}<span class="label" style="color:var(--accent)">Tarih</span></div>
      <div style="display:flex;gap:8px">
        {''.join(f'<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:10px 0;border-radius:16px;background:{"var(--accent)" if a else "var(--surface)"};border:1px solid {"var(--accent)" if a else "var(--line)"}"><span class="micro" style="color:{"rgba(255,240,245,.7)" if a else "var(--muted)"}">{g}</span><span class="cardTitle" style="color:{"var(--onAccent)" if a else "var(--ink)"}">{d}</span></div>' for g,d,a in GUNLER)}
      </div>
      <div class="row" style="gap:8px;margin-top:4px">{ikon(I['saat'],'#4A1942',18)}<span class="label" style="color:var(--accent)">Saat</span></div>
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">
        {''.join(saat(s) for s in SAATLER)}
      </div>
      <div class="row" style="gap:16px">
        <span class="micro muted"><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--line);margin-right:5px;vertical-align:-1px"></span>Dolu</span>
        <span class="micro muted"><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--accent);margin-right:5px;vertical-align:-1px"></span>Seçtiğin</span>
      </div>
    </div>
  </div>

  <div class="sec">
    <div class="h2">Hizmetler</div>
    <div class="card20" style="display:flex;flex-direction:column;gap:14px">
      {''.join(f'''<div class="row" style="gap:12px">
        <div style="width:22px;height:22px;border-radius:7px;background:var(--accent);display:flex;align-items:center;justify-content:center">{ikon(I['onay'],'#FFF0F5',13)}</div>
        <div class="grow"><div class="bodyStrong">{n}</div><div class="micro muted">{d} dk</div></div>
        <div class="rowTitle">{p} ₸</div></div>''' for n,d,p in [('Saç boyama (kök)','90','15.000'),('Keratin bakımı','60','6.000')])}
      <div style="height:1px;background:var(--line)"></div>
      <div class="row" style="gap:12px;opacity:.55">
        <div style="width:22px;height:22px;border-radius:7px;border:1.5px solid var(--lineStrong)"></div>
        <div class="grow"><div class="bodyStrong">Saç kesimi</div><div class="micro muted">30 dk</div></div>
        <div class="rowTitle">4.000 ₸</div>
      </div>
    </div>
  </div>

  <div class="sec">
    <div style="border-radius:24px;padding:20px;background:linear-gradient(146deg,var(--accent) 25%,var(--accentDeep) 75%);display:flex;flex-direction:column;gap:14px">
      <div class="label" style="color:rgba(255,240,245,.62)">Özet</div>
      <div class="row" style="justify-content:space-between">
        <span class="body" style="color:#C5A3C7">Cum 05.09 · 15:00</span>
        <span class="bodyStrong" style="color:var(--onAccent)">150 dk</span>
      </div>
      <div style="height:1px;background:rgba(212,160,160,.2)"></div>
      <div class="row" style="justify-content:space-between">
        <span class="body" style="color:#C5A3C7">Toplam tutar</span>
        <span class="big" style="color:var(--onAccent)">21.000 ₸</span>
      </div>
      <div class="row" style="justify-content:space-between">
        <span class="micro" style="color:#C5A3C7">Şimdi ödenecek depozito</span>
        <span class="bodyStrong" style="color:var(--onAccent)">2.100 ₸</span>
      </div>
    </div>
  </div>

  <div class="sec"><div class="btn">Randevuyu onayla</div>
    <div class="micro muted" style="text-align:center">Onaydan sonra depozito için 10 dakikan olur.</div>
  </div>
</div>'''
yaz('Main', saatSec)
print('Main (Saat seç)')

# ── 2 · RANDEVU DETAYI ────────────────────────────────────────────────────
ADIMLAR = [('Talep','ok'),('Onay','ok'),('Depozito','now'),('Kesinleşti',''),
           ('Hizmet',''),('Ödeme',''),('Tamamlandı','')]
def adim(n, d, son):
    if d=='ok':
        yuv = f'<div style="width:22px;height:22px;border-radius:100px;background:var(--success);display:flex;align-items:center;justify-content:center">{ikon(I["onay"],"#FFFFFF",13)}</div>'
        yazi = f'<span class="body">{n}</span>'
    elif d=='now':
        yuv = ('<div style="width:22px;height:22px;border-radius:100px;background:var(--accent);'
               'box-shadow:0 0 0 4px var(--accent07)"></div>')
        yazi = f'<span class="rowTitle">{n}</span>'
    else:
        yuv = '<div style="width:22px;height:22px;border-radius:100px;border:1.5px solid var(--lineStrong)"></div>'
        yazi = f'<span class="body muted">{n}</span>'
    cizgi = '' if son else '<div style="position:absolute;left:10px;top:32px;width:2px;height:10px;background:var(--line)"></div>'
    return f'<div style="position:relative;display:flex;align-items:center;gap:12px;height:42px">{yuv}{yazi}{cizgi}</div>'

detay = f'''<div class="screen">
  {bas('Randevu detayı')}

  <div class="sec">
    <div class="card" style="display:flex;flex-direction:column;gap:10px">
      <div class="row" style="gap:12px">
        <div style="width:52px;height:52px;border-radius:100px;background:var(--accentSoft);flex-shrink:0"></div>
        <div class="grow" style="min-width:0">
          <div class="cardTitle">Gold Hair Lab</div>
          <div class="micro muted">Saç boyama (kök) + Keratin</div>
        </div>
      </div>
      <span class="pill" style="background:var(--goldSoft);color:var(--gold);align-self:flex-start">
        <span style="width:6px;height:6px;border-radius:3px;background:var(--goldFill)"></span>Depozito bekleniyor
      </span>
      <div style="height:1px;background:var(--line)"></div>
      <div class="row" style="gap:8px">{ikon(I['takvim'],'#68536A',16)}<span class="rowTitle">Cum 05.09.2026 · 15:00</span></div>
    </div>
  </div>

  <div class="sec">
    <div class="card20" style="display:flex;flex-direction:column;gap:0">
      {''.join(adim(n,d,i==len(ADIMLAR)-1) for i,(n,d) in enumerate(ADIMLAR))}
    </div>
  </div>

  <div class="sec">
    <div class="card20" style="display:flex;flex-direction:column;gap:12px">
      <div class="row" style="justify-content:space-between">
        <span class="body muted">Depozito</span><span class="rowTitle">2.100 ₸</span>
      </div>
      <div class="row" style="justify-content:space-between">
        <span class="body muted">Hizmetten sonra uzmana</span><span class="rowTitle">18.900 ₸</span>
      </div>
    </div>
  </div>

  <div class="sec">
    <div style="border-radius:20px;padding:16px;background:var(--dangerSoft);border:1px solid var(--danger);display:flex;flex-direction:column;gap:6px">
      <div class="row" style="gap:8px">{ikon(I['uyari'],'#A93E4D',18)}<span class="rowTitle" style="color:var(--danger)">Randevunu korumak için öde</span></div>
      <div class="body"><span style="color:var(--danger);font-weight:600">09:19</span> <span class="muted">içinde ödemezsen randevu düşer</span></div>
    </div>
  </div>

  <div class="sec">
    <div class="btn">Depozito öde</div>
    <div class="btn ghost">Randevuyu ertele</div>
    <div class="micro muted" style="text-align:center;padding-top:4px">⊗ İptal et</div>
  </div>
</div>'''
yaz('RandevuDetayi', detay)

# ── 3 · DEPOZİTO ÖDE ──────────────────────────────────────────────────────
depozito = f'''<div class="screen">
  {bas('Depozito öde')}

  <div class="sec">
    <div style="border-radius:20px;padding:14px 16px;background:var(--dangerSoft);border:1px solid var(--danger);display:flex;align-items:center;gap:10px">
      {ikon(I['saat'],'#A93E4D',18)}
      <div class="body"><span style="color:var(--danger);font-weight:600">09:19</span> <span class="muted">içinde ödemezsen randevu düşer</span></div>
    </div>
  </div>

  <div class="sec">
    <div style="border-radius:24px;padding:20px;background:linear-gradient(146deg,var(--accent) 25%,var(--accentDeep) 75%);display:flex;flex-direction:column;gap:6px">
      <div class="label" style="color:rgba(255,240,245,.62)">Ödenecek tutar</div>
      <div style="font-weight:600;font-size:34px;line-height:40px;color:var(--onAccent)">2.100 ₸</div>
      <div class="micro" style="color:#C5A3C7">Toplam 21.000 ₸ hizmet bedelinin %10'u</div>
    </div>
  </div>

  <div class="sec">
    <div class="card20" style="display:flex;align-items:center;gap:14px">
      <div style="width:22px;height:22px;border-radius:7px;background:var(--accent);display:flex;align-items:center;justify-content:center">{ikon(I['onay'],'#FFF0F5',13)}</div>
      <div class="grow" style="min-width:0">
        <div class="bodyStrong">376 puan kullan</div>
        <div class="micro muted">Biriken puanının en fazla %25'i</div>
      </div>
      <div class="rowTitle" style="color:var(--success);flex-shrink:0">−376 ₸</div>
    </div>
  </div>

  <div class="sec">
    <div class="h2">Kaspi ile öde</div>
    <div class="card20" style="display:flex;flex-direction:column;gap:12px">
      {''.join(f'''<div class="row" style="gap:12px;align-items:flex-start">
        <div style="width:20px;height:20px;border-radius:100px;background:var(--accent07);display:flex;align-items:center;justify-content:center;flex-shrink:0"><span class="microStrong" style="color:var(--accent)">{i}</span></div>
        <div class="body grow">{t}</div></div>''' for i,t in [
          (1,'Alıcı hazır gelir — hesap numarası yazmana gerek yok'),
          (2,'Tutarı elle gir: <b>2.100 ₸</b>'),
          (3,'Açıklamaya ödeme kodunu yaz')])}
    </div>
    <div class="btn">Kaspi ile öde</div>
  </div>

  <div class="sec">
    <div class="card20" style="display:flex;flex-direction:column;gap:10px;border-color:var(--accent15)">
      <div class="label" style="color:var(--accent)">Dekontla birlikte gönderilecek</div>
      <div class="row" style="justify-content:space-between">
        <span class="body muted">Ödeme kodu</span>
        <span class="cardTitle" style="letter-spacing:1.5px">AYNA-2T4K9</span>
      </div>
      <div class="row" style="justify-content:space-between">
        <span class="body muted">Randevu no</span>
        <span class="bodyStrong" style="letter-spacing:1px">bk-f2t4k9a</span>
      </div>
      <div class="micro muted">Kodu Kaspi'de açıklama alanına yaz. Ödemeni bu randevuyla bu kod eşleştiriyor.</div>
    </div>
  </div>

  <div class="sec">
    <div class="card20" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:132px;border-style:dashed;border-color:var(--lineStrong);box-shadow:none">
      {ikon(I['yukle'],'#68536A',26)}
      <div class="body muted">Dekontu yükle</div>
    </div>
    <div class="btn dim">Dekontu gönder</div>
  </div>
</div>'''
yaz('Depozito', depozito)
print('RandevuDetayi + Depozito')

# ── 4 · TALEP GÖNDERİLDİ ──────────────────────────────────────────────────
gonderildi = f'''<div class="screen" style="min-height:760px;justify-content:center;padding-bottom:0">
  <div style="padding:0 24px;display:flex;flex-direction:column;align-items:center;gap:18px">
    <div style="width:96px;height:96px;border-radius:100px;background:var(--successSoft);display:flex;align-items:center;justify-content:center">
      {ikon(I['onay'],'#2F7A4A',42)}
    </div>
    <div style="text-align:center;display:flex;flex-direction:column;gap:8px">
      <div class="h1">Talebin uzmana ulaştı</div>
      <div class="body muted">Uzman onaylayınca depozito adımına geçeceksin.</div>
    </div>

    <div class="card" style="width:100%;display:flex;flex-direction:column;gap:12px;margin-top:4px">
      <div class="row" style="gap:12px">
        <div style="width:48px;height:48px;border-radius:100px;background:var(--accentSoft)"></div>
        <div class="grow">
          <div class="rowTitle">Gold Hair Lab</div>
          <div class="micro muted">Saç boyama (kök) + Keratin</div>
        </div>
      </div>
      <div style="height:1px;background:var(--line)"></div>
      <div class="row" style="justify-content:space-between">
        <span class="body muted">Tarih</span><span class="bodyStrong">Cum 05.09 · 15:00</span>
      </div>
      <div class="row" style="justify-content:space-between">
        <span class="body muted">Uzmanın yanıt süresi</span>
        <span class="bodyStrong" style="color:var(--gold)">3 saat</span>
      </div>
    </div>

    <div style="width:100%;border-radius:20px;padding:14px 16px;background:var(--accent07);display:flex;gap:10px;align-items:flex-start">
      {ikon(I['uyari'],'#4A1942',17)}
      <div class="micro" style="color:var(--accent);flex:1">Salonun adresi onay sonrası açılır. Senin numaran uzmanla paylaşılmaz.</div>
    </div>

    <div class="btn" style="width:100%;margin-top:4px">Randevularıma git</div>
  </div>
</div>'''
yaz('TalepGonderildi', gonderildi)

# ── 5 · ERTELEME ──────────────────────────────────────────────────────────
YENI_GUN = [('Cmt','06',False),('Paz','07',False),('Pzt','08',True),('Sal','09',False),('Çar','10',False)]
erteleme = f'''<div class="screen">
  {bas('Randevuyu ertele')}

  <div class="sec">
    <div class="card20" style="display:flex;flex-direction:column;gap:10px">
      <div class="label muted">Mevcut randevu</div>
      <div class="row" style="gap:12px">
        <div style="width:44px;height:44px;border-radius:100px;background:var(--accentSoft)"></div>
        <div class="grow">
          <div class="rowTitle">Gold Hair Lab</div>
          <div class="micro muted">Cum 05.09.2026 · 15:00</div>
        </div>
      </div>
    </div>
  </div>

  <div class="sec">
    <div class="h2">Yeni tarih ve saat</div>
    <div class="card20" style="display:flex;flex-direction:column;gap:14px">
      <div style="display:flex;gap:8px">
        {''.join(f'<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:10px 0;border-radius:16px;background:{"var(--accent)" if a else "var(--surface)"};border:1px solid {"var(--accent)" if a else "var(--line)"}"><span class="micro" style="color:{"rgba(255,240,245,.7)" if a else "var(--muted)"}">{g}</span><span class="cardTitle" style="color:{"var(--onAccent)" if a else "var(--ink)"}">{d}</span></div>' for g,d,a in YENI_GUN)}
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">
        {''.join(saat(s) for s in SAATLER[:8])}
      </div>
    </div>
  </div>

  <div class="sec">
    <div style="border-radius:20px;padding:16px;background:var(--goldSoft);border:1px solid var(--gold);display:flex;gap:10px;align-items:flex-start">
      {ikon(I['degis'],'#9A5A05',18)}
      <div class="grow">
        <div class="bodyStrong" style="color:var(--gold)">Randevu başına 1 erteleme</div>
        <div class="micro muted" style="margin-top:2px">Uzman kabul ederse yeni saatin geçerli olur; reddederse mevcut saat kalır.</div>
      </div>
    </div>
  </div>

  <div class="sec"><div class="btn">Erteleme talebi gönder</div></div>
</div>'''
yaz('Erteleme', erteleme)

# ── 6 · DEPOZİTO İADESİ ───────────────────────────────────────────────────
iade = f'''<div class="screen">
  {bas('Depozito iadesi')}

  <div class="sec">
    <div style="border-radius:24px;padding:20px;background:linear-gradient(146deg,var(--accent) 25%,var(--accentDeep) 75%);display:flex;flex-direction:column;gap:6px">
      <div class="label" style="color:rgba(255,240,245,.62)">İade edilecek tutar</div>
      <div style="font-weight:600;font-size:34px;line-height:40px;color:var(--onAccent)">2.100 ₸</div>
      <div class="micro" style="color:#C5A3C7">İade 1 iş günü içinde yapılır.</div>
    </div>
  </div>

  <div class="sec">
    <div class="h2">İade yapılacak hesap</div>
    <div class="card20" style="display:flex;flex-direction:column;gap:12px">
      <div class="row" style="gap:10px;padding:14px;border-radius:16px;border:1px solid var(--lineStrong)">
        {ikon(I['kart'],'#68536A',18)}
        <span class="body muted grow">Kaspi numarası veya IBAN</span>
      </div>
      <div class="row" style="gap:8px;align-items:flex-start">
        {ikon(I['uyari'],'#68536A',15)}
        <div class="micro muted grow">Bu bilgi yalnız iadeyi yapan ekiple paylaşılır; uzmana ya da salona gitmez.</div>
      </div>
    </div>
  </div>

  <div class="sec"><div class="btn">İade talebi gönder</div></div>
</div>'''
yaz('DepozitoIadesi', iade)
print('TalepGonderildi + Erteleme + DepozitoIadesi')
