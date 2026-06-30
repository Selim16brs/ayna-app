-- §4.6: women-only yaklaşımı — kayıtta cinsiyet
ALTER TABLE "users" ADD COLUMN "gender" TEXT NOT NULL DEFAULT 'unspecified';
