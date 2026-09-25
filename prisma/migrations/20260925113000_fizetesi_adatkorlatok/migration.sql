ALTER TABLE "PaymentAttempt"
  ADD CONSTRAINT "PaymentAttempt_amountHuf_positive_check" CHECK ("amountHuf" > 0),
  ADD CONSTRAINT "PaymentAttempt_attemptNo_positive_check" CHECK ("attemptNo" > 0),
  ADD CONSTRAINT "PaymentAttempt_merchantRef_nonempty_check" CHECK (length(btrim("merchantRef")) > 0),
  ADD CONSTRAINT "PaymentAttempt_currency_nonempty_check" CHECK (length(btrim("currency")) > 0);

ALTER TABLE "PaymentEvent"
  ADD CONSTRAINT "PaymentEvent_fingerprint_nonempty_check" CHECK (length(btrim("eventFingerprint")) > 0);

ALTER TABLE "Refund"
  ADD CONSTRAINT "Refund_amountHuf_positive_check" CHECK ("amountHuf" > 0),
  ADD CONSTRAINT "Refund_reason_nonempty_check" CHECK (length(btrim("reason")) BETWEEN 1 AND 500);
