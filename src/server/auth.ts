import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { normalizePhone } from "~/lib/phone";
import { getAndParse, del, keys } from "./redis";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: "SUPER_ADMIN" | "BUSINESS_OWNER" | "STAFF" | "CLIENT";
      businessSlug?: string;
      businessId?: string;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" }, // JWT sessions to avoid burning Supabase free-tier connections
  pages: { signIn: "/signin" },
  providers: [
    // --- Super Admin: single username/password pair from env, no DB row ---
    Credentials({
      id: "admin",
      name: "Super Admin",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.username || !creds?.password) return null;
        if (
          creds.username === process.env.ADMIN_USERNAME &&
          creds.password === process.env.ADMIN_PASSWORD
        ) {
          return { id: "super-admin", name: "Super Admin", role: "SUPER_ADMIN" as const };
        }
        return null;
      },
    }),

    // --- Business Owner: phone + password ---
    Credentials({
      id: "owner",
      name: "Business Owner",
      credentials: {
        phone_number: { label: "Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.phone_number || !creds?.password) return null;
        const phone = normalizePhone(String(creds.phone_number));
        const user = await db.user.findFirst({
          where: { phoneNumber: phone, role: "BUSINESS_OWNER", verified: true },
          include: { ownedBusiness: true },
        });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(String(creds.password), user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          name: user.name,
          role: "BUSINESS_OWNER" as const,
          businessId: user.ownedBusiness?.id,
          businessSlug: user.ownedBusiness?.slug,
        };
      },
    }),

    // --- Staff: phone + pin + businessSlug ---
    Credentials({
      id: "staff",
      name: "Staff",
      credentials: {
        phone_number: { label: "Phone", type: "text" },
        pin: { label: "PIN", type: "password" },
        businessSlug: { label: "Business", type: "text" },
      },
      async authorize(creds) {
        if (!creds?.phone_number || !creds?.pin || !creds?.businessSlug) return null;
        const phone = normalizePhone(String(creds.phone_number));
        const business = await db.business.findUnique({
          where: { slug: String(creds.businessSlug) },
        });
        if (!business) return null;
        const user = await db.user.findFirst({
          where: {
            phoneNumber: phone,
            role: "STAFF",
            businessId: business.id,
            verified: true,
          },
        });
        if (!user?.pin) return null;
        const ok = await bcrypt.compare(String(creds.pin), user.pin);
        if (!ok) return null;
        return {
          id: user.id,
          name: user.name,
          role: "STAFF" as const,
          businessId: business.id,
          businessSlug: business.slug,
        };
      },
    }),

    // --- Client: phone + OTP (delivered via Telegram bot) ---
    Credentials({
      id: "client",
      name: "Client",
      credentials: {
        phone_number: { label: "Phone", type: "text" },
        otp: { label: "OTP", type: "text" },
        businessSlug: { label: "Business", type: "text" },
      },
      async authorize(creds) {
        if (!creds?.phone_number || !creds?.otp || !creds?.businessSlug) return null;
        const phone = normalizePhone(String(creds.phone_number));
        const pending = await getAndParse<{ code: string }>(keys.clientLoginOtp(phone));
        if (!pending || pending.code !== String(creds.otp)) return null;
        await del(keys.clientLoginOtp(phone));

        const business = await db.business.findUnique({
          where: { slug: String(creds.businessSlug) },
        });
        if (!business) return null;

        // Auto-register the client on first successful verification.
        const client = await db.client.upsert({
          where: { businessId_phoneNumber: { businessId: business.id, phoneNumber: phone } },
          update: { verified: true },
          create: {
            businessId: business.id,
            phoneNumber: phone,
            verified: true,
          },
        });

        return {
          id: client.id,
          name: client.name ?? phone,
          role: "CLIENT" as const,
          businessId: business.id,
          businessSlug: business.slug,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.businessId = (user as any).businessId;
        token.businessSlug = (user as any).businessSlug;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role as any;
      session.user.businessId = token.businessId as any;
      session.user.businessSlug = token.businessSlug as any;
      return session;
    },
  },
});
