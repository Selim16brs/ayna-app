-- Para el değiştirme adımları: randevuda %10 peşin alınır, kalan bakiye
-- hizmetten sonra ödenir ve iki taraf da beyan eder.
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'balance_pending';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'balance_submitted';
