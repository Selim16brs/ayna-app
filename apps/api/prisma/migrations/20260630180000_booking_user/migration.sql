-- §5.6: randevuyu sahibine bağla (çift-yönlü puanlama + hatırlatma önkoşulu)
ALTER TABLE "bookings" ADD COLUMN "user_id" UUID;
CREATE INDEX "bookings_user_id_idx" ON "bookings" ("user_id");
