import { createHash } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
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
  }

  get enabled(): boolean {
    return this.client !== null;
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
      this.log.warn(`R2 put başarısız (${key}): ${(e as Error).message}`);
      return value;
    }
  }

  /** Birden çok data URL (galeri/sertifika) → sırayla yükle. */
  async putMany(values: string[], prefix: string): Promise<string[]> {
    const out: string[] = [];
    for (const v of values) out.push((await this.put(v, prefix)) ?? v);
    return out;
  }
}
