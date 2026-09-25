-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "merchantRef" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'CREATED',
    "amountHuf" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'HUF',
    "attemptNo" INTEGER NOT NULL,
    "paymentUrl" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventFingerprint" TEXT NOT NULL,
    "eventKey" TEXT,
    "paymentAttemptId" TEXT,
    "verifiedState" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "paymentAttemptId" TEXT NOT NULL,
    "amountHuf" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'REQUESTED',
    "providerRefundId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_merchantRef_key" ON "PaymentAttempt"("merchantRef");

-- CreateIndex
CREATE INDEX "PaymentAttempt_state_createdAt_idx" ON "PaymentAttempt"("state", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_orderId_attemptNo_key" ON "PaymentAttempt"("orderId", "attemptNo");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_provider_providerPaymentId_key" ON "PaymentAttempt"("provider", "providerPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_orderId_idempotencyKey_key" ON "PaymentAttempt"("orderId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentEvent_receivedAt_processedAt_idx" ON "PaymentEvent"("receivedAt", "processedAt");

-- CreateIndex
CREATE INDEX "PaymentEvent_paymentAttemptId_receivedAt_idx" ON "PaymentEvent"("paymentAttemptId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_provider_eventFingerprint_key" ON "PaymentEvent"("provider", "eventFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_idempotencyKey_key" ON "Refund"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Refund_paymentAttemptId_state_idx" ON "Refund"("paymentAttemptId", "state");

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
