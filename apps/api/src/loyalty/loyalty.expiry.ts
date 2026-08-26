// §8 — puan sona erme uyarısı.
//
// Son kullanma SÜRESİNİN kendisi artık burada değil: K4.4 ile 12 ay yerine
// admin ayarı (`rate.points_expiry_days`, varsayılan 90 gün) geçerli ve hesap
// `loyalty.rules.expiryFrom` içinde. Yanacak puanın HESABI da FIFO motoruna
// taşındı (`@ayna/domain` → `expiringWithin`): eski `expiringSoon` harcamayı
// hiç dikkate almadığı için zaten harcanmış puanı "yanacak" diye sayıyordu.
//
// Geriye yalnız uyarı penceresi kaldı.

export const EXPIRY_WARN_DAYS = 30; // silinmeden 30 gün önce uyarı (MD §8)
