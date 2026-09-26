import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure, router } from "@/lib/trpc";
import bcrypt from "bcryptjs";
import { setVerifyToken } from "@/lib/redis";

const signupRouter = router({
  start: publicProcedure
    .input(
      z.object({
        phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const existing = await prisma.account.findFirst({
          where: { phone: input.phone },
        });

        if (existing) {
          return { success: false, error: "Account already exists" };
        }

        const passwordHash = await bcrypt.hash(input.password, 12);
        const token = crypto.randomUUID();

        const stored = await setVerifyToken(token, {
          phone: input.phone,
          passwordHash,
        });

        if (!stored) {
          return { success: false, error: "Temporary storage unavailable. Please try again later." };
        }

        const botUsername = process.env.TELEGRAM_BOT_USERNAME || "loyaltysphere_bot";
        const telegramUrl = `https://t.me/${botUsername}?start=${token}`;

        return { success: true, telegramUrl };
      } catch (err) {
        console.error("Signup error:", err);
        return { success: false, error: "Internal error. Please try again later." };
      }
    }),
});

export default signupRouter;
