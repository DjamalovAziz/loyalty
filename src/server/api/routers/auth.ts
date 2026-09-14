import { randomUUID } from "crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { setWithTtl, keys, type PendingSignup } from "~/server/redis";
import { E164_REGEX, normalizePhone } from "~/lib/phone";

export const authRouter = createTRPCRouter({
  signup: publicProcedure
    .input(
      z.object({
        name: z.string().min(2),
        phone_number: z.string().regex(E164_REGEX, "Use E.164 format, e.g. +998901234567"),
        password: z.string().min(8),
      }),
    )
    .mutation(async ({ input }) => {
      const normalized = normalizePhone(input.phone_number);
      const existing = await db.user.findUnique({ where: { phoneNumber: normalized } });
      if (existing) {
        throw new Error("An account with this phone number already exists.");
      }

      const password_hash = await bcrypt.hash(input.password, 10);
      const token = randomUUID();

      const pending: PendingSignup = {
        name: input.name,
        phone_number: input.phone_number,
        password_hash,
      };
      await setWithTtl(keys.signupVerify(token), pending, 600);

      const botUsername = process.env.TELEGRAM_BOT_USERNAME;
      return {
        token,
        deepLink: `https://t.me/${botUsername}?start=${token}`,
      };
    }),
});
