import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

// 32 baytlık anahtar türetimi (sabit tuz; anahtar zaten gizli .env'de)
function keyFrom(secret: string): Buffer {
  return scryptSync(secret, 'ayna.field.v1', 32);
}

// --- Parola (scrypt; salt:hash hex) ---
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const hash = scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
  const expected = Buffer.from(hashHex, 'hex');
  return hash.length === expected.length && timingSafeEqual(hash, expected);
}

// --- Alan şifreleme (AES-256-GCM → iv(12) | tag(16) | ciphertext) ---
export function encryptField(plain: string, secret: string): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFrom(secret), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]);
}

export function decryptField(buf: Buffer, secret: string): string {
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', keyFrom(secret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

// --- Telefon arama hash'i (HMAC-SHA256) ---
export function phoneHash(phone: string, secret: string): string {
  return createHmac('sha256', secret).update(normalizePhone(phone)).digest('hex');
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

// --- HS256 JWT (bağımsız; harici lib yok) ---
function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function signJwt(payload: Record<string, unknown>, secret: string, ttlSec: number): string {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlSec };
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const data = `${header}.${b64url(JSON.stringify(body))}`;
  const sig = b64url(createHmac('sha256', secret).update(data).digest());
  return `${data}.${sig}`;
}

export function verifyJwt(token: string, secret: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = b64url(createHmac('sha256', secret).update(`${header}.${body}`).digest());
  const a = Buffer.from(sig!);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body!, 'base64').toString('utf8')) as Record<
      string,
      unknown
    >;
    if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
