ALTER TABLE "Order" ADD COLUMN "fiokId" TEXT;

CREATE TABLE "VasarloiFiok" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "jelszoHash" TEXT NOT NULL,
    "nev" TEXT NOT NULL DEFAULT '',
    "emailIgazolvaAt" TIMESTAMP(3),
    "letiltvaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VasarloiFiok_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VasarloiMunkamenet" (
    "id" TEXT NOT NULL,
    "fiokId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VasarloiMunkamenet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VasarloiEmailIgazolas" (
    "id" TEXT NOT NULL,
    "fiokId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VasarloiEmailIgazolas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VasarloiCim" (
    "id" TEXT NOT NULL,
    "fiokId" TEXT NOT NULL,
    "nev" TEXT NOT NULL,
    "iranyitoszam" TEXT NOT NULL,
    "telepules" TEXT NOT NULL,
    "cim" TEXT NOT NULL,
    "alapertelmezett" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VasarloiCim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VasarloiFiok_email_key" ON "VasarloiFiok"("email");
CREATE INDEX "VasarloiFiok_emailIgazolvaAt_letiltvaAt_idx" ON "VasarloiFiok"("emailIgazolvaAt", "letiltvaAt");
CREATE UNIQUE INDEX "VasarloiMunkamenet_tokenHash_key" ON "VasarloiMunkamenet"("tokenHash");
CREATE INDEX "VasarloiMunkamenet_fiokId_expiresAt_idx" ON "VasarloiMunkamenet"("fiokId", "expiresAt");
CREATE INDEX "VasarloiMunkamenet_expiresAt_idx" ON "VasarloiMunkamenet"("expiresAt");
CREATE UNIQUE INDEX "VasarloiEmailIgazolas_tokenHash_key" ON "VasarloiEmailIgazolas"("tokenHash");
CREATE INDEX "VasarloiEmailIgazolas_fiokId_expiresAt_idx" ON "VasarloiEmailIgazolas"("fiokId", "expiresAt");
CREATE INDEX "VasarloiCim_fiokId_alapertelmezett_idx" ON "VasarloiCim"("fiokId", "alapertelmezett");
CREATE INDEX "Order_fiokId_idx" ON "Order"("fiokId");

ALTER TABLE "Order" ADD CONSTRAINT "Order_fiokId_fkey" FOREIGN KEY ("fiokId") REFERENCES "VasarloiFiok"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VasarloiMunkamenet" ADD CONSTRAINT "VasarloiMunkamenet_fiokId_fkey" FOREIGN KEY ("fiokId") REFERENCES "VasarloiFiok"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VasarloiEmailIgazolas" ADD CONSTRAINT "VasarloiEmailIgazolas_fiokId_fkey" FOREIGN KEY ("fiokId") REFERENCES "VasarloiFiok"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VasarloiCim" ADD CONSTRAINT "VasarloiCim_fiokId_fkey" FOREIGN KEY ("fiokId") REFERENCES "VasarloiFiok"("id") ON DELETE CASCADE ON UPDATE CASCADE;
