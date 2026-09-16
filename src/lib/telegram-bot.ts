import { Bot, type Context } from "grammy";
import { db } from "~/server/db";
import { getAndParse, del, keys, setWithTtl, type PendingSignup } from "~/server/redis";
import { normalizePhone, isValidE164 } from "~/lib/phone";
import bcrypt from "bcryptjs";
import { env } from "~/env";

export const bot = new Bot(env().TELEGRAM_BOT_TOKEN);

// grammY requires an explicit error boundary — without bot.catch(), any error thrown
// inside a handler (a failed Prisma query, a Redis timeout, anything) becomes an
// unhandled rejection that propagates all the way up through webhookCallback(), and
// Next.js turns that into a bare 500 with the actual cause visible only as an
// "Unhandled Rejection" stack in Vercel's function logs — easy to miss, easy to
// mistake for an infra problem instead of an application bug. Log it loudly here.
bot.catch((err) => {
  console.error("[telegram-bot] unhandled error in update handler", {
    updateType: err.ctx.update.update_id,
    message: err.error instanceof Error ? err.error.message : String(err.error),
    stack: err.error instanceof Error ? err.error.stack : undefined,
  });
});

// /start <token> — Business Owner registration deep link
bot.command("start", async (ctx) => {
  const token = ctx.match?.trim();
  if (!token) {
    await ctx.reply(
      "👋 Welcome! To finish registration, open the link from the signup page, or send /register to link an existing account.",
    );
    return;
  }
  await ctx.reply(
    "Tap the button below to share your phone number automatically (recommended), " +
      "or just type it here in international format, e.g. +998901234567.",
    {
      reply_markup: {
        keyboard: [[{ text: "📱 Share my phone number", request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    },
  );
  // Stash the token against this chat so we know which pending signup to match on contact share.
  await setWithTtl(`start-session:${ctx.chat.id}`, token, 600);
});

/**
 * Shared by both the contact-share button (message:contact) and manually-typed phone
 * numbers (message:text): verifies the phone against a pending signup, or — if there's
 * no pending signup — links the chat for OTP delivery as an existing client.
 */
async function handleIncomingPhone(ctx: Context, realPhone: string) {
  const chatId = ctx.chat!.id;

  const token = await getAndParse<string>(`start-session:${chatId}`);
  if (token) {
    const pending = await getAndParse<PendingSignup>(keys.signupVerify(token));
    if (!pending) {
      await ctx.reply("This registration link expired. Please sign up again.");
      return;
    }
    const pendingPhone = normalizePhone(pending.phone_number);
    if (pendingPhone !== realPhone) {
      await ctx.reply(
        `❌ Error: phone number does not match your registration (you entered a number ending in ${realPhone.slice(-4)}). Please try again or restart signup on the website.`,
      );
      return;
    }

    const existing = await db.user.findUnique({ where: { phoneNumber: pendingPhone } });
    if (!existing) {
      const owner = await db.user.create({
        data: {
          name: pending.name,
          phoneNumber: pendingPhone,
          passwordHash: pending.password_hash,
          role: "BUSINESS_OWNER",
          verified: true,
          telegramChatId: String(chatId),
        },
      });
      await db.business.create({
        data: {
          name: `${owner.name}'s Business`,
          slug: `${owner.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${owner.id.slice(0, 6)}`,
          ownerId: owner.id,
        },
      });
    }

    await del(keys.signupVerify(token));
    await del(`start-session:${chatId}`);
    await ctx.reply("✅ Registration complete! You can now sign in on the website.");
    return;
  }

  // No pending signup token: treat as a client linking their Telegram chat for OTP delivery.
  await db.client.updateMany({
    where: { phoneNumber: realPhone },
    data: { telegramChatId: String(chatId) },
  });
  await ctx.reply("Your Telegram account is now linked for OTP delivery.");
}

// Contact share handler (the "📱 Share my phone number" button).
bot.on("message:contact", async (ctx) => {
  const contact = ctx.message.contact;
  if (!contact) return;
  try {
    await handleIncomingPhone(ctx, normalizePhone(contact.phone_number));
  } catch (err) {
    console.error("[telegram-bot] message:contact handler failed", err);
    await ctx.reply("⚠️ Something went wrong on our end. Please try again in a moment.");
    throw err;
  }
});

// Fallback for a manually-typed phone number (not everyone taps the share-contact button).
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();
  if (text.startsWith("/")) return; // commands are handled by bot.command(...)

  const digitsOnly = text.replace(/[\s()-]/g, "");
  if (!isValidE164(digitsOnly) && !/^\d{7,15}$/.test(digitsOnly)) {
    await ctx.reply(
      "I didn't recognize that as a phone number. Tap \"📱 Share my phone number\" below, " +
        "or type it in international format, e.g. +998901234567.",
    );
    return;
  }

  try {
    await handleIncomingPhone(ctx, normalizePhone(digitsOnly));
  } catch (err) {
    console.error("[telegram-bot] message:text phone handler failed", err);
    await ctx.reply("⚠️ Something went wrong on our end. Please try again in a moment.");
    throw err;
  }
});

/** Send a plain text message to a chat (used for OTP delivery / redemption confirmations). */
export async function sendTelegramMessage(chatId: string, text: string) {
  await bot.api.sendMessage(chatId, text);
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}
