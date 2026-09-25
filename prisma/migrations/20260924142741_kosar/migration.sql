-- CreateTable
CREATE TABLE "Kosar" (
    "id" TEXT NOT NULL,
    "sessionHash" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kosar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KosarTetel" (
    "id" TEXT NOT NULL,
    "kosarId" TEXT NOT NULL,
    "termekId" TEXT NOT NULL,
    "mennyiseg" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KosarTetel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Kosar_sessionHash_key" ON "Kosar"("sessionHash");

-- CreateIndex
CREATE INDEX "Kosar_expiresAt_idx" ON "Kosar"("expiresAt");

-- CreateIndex
CREATE INDEX "KosarTetel_termekId_idx" ON "KosarTetel"("termekId");

-- CreateIndex
CREATE UNIQUE INDEX "KosarTetel_kosarId_termekId_key" ON "KosarTetel"("kosarId", "termekId");

-- AddForeignKey
ALTER TABLE "KosarTetel" ADD CONSTRAINT "KosarTetel_kosarId_fkey" FOREIGN KEY ("kosarId") REFERENCES "Kosar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KosarTetel" ADD CONSTRAINT "KosarTetel_termekId_fkey" FOREIGN KEY ("termekId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
