// Super Admin panel, mounted via AdminJS + AdminJS's official Next.js adapter.
// Auth is a single username/password pair from env (ADMIN_USERNAME / ADMIN_PASSWORD),
// distinct from the NextAuth flows used by owners/staff/clients.
import { buildAuthenticatedRouter } from "@adminjs/nextjs";
import { admin } from "~/lib/admin";

export const dynamic = "force-dynamic";

const { GET, POST } = buildAuthenticatedRouter({
  admin,
  auth: {
    authenticate: async (email: string, password: string) => {
      if (email === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        return { email };
      }
      return null;
    },
    cookiePassword: process.env.AUTH_SECRET!,
  },
});

export { GET, POST };
