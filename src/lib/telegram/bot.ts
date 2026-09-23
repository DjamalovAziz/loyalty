import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { prisma } from "@/lib/prisma";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

bot.start(async (ctx) => {
  const chatId = String(ctx.chat.id);
  const from = ctx.from;

  await ctx.reply(
    "Welcome to LoyaltySphere! Please send your phone number to register or link your account."
  );
});

bot.on(message("text"), async (ctx) => {
  const text = ctx.message.text;
  const chatId = String(ctx.chat.id);

  if (text.startsWith("/start")) {
    await ctx.reply(
      "Welcome! Please send your phone number to register or link your account."
    );
    return;
  }

  const phone = text.trim();
  const account = await prisma.account.upsert({
    where: { phone },
    update: {},
    create: {
      name: phone,
      phone,
      role: "CUSTOMER",
    },
  });

  await prisma.customer.upsert({
    where: { accountId: account.id },
    update: { telegramId: chatId },
    create: {
      accountId: account.id,
      phone,
      telegramId: chatId,
    },
  });

  await ctx.reply(
    `Your account has been linked to phone ${phone}. You can now use the app.`
  );
});

export default bot;
