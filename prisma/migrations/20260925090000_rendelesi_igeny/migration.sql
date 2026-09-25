ALTER TABLE "Order"
  ADD COLUMN "paymentState" TEXT NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN "productTotalHuf" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "shippingFeeHuf" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "shippingMethod" TEXT NOT NULL DEFAULT 'hazhoz',
  ADD COLUMN "customerName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "customerPhone" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "addressSnapshot" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "itemSnapshots" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "sourceQuoteId" TEXT,
  ADD COLUMN "sessionHash" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "guestAccessHash" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "requestHash" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "stockConfirmationNote" TEXT,
  ADD COLUMN "stockConfirmedAt" TIMESTAMP(3);

DROP INDEX IF EXISTS "Order_idempotencyKey_key";

CREATE UNIQUE INDEX "Order_sessionHash_idempotencyKey_key" ON "Order"("sessionHash", "idempotencyKey");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX "Order_guestAccessHash_idx" ON "Order"("guestAccessHash");

CREATE TABLE "OrderEvent" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");
