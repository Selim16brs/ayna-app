import pathlib, sys
ORTAK = pathlib.Path('_ortak.txt').read_text()
def yaz(ad, govde):
    p = pathlib.Path(f'{ad}.dc.html')
    p.write_text(f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
{ORTAK}
{govde}
</x-dc>
</body>
</html>
""")
    return p

# Yeniden kullanılan parçalar
def tabbar(aktif):
    ikon = {
      'Keşfet':'<path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35"/>',
      'Randevu':'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 11h18"/>',
      'W2W':'<path d="M21 12a8 8 0 1 1-3.2-6.4"/><path d="M8 12h8M8 16h5"/>',
      'Bakım':'<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10Z"/>',
      'Profil':'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    }
    ts = ''.join(
      f'<div class="tab{" on" if a==aktif else ""}"><div class="tabdot">'
      f'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
      f'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{ikon[a]}</svg></div>{a}</div>'
      for a in ['Keşfet','Randevu','W2W','Bakım','Profil'])
    return f'<div class="tabbar"><div class="pill">{ts}</div></div>'

def basliksatiri(t, geri=True):
    ok = ('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
          'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
          '<path d="M15 18l-6-6 6-6"/></svg>')
    g = f'<div style="width:40px;height:40px;border-radius:var(--r-pill);background:var(--surface);display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow)">{ok}</div>' if geri else ''
    return (f'<div class="row" style="gap:12px;padding:12px 16px 4px">{g}'
            f'<div class="h1">{t}</div></div>')

# ── 1. KEŞFET (Main) — app/(tabs)/discover.tsx ────────────────────────────
kesfet = f'''<div class="screen">
  <div class="row" style="justify-content:space-between;padding:14px 16px 6px">
    <div class="col" style="gap:2px">
      <div class="caption muted">Hoş geldin</div>
      <div class="h1">Selim</div>
    </div>
    <div class="row" style="gap:10px">
      <div class="row" style="gap:6px;padding:7px 12px;border-radius:var(--r-pill);background:var(--goldSoft)">
        <span class="micro" style="color:var(--gold)">1.505</span>
        <span class="micro muted">AYNA Puanı</span>
      </div>
      <div style="width:40px;height:40px;border-radius:var(--r-pill);background:var(--accentSoft)"></div>
    </div>
  </div>

  <div class="pad" style="padding-top:10px">
    <div class="row" style="gap:10px;height:48px;padding:0 16px;border-radius:var(--r-pill);background:var(--surface);box-shadow:var(--shadow)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#68536A" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      <span class="caption muted">Uzman, salon veya hizmet ara</span>
    </div>
  </div>

  <div style="padding:6px 16px 0">
    <div class="row" style="gap:12px;padding:16px;border-radius:var(--r-lg);background:var(--accent)">
      <div class="col" style="gap:4px;flex:1">
        <div class="h2" style="color:var(--onAccent)">Dileğin Nedir?</div>
        <div class="caption" style="color:rgba(255,240,245,.78)">Anlat — uzmanlar sana fiyat versin</div>
      </div>
      <div style="width:44px;height:44px;border-radius:var(--r-pill);background:rgba(255,240,245,.16);display:flex;align-items:center;justify-content:center">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFF0F5" stroke-width="1.8" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </div>
    </div>
  </div>

  <div style="padding:16px 0 0">
    <div style="display:flex;gap:12px;padding:0 16px;overflow:hidden">
      {''.join(f'<div class="col" style="gap:8px;align-items:center;min-width:64px"><div style="width:64px;height:64px;border-radius:var(--r-md);background:{c}"></div><span class="micro muted">{n}</span></div>' for n,c in [('Saç','#E8D9EB'),('Tırnak','#F9EAEB'),('Cilt','#E3F2E8'),('Kirpik','#FDF3E7'),('Masaj','#EFEBE9')])}
    </div>
  </div>

  <div class="sechead"><div class="h2">Fırsatlar</div><span class="captionStrong accentFg">Tümü</span></div>
  <div style="display:flex;gap:12px;padding:0 16px;overflow:hidden">
    {''.join(f'<div style="min-width:210px;height:130px;border-radius:var(--r-lg);background:linear-gradient(160deg,#642855,#4A1942);padding:14px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:var(--shadow)"><div class="chip" style="background:rgba(255,240,245,.16);color:var(--onAccent);align-self:flex-start">Sponsorlu</div><div><div class="title" style="color:var(--onAccent)">{t}</div><div class="micro" style="color:rgba(255,240,245,.72)">{s}</div></div></div>' for t,s in [('Yaz saç bakımı','-%20'),('Manikür & Pedikür','Studio Lana')])}
  </div>

  <div class="sechead"><div class="h2">Öne çıkanlar</div><span class="captionStrong accentFg">Tümü</span></div>
  <div style="display:flex;gap:12px;padding:0 16px;overflow:hidden">
    {''.join(f'<div style="min-width:210px;height:130px;border-radius:var(--r-lg);background:var(--surface);box-shadow:var(--shadow);overflow:hidden;display:flex;flex-direction:column"><div style="height:74px;background:{c}"></div><div style="padding:10px 12px"><div class="captionStrong">{t}</div><div class="micro muted">★ 4.9 · Sponsorlu</div></div></div>' for t,c in [('Gold Hair Lab','#E8D9EB'),('Essence Beauty','#F9EAEB')])}
  </div>

  <div class="sechead"><div class="h2">Bu hafta trend ⚡</div></div>
  <div style="display:flex;gap:12px;padding:0 16px;overflow:hidden">
    {''.join(f'<div class="col" style="gap:6px;min-width:104px"><div style="height:80px;border-radius:var(--r-md);background:{c}"></div><span class="micro">{n}</span></div>' for n,c in [('Keratin Bakım','#EFEBE9'),('Nude Nail Art','#F9EAEB'),('İpek Kirpik','#E8D9EB')])}
  </div>

  <div class="sechead"><div class="h2">Sana yakın salonlar</div><span class="captionStrong accentFg">Tümü</span></div>
  <div class="col" style="gap:10px;padding:0 16px 8px">
    {''.join(f'<div class="row card" style="gap:12px"><div style="width:56px;height:56px;border-radius:var(--r-sm);background:{c}"></div><div class="col" style="flex:1;gap:2px"><div class="captionStrong">{n}</div><div class="micro muted">{d} · ★ {r}</div></div><div class="chip">Detaylar</div></div>' for n,d,r,c in [('Aliya Studio','6,8 km','4.9','#E8D9EB'),('Sayan Atelier','2,3 km','4.7','#EFEBE9')])}
  </div>
  <div style="flex:1"></div>
  {tabbar('Keşfet')}
</div>'''
yaz('Main', kesfet)
print('Main (Keşfet) yazıldı')

# ── 2. RANDEVULARIM — app/(tabs)/bookings.tsx ─────────────────────────────
def durumRozet(t, bg, fg, nokta=False):
    d = f'<span style="width:6px;height:6px;border-radius:3px;background:{fg};display:inline-block;margin-right:6px"></span>' if nokta else ''
    return f'<span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:var(--r-pill);background:{bg};color:{fg};font-size:12px;font-weight:500">{d}{t}</span>'

randevular = f'''<div class="screen">
  <div style="padding:14px 16px 4px"><div class="h1">Randevularım</div></div>
  <div class="row" style="gap:8px;padding:8px 16px 4px">
    {''.join(f'<div style="padding:8px 16px;border-radius:var(--r-pill);background:{"var(--accent)" if a else "var(--surface)"};color:{"var(--onAccent)" if a else "var(--muted)"};font-size:14px;font-weight:500;box-shadow:var(--shadow)">{t}</div>' for t,a in [('Yaklaşan',True),('Talepler',False),('Geçmiş',False)])}
  </div>

  <div class="col" style="gap:12px;padding:12px 16px">
    <div class="card col" style="gap:10px">
      <div class="row" style="justify-content:space-between">
        <div class="title">Gold Hair Lab</div>
        {durumRozet('Depozito bekleniyor','#FDF3E7','#9A5A05',True)}
      </div>
      <div class="caption muted">Saç boyama (kök) + Keratin</div>
      <div class="bodyStrong">Cum 04.09.2026 · 15:00</div>
      <div class="row" style="gap:8px;padding-top:4px">
        <div style="flex:1;height:44px;border-radius:var(--r-pill);background:var(--accent);color:var(--onAccent);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:15px">Depozito öde</div>
        <div style="height:44px;padding:0 16px;border-radius:var(--r-pill);border:1px solid var(--lineStrong);display:flex;align-items:center;color:var(--accent);font-weight:500;font-size:15px">Detayı gör</div>
      </div>
    </div>

    <div class="card col" style="gap:10px">
      <div class="row" style="justify-content:space-between">
        <div class="title">Essence Beauty</div>
        {durumRozet('Kesinleşti','#E3F2E8','#2F7A4A')}
      </div>
      <div class="caption muted">Manikür</div>
      <div class="bodyStrong">Pzt 07.09.2026 · 11:30</div>
    </div>

    <div class="card col" style="gap:10px;border:1px solid var(--lineStrong);box-shadow:none;background:transparent">
      <div class="label muted">Talep</div>
      <div class="captionStrong">Saç kesimi · Almatı</div>
      <div class="row" style="justify-content:space-between">
        <span class="micro muted">3 uzman teklif gönderdi</span>
        <span class="captionStrong accentFg">Teklifleri gör →</span>
      </div>
    </div>

    <div class="card col" style="gap:8px;background:var(--accentSoft);box-shadow:none">
      <div class="captionStrong">Aldığın hizmeti değerlendir</div>
      <div class="micro muted">Hizmeti nasıl aldın? Puanın ve yorumun toplulukça görülür.</div>
      <div style="align-self:flex-start;padding:9px 18px;border-radius:var(--r-pill);background:var(--accent);color:var(--onAccent);font-weight:600;font-size:14px">Değerlendir</div>
    </div>
  </div>
  <div style="flex:1"></div>
  {tabbar('Randevu')}
</div>'''
yaz('Randevularim', randevular)

# ── 3. W2W TOPLULUK — app/(tabs)/circle.tsx ───────────────────────────────
topluluk = f'''<div class="screen">
  <div class="col" style="gap:2px;padding:14px 16px 4px">
    <div class="h1">AYNA W2W</div>
    <div class="caption muted">Kadından kadına gerçek tavsiyeler</div>
  </div>
  <div class="pad" style="padding-top:10px">
    <div class="row" style="gap:10px;height:48px;padding:0 16px;border-radius:var(--r-pill);background:var(--surface);box-shadow:var(--shadow)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A1942" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      <span class="caption muted">Sor ya da paylaş</span>
    </div>
  </div>
  <div class="row" style="gap:8px;padding:4px 16px 0">
    {''.join(f'<div style="padding:8px 14px;border-radius:var(--r-pill);background:{"var(--accent)" if a else "var(--surface)"};color:{"var(--onAccent)" if a else "var(--muted)"};font-size:14px;font-weight:500;box-shadow:var(--shadow)">{t}</div>' for t,a in [('Akış',True),('Tavsiyeler',False),('Kaydedilenler',False)])}
  </div>

  <div class="col" style="gap:12px;padding:14px 16px">
    <div class="card col" style="gap:10px">
      <div class="row" style="gap:10px">
        <div style="width:36px;height:36px;border-radius:var(--r-pill);background:var(--accentSoft)"></div>
        <div class="col" style="gap:1px;flex:1">
          <div class="captionStrong">Anonim üye</div>
          <div class="micro muted">2 saat önce</div>
        </div>
        <span class="chip" style="background:var(--successSoft);color:var(--success)">Doğrulanmış üye</span>
      </div>
      <div class="body">Keratin bakımı sonrası saçım ne kadar sürede eski hâline döner? Almatı’da güvendiğiniz bir yer var mı?</div>
      <div class="row" style="gap:16px;padding-top:2px">
        <span class="micro muted">♡ 24 faydalı</span>
        <span class="micro muted">12 yorum</span>
      </div>
    </div>

    <div class="card col" style="gap:8px;background:var(--accentSoft);box-shadow:none">
      <div class="captionStrong">Buraya hiçbir şey kendiliğinden düşmez</div>
      <div class="micro muted">Paylaştıkların yalnız senin seçtiğin kadar görünür; kimliğin gizli kalabilir.</div>
    </div>

    <div class="sechead" style="padding:0;margin:8px 0 0"><div class="h2">AYNA Life · Pratik Bilgiler</div></div>
    {''.join(f'<div class="row card" style="gap:12px"><div style="width:64px;height:64px;border-radius:var(--r-sm);background:{c}"></div><div class="col" style="flex:1;gap:3px"><div class="captionStrong">{t}</div><div class="micro muted">{d} dk okuma</div></div></div>' for t,d,c in [('Kuru havada cilt bakımı','4','#EFEBE9'),('Kışın saç dökülmesi','6','#E8D9EB')])}
  </div>
  <div style="flex:1"></div>
  {tabbar('W2W')}
</div>'''
yaz('Topluluk', topluluk)
print('Randevularim + Topluluk yazıldı')

# ── 4. BAKIM — app/(tabs)/care.tsx ────────────────────────────────────────
bakim = f'''<div class="screen">
  <div style="padding:14px 16px 4px"><div class="h1">Bakımın</div></div>

  <div class="pad" style="padding-top:8px">
    <div class="row card" style="gap:14px;background:var(--accent);box-shadow:var(--shadow)">
      <div style="width:64px;height:64px;border-radius:var(--r-pill);border:3px solid rgba(255,240,245,.28);display:flex;align-items:center;justify-content:center;flex-direction:column">
        <span class="h2" style="color:var(--onAccent)">72</span>
      </div>
      <div class="col" style="gap:3px;flex:1">
        <div class="label" style="color:rgba(255,240,245,.62)">Bakım skorun</div>
        <div class="captionStrong" style="color:var(--onAccent)">%72 tutarlılık</div>
        <div class="micro" style="color:rgba(255,240,245,.72)">Rutinlerini gör →</div>
      </div>
    </div>
  </div>

  <div class="row" style="gap:10px;padding:12px 16px 0">
    {''.join(f'<div class="card col" style="flex:1;gap:2px;align-items:center;padding:14px 8px"><div class="h2">{v}</div><div class="micro muted">{n}</div></div>' for v,n in [('1.505','AYNA Puanı'),('8','Kaydedilenler'),('12','Tamamlanan')])}
  </div>

  <div class="sechead"><div class="h2">Yaklaşan randevu</div></div>
  <div class="pad" style="padding-top:0">
    <div class="card col" style="gap:8px">
      <span class="chip" style="align-self:flex-start">Yaklaşan randevu</span>
      <div class="title">Gold Hair Lab</div>
      <div class="caption muted">Cum 04.09.2026 · 15:00</div>
      <div style="align-self:flex-start;padding:9px 18px;border-radius:var(--r-pill);border:1px solid var(--lineStrong);color:var(--accent);font-weight:500;font-size:14px">Detayı gör</div>
    </div>
  </div>

  <div class="sechead"><div class="h2">Hızlı ekle</div></div>
  <div class="row" style="gap:10px;padding:0 16px">
    {''.join(f'<div class="card col" style="flex:1;gap:6px;align-items:center;padding:14px 6px"><div style="width:34px;height:34px;border-radius:var(--r-pill);background:{c}"></div><span class="micro">{n}</span></div>' for n,c in [('Rutin','#E8D9EB'),('An','#F9EAEB'),('Günlük','#E3F2E8'),('Özel gün','#FDF3E7')])}
  </div>

  <div class="sechead"><div class="h2">Kişisel kayıtların</div><span class="captionStrong accentFg">Ekle</span></div>
  <div class="pad" style="padding-top:0">
    <div class="card col" style="gap:6px;align-items:center;padding:26px 16px;box-shadow:none;border:1px dashed var(--lineStrong);background:transparent">
      <div class="captionStrong muted">Henüz kişisel kayıt yok</div>
    </div>
  </div>

  <div class="pad" style="padding-top:4px">
    <div class="row card" style="gap:12px;background:var(--goldSoft);box-shadow:none">
      <div style="width:40px;height:40px;border-radius:var(--r-pill);background:var(--gold)"></div>
      <div class="col" style="gap:2px;flex:1">
        <div class="captionStrong">Boni’ye sor</div>
        <div class="micro muted">AI güzellik danışmanın</div>
      </div>
    </div>
  </div>
  <div style="flex:1"></div>
  {tabbar('Bakım')}
</div>'''
yaz('Bakim', bakim)

# ── 5. PROFİL — app/(tabs)/profile.tsx ────────────────────────────────────
def satir(n, alt=''):
    a = f'<div class="micro muted">{alt}</div>' if alt else ''
    return (f'<div class="row" style="gap:12px;padding:14px 16px;border-bottom:1px solid var(--line)">'
            f'<div style="width:32px;height:32px;border-radius:var(--r-xs);background:var(--accentSoft)"></div>'
            f'<div class="col" style="flex:1;gap:1px"><div class="captionStrong">{n}</div>{a}</div>'
            f'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#68536A" stroke-width="1.8" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></div>')

profil = f'''<div class="screen">
  <div style="padding:14px 16px 4px"><div class="h1">Profil</div></div>
  <div class="pad" style="padding-top:8px">
    <div class="card row" style="gap:14px">
      <div style="width:64px;height:64px;border-radius:var(--r-pill);background:var(--accentSoft);border:1.5px solid var(--accent)"></div>
      <div class="col" style="gap:3px;flex:1">
        <div class="title">Selim Vurgun</div>
        <div class="row" style="gap:6px">
          <span class="chip" style="background:var(--successSoft);color:var(--success)">Telefon doğrulandı</span>
          <span class="chip">Premium</span>
        </div>
      </div>
    </div>
  </div>

  <div class="row" style="gap:10px;padding:12px 16px 0">
    {''.join(f'<div class="card col" style="flex:1;gap:2px;align-items:center;padding:14px 8px"><div class="h2">{v}</div><div class="micro muted">{n}</div></div>' for v,n in [('12','Randevu'),('1.505','Puan'),('7','Değerlendirme')])}
  </div>

  <div class="sechead"><div class="h2">Görünüm</div></div>
  <div class="row" style="gap:8px;padding:0 16px">
    {''.join(f'<div style="flex:1;padding:11px 0;text-align:center;border-radius:var(--r-pill);background:{"var(--accent)" if a else "var(--surface)"};color:{"var(--onAccent)" if a else "var(--muted)"};font-size:14px;font-weight:500;box-shadow:var(--shadow)">{t}</div>' for t,a in [('Sistem',True),('Açık',False),('Koyu',False)])}
  </div>

  <div style="margin-top:20px;background:var(--surface);border-radius:var(--r-lg);margin-left:16px;margin-right:16px;overflow:hidden;box-shadow:var(--shadow)">
    {satir('Üyeliğin','Premium · 12.10.2026’ya kadar')}
    {satir('Adreslerim')}
    {satir('Takip Ettiklerim','24 takipçi · 18 takip')}
    {satir('Değerlendirmelerim')}
    {satir('Bildirimler')}
    {satir('Gizlilik ve güvenlik')}
    {satir('Yardım')}
  </div>
  <div style="flex:1"></div>
  {tabbar('Profil')}
</div>'''
yaz('Profil', profil)
print('Bakim + Profil yazıldı')

# ── 6. TAKVİM / SAAT SEÇ — app/booking/schedule.tsx ───────────────────────
saatler = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30',
           '13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30']
dolu = {'10:30','11:00','14:00'}
secili = '15:00'
def saatKutu(s):
    if s in dolu:
        return f'<div style="padding:11px 0;text-align:center;border-radius:var(--r-sm);background:var(--line);color:var(--muted);font-size:14px;font-weight:500;text-decoration:line-through">{s}</div>'
    if s == secili:
        return f'<div style="padding:11px 0;text-align:center;border-radius:var(--r-sm);background:var(--accent);color:var(--onAccent);font-size:14px;font-weight:600">{s}</div>'
    return f'<div style="padding:11px 0;text-align:center;border-radius:var(--r-sm);background:var(--surface);border:1px solid var(--line);font-size:14px;font-weight:500">{s}</div>'

takvim = f'''<div class="screen">
  {basliksatiri('Saat seç')}
  <div class="pad">
    <div class="card col" style="gap:12px">
      <div class="label muted">Tarih ve saat</div>
      <div style="display:flex;gap:8px;overflow:hidden">
        {''.join(f'<div class="col" style="align-items:center;gap:3px;min-width:52px;padding:10px 0;border-radius:var(--r-sm);background:{"var(--accent)" if a else "var(--surface)"};border:1px solid {"var(--accent)" if a else "var(--line)"}"><span class="micro" style="color:{"rgba(255,240,245,.72)" if a else "var(--muted)"}">{g}</span><span class="bodyStrong" style="color:{"var(--onAccent)" if a else "var(--ink)"}">{d}</span></div>' for g,d,a in [('Çar','03',False),('Cum','04',True),('Cmt','05',False),('Paz','06',False),('Pzt','07',False)])}
      </div>
      <div class="label muted" style="margin-top:4px">Saat</div>
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">
        {''.join(saatKutu(s) for s in saatler)}
      </div>
      <div class="row" style="gap:14px;padding-top:2px">
        <span class="micro muted"><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--line);margin-right:5px"></span>Dolu</span>
        <span class="micro muted"><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--accent);margin-right:5px"></span>Seçili</span>
      </div>
    </div>
  </div>

  <div class="pad" style="padding-top:0">
    <div class="card col" style="gap:10px">
      <div class="label muted">Hizmetler</div>
      {''.join(f'<div class="row" style="justify-content:space-between"><div class="col" style="gap:1px"><span class="captionStrong">{n}</span><span class="micro muted">{d} dk</span></div><span class="bodyStrong">{p} ₸</span></div>' for n,d,p in [('Saç boyama (kök)','90','15.000'),('Keratin bakımı','60','6.000')])}
    </div>
  </div>

  <div class="pad" style="padding-top:0">
    <div class="card col" style="gap:8px;background:var(--accentSoft);box-shadow:none">
      <div class="label" style="color:var(--accent)">Özet</div>
      <div class="row" style="justify-content:space-between"><span class="caption muted">Toplam süre</span><span class="captionStrong">150 dk</span></div>
      <div class="row" style="justify-content:space-between"><span class="caption muted">Toplam tutar</span><span class="h2">21.000 ₸</span></div>
    </div>
  </div>

  <div class="pad" style="padding-top:4px"><div class="btn">Randevuyu onayla</div></div>
  <div style="height:20px"></div>
</div>'''
yaz('Takvim', takvim)

# ── 7. RANDEVU DETAYI — app/booking/[id].tsx ──────────────────────────────
adimlar = [('Talep',True),('Onay',True),('Depozito','now'),('Kesinleşti',False),
           ('Hizmet',False),('Ödeme',False),('Tamamlandı',False)]
def adim(n, d):
    if d is True:
        yuvar = '<div style="width:20px;height:20px;border-radius:var(--r-pill);background:var(--success);display:flex;align-items:center;justify-content:center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>'
        yazi = f'<span class="caption">{n}</span>'
    elif d == 'now':
        yuvar = '<div style="width:20px;height:20px;border-radius:var(--r-pill);background:var(--accent)"></div>'
        yazi = f'<span class="bodyStrong">{n}</span>'
    else:
        yuvar = '<div style="width:20px;height:20px;border-radius:var(--r-pill);border:1.5px solid var(--lineStrong)"></div>'
        yazi = f'<span class="caption muted">{n}</span>'
    return f'<div class="row" style="gap:12px;height:34px">{yuvar}{yazi}</div>'

detay = f'''<div class="screen">
  {basliksatiri('Randevu detayı')}
  <div class="pad">
    <div class="card col" style="gap:6px">
      <div class="row" style="justify-content:space-between">
        <div class="h2">Gold Hair Lab</div>
        {durumRozet('Depozito bekleniyor','#FDF3E7','#9A5A05',True)}
      </div>
      <div class="caption muted">Saç boyama (kök) + Keratin</div>
      <div class="bodyStrong">Cum 04.09.2026 · 15:00</div>
    </div>
  </div>
  <div class="pad" style="padding-top:0">
    <div class="card col" style="gap:0">
      {''.join(adim(n,d) for n,d in adimlar)}
      <div class="row" style="gap:8px;margin-top:8px">
        <span style="width:8px;height:8px;border-radius:4px;background:var(--gold)"></span>
        <span class="caption muted">Müşteri depozitoyu ödüyor</span>
      </div>
    </div>
  </div>
  <div class="pad" style="padding-top:0">
    <div class="card col" style="gap:8px">
      <div class="row" style="justify-content:space-between"><span class="caption muted">Depozito</span><span class="bodyStrong">2.100 ₸</span></div>
      <div class="row" style="justify-content:space-between"><span class="caption muted">Hizmetten sonra uzmana</span><span class="bodyStrong">18.900 ₸</span></div>
    </div>
  </div>
  <div class="pad" style="padding-top:0">
    <div class="card col" style="gap:4px;border:1px solid var(--danger);box-shadow:none">
      <div class="bodyStrong" style="color:var(--danger)">Randevunu korumak için öde</div>
      <div class="caption"><span style="color:var(--danger);font-weight:600">09:19</span> <span class="muted">içinde ödemezsen randevu düşer</span></div>
    </div>
  </div>
  <div class="pad" style="padding-top:4px"><div class="btn">Depozito öde</div></div>
  <div style="text-align:center;padding:14px 0 20px"><span class="caption muted">⊗ İptal et</span></div>
</div>'''
yaz('RandevuDetayi', detay)
print('Takvim + RandevuDetayi yazıldı')

# ── 8. DEPOZİTO ÖDE — app/booking/deposit.tsx ─────────────────────────────
depozito = f'''<div class="screen">
  {basliksatiri('Depozito öde')}
  <div class="pad">
    <div class="card col" style="gap:4px;border:1px solid var(--danger);box-shadow:none">
      <div class="caption"><span style="color:var(--danger);font-weight:600">09:19</span> <span class="muted">içinde ödemezsen randevu düşer</span></div>
    </div>
  </div>
  <div class="pad" style="padding-top:0">
    <div class="card col" style="gap:6px">
      <div class="row" style="justify-content:space-between">
        <span class="caption muted">Ödenecek tutar</span>
        <span class="h1">2.100 ₸</span>
      </div>
      <span class="caption muted">Toplam 21.000 ₸ hizmet bedelinin %10’u</span>
    </div>
  </div>
  <div class="pad" style="padding-top:0">
    <div class="row card" style="gap:14px">
      <div style="width:22px;height:22px;border-radius:6px;border:1.5px solid var(--accent);display:flex;align-items:center;justify-content:center"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4A1942" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>
      <div class="col" style="gap:2px;flex:1">
        <div class="bodyStrong">376 puan kullan</div>
        <div class="micro muted">Biriken puanının en fazla %25’i kullanılabilir (1 puan = 1 ₸)</div>
      </div>
    </div>
  </div>
  <div class="pad" style="padding-top:0">
    <div class="card col" style="gap:10px;background:var(--accentSoft);box-shadow:none">
      <div class="label" style="color:var(--accent)">Kaspi’de sırayla</div>
      {''.join(f'<div class="row" style="gap:12px;align-items:flex-start"><span class="micro muted" style="width:10px">{i}</span><span class="caption" style="flex:1">{t}</span></div>' for i,t in [(1,'Alıcı hazır gelir — hesap numarası yazmana gerek yok'),(2,'Tutarı elle gir: <b>2.100 ₸</b>'),(3,'Açıklamaya ödeme kodunu yaz')])}
    </div>
  </div>
  <div class="pad" style="padding-top:4px"><div class="btn">Kaspi ile öde</div></div>
  <div class="pad" style="padding-top:12px">
    <div class="card col" style="gap:6px">
      <div class="bodyStrong">SES INVEST TOO</div>
      <div class="micro muted">Ödemeyi bu hesaba yap; dekontu aşağıya yükle.</div>
    </div>
  </div>
  <div class="pad" style="padding-top:0">
    <div class="card col" style="gap:10px;align-items:center;justify-content:center;min-height:140px;border:1px dashed var(--lineStrong);box-shadow:none;background:transparent">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#68536A" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>
      <span class="caption muted">Dekontu yükle</span>
    </div>
  </div>
  <div class="pad" style="padding-top:0">
    <div class="card col" style="gap:8px;border:1px solid var(--line);box-shadow:none">
      <div class="label" style="color:var(--accent)">Dekontla birlikte gönderilecek</div>
      <div class="row" style="justify-content:space-between"><span class="caption muted">Ödeme kodu</span><span class="bodyStrong" style="letter-spacing:1px">AYNA-2T4K9</span></div>
      <div class="row" style="justify-content:space-between"><span class="caption muted">Randevu no</span><span class="captionStrong" style="letter-spacing:1px">bk-f2t4k9a</span></div>
      <div class="micro muted">Kodu Kaspi’de açıklama alanına yaz. Ödemeni bu randevuyla bu kod eşleştiriyor.</div>
    </div>
  </div>
  <div class="pad" style="padding-top:4px"><div class="btn sec">Dekontu gönder</div></div>
  <div style="height:20px"></div>
</div>'''
yaz('Depozito', depozito)

# ── 9. TALEP GÖNDERİLDİ — app/booking/confirmed.tsx ───────────────────────
onay = f'''<div class="screen" style="justify-content:center;min-height:844px">
  <div class="col" style="align-items:center;gap:16px;padding:0 32px">
    <div style="width:88px;height:88px;border-radius:var(--r-pill);background:var(--successSoft);display:flex;align-items:center;justify-content:center">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2F7A4A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
    </div>
    <div class="h1" style="text-align:center">Talebin uzmanlara ulaştı</div>
    <div class="caption muted" style="text-align:center">Uzman onayı bekleniyor — onaylanınca adres ve telefon açılır.</div>
    <div class="card col" style="gap:6px;width:100%;margin-top:8px">
      <div class="title">Gold Hair Lab</div>
      <div class="caption muted">Saç boyama (kök) + Keratin</div>
      <div class="bodyStrong">Cum 04.09.2026 · 15:00</div>
    </div>
    <div class="micro muted" style="text-align:center;padding:0 8px">Salonun adresi onay sonrası sana gösterilir; senin numaran uzmanla paylaşılmaz.</div>
    <div class="btn" style="width:100%;margin-top:8px">Randevularıma git</div>
  </div>
</div>'''
yaz('TalepGonderildi', onay)
print('Depozito + TalepGonderildi yazıldı')

# ── 10. ERTELEME — app/booking/reschedule.tsx ─────────────────────────────
erteleme = f'''<div class="screen">
  {basliksatiri('Randevuyu ertele')}
  <div class="pad">
    <div class="card col" style="gap:6px">
      <div class="label muted">Mevcut randevu</div>
      <div class="title">Gold Hair Lab</div>
      <div class="bodyStrong">Cum 04.09.2026 · 15:00</div>
    </div>
  </div>
  <div class="pad" style="padding-top:0">
    <div class="card col" style="gap:12px">
      <div class="label muted">Yeni tarih &amp; saat</div>
      <div style="display:flex;gap:8px;overflow:hidden">
        {''.join(f'<div class="col" style="align-items:center;gap:3px;min-width:52px;padding:10px 0;border-radius:var(--r-sm);background:{"var(--accent)" if a else "var(--surface)"};border:1px solid {"var(--accent)" if a else "var(--line)"}"><span class="micro" style="color:{"rgba(255,240,245,.72)" if a else "var(--muted)"}">{g}</span><span class="bodyStrong" style="color:{"var(--onAccent)" if a else "var(--ink)"}">{d}</span></div>' for g,d,a in [('Cmt','05',False),('Paz','06',False),('Pzt','07',True),('Sal','08',False),('Çar','09',False)])}
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">
        {''.join(saatKutu(s) for s in saatler[:8])}
      </div>
    </div>
  </div>
  <div class="pad" style="padding-top:0">
    <div class="card col" style="gap:6px;background:var(--goldSoft);box-shadow:none">
      <div class="caption">Erteleme randevu başına 1 kez. Uzman kabul ederse yeni saatin geçerli olur.</div>
    </div>
  </div>
  <div class="pad" style="padding-top:4px"><div class="btn">Erteleme talebi gönder</div></div>
  <div style="height:20px"></div>
</div>'''
yaz('Erteleme', erteleme)

# ── 11. DEPOZİTO İADESİ — app/booking/refund.tsx ──────────────────────────
iade = f'''<div class="screen">
  {basliksatiri('Depozito iadesi')}
  <div class="pad">
    <div class="card col" style="gap:6px">
      <div class="row" style="justify-content:space-between">
        <span class="caption muted">İade edilecek tutar</span>
        <span class="h1">2.100 ₸</span>
      </div>
      <span class="micro muted">İade 1 iş günü içinde yapılır.</span>
    </div>
  </div>
  <div class="pad" style="padding-top:0">
    <div class="card col" style="gap:10px">
      <div class="label muted">İade yapılacak hesap</div>
      <div style="height:52px;border-radius:var(--r-sm);border:1px solid var(--lineStrong);display:flex;align-items:center;padding:0 14px">
        <span class="caption muted">Kaspi numarası veya IBAN</span>
      </div>
      <div class="micro muted">Bu bilgi yalnız iadeyi yapan ekiple paylaşılır; uzmana ya da salona gitmez.</div>
    </div>
  </div>
  <div class="pad" style="padding-top:4px"><div class="btn">İade talebi gönder</div></div>
  <div style="height:20px"></div>
</div>'''
yaz('DepozitoIadesi', iade)
print('Erteleme + DepozitoIadesi yazıldı')
