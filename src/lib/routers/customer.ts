import { z } from "zod";
import { publicProcedure, router } from "@/lib/trpc";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rateLimit";

const otpSchema = z.object({
  phone: z.string().min(10),
});

export const customerRouter = router({
  requestLoginOtp: publicProcedure
    .input(otpSchema)
    .mutation(async ({ input }) => {
      const limited = await rateLimit({
        key: `otp:${input.phone}`,
        limit: 3,
        window: "1 h",
      });
      if (limited) return limited;

      const customer = await prisma.customer.upsert({
        where: { phone: input.phone },
        update: { isVerified: false },
        create: { phone: input.phone },
      });

      await logAudit({
        action: "otp_requested",
        actorType: "customer",
        customerId: customer.id,
        metadata: { phone: input.phone },
      });

      return { success: true, message: "OTP sent" };
    }),

  join: publicProcedure
    .input(
      z.object({
        customerId: z.string(),
        businessId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const business = await prisma.business.findUnique({
        where: { id: input.businessId },
      });

      if (!business || !business.isActive) {
        throw new Error("Business not found");
      }

      const membership = await prisma.membership.upsert({
        where: {
          customerId_businessId: {
            customerId: input.customerId,
            businessId: input.businessId,
          },
        },
        create: {
          customerId: input.customerId,
          businessId: input.businessId,
          points: business.welcomePoints,
        },
        update: {
          isActive: true,
        },
      });

      if (business.welcomePoints > 0) {
        await prisma.transaction.create({
          data: {
            type: "EARN",
            amount: business.welcomePoints,
            description: "Welcome bonus",
            membershipId: membership.id,
            businessId: input.businessId,
            customerId: input.customerId,
          },
        });
      }

      await logAudit({
        action: "membership_joined",
        actorType: "customer",
        customerId: input.customerId,
        businessId: input.businessId,
        resourceType: "membership",
        resourceId: membership.id,
      });

      return { success: true, membership };
    }),

  leave: publicProcedure
    .input(
      z.object({
        customerId: z.string(),
        businessId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const membership = await prisma.membership.update({
        where: {
          customerId_businessId: {
            customerId: input.customerId,
            businessId: input.businessId,
          },
        },
        data: { isActive: false },
      });

      await logAudit({
        action: "membership_left",
        actorType: "customer",
        customerId: input.customerId,
        businessId: input.businessId,
        resourceType: "membership",
        resourceId: membership.id,
      });

      return { success: true };
    }),

  me: publicProcedure
    .input(z.object({ customerId: z.string() }))
    .query(async ({ input }) => {
      const customer = await prisma.customer.findUnique({
        where: { id: input.customerId },
        include: {
          memberships: {
            where: { isActive: true },
            include: {
              business: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  logo: true,
                  category: true,
                },
              },
            },
          },
        },
      });

      return customer;
    }),
});
