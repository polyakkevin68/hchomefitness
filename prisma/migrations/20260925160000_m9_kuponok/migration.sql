ALTER TABLE "CheckoutQuote" ADD COLUMN "kuponKod" TEXT;
ALTER TABLE "CheckoutQuote" ADD COLUMN "kedvezmenyHuf" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "discountHuf" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "couponCode" TEXT;

CREATE TABLE "Kupon" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "tipus" TEXT NOT NULL,
    "ertek" INTEGER NOT NULL,
    "minimumHuf" INTEGER NOT NULL DEFAULT 0,
    "maximumHuf" INTEGER,
    "indulAt" TIMESTAMP(3) NOT NULL,
    "lejarAt" TIMESTAMP(3) NOT NULL,
    "felhasznalasiKeret" INTEGER,
    "aktiv" BOOLEAN NOT NULL DEFAULT false,
    "osszevonhato" BOOLEAN NOT NULL DEFAULT false,
    "kategoriak" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "cikkszamok" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Kupon_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KuponFelhasznalas" (
    "id" TEXT NOT NULL,
    "kuponId" TEXT NOT NULL,
    "kosarId" TEXT NOT NULL,
    "checkoutQuoteId" TEXT NOT NULL,
    "orderId" TEXT,
    "allapot" TEXT NOT NULL DEFAULT 'RESERVED',
    "kedvezmenyHuf" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    CONSTRAINT "KuponFelhasznalas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Kupon_kod_key" ON "Kupon"("kod");
CREATE INDEX "Kupon_aktiv_indulAt_lejarAt_idx" ON "Kupon"("aktiv", "indulAt", "lejarAt");
CREATE UNIQUE INDEX "KuponFelhasznalas_checkoutQuoteId_key" ON "KuponFelhasznalas"("checkoutQuoteId");
CREATE UNIQUE INDEX "KuponFelhasznalas_orderId_key" ON "KuponFelhasznalas"("orderId");
CREATE INDEX "KuponFelhasznalas_kuponId_allapot_createdAt_idx" ON "KuponFelhasznalas"("kuponId", "allapot", "createdAt");
CREATE INDEX "KuponFelhasznalas_kosarId_allapot_idx" ON "KuponFelhasznalas"("kosarId", "allapot");

ALTER TABLE "KuponFelhasznalas" ADD CONSTRAINT "KuponFelhasznalas_kuponId_fkey" FOREIGN KEY ("kuponId") REFERENCES "Kupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KuponFelhasznalas" ADD CONSTRAINT "KuponFelhasznalas_kosarId_fkey" FOREIGN KEY ("kosarId") REFERENCES "Kosar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KuponFelhasznalas" ADD CONSTRAINT "KuponFelhasznalas_checkoutQuoteId_fkey" FOREIGN KEY ("checkoutQuoteId") REFERENCES "CheckoutQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
