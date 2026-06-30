-- User: parola tabanlı hesap alanları (müşteri kaydı, OTP'siz)
ALTER TABLE "users" ADD COLUMN "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "email" TEXT;
ALTER TABLE "users" ADD COLUMN "city" TEXT;
ALTER TABLE "users" ADD COLUMN "password_hash" TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
