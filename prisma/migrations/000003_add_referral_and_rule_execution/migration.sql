-- CreateReferral model
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "rewardPoints" INTEGER NOT NULL DEFAULT 0,
    "isRewarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- Create unique index for referral
CREATE UNIQUE INDEX "Referral_referrerId_refereeId_businessId_key" ON "Referral"("referrerId", "refereeId", "businessId");

-- Create indexes for Referral
CREATE INDEX "Referral_businessId_idx" ON "Referral"("businessId");

-- Create foreign keys for Referral
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Customer"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "Customer"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Create RuleExecution model
CREATE TABLE "RuleExecution" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RuleExecution_pkey" PRIMARY KEY ("id")
);

-- Create unique index for RuleExecution
CREATE UNIQUE INDEX "RuleExecution_ruleId_entityId_key" ON "RuleExecution"("ruleId", "entityId");

-- Create indexes for RuleExecution
CREATE INDEX "RuleExecution_entityId_idx" ON "RuleExecution"("entityId");

-- Create foreign key for RuleExecution
ALTER TABLE "RuleExecution" ADD CONSTRAINT "RuleExecution_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "LoyaltyRule"(id) ON DELETE CASCADE ON UPDATE CASCADE;
