import { Bot } from "grammy";
import { db } from "~/server/db";
import { getAndParse, del, keys, setWithTtl, type PendingSignup } from "~/server/redis";
import { normalizePhone } from "~/lib/phone";
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
  await ctx.reply("Please share your phone number to verify your registration.", {
    reply_markup: {
      keyboard: [[{ text: "📱 Share my phone number", request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
  // Stash the token against this chat so we know which pending signup to match on contact share.
  await setWithTtl(`start-session:${ctx.chat.id}`, token, 600);
});

// Contact share handler — completes signup, or logs in an existing client (sends OTP).
bot.on("message:contact", async (ctx) => {
  const contact = ctx.message.contact;
  if (!contact) return;
  const chatId = ctx.chat.id;
  const realPhone = normalizePhone(contact.phone_number);

  try {
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
          "❌ Error: Phone number does not match registration details.",
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
      const appUrl = env().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
      await ctx.reply(
        `✅ Registration complete! You can now sign in on the website:\n${appUrl}/owner/signin`,
      );
      return;
    }

    // No pending signup token: treat as a client linking their Telegram chat for OTP delivery.
    await db.client.updateMany({
      where: { phoneNumber: realPhone },
      data: { telegramChatId: String(chatId) },
    });
    await ctx.reply("Your Telegram account is now linked for OTP delivery.");
  } catch (err) {
    console.error("[telegram-bot] message:contact handler failed", err);
    await ctx.reply("⚠️ Something went wrong on our end. Please try again in a moment.");
    throw err; // still bubble up to bot.catch()/webhookCallback for the 5xx + Telegram retry
  }
});

/** Send a plain text message to a chat (used for OTP delivery / redemption confirmations). */
export async function sendTelegramMessage(chatId: string, text: string) {
  await bot.api.sendMessage(chatId, text);
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}
