import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { prisma } from "@/lib/prisma";
import { getVerifyToken, deleteVerifyToken } from "@/lib/redis";

const signupSessions = new Map<string, { token: string; phone: string }>();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

bot.start(async (ctx) => {
  const text = ctx.message.text || "";
  const parts = text.split(" ");
  const token = parts[1];

  if (token) {
    const signupData = await getVerifyToken(token);
    if (!signupData) {
      await ctx.reply("Invalid or expired signup token.");
      return;
    }

    signupSessions.set(String(ctx.chat.id), { token, phone: signupData.phone });

    await ctx.reply(
      "Please share your phone number to complete registration.",
      {
        reply_markup: {
          keyboard: [
            [{ text: "Share phone", request_contact: true }],
          ],
          one_time_keyboard: true,
          resize_keyboard: true,
        },
      }
    );
    return;
  }

  await ctx.reply(
    "Welcome to LoyaltySphere! Please send your phone number to register or link your account."
  );
});

bot.on(message("contact"), async (ctx) => {
  const contact = ctx.message.contact;
  if (!contact || !contact.phone_number) {
    await ctx.reply("Phone number is required.");
    return;
  }

  const chatId = String(ctx.chat.id);
  const session = signupSessions.get(chatId);

  if (!session) {
    await ctx.reply("No signup session found. Please start from the web app.");
    return;
  }

  const signupData = await getVerifyToken(session.token);
  if (!signupData) {
    await ctx.reply("Invalid or expired signup token.");
    signupSessions.delete(chatId);
    return;
  }

  const normalizedFromTelegram = contact.phone_number.replace(/\D/g, "");
  const normalizedFromRedis = signupData.phone.replace(/\D/g, "");

  if (normalizedFromTelegram !== normalizedFromRedis) {
    await ctx.reply("Phone numbers do not match. Registration cancelled.");
    await deleteVerifyToken(session.token);
    signupSessions.delete(chatId);
    return;
  }

  const account = await prisma.account.upsert({
    where: { phone: signupData.phone },
    update: { passwordHash: signupData.passwordHash },
    create: {
      name: signupData.phone,
      phone: signupData.phone,
      passwordHash: signupData.passwordHash,
      role: "CUSTOMER",
    },
  });

  await prisma.customer.upsert({
    where: { accountId: account.id },
    update: { telegramId: chatId },
    create: {
      accountId: account.id,
      phone: signupData.phone,
      telegramId: chatId,
    },
  });

  await deleteVerifyToken(session.token);
  signupSessions.delete(chatId);

  await ctx.reply(
    "Registration successful! You can now use the app.",
    {
      reply_markup: { remove_keyboard: true },
    }
  );

  await ctx.reply(
    `Open the app: ${process.env.NEXT_PUBLIC_APP_URL || "https://loyalty-aziz.vercel.app"}/auth/signin`
  );
});

export default bot;
