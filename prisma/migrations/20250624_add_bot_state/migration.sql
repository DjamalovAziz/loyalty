-- Migration: add bot_state table for registration flow
-- Run this SQL against your database when the Supabase connection is fixed.

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
