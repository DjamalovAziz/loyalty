/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return new Response("OK", { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const secret = req.headers.get("x-telegram-bot-api-secret-token");

    if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { Telegraf } = await import("telegraf");
    const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

    bot.start((ctx: any) => ctx.reply("Welcome to LoyaltySphere Bot!"));

    bot.on("text", async (ctx: any) => {
      const telegramId = String(ctx.from!.id);
      const username = ctx.from!.username;
      const { prisma } = await import("@/lib/prisma");

      let customer = await prisma.customer.findUnique({
        where: { telegramId },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            phone: `tg:${telegramId}`,
            telegramId,
            telegramUsername: username || undefined,
            name: ctx.from!.first_name || undefined,
            isVerified: true,
          },
        });
      }

      await ctx.reply(
        `Hello ${customer.name || "there"}! Your customer ID is: ${customer.id}`
      );
    });

    bot.command("help", (ctx: any) => {
      ctx.reply("Available commands: /start, /help, /me");
    });

    bot.command("me", async (ctx: any) => {
      const telegramId = String(ctx.from!.id);
      const { prisma } = await import("@/lib/prisma");
      const customer = await prisma.customer.findUnique({
        where: { telegramId },
        include: {
          memberships: {
            where: { isActive: true },
            include: {
              business: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
      });

      if (!customer) {
        return ctx.reply("Customer not found. Please send /start to register.");
      }

      const lines: string[] = [`Hello ${customer.name || "there"}!`, "", "Your memberships:"];
      customer.memberships.forEach((m: any) => {
        lines.push(`• ${m.business.name}: ${m.points} points (${m.tier})`);
      });

      ctx.reply(lines.join("\n"));
    });

    await bot.handleUpdate(body as any);

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Webhook failed", { status: 500 });
  }
}
