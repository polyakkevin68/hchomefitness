CREATE TABLE "TermekErtekeles" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fiokId" TEXT NOT NULL,
    "csillag" INTEGER NOT NULL,
    "szoveg" TEXT NOT NULL,
    "allapot" TEXT NOT NULL DEFAULT 'PENDING',
    "igazoltVasarlas" BOOLEAN NOT NULL DEFAULT true,
    "moderaltaId" TEXT,
    "moderalvaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TermekErtekeles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TermekErtekeles_csillag_check" CHECK ("csillag" BETWEEN 1 AND 5),
    CONSTRAINT "TermekErtekeles_szoveg_nemures_check" CHECK (length(trim("szoveg")) > 0)
);
CREATE TABLE "TartalmiOldal" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cim" TEXT NOT NULL,
    "bevezeto" TEXT NOT NULL,
    "szekciok" JSONB NOT NULL DEFAULT '[]',
    "kintVan" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TartalmiOldal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TartalmiOldal_slug_key" ON "TartalmiOldal"("slug");
CREATE INDEX "TartalmiOldal_kintVan_slug_idx" ON "TartalmiOldal"("kintVan", "slug");
CREATE UNIQUE INDEX "TermekErtekeles_orderId_productId_key" ON "TermekErtekeles"("orderId", "productId");
CREATE INDEX "TermekErtekeles_productId_allapot_createdAt_idx" ON "TermekErtekeles"("productId", "allapot", "createdAt");
CREATE INDEX "TermekErtekeles_fiokId_createdAt_idx" ON "TermekErtekeles"("fiokId", "createdAt");
ALTER TABLE "TermekErtekeles" ADD CONSTRAINT "TermekErtekeles_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TermekErtekeles" ADD CONSTRAINT "TermekErtekeles_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TermekErtekeles" ADD CONSTRAINT "TermekErtekeles_fiokId_fkey" FOREIGN KEY ("fiokId") REFERENCES "VasarloiFiok"("id") ON DELETE CASCADE ON UPDATE CASCADE;
