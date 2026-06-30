-- §4.6: telefon OTP doğrulama (mock SMS)
ALTER TABLE "users" ADD COLUMN "phone_verified" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "otp_codes" (
  "id" UUID NOT NULL,
  "phone_hash" TEXT NOT NULL,
  "code_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "otp_codes_phone_hash_idx" ON "otp_codes" ("phone_hash");
