import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure, router } from "@/lib/trpc";

const staffPermissionRouter = router({
  list: publicProcedure
    .input(z.object({ staffId: z.string() }))
    .query(async ({ input }) => {
      return prisma.staffPermission.findMany({
        where: { staffId: input.staffId },
      });
    }),

  assign: publicProcedure
    .input(
      z.object({
        staffId: z.string(),
        role: z.enum(["CASHIER", "MANAGER", "OWNER"]),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.staffPermission.upsert({
        where: { staffId_role: { staffId: input.staffId, role: input.role } },
        update: { isActive: true },
        create: {
          staffId: input.staffId,
          role: input.role,
        },
      });
    }),
});

export default staffPermissionRouter;
