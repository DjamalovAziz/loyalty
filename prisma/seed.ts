import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@loyalty.local' },
    update: {},
    create: {
      email: 'admin@loyalty.local',
      name: 'Администратор',
      passwordHash: hash,
      role: 'ADMIN',
    },
  })
  console.log('✅ Admin created:', admin.email)

  const cashierHash = await bcrypt.hash('cashier123', 12)
  const cashier = await prisma.user.upsert({
    where: { email: 'cashier@loyalty.local' },
    update: {},
    create: {
      email: 'cashier@loyalty.local',
      name: 'Кассир #1',
      passwordHash: cashierHash,
      role: 'CASHIER',
    },
  })
  console.log('✅ Cashier created:', cashier.email)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
