import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const existingUser = await prisma.user.findFirst()
  if (existingUser) {
    console.log('Пользователи уже существуют, пропускаем seed.')
    return
  }

  const hash = await bcrypt.hash('admin123', 12)
  await prisma.user.create({
    data: {
      email: 'admin@loyalty.local',
      name: 'Администратор',
      passwordHash: hash,
      role: 'ADMIN',
    },
  })
  console.log('✅ Admin created: admin@loyalty.local / admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
