// §5.5 — W2W içerik moderasyonu. OpenAI /moderations (ücretsiz) birincil; anahtar
// yoksa saf keyword blocklist yedeği. Saf kısım test edilebilir.

// Kaba filtre — küfür/nefret/spam işaretleri (tr/ru/en örnekleri; genişletilebilir).
const BLOCKLIST = [
  'orospu',
  'piç',
  'salak',
  'aptal',
  'gerizekalı',
  'sik',
  'amk',
  'reklam',
  'kazan bedava',
  'tıkla kazan',
  'siktir',
  'idiot',
  'fuck',
  'porn',
  'viagra',
  'casino',
  'bet365',
];

export interface ModerationVerdict {
  flagged: boolean;
  reason: string;
}

// Saf keyword taraması — locale-nötr küçük harf (İngilizce blocklist güvenilir eşleşir;
// tr-locale 'I'→'ı' dönüşümü İngilizce kelimeleri bozardı).
export function keywordModeration(text: string): ModerationVerdict {
  const norm = text.toLowerCase();
  const hit = BLOCKLIST.find((w) => norm.includes(w));
  return hit ? { flagged: true, reason: `Yasaklı ifade: "${hit}"` } : { flagged: false, reason: '' };
}
