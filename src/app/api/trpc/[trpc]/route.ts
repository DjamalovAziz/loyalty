import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/lib/routers/_app";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import type { Context } from "@/lib/trpc";

export async function GET(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async (): Promise<Context> => {
      const cookieStore = await cookies();
      const token = cookieStore.get("next-auth.session-token")?.value;
      let user: Context["user"] = null;

      if (token) {
        try {
          const account = await prisma.account.findFirst({
            where: { sessions: { some: { sessionToken: token, expires: { gt: new Date() } } } },
            select: { id: true, role: true },
          });
          if (account) {
            user = { id: account.id, role: account.role };
          }
        } catch (err) {
          console.error("Session lookup error:", err);
        }
      }

      return { prisma, user };
    },
    onError: (err) => {
      console.error("tRPC error:", err);
    },
  });
}

export async function POST(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async (): Promise<Context> => {
      const cookieStore = await cookies();
      const token = cookieStore.get("next-auth.session-token")?.value;
      let user: Context["user"] = null;

      if (token) {
        try {
          const account = await prisma.account.findFirst({
            where: { sessions: { some: { sessionToken: token, expires: { gt: new Date() } } } },
            select: { id: true, role: true },
          });
          if (account) {
            user = { id: account.id, role: account.role };
          }
        } catch (err) {
          console.error("Session lookup error:", err);
        }
      }

      return { prisma, user };
    },
    onError: (err) => {
      console.error("tRPC error:", err);
    },
  });
}
