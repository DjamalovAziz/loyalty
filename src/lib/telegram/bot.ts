import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { prisma } from "@/lib/prisma";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

bot.start(async (ctx) => {
  const chatId = ctx.chat.id;
  const from = ctx.from;

  await prisma.account.upsert({
    where: { email: String(chatId) },
    update: {},
    create: {
      name: from?.first_name || "User",
      email: String(chatId),
      role: "CUSTOMER",
    },
  });

  await ctx.reply(
    "Welcome to LoyaltySphere! By using this bot, you agree to our Terms of Service and Privacy Policy."
  );
});

bot.on(message("text"), async (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith("/start")) {
    const chatId = ctx.chat.id;
    const from = ctx.from;

    await prisma.account.upsert({
      where: { email: String(chatId) },
      update: {},
      create: {
        name: from?.first_name || "User",
        email: String(chatId),
        role: "CUSTOMER",
      },
    });

    await ctx.reply(
      "Welcome! You are now registered. Use /help to see available commands."
    );
  }
});

export default bot;
