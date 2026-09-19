import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

const EARTH_RADIUS_KM = 6371;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const businessRouter = createTRPCRouter({
  explore: publicProcedure
    .input(
      z.object({
        searchQuery: z.string().optional(),
        category: z.string().optional(),
        hasWelcomeBonus: z.boolean().optional(),
        minCashback: z.number().optional(),
        sortBy: z.enum(["NEWEST", "POPULAR", "CASHBACK"]).default("NEWEST"),
        // Optional — only used to compute/display distance, not to filter or sort by
        // default (that needs the customer's live location on every request, which is
        // a bigger UX commitment than this MVP catalog needs). Passed straight through
        // from navigator.geolocation on the client if the user allows it.
        lat: z.number().optional(),
        lng: z.number().optional(),
        cursor: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ input }) => {
      const where = {
        ...(input.searchQuery && {
          name: { contains: input.searchQuery, mode: "insensitive" as const },
        }),
        ...(input.category && { category: input.category }),
        ...(input.hasWelcomeBonus && { welcomePoints: { gt: 0 } }),
        ...(input.minCashback !== undefined && { minCashback: { gte: input.minCashback } }),
      };

      const orderBy =
        input.sortBy === "CASHBACK"
          ? [{ minCashback: "desc" as const }]
          : input.sortBy === "POPULAR"
            ? [{ memberships: { _count: "desc" as const } }]
            : [{ createdAt: "desc" as const }];

      const businesses = await db.business.findMany({
        where,
        orderBy,
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        select: {
          id: true,
          slug: true,
          name: true,
          category: true,
          description: true,
          address: true,
          lat: true,
          lng: true,
          logoUrl: true,
          welcomePoints: true,
          minCashback: true,
          _count: { select: { memberships: true } },
        },
      });

      let nextCursor: string | undefined;
      if (businesses.length > input.limit) {
        nextCursor = businesses.pop()!.id;
      }

      const results = businesses.map((b) => ({
        ...b,
        distanceKm:
          input.lat !== undefined && input.lng !== undefined && b.lat !== null && b.lng !== null
            ? Math.round(haversineKm(input.lat, input.lng, b.lat, b.lng) * 10) / 10
            : null,
      }));

      return { businesses: results, nextCursor };
    }),

  categories: publicProcedure.query(async () => {
    const rows = await db.business.findMany({
      select: { category: true },
      distinct: ["category"],
    });
    return rows.map((r) => r.category);
  }),
});
