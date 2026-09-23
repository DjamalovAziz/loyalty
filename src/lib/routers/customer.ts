import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure, router } from "@/lib/trpc";

const customerRouter = router({
  requestLoginOtp: publicProcedure
    .input(z.object({ phone: z.string() }))
    .mutation(async ({ input }) => {
      const account = await prisma.account.upsert({
        where: { email: input.phone },
        update: {},
        create: {
          name: input.phone,
          email: input.phone,
          role: "CUSTOMER",
        },
      });

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = Buffer.from(code).toString("base64");

      await prisma.otpCode.create({
        data: {
          accountId: account.id,
          codeHash,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      console.log(`OTP for ${input.phone}: ${code}`);
      return { sent: true };
    }),

  verifyOtp: publicProcedure
    .input(z.object({ phone: z.string(), code: z.string() }))
    .mutation(async ({ input }) => {
      const account = await prisma.account.findFirst({
        where: { email: input.phone, role: "CUSTOMER" },
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

      const isValid = Buffer.from(otp.codeHash, "base64").toString() === input.code;
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

  join: publicProcedure
    .input(z.object({ businessId: z.string(), accountId: z.string() }))
    .mutation(async ({ input }) => {
      const customer = await prisma.customer.findUnique({
        where: { accountId: input.accountId },
      });

      if (!customer) {
        const newCustomer = await prisma.customer.create({
          data: {
            accountId: input.accountId,
            phone: `phone-${input.accountId}`,
          },
        });

        await prisma.membership.create({
          data: {
            customerId: newCustomer.id,
            businessId: input.businessId,
          },
        });

        return { success: true };
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

  leave: publicProcedure
    .input(z.object({ businessId: z.string(), customerId: z.string(), accountId: z.string() }))
    .mutation(async ({ input }) => {
      const customer = await prisma.customer.findFirst({
        where: { id: input.customerId, accountId: input.accountId },
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

  anonymize: publicProcedure
    .input(z.object({ customerId: z.string(), accountId: z.string() }))
    .mutation(async ({ input }) => {
      const customer = await prisma.customer.findFirst({
        where: { id: input.customerId, accountId: input.accountId },
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
          actorId: input.accountId,
          target: customer.id,
          meta: { previousPhone: customer.phone },
        },
      });

      return { success: true };
    }),
});

export default customerRouter;
