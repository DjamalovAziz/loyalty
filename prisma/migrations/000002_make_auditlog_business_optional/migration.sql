-- Make businessId nullable on AuditLog
ALTER TABLE "AuditLog" ALTER COLUMN "businessId" DROP NOT NULL;

-- Drop the foreign key constraint first
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_businessId_fkey";

-- Recreate as optional
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"(id) ON DELETE CASCADE NOT VALID;

-- Mark as valid
ALTER TABLE "AuditLog" VALIDATE CONSTRAINT "AuditLog_businessId_fkey";
