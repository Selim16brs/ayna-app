// §10.3 — outbox teslim politikası. Saf mantık: zaman üretmez, I/O yapmaz.

/**
 * Denemeler arası bekleme (dakika). Artan aralık: geçici bir ağ sorunu birkaç
 * dakikada çözülür, kalıcı bir sorun sunucuyu boşuna yormaz.
 *
 * Toplam kapsama ~31 saat. Bundan sonrası `dead`: bildirimin içeriği o kadar
 * bayatlamış olur ki teslim etmek yardımcı olmaz (kapora süresi çoktan dolmuştur).
 */
export const BACKOFF_MINUTES = [1, 5, 15, 60, 360, 1440] as const;

export const MAX_ATTEMPTS = BACKOFF_MINUTES.length;

/** Teslim edilmiş satırlar bu kadar gün sonra budanır (PII süresiz durmasın). */
export const KEEP_SENT_DAYS = 7;

/**
 * Kullanıcının bildirim GEÇMİŞİ bu kadar gün saklanır.
 *
 * Uygulamanın yerel temizliğiyle (`NOTIFICATION_TTL_MS` = 30 gün) AYNI
 * olmak zorunda: iki taraf farklı saklasaydı aynı kullanıcı telefonunda
 * gördüğü bildirimi tabletinde bulamazdı.
 */
export const GECMIS_SAKLAMA_GUN = 30;

export type Attempt = { attempts: number };

/** Bu denemeden sonraki durum: tekrar denenecek mi, yoksa hakkı bitti mi? */
export function nextState(
  attemptsSoFar: number,
  now: number,
): { status: 'pending' | 'dead'; nextAttemptAt: Date } {
  const yapilan = Math.max(0, Math.floor(attemptsSoFar));
  if (yapilan >= MAX_ATTEMPTS) {
    return { status: 'dead', nextAttemptAt: new Date(now) };
  }
  // yapilan=1 (ilk deneme başarısız) → BACKOFF_MINUTES[0]
  const idx = Math.min(Math.max(0, yapilan - 1), MAX_ATTEMPTS - 1);
  const dakika = BACKOFF_MINUTES[idx] ?? 1;
  return { status: 'pending', nextAttemptAt: new Date(now + dakika * 60_000) };
}

/** Expo yanıtından, silinmesi gereken (artık kayıtlı olmayan) token'ları çıkarır. */
export function deadTokensFrom(
  gonderilen: readonly string[],
  yanit: unknown,
): { dead: string[]; hatali: number } {
  const data = (yanit as { data?: unknown })?.data;
  if (!Array.isArray(data)) return { dead: [], hatali: 0 };
  const dead: string[] = [];
  let hatali = 0;
  data.forEach((ticket, i) => {
    const t = ticket as { status?: string; details?: { error?: string } };
    if (t?.status !== 'error') return;
    hatali += 1;
    // Cihaz uygulamayı silmiş / token geçersiz → token'ı tutmanın anlamı yok,
    // her denemede aynı hatayı üretir ve outbox'ı sonsuza kadar meşgul eder.
    if (t.details?.error === 'DeviceNotRegistered') {
      const tok = gonderilen[i];
      if (tok) dead.push(tok);
    }
  });
  return { dead, hatali };
}

/** Hata metnini saklamadan önce kısaltır (kolon şişmesin). */
export function shortError(e: unknown, max = 300): string {
  const s = e instanceof Error ? e.message : String(e);
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
