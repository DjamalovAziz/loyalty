import { router } from "@/lib/trpc";
import customerRouter from "./customer";
import businessRouter from "./business";
import staffRouter from "./staff";
import supportRouter from "./support";
import ownerRouter from "./owner";
import adminRouter from "./admin";
import adjustmentRouter from "./adjustment";
import expiryRouter from "./expiry";
import staffPermissionRouter from "./staffPermission";
import auditRouter from "./audit";
import cronRouter from "./cron";
import rateLimitRouter from "./rateLimit";
import analyticsRouter from "./analytics";
import broadcastRouter from "./broadcast";
import referralRouter from "./referral";
import loyaltyRuleRouter from "./loyaltyRule";
import segmentationRouter from "./segmentation";
import locationRouter from "./location";
import reconciliationRouter from "./reconciliation";
import quotaRouter from "./quota";
import signupRouter from "./signup";

export const appRouter = router({
  customer: customerRouter,
  business: businessRouter,
  staff: staffRouter,
  support: supportRouter,
  owner: ownerRouter,
  admin: adminRouter,
  adjustment: adjustmentRouter,
  expiry: expiryRouter,
  staffPermission: staffPermissionRouter,
  audit: auditRouter,
  cron: cronRouter,
  rateLimit: rateLimitRouter,
  analytics: analyticsRouter,
  broadcast: broadcastRouter,
  referral: referralRouter,
  loyaltyRule: loyaltyRuleRouter,
  segmentation: segmentationRouter,
  location: locationRouter,
  reconciliation: reconciliationRouter,
  quota: quotaRouter,
  signup: signupRouter,
});

export type AppRouter = typeof appRouter;
