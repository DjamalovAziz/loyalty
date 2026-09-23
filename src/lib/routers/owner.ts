import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure, protectedProcedure, router } from "@/lib/trpc";

const ownerRouter = router({
  myBusiness: protectedProcedure
    .query(async ({ ctx }) => {
      const business = await prisma.business.findFirst({
        where: { ownerId: ctx.user!.id },
      });
      return business;
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

  listAdjustments: publicProcedure
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
