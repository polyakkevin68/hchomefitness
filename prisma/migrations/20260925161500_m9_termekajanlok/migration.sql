CREATE TABLE "TermekAjanlo" (
    "id" TEXT NOT NULL,
    "forrasTermekId" TEXT NOT NULL,
    "celTermekId" TEXT NOT NULL,
    "sorrend" INTEGER NOT NULL DEFAULT 0,
    "aktiv" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "frissitveAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TermekAjanlo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TermekAjanlo_forrasTermekId_celTermekId_key" ON "TermekAjanlo"("forrasTermekId", "celTermekId");
CREATE INDEX "TermekAjanlo_forrasTermekId_aktiv_sorrend_idx" ON "TermekAjanlo"("forrasTermekId", "aktiv", "sorrend");
CREATE INDEX "TermekAjanlo_celTermekId_idx" ON "TermekAjanlo"("celTermekId");

ALTER TABLE "TermekAjanlo" ADD CONSTRAINT "TermekAjanlo_forrasTermekId_fkey" FOREIGN KEY ("forrasTermekId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TermekAjanlo" ADD CONSTRAINT "TermekAjanlo_celTermekId_fkey" FOREIGN KEY ("celTermekId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
