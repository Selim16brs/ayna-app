-- §6.D: yorum kalıcılığı + uzman/işletme yanıtı + hizmet etiketi
ALTER TABLE "ratings" ADD COLUMN "service_tag" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ratings" ADD COLUMN "reply" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ratings" ADD COLUMN "replied_at" TIMESTAMPTZ(6);
