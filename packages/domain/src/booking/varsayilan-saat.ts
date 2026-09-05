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

/**
 * Çalışma saatleri ekranının BAŞLANGIÇ değerleri — hiçbir gün kapalı değil.
 *
 * Ekran burada `open: wd !== 0` diyordu: PAZAR günü uzman adına kapalı
 * işaretleniyordu. Uzman ekranı hiç açmasa bile bu değerler kaydediliyor ve
 * müşteri o gün hiç slot göremiyordu; uzmanın kendi takviminde ise kilit
 * görünmüyordu (kurucu, 06.09.2026: "izinli olarak işaretlemediği halde
 * kullanıcıya o gün çalışmıyor gibi görünüyor").
 *
 * Sunucunun kendi varsayılanı da bu: saat girilmemişse HER gün açık ve
 * yukarıdaki pencere uygulanıyor. Kapatma kararı yalnız uzmanın.
 */
export function varsayilanCalismaSaatleri(): {
  wd: number;
  open: boolean;
  from: string;
  to: string;
}[] {
  return [1, 2, 3, 4, 5, 6, 0].map((wd) => ({
    wd,
    open: true,
    from: VARSAYILAN_CALISMA_SAATI.from,
    to: VARSAYILAN_CALISMA_SAATI.to,
  }));
}
