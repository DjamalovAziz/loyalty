-- Migration: add telegram verification table
-- Run this SQL against your database when the Supabase connection is fixed.

CREATE TABLE IF NOT EXISTS "TelegramVerification" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "chatId" TEXT NOT NULL UNIQUE,
    "verifyToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramVerification_pkey" PRIMARY KEY ("id")
);
