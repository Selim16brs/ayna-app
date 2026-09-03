import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadEnv } from '@ayna/config/env';

/**
 * SMS ORTAMI — EKSİK KİMLİKLE AÇILMA.
 *
 * Alternatifi sessiz felaketti: `SMS_PROVIDER=smsc` ama şifre boş → API
 * sorunsuz açılır, her OTP isteği içeride patlar, kullanıcı sebebini
 * bilmeden kaydolamaz. Açılışta durmak saatlerce kod göndermemekten iyidir.
 */

/** Şemayı geçmeye yeten en küçük ortam. */
const TABAN = {
  DATABASE_URL: 'postgresql://x/y',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'r'.repeat(32),
  FIELD_ENCRYPTION_KEY: 'a'.repeat(64),
};

function taban(): Record<string, string | undefined> {
  // Şema zamanla değişebilir; eksik zorunlu alan varsa test SEBEBİ SÖYLESİN.
  try {
    loadEnv(TABAN);
  } catch (e) {
    assert.fail(`taban ortam artık yetmiyor, testi güncelle: ${(e as Error).message}`);
  }
  return { ...TABAN };
}

test('varsayılan sağlayıcı mock — kimlik istemiyor', () => {
  assert.equal(loadEnv(taban()).SMS_PROVIDER, 'mock');
});

test('eksik kimlik API’yi AÇILIŞTA DÜŞÜRMÜYOR', () => {
  /*
   * ── BU TEST BİR ÜRETİM KESİNTİSİNDEN DOĞDU ───────────────────────────
   *
   * Denetim önce buradaydı ve eksik ayarda API hiç açılmıyordu. Kurucu
   * değişkeni `MOBIZON_API_KEY` yerine `api.mobizon.kz` adıyla kaydetti;
   * TÜM PAZAR YERİ kapandı — randevular, harita, mesajlar, ödemeler.
   *
   * SMS ayarındaki bir yazım hatası uygulamanın tamamını durdurmamalı.
   * Eksik ayar artık YALNIZ OTP akışını durduruyor (bkz. `SmsService`).
   */
  for (const s of ['smsc', 'mobizon']) {
    const env = loadEnv({ ...taban(), SMS_PROVIDER: s });
    assert.equal(env.SMS_PROVIDER, s, `${s}: kimlik eksikken ortam reddedildi`);
  }
});

test('tanınmayan sağlayıcı adı reddediliyor', () => {
  // Yazım hatası ("smcs") sessizce mock'a düşseydi üretim SMS göndermezdi.
  assert.throws(() => loadEnv({ ...taban(), SMS_PROVIDER: 'smcs' }));
});

/* ── EKSİK AYAR: SMS DURUR, UYGULAMA DURMAZ ───────────────────────────── */

test('eksik kimlikle "gönderildi" DENMİYOR ve sebep kaydediliyor', async () => {
  const { SmsService } = await import('./sms.service');
  const yazilan: Record<string, unknown>[] = [];
  const prisma = {
    smsLog: {
      create: ({ data }: { data: Record<string, unknown> }) => {
        yazilan.push(data);
        return Promise.resolve({});
      },
    },
  };
  // Sağlayıcı seçili ama anahtar YOK — üretimde yaşanan durumun aynısı.
  const env = { SMS_PROVIDER: 'mobizon', MOBIZON_API_KEY: undefined };
  const svc = new SmsService(prisma as never, env as never);

  // Açılış denetimi PATLAMIYOR: uygulama ayakta kalmalı.
  svc.onModuleInit();

  const r = await svc.kodGonder('+77771234567', '123456', 'tr');
  assert.equal(r.gonderildi, false, 'eksik ayarla "gönderildi" dendi');
  assert.match(r.sebep ?? '', /MOBIZON_API_KEY/, 'sebep hangi ayarın eksik olduğunu söylemiyor');
  assert.equal(yazilan.length, 1, 'başarısızlık kayda geçmedi');
  assert.equal(yazilan[0]!['status'], 'FAILED');
});

test('boşluktan ibaret anahtarla GÖNDERİM DENENMİYOR', async () => {
  /*
   * Railway'e yanlışlıkla boşluk yapıştırmak mümkün. "Var ama boş" bir
   * anahtarla sağlayıcıya gitmek her isteği yetki hatasına çevirir ve
   * gerçek sebebi gizlerdi.
   *
   * DAVRANIŞ ölçülüyor, değer değil: `loadEnv`in ne döndürdüğüne bakan bir
   * test, servisin `trim` denetimini kaldırınca da geçerdi.
   */
  const { SmsService } = await import('./sms.service');
  const yazilan: Record<string, unknown>[] = [];
  const prisma = {
    smsLog: {
      create: ({ data }: { data: Record<string, unknown> }) => {
        yazilan.push(data);
        return Promise.resolve({});
      },
    },
  };
  const svc = new SmsService(
    prisma as never,
    { SMS_PROVIDER: 'mobizon', MOBIZON_API_KEY: '   ' } as never,
  );
  const r = await svc.kodGonder('+77771234567', '123456', 'tr');
  assert.equal(r.gonderildi, false, 'boşluk anahtarla sağlayıcıya gidildi');
  assert.match(r.sebep ?? '', /MOBIZON_API_KEY/);
});
