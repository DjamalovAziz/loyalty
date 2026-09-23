-- Add telegramOptOut to Customer
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "telegramOptOut" BOOLEAN NOT NULL DEFAULT false;

-- Create BroadcastQueue model
CREATE TABLE "BroadcastQueue" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BroadcastQueue_pkey" PRIMARY KEY ("id")
);

-- Create indexes for BroadcastQueue
CREATE INDEX "BroadcastQueue_businessId_status_idx" ON "BroadcastQueue"("businessId", "status");
CREATE INDEX "BroadcastQueue_createdAt_idx" ON "BroadcastQueue"("createdAt");

-- Create foreign key for BroadcastQueue
ALTER TABLE "BroadcastQueue" ADD CONSTRAINT "BroadcastQueue_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"(id) ON DELETE CASCADE ON UPDATE CASCADE;
