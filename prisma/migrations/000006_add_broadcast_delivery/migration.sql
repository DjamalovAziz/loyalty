-- Create BroadcastDelivery model
CREATE TABLE "BroadcastDelivery" (
    "id" TEXT NOT NULL,
    "queueId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "telegramId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BroadcastDelivery_pkey" PRIMARY KEY ("id")
);

-- Create indexes for BroadcastDelivery
CREATE INDEX "BroadcastDelivery_queueId_status_idx" ON "BroadcastDelivery"("queueId", "status");
CREATE INDEX "BroadcastDelivery_customerId_idx" ON "BroadcastDelivery"("customerId");

-- Create foreign key for BroadcastDelivery
ALTER TABLE "BroadcastDelivery" ADD CONSTRAINT "BroadcastDelivery_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "BroadcastQueue"(id) ON DELETE CASCADE ON UPDATE CASCADE;
