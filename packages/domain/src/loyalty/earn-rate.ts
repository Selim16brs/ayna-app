// Hizmetten geri kazanım (§K4.1) — TEK KAYNAK.
//
// Kanvasın randevu ekranında (design/Randevu.dc.html §para dökümü) "hizmetten
// sonra kazanacağın puan" satırı var: kullanıcı hizmeti almadan ÖNCE ne
// kazanacağını görür. Ekranda bu satır yoktu ve mobil formülü de bilmiyordu.
//
// Formül sunucuda (apps/api/.../completion-rewards.ts) zaten uygulanıyordu;
// mobilde ikinci bir kopya yazmak, ileride oran değişince iki tarafın farklı
// sayı göstermesi demekti. Vaat edilen puan ile yatan puan AYNI olmalı.

/**
 * Kazanım oranı ayarı okunamazsa kullanılan varsayılan (%).
 *
 * Brief §5: "Kazanım = hizmet bedelinin %1'i (tamamlanma onayında yüklenir)."
 * Eskiden %3'tü; brief §10 eski "%15 + %3 cashback" modelini açıkça geçersiz
 * ilan ediyor. Oran tek yerde durmalı: mobil "kazanacağın puan" satırını da
 * buradan okuyor, ayrışırsa vaat edilen puanla yatan puan farklı olur.
 */
export const DEFAULT_EARN_PCT = 1;

/**
 * Fiyat ve orandan kazanılacak puanı hesaplar. 1 puan = 1 ₸.
 *
 * AŞAĞI yuvarlar: kullanıcıya söz verilenden azını yatırmak güven kaybıdır,
 * bu yüzden vaat de yatan da aynı aşağı yuvarlamayı kullanır.
 */
export function earnPoints(price: number, pct: number): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  if (!Number.isFinite(pct) || pct <= 0) return 0;
  return Math.floor((price * pct) / 100);
}
