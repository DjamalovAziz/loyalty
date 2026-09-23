-- Create enum types
CREATE TYPE "AccountRole" AS ENUM ('SUPER_ADMIN', 'OWNER', 'STAFF', 'CUSTOMER');
CREATE TYPE "ActorType" AS ENUM ('CUSTOMER', 'OWNER', 'STAFF', 'SYSTEM', 'ADMIN');
CREATE TYPE "TransactionType" AS ENUM ('EARN', 'REDEEM', 'ADJUSTMENT', 'EXPIRE', 'WELCOME');
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "TicketSource" AS ENUM ('CUSTOMER', 'STAFF', 'ADMIN', 'SYSTEM');
CREATE TYPE "RuleType" AS ENUM ('REFERRAL', 'BIRTHDAY', 'ANNIVERSARY', 'SPENDING_THRESHOLD', 'VISIT_COUNT', 'INACTIVITY', 'TIER_UPGRADE', 'PROMO');
CREATE TYPE "StaffRole" AS ENUM ('CASHIER', 'MANAGER', 'OWNER');

-- Create all tables
CREATE TABLE "Account" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "emailVerified" TIMESTAMP(3),
  "passwordHash" TEXT,
  "image" TEXT,
  "role" "AccountRole" NOT NULL DEFAULT 'CUSTOMER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier", "token")
);

CREATE TABLE "Customer" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "telegramId" TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
  "anonExpiresAt" TIMESTAMP(3),
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Business" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "address" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "logoUrl" TEXT,
  "welcomePoints" INTEGER NOT NULL DEFAULT 0,
  "minimumCashback" INTEGER NOT NULL DEFAULT 0,
  "telegramGroupId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ownerId" TEXT NOT NULL,
  CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Membership" (
  "id" TEXT NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 0,
  "tier" TEXT NOT NULL DEFAULT 'BRONZE',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastEarnAt" TIMESTAMP(3),
  "lastRedeemAt" TIMESTAMP(3),
  "customerId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Transaction" (
  "id" TEXT NOT NULL,
  "type" "TransactionType" NOT NULL,
  "amount" INTEGER NOT NULL,
  "balanceBefore" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "reason" TEXT,
  "referenceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorType" "ActorType" NOT NULL,
  "actorId" TEXT NOT NULL,
  "membershipId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Adjustment" (
  "id" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorId" TEXT NOT NULL,
  "actorType" "ActorType" NOT NULL,
  "originalId" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  CONSTRAINT "Adjustment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LoyaltyRule" (
  "id" TEXT NOT NULL,
  "type" "RuleType" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "businessId" TEXT NOT NULL,
  CONSTRAINT "LoyaltyRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportTicket" (
  "id" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
  "source" "TicketSource" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "customerId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportMessage" (
  "id" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "source" "TicketSource" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ticketId" TEXT NOT NULL,
  CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StaffAccount" (
  "id" TEXT NOT NULL,
  "pinHash" TEXT NOT NULL,
  "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accountId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  CONSTRAINT "StaffAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StaffPermission" (
  "id" TEXT NOT NULL,
  "role" "StaffRole" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "staffId" TEXT NOT NULL,
  CONSTRAINT "StaffPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StaffInvite" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "role" "StaffRole" NOT NULL DEFAULT 'CASHIER',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "businessId" TEXT NOT NULL,
  CONSTRAINT "StaffInvite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorType" "ActorType" NOT NULL,
  "actorId" TEXT NOT NULL,
  "target" TEXT,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "businessId" TEXT NOT NULL,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OtpCode" (
  "id" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accountId" TEXT NOT NULL,
  CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");
CREATE UNIQUE INDEX "Account_customer_key" ON "Customer"("accountId");
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE UNIQUE INDEX "Transaction_idempotencyKey_key" ON "Transaction"("idempotencyKey");
CREATE UNIQUE INDEX "StaffInvite_code_key" ON "StaffInvite"("code");
CREATE UNIQUE INDEX "Membership_customerId_businessId_key" ON "Membership"("customerId", "businessId");
CREATE UNIQUE INDEX "StaffAccount_accountId_businessId_key" ON "StaffAccount"("accountId", "businessId");
CREATE UNIQUE INDEX "StaffPermission_staffId_role_key" ON "StaffPermission"("staffId", "role");

-- Indexes
CREATE INDEX "Account_role_idx" ON "Account"("role");
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");
CREATE INDEX "Customer_telegramId_idx" ON "Customer"("telegramId");
CREATE INDEX "Business_slug_idx" ON "Business"("slug");
CREATE INDEX "Business_ownerId_idx" ON "Business"("ownerId");
CREATE INDEX "Membership_customerId_idx" ON "Membership"("customerId");
CREATE INDEX "Membership_businessId_idx" ON "Membership"("businessId");
CREATE INDEX "Transaction_membershipId_idx" ON "Transaction"("membershipId");
CREATE INDEX "Transaction_customerId_idx" ON "Transaction"("customerId");
CREATE INDEX "Transaction_businessId_idx" ON "Transaction"("businessId");
CREATE INDEX "Transaction_type_createdAt_idx" ON "Transaction"("type", "createdAt");
CREATE INDEX "SupportTicket_customerId_idx" ON "SupportTicket"("customerId");
CREATE INDEX "SupportTicket_businessId_idx" ON "SupportTicket"("businessId");
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX "AuditLog_businessId_createdAt_idx" ON "AuditLog"("businessId", "createdAt");
CREATE INDEX "AuditLog_actorType_actorId_idx" ON "AuditLog"("actorType", "actorId");
CREATE INDEX "OtpCode_accountId_idx" ON "OtpCode"("accountId");
CREATE INDEX "OtpCode_expiresAt_idx" ON "OtpCode"("expiresAt");

-- DB invariants
ALTER TABLE "Membership" ADD CONSTRAINT "membership_points_non_negative" CHECK ("points" >= 0);

-- Append-only triggers (protect against UPDATE/DELETE on ledger tables)
CREATE OR REPLACE FUNCTION prevent_ledger_modification() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Ledger table % is append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaction_append_only BEFORE UPDATE OR DELETE ON "Transaction" FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();
CREATE TRIGGER auditlog_append_only BEFORE UPDATE OR DELETE ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();

-- Foreign keys
ALTER TABLE "Session" ADD CONSTRAINT "Session_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE;
ALTER TABLE "Business" ADD CONSTRAINT "Business_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Account"("id");
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id");
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id");
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id");
ALTER TABLE "Adjustment" ADD CONSTRAINT "Adjustment_originalId_fkey" FOREIGN KEY ("originalId") REFERENCES "Transaction"("id");
ALTER TABLE "Adjustment" ADD CONSTRAINT "Adjustment_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Transaction"("id");
ALTER TABLE "LoyaltyRule" ADD CONSTRAINT "LoyaltyRule_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id");
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id");
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE;
ALTER TABLE "StaffAccount" ADD CONSTRAINT "StaffAccount_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE;
ALTER TABLE "StaffAccount" ADD CONSTRAINT "StaffAccount_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE;
ALTER TABLE "StaffPermission" ADD CONSTRAINT "StaffPermission_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffAccount"("id") ON DELETE CASCADE;
ALTER TABLE "StaffInvite" ADD CONSTRAINT "StaffInvite_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE;
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE;
