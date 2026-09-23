import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { createHmac } from "crypto";

const { handlers, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "phone",
      credentials: {
        phone: { label: "Phone", type: "tel" },
        password: { label: "Password", type: "password" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phone) return null;

        const account = await prisma.account.findFirst({
          where: { phone: credentials.phone as string },
        });

        if (!account) {
          await writeAuditLog({
            action: "auth.failed",
            actorType: "UNKNOWN",
            actorId: "unknown",
            target: credentials.phone as string,
            meta: { reason: "account_not_found", provider: "phone" },
          } as any);
          return null;
        }

        if (credentials.code) {
          const otp = await prisma.otpCode.findFirst({
            where: {
              accountId: account.id,
              consumedAt: null,
              expiresAt: { gt: new Date() },
              attempts: { lt: 5 },
            },
            orderBy: { createdAt: "desc" },
          });

          if (!otp) {
            await writeAuditLog({
              action: "auth.failed",
              actorType: "CUSTOMER",
              actorId: account.id,
              target: account.phone,
              meta: { reason: "otp_not_found", provider: "phone" },
            } as any);
            return null;
          }

          const codeHash = createHmac("sha256", process.env.AUTH_SECRET || "fallback").update(credentials.code as string).digest("hex");
          if (codeHash !== otp.codeHash) {
            await prisma.otpCode.update({
              where: { id: otp.id },
              data: { attempts: { increment: 1 } },
            });
            await writeAuditLog({
              action: "auth.failed",
              actorType: "CUSTOMER",
              actorId: account.id,
              target: account.phone,
              meta: { reason: "invalid_otp", provider: "phone" },
            } as any);
            return null;
          }

          await prisma.otpCode.update({
            where: { id: otp.id },
            data: { consumedAt: new Date() },
          });

          return {
            id: account.id,
            name: account.name,
            phone: account.phone,
            role: account.role,
          } as any;
        }

        if (!credentials.password) return null;

        const isValid = await bcrypt.compare(credentials.password as string, account.passwordHash || "");
        if (!isValid) {
          let businessId: string | undefined;
          const ownerBusiness = await prisma.business.findFirst({
            where: { ownerId: account.id },
            select: { id: true },
          });
          if (ownerBusiness) businessId = ownerBusiness.id;

          const staffAccount = await prisma.staffAccount.findFirst({
            where: { accountId: account.id },
            select: { businessId: true },
          });
          if (staffAccount) businessId = staffAccount.businessId;

          const role = account.role === "SUPER_ADMIN" ? "ADMIN" : account.role;

          await writeAuditLog({
            businessId,
            action: "auth.failed",
            actorType: role as any,
            actorId: account.id,
            target: credentials.phone as string,
            meta: { reason: "invalid_password", provider: "phone" },
          } as any);
          return null;
        }

        return {
          id: account.id,
          name: account.name,
          phone: account.phone,
          role: account.role,
        } as any;
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.phone = (user as any).phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.phone = token.phone as string;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
});

export const { GET, POST } = handlers;
