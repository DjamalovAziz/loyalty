-- AlterTable
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_points_check" CHECK ("points" >= 0);
