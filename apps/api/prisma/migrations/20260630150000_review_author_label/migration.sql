-- Gizlilik: yorum sahibinin kimliği yerine yalnızca etiket saklanır (provider-blind)
ALTER TABLE "ratings" ADD COLUMN "author_label" TEXT NOT NULL DEFAULT 'Doğrulanmış üye';
