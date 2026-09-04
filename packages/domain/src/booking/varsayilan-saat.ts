/**
 * ÇALIŞMA SAATİ BELİRTİLMEMİŞ SAĞLAYICININ VARSAYILAN PENCERESİ.
 *
 * Saatlerini girmemiş uzmana sunucu bu pencereyi uyguluyor ve müşteriye
 * 10:00–20:00 arası slotlar gösteriliyor. Uzman bunu HİÇ söylemedi.
 *
 * Randevu yine de uzmanın onayından geçiyor, yani uydurulmuş bir randevu
 * doğmuyor; uydurulan şey SAATLERİN KENDİSİ. Çözüm pencereyi kaldırmak
 * değil — o zaman saatini girmemiş her uzman randevu alamaz hâle gelirdi —
 * uzmana bunu SÖYLEMEK: panelde "saatlerini belirtmedin, müşteriye şu
 * aralık gösteriliyor" uyarısı var.
 *
 * Sayı burada TEK YERDE: sunucu slot üretirken, panel uyarıyı yazarken
 * aynı kaynaktan okuyor. İkisi ayrı yazılsaydı uyarı yanlış saati söyler
 * ve uzman doğru sandığı bir aralıkla kalırdı.
 */
export const VARSAYILAN_CALISMA_SAATI = { from: '10:00', to: '20:00' } as const;
