import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure, protectedProcedure, router } from "@/lib/trpc";
import { hashPin } from "@/lib/pin";
import { createHmac } from "crypto";

const ownerRouter = router({
  myBusiness: protectedProcedure
    .query(async ({ ctx }) => {
      const business = await prisma.business.findFirst({
        where: { ownerId: ctx.user!.id },
      });
      return business;
    }),

  createBusiness: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Business name is required"),
        category: z.string().optional(),
        address: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.business.findFirst({
        where: { ownerId: ctx.user!.id },
      });

      if (existing) {
        return { success: false, error: "You already have a business" };
      }

      const business = await prisma.business.create({
        data: {
          name: input.name,
          slug: `business-${ctx.user!.id}`,
          category: input.category,
          address: input.address,
          ownerId: ctx.user!.id,
        },
      });

      const pinCode = Math.floor(100000 + Math.random() * 900000).toString();
      const pinHash = await hashPin(pinCode);

      const staffAccount = await prisma.staffAccount.create({
        data: {
          accountId: ctx.user!.id,
          businessId: business.id,
          pinHash,
          isActive: true,
        },
      });

      await prisma.staffPermission.create({
        data: {
          staffId: staffAccount.id,
          role: "OWNER",
          isActive: true,
        },
      });

      return { success: true, business, pinCode };
    }),

  businessProfileUpdate: publicProcedure
    .input(
      z.object({
        businessId: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        address: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        logoUrl: z.string().url().optional().or(z.literal("")),
        welcomePoints: z.number().int().nonnegative().optional(),
        minimumCashback: z.number().int().nonnegative().optional(),
        telegramGroupId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { businessId, ...data } = input;
      const cleaned = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined && v !== "")
      );

      const business = await prisma.business.update({
        where: { id: businessId },
        data: cleaned,
      });

      return { success: true, business };
    }),

  createStaffInvite: protectedProcedure
    .input(
      z.object({
        businessId: z.string(),
        role: z.enum(["CASHIER", "MANAGER", "OWNER"]).default("CASHIER"),
        expiresInDays: z.number().int().positive().default(7),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const business = await prisma.business.findFirst({
        where: { id: input.businessId, ownerId: ctx.user!.id },
      });

      if (!business) {
        return { success: false, error: "Business not found or access denied" };
      }

      const rawCode = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
      const codeHash = createHmac("sha256", process.env.AUTH_SECRET || "fallback").update(rawCode).digest("hex");

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

      const invite = await prisma.staffInvite.create({
        data: {
          businessId: input.businessId,
          code: codeHash,
          role: input.role,
          expiresAt,
        },
      });

      return { success: true, inviteId: invite.id, rawCode };
    }),

  listStaffInvites: protectedProcedure
    .input(z.object({ businessId: z.string() }))
    .query(async ({ input, ctx }) => {
      const business = await prisma.business.findFirst({
        where: { id: input.businessId, ownerId: ctx.user!.id },
      });

      if (!business) {
        return [];
      }

      return prisma.staffInvite.findMany({
        where: { businessId: input.businessId },
        orderBy: { createdAt: "desc" },
      });
    }),

  listAdjustments: protectedProcedure
    .input(z.object({ businessId: z.string() }))
    .query(async ({ input }) => {
      const adjustments = await prisma.adjustment.findMany({
        where: { original: { businessId: input.businessId } },
        include: {
          original: true,
          reference: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return { success: true, adjustments };
    }),
});

export default ownerRouter;
