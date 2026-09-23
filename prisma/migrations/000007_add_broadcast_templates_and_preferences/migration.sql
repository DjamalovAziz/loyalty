-- Create BroadcastTemplate model
CREATE TABLE "BroadcastTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessId" TEXT NOT NULL,

    CONSTRAINT "BroadcastTemplate_pkey" PRIMARY KEY ("id")
);

-- Create indexes for BroadcastTemplate
CREATE INDEX "BroadcastTemplate_businessId_idx" ON "BroadcastTemplate"("businessId");
CREATE INDEX "BroadcastTemplate_segment_idx" ON "BroadcastTemplate"("segment");

-- Create foreign key for BroadcastTemplate
ALTER TABLE "BroadcastTemplate" ADD CONSTRAINT "BroadcastTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Create BroadcastPreference model
CREATE TABLE "BroadcastPreference" (
    "id" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "optIn" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" TEXT NOT NULL,

    CONSTRAINT "BroadcastPreference_pkey" PRIMARY KEY ("id")
);

-- Create indexes for BroadcastPreference
CREATE UNIQUE INDEX "BroadcastPreference_customerId_segment_key" ON "BroadcastPreference"("customerId", "segment");
CREATE INDEX "BroadcastPreference_customerId_idx" ON "BroadcastPreference"("customerId");

-- Create foreign key for BroadcastPreference
ALTER TABLE "BroadcastPreference" ADD CONSTRAINT "BroadcastPreference_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"(id) ON DELETE CASCADE ON UPDATE CASCADE;
