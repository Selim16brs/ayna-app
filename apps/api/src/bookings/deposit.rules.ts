import { DEPOSIT_SETTING_KEYS, depositRulesFrom, type DepositRules } from '@ayna/domain';
import type { PrismaService } from '../prisma/prisma.service';

// Kapora kurallarını admin ayarlarından okur. Kapora İKİ ayrı yolda doğuyor
// (uzmanın onayı → bookings.service, müşterinin teklif seçmesi → quotes.service);
// ikisinin de aynı fiyata aynı kaporayı istemesi için okuma da hesap da tek yerde.
export async function loadDepositRules(prisma: PrismaService): Promise<DepositRules> {
  const rows = await prisma.setting.findMany({
    // Eski düz tutar da okunur: yeni anahtarlar hiç yazılmamışsa alt sınır yedeği olur.
    where: { key: { in: [...DEPOSIT_SETTING_KEYS, 'rate.deposit_kzt'] } },
    select: { key: true, intValue: true },
  });
  return depositRulesFrom(rows);
}
