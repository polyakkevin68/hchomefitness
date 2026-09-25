ALTER TABLE "Invoice"
ADD COLUMN "documentPdf" BYTEA,
ADD COLUMN "documentSha256" TEXT;

CREATE UNIQUE INDEX "Invoice_orderId_key" ON "Invoice"("orderId");
