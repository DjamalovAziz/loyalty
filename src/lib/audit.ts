export async function logAudit(params: {
  actorId?: string;
  actorType?: string;
  action: string;
  businessId?: string;
  customerId?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}) {
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        actorType: params.actorType,
        action: params.action,
        businessId: params.businessId,
        customerId: params.customerId,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        metadata: params.metadata,
        ip: params.ip,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}
