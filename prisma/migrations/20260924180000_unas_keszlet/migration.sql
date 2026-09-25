CREATE TABLE "ProductStock" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "rows" JSONB NOT NULL DEFAULT '[]',
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductStock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductStock_productId_key" ON "ProductStock"("productId");
CREATE INDEX "ProductStock_fetchedAt_idx" ON "ProductStock"("fetchedAt");
ALTER TABLE "ProductStock" ADD CONSTRAINT "ProductStock_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
