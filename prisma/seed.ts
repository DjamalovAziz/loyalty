import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const ownerPassword = await bcrypt.hash("owner123", 10);

  const owner = await prisma.user.upsert({
    where: { email: "owner@test.com" },
    update: {},
    create: {
      email: "owner@test.com",
      name: "Owner Test",
      password: ownerPassword,
      role: "OWNER",
      staffRole: "OWNER",
    },
  });

  const business = await prisma.business.create({
    data: {
      name: "Test Business",
      slug: "test-business",
      description: "A test business for demo",
      category: "cafe",
      address: "Tashkent, Uzbekistan",
      welcomePoints: 10,
      minimumCashback: 5,
      ownerId: owner.id,
    },
  });

  const customer = await prisma.customer.upsert({
    where: { phone: "+998901234567" },
    update: {},
    create: {
      phone: "+998901234567",
      name: "Test Customer",
      isVerified: true,
    },
  });

  const membership = await prisma.membership.create({
    data: {
      customerId: customer.id,
      businessId: business.id,
      points: 100,
    },
  });

  console.log("Seed completed:");
  console.log("Owner:", owner.email);
  console.log("Business:", business.name, business.slug);
  console.log("Customer:", customer.phone);
  console.log("Membership ID:", membership.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
