-- Add phone column to Account
ALTER TABLE "Account" ADD COLUMN "phone" TEXT;

-- Copy existing email values to phone (they already contain phone/chat identifiers)
UPDATE "Account" SET "phone" = "email" WHERE "phone" IS NULL;

-- Drop email column
ALTER TABLE "Account" DROP COLUMN "email";

-- Make phone not nullable and add unique constraint
ALTER TABLE "Account" ALTER COLUMN "phone" SET NOT NULL;
CREATE UNIQUE INDEX "Account_phone_key" ON "Account"("phone");

-- Drop old email index if exists
DROP INDEX IF EXISTS "Account_email_key";
