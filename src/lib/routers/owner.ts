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

  signup: publicProcedure
    .input(
      z.object({
        phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await prisma.account.findFirst({
        where: { phone: input.phone },
      });

      if (existing) {
        return { success: false, error: "Account already exists" };
      }

      const passwordHash = await hashPin(input.password);

      const account = await prisma.account.create({
        data: {
          phone: input.phone,
          name: input.phone,
          passwordHash,
          role: "OWNER",
        },
      });

      return {
        success: true,
        accountId: account.id,
      };
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
