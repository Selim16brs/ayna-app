# AYNA — Veri Saklama Matrisi (TASLAK — hukuk onayı bekliyor)

| Veri                          | Amaç                       | Erişen                  | Saklama                                                | Silme/anonimleştirme                                    |
| ----------------------------- | -------------------------- | ----------------------- | ------------------------------------------------------ | ------------------------------------------------------- |
| Telefon (şifreli) + hash      | Kimlik/giriş               | Sahibi, sistem          | Hesap silmeye kadar                                    | Silmede hash `deleted:{id}` ile koparılır (uygulandı)   |
| Randevu kayıtları             | Hizmet geçmişi, uyuşmazlık | Taraflar, admin         | Hesap silme sonrası finans/uyuşmazlık gereği saklanır* | Kişisel alanların anonimleştirilmesi: job tasarlanacak* |
| Kapora/iade dekont görselleri | Ödeme kanıtı               | Taraflar, admin         | Uyuşmazlık penceresi + yasal süre*                     | Signed-URL + süreli erişim: sıradaki iş                 |
| Sadakat ledger                | Finansal tutarlılık        | Sahibi, admin           | Süresiz (append-only; düzeltme ters kayıt)             | Kişiden koparılarak saklanabilir*                       |
| Audit log                     | Güvenlik/denetim           | Admin                   | 12 ay önerisi*                                         | Otomatik budama job'ı*                                  |
| OTP kayıtları                 | Doğrulama                  | Sistem                  | 24 saat yeter*                                         | Budama job'ı*                                           |
| Push token                    | Bildirim                   | Sistem                  | Oturum yaşamı                                          | Çıkışta silinir                                         |
| W2W gönderileri               | Topluluk                   | Herkese açık (takma ad) | Kullanıcı silene kadar                                 | Hesap silmede anonimleştirme*                           |

\* işaretliler hukuk onayı + Faz sonrası uygulama gerektirir.
