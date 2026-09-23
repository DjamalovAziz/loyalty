import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure, protectedProcedure, router } from "@/lib/trpc";
import { otpLimiter } from "@/lib/rateLimit";
import { createHmac } from "crypto";

const customerRouter = router({
  requestLoginOtp: publicProcedure
    .input(z.object({ phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number") }))
    .mutation(async ({ input }) => {
      const { success } = await otpLimiter.limit(input.phone);
      if (!success) {
        return { sent: false, error: "Rate limit exceeded. Try again later." };
      }

      const account = await prisma.account.upsert({
        where: { phone: input.phone },
        update: {},
        create: {
          name: input.phone,
          phone: input.phone,
          role: "CUSTOMER",
        },
      });

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = createHmac("sha256", process.env.AUTH_SECRET || "fallback").update(code).digest("hex");

      await prisma.otpCode.create({
        data: {
          accountId: account.id,
          codeHash,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      await prisma.customer.upsert({
        where: { accountId: account.id },
        update: {},
        create: {
          accountId: account.id,
          phone: input.phone,
        },
      });

      console.log(`OTP for ${input.phone}: ${code}`);
      return { sent: true };
    }),

  verifyOtp: publicProcedure
    .input(z.object({ phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number"), code: z.string() }))
    .mutation(async ({ input }) => {
      const { success } = await otpLimiter.limit(input.phone);
      if (!success) {
        return { success: false, error: "Rate limit exceeded. Try again later." };
      }

      const account = await prisma.account.findFirst({
        where: { phone: input.phone, role: "CUSTOMER" },
      });

      if (!account) return { success: false };

      const otp = await prisma.otpCode.findFirst({
        where: {
          accountId: account.id,
          consumedAt: null,
          expiresAt: { gt: new Date() },
          attempts: { lt: 5 },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!otp) return { success: false };

      const isValid = createHmac("sha256", process.env.AUTH_SECRET || "fallback").update(input.code).digest("hex") === otp.codeHash;
      if (!isValid) {
        await prisma.otpCode.update({
          where: { id: otp.id },
          data: { attempts: { increment: 1 } },
        });
        return { success: false };
      }

      await prisma.otpCode.update({
        where: { id: otp.id },
        data: { consumedAt: new Date() },
      });

      return { success: true, accountId: account.id };
    }),

  join: protectedProcedure
    .input(z.object({ businessId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const account = await prisma.account.findUnique({
        where: { id: ctx.user!.id },
      });

      if (!account) {
        return { success: false, error: "Account not found" };
      }

      let customer = await prisma.customer.findUnique({
        where: { accountId: ctx.user!.id },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            accountId: ctx.user!.id,
            phone: account.phone,
          },
        });
      }

      await prisma.membership.upsert({
        where: { customerId_businessId: { customerId: customer.id, businessId: input.businessId } },
        update: { isActive: true },
        create: {
          customerId: customer.id,
          businessId: input.businessId,
        },
      });

      return { success: true };
    }),

  leave: protectedProcedure
    .input(z.object({ businessId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const customer = await prisma.customer.findUnique({
        where: { accountId: ctx.user!.id },
      });

      if (!customer) {
        return { success: false, error: "Customer not found" };
      }

      await prisma.membership.update({
        where: { customerId_businessId: { customerId: customer.id, businessId: input.businessId } },
        data: { isActive: false },
      });

      return { success: true };
    }),

  anonymize: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const customer = await prisma.customer.findFirst({
        where: { id: input.customerId, accountId: ctx.user!.id },
      });

      if (!customer) {
        return { success: false, error: "Customer not found" };
      }

      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          phone: `anon-${customer.id}`,
          firstName: null,
          lastName: null,
          telegramId: null,
          isAnonymous: true,
          anonExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "customer.anonymize",
          actorType: "CUSTOMER",
          actorId: ctx.user!.id,
          target: customer.id,
          meta: { previousPhone: customer.phone },
        },
      });

      return { success: true };
    }),

  myMemberships: protectedProcedure
    .query(async ({ ctx }) => {
      const customer = await prisma.customer.findUnique({
        where: { accountId: ctx.user!.id },
      });

      if (!customer) {
        return [];
      }

      return prisma.membership.findMany({
        where: { customerId: customer.id, isActive: true },
        include: { business: { select: { id: true, name: true, slug: true } } },
      });
    }),
});

export default customerRouter;
