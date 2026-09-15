import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "~/server/api/trpc";

export const adminRouter = createTRPCRouter({
  overview: adminProcedure.query(async ({ ctx }) => {
    const [businessCount, ownerCount, staffCount, clientCount, txCount] = await Promise.all([
      ctx.db.business.count(),
      ctx.db.user.count({ where: { role: "BUSINESS_OWNER" } }),
      ctx.db.user.count({ where: { role: "STAFF" } }),
      ctx.db.client.count(),
      ctx.db.transaction.count(),
    ]);
    return { businessCount, ownerCount, staffCount, clientCount, txCount };
  }),

  listBusinesses: adminProcedure.query(({ ctx }) =>
    ctx.db.business.findMany({
      include: {
        owner: { select: { name: true, phoneNumber: true, verified: true } },
        _count: { select: { clients: true, staff: true, transactions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ),

  listUsers: adminProcedure
    .input(z.object({ role: z.enum(["BUSINESS_OWNER", "STAFF"]).optional() }).optional())
    .query(({ ctx, input }) =>
      ctx.db.user.findMany({
        where: input?.role ? { role: input.role } : { role: { in: ["BUSINESS_OWNER", "STAFF"] } },
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          role: true,
          verified: true,
          createdAt: true,
          business: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ),

  setBusinessOwnerVerified: adminProcedure
    .input(z.object({ userId: z.string().uuid(), verified: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.db.user.update({ where: { id: input.userId }, data: { verified: input.verified } }),
    ),

  // Registers the Telegram webhook by calling Telegram's API from the server (Vercel),
  // not from your machine — useful when your local network can't reach api.telegram.org
  // (common with some ISPs) but the deployed app can.
  setTelegramWebhook: adminProcedure.mutation(async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!token || !secret || !appUrl) {
      throw new Error("Missing TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, or NEXT_PUBLIC_APP_URL");
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: `${appUrl}/api/telegram/webhook`,
        secret_token: secret,
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
    return data as { ok: true; result: boolean; description: string };
  }),

  getTelegramWebhookInfo: adminProcedure.query(async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const data = await res.json();
    return data.result as {
      url: string;
      has_custom_certificate: boolean;
      pending_update_count: number;
      last_error_date?: number;
      last_error_message?: string;
    };
  }),
});
