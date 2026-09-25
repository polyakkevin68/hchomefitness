CREATE TABLE "VasarloiBelepesiProba" (
    "id" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "forrasHash" TEXT NOT NULL,
    "sikeres" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VasarloiBelepesiProba_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VasarloiBelepesiProba_emailHash_sikeres_createdAt_idx" ON "VasarloiBelepesiProba"("emailHash", "sikeres", "createdAt");
CREATE INDEX "VasarloiBelepesiProba_createdAt_idx" ON "VasarloiBelepesiProba"("createdAt");
