CREATE TABLE "HirlevelFeliratkozas" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hozzajarultAt" TIMESTAMP(3) NOT NULL,
    "hozzajarulasVerzio" TEXT NOT NULL DEFAULT 'hirlevel-2026-09',
    "igazolasHash" TEXT NOT NULL,
    "igazolasLejarAt" TIMESTAMP(3) NOT NULL,
    "igazolvaAt" TIMESTAMP(3),
    "leiratkozasHash" TEXT NOT NULL,
    "leiratkozottAt" TIMESTAMP(3),
    "szolgaltatoiAllapot" TEXT NOT NULL DEFAULT 'PENDING',
    "szolgaltatoiUzenetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HirlevelFeliratkozas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HirlevelFeliratkozas_email_key" ON "HirlevelFeliratkozas"("email");
CREATE INDEX "HirlevelFeliratkozas_igazolvaAt_leiratkozottAt_idx" ON "HirlevelFeliratkozas"("igazolvaAt", "leiratkozottAt");
CREATE INDEX "HirlevelFeliratkozas_igazolasLejarAt_idx" ON "HirlevelFeliratkozas"("igazolasLejarAt");
