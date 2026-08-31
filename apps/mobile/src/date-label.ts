/**
 * TARİH ETİKETİ — saf, react-native'siz.
 *
 * `ui/DateField.tsx` içindeydi ve o dosya react-native'e bağlı. Bakım verisi
 * sunucudan gelince etiketin MAĞAZADA yeniden üretilmesi gerekiyor (sunucu
 * tarihi saklıyor, etiketi değil) — ama mağaza o dosyayı içe aktaramaz.
 *
 * İkinci bir formatlayıcı yazmak yerine buraya taşındı: iki kopya olsaydı
 * kullanıcı aynı tarihi ekranda iki farklı biçimde görürdü.
 */
const TR_AYLAR = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
];
const iki = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export function formatTrDate(d: Date, withTime: boolean): string {
  const base = `${d.getDate()} ${TR_AYLAR[d.getMonth()]}`;
  return withTime ? `${base} · ${iki(d.getHours())}:${iki(d.getMinutes())}` : base;
}
