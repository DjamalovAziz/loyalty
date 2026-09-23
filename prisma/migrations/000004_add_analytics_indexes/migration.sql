-- Add composite index for analytics queries
CREATE INDEX "Transaction_businessId_createdAt_idx" ON "Transaction"("businessId", "createdAt");

-- Add index for membership analytics
CREATE INDEX "Membership_businessId_points_idx" ON "Membership"("businessId", "points");

-- Add index for support ticket analytics
CREATE INDEX "SupportTicket_businessId_status_createdAt_idx" ON "SupportTicket"("businessId", "status", "createdAt");
