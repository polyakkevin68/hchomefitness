CREATE TABLE "CheckoutQuote" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "kosarId" TEXT NOT NULL,
    "cartVersion" INTEGER NOT NULL,
    "itemSnapshots" JSONB NOT NULL,
    "szallitasiMod" TEXT NOT NULL,
    "termekOsszegHuf" INTEGER NOT NULL,
    "szallitasHuf" INTEGER NOT NULL,
    "fizetendoHuf" INTEGER NOT NULL,
    "arSzabalyVerzio" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CheckoutQuote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CheckoutQuote_tokenHash_key" ON "CheckoutQuote"("tokenHash");
CREATE INDEX "CheckoutQuote_kosarId_expiresAt_idx" ON "CheckoutQuote"("kosarId", "expiresAt");
CREATE INDEX "CheckoutQuote_expiresAt_idx" ON "CheckoutQuote"("expiresAt");
ALTER TABLE "CheckoutQuote" ADD CONSTRAINT "CheckoutQuote_kosarId_fkey"
  FOREIGN KEY ("kosarId") REFERENCES "Kosar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
