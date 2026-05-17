ALTER TABLE "Order"
  ADD COLUMN "sessionId" TEXT,
  ADD COLUMN "contactName" TEXT,
  ADD COLUMN "contactPhone" TEXT,
  ADD COLUMN "paymentMethod" TEXT,
  ADD COLUMN "shippingMethod" TEXT;

CREATE INDEX "Order_sessionId_idx" ON "Order"("sessionId");
