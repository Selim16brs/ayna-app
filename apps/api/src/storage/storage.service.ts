import { createHash } from 'node:crypto';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Env } from '@ayna/config/env';
import { ENV } from '../config/config.module';

/**
 * §medya — Cloudflare R2 (S3 uyumlu) nesne depolama.
 *
 * Sözleşme: `put(dataUrl, prefix)` bir data URL alır.
 *  - R2 YAPILANDIRILMIŞSA → görseli bucket'a yükler, KISA public URL döndürür.
 *  - DEĞİLSE → data URL'i AYNEN döndürür (mevcut davranış; hiçbir şey bozulmaz).
 * Zaten http(s) URL gelirse (yeniden kaydetme) dokunmadan geri verir.
 * Böylece tüm çağıran kod tek satır değişir; anahtar eklenince otomatik R2'ye geçer.
 */
@Injectable()
export class StorageService {
  private readonly log = new Logger('StorageService');
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(@Inject(ENV) private readonly env: Env) {
    const ok =
      env.R2_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_BUCKET &&
      env.R2_PUBLIC_URL;
    this.bucket = env.R2_BUCKET ?? '';
    this.publicUrl = (env.R2_PUBLIC_URL ?? '').replace(/\/+$/, '');
    this.client = ok
      ? new S3Client({
          region: 'auto',
          endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: env.R2_ACCESS_KEY_ID!,
            secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
          },
        })
      : null;
    /*
     * ── YAPILANDIRMA EKSİKSE SESSİZ KALINMIYOR ──────────────────────────
     *
     * Depolama yoksa `put()` gelen değeri OLDUĞU GİBİ döndürüyor: telefondan
     * seçilen fotoğraf ham base64 olarak veritabanı satırına yazılıyor.
     * Uygulama çalışmaya devam ettiği için hata görünmüyor — ta ki
     * veritabanı şişip listeler yavaşlayana kadar.
     *
     * SMS servisi eksik yapılandırmayı zaten yüksek sesle söylüyor; depolama
     * söylemiyordu. Sunucu günlüğünde tek satır, kurucunun Railway'de
     * göreceği yerde.
     */
    if (!ok) {
      const eksik = (
        [
          ['R2_ACCOUNT_ID', env.R2_ACCOUNT_ID],
          ['R2_ACCESS_KEY_ID', env.R2_ACCESS_KEY_ID],
          ['R2_SECRET_ACCESS_KEY', env.R2_SECRET_ACCESS_KEY],
          ['R2_BUCKET', env.R2_BUCKET],
          ['R2_PUBLIC_URL', env.R2_PUBLIC_URL],
        ] as const
      )
        .filter(([, v]) => !v)
        .map(([k]) => k);
      this.log.warn(
        `DEPOLAMA YAPILANDIRMASI EKSİK — şu değişken(ler) boş: ${eksik.join(', ')}. ` +
          'Yüklenen fotoğraflar VERİTABANINA ham base64 olarak yazılacak; ' +
          'kayıtlar büyür ve listeler yavaşlar.',
      );
    }
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  private lastError = '';
  // Teşhis: secret sızdırmadan — yapılandırıldı mı, hangi alanlar boş, son hata.
  status() {
    return {
      enabled: this.enabled,
      bucket: this.bucket || null,
      publicUrl: this.publicUrl || null,
      missing: [
        !this.env.R2_ACCOUNT_ID && 'R2_ACCOUNT_ID',
        !this.env.R2_ACCESS_KEY_ID && 'R2_ACCESS_KEY_ID',
        !this.env.R2_SECRET_ACCESS_KEY && 'R2_SECRET_ACCESS_KEY',
        !this.env.R2_BUCKET && 'R2_BUCKET',
        !this.env.R2_PUBLIC_URL && 'R2_PUBLIC_URL',
      ].filter(Boolean),
      lastError: this.lastError || null,
    };
  }

  /** data URL → R2 public URL (yapılandırılmışsa); değilse girdiyi aynen döndürür. */
  async put(value: string | null | undefined, prefix: string): Promise<string | null> {
    if (!value) return value ?? null;
    // Zaten uzak URL → dokunma (idempotent; yeniden kaydetmede tekrar yüklemez)
    if (/^https?:\/\//.test(value)) return value;
    if (!this.client) return value; // R2 yok → data URL kalır
    const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(value);
    if (!m) return value; // data URL değil → dokunma
    const mime = m[1]!;
    const buf = Buffer.from(m[2]!, 'base64');
    const ext = mime.split('/')[1]!.replace('jpeg', 'jpg');
    // İçerik hash'i = anahtar → aynı görsel tekrar yüklenmez (deduplikasyon)
    const hash = createHash('sha256').update(buf).digest('hex').slice(0, 32);
    const key = `${prefix}/${hash}.${ext}`;
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buf,
          ContentType: mime,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
      return `${this.publicUrl}/${key}`;
    } catch (e) {
      // Yükleme başarısızsa AKIŞI DÜŞÜRME — data URL ile devam (güvenli geri düşüş)
      this.lastError = (e as Error).message;
      this.log.warn(`R2 put başarısız (${key}): ${this.lastError}`);
      return value;
    }
  }

  /**
   * Depodan siler — public URL ile.
   *
   * 7 günlük paylaşımların "sistemden silinmesi" için gerekli: kaydı
   * silip fotoğrafı bırakmak, kişisel veriyi süresiz saklamak olurdu.
   *
   * DATA URL'DE İŞ YOK: R2 yapılandırılmamışsa görsel zaten kaydın
   * içinde ve kayıt silinince o da gidiyor.
   *
   * Silme başarısız olursa AKIŞ DÜŞMÜYOR (`false` dönüyor) ama sessiz de
   * kalmıyor: çağıran taraf kaydı silmeyip bir sonraki turda yeniden
   * denemeyi seçebilir.
   */
  async remove(url: string | null | undefined): Promise<boolean> {
    if (!url || !this.client || !this.publicUrl) return false;
    if (!url.startsWith(this.publicUrl)) return false;
    const key = url.slice(this.publicUrl.length).replace(/^\/+/, '');
    if (!key) return false;
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (e) {
      this.lastError = (e as Error).message;
      this.log.warn(`R2 delete başarısız (${key}): ${this.lastError}`);
      return false;
    }
  }

  /** Birden çok data URL (galeri/sertifika) → sırayla yükle. */
  async putMany(values: string[], prefix: string): Promise<string[]> {
    const out: string[] = [];
    for (const v of values) out.push((await this.put(v, prefix)) ?? v);
    return out;
  }
}
