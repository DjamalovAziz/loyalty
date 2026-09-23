import { prisma } from "@/lib/prisma";

export async function writeAuditLog(params: {
  businessId: string;
  action: string;
  actorType: "CUSTOMER" | "OWNER" | "STAFF" | "SYSTEM" | "ADMIN";
  actorId: string;
  target?: string;
  meta?: Record<string, any>;
}) {
  await prisma.auditLog.create({
    data: {
      businessId: params.businessId,
      action: params.action,
      actorType: params.actorType,
      actorId: params.actorId,
      target: params.target,
      meta: params.meta,
    },
  });
}
