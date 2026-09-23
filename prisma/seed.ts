import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const owner = await prisma.account.upsert({
    where: { phone: "+998900000000" },
    update: {},
    create: {
      name: "Demo Owner",
      phone: "+998900000000",
      role: "OWNER",
      passwordHash: await import("bcryptjs").then((bcrypt) =>
        bcrypt.hash("password123", 10)
      ),
    },
  });

  const business = await prisma.business.upsert({
    where: { slug: "demo-cafe" },
    update: {},
    create: {
      slug: "demo-cafe",
      name: "Demo Café",
      description: "Демо-бизнес для разработки",
      category: "Cafe",
      welcomePoints: 100,
      minimumCashback: 50,
      ownerId: owner.id,
    },
  });

  console.log("Seeded:", business);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
