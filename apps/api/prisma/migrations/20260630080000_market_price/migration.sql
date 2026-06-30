-- Ortalama piyasa fiyatı (kategori × şehir) — %40 kuralı (Build Brief §1.3)
CREATE TABLE "market_prices" (
    "id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT '',
    "base_price" DECIMAL(12,2) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "market_prices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "market_prices_category_city_key" ON "market_prices"("category", "city");
