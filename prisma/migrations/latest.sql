-- ============================================================
-- Migration: Add Telegram verification tables
-- Apply this SQL via Supabase Dashboard SQL Editor
-- OR run: npx supabase db execute --file prisma/migrations/latest.sql
-- ============================================================

-- Table for client phone verification via Telegram bot
CREATE TABLE IF NOT EXISTS "TelegramVerification" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "chatId" TEXT NOT NULL UNIQUE,
    "verifyToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramVerification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TelegramVerification_chatId_idx" ON "TelegramVerification"("chatId");

-- Table for bot conversation state (registration flow)
CREATE TABLE IF NOT EXISTS "BotState" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "chatId" TEXT NOT NULL UNIQUE,
    "state" TEXT NOT NULL,
    "data" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotState_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BotState_chatId_idx" ON "BotState"("chatId");
