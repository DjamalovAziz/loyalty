import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { sendEmail, staffWelcomeEmail } from '@/lib/email'
import { getTelegramBotLink } from '@/lib/telegram'
import { randomUUID } from 'crypto'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, name: true, role: true,
      isActive: true, createdAt: true, telegramChatId: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email, name, password, role } = await req.json()
  if (!email || !name || !password || !role) {
    return NextResponse.json({ error: 'Все поля обязательны' }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Пароль должен быть не менее 6 символов' }, { status: 400 })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Некорректный email' }, { status: 400 })
  }

  const validRoles = ['ADMIN', 'CASHIER']
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Некорректная роль' }, { status: 400 })
  }

  try {
    const hash = await bcrypt.hash(password, 12)
    const verifyToken = randomUUID()

    const user = await prisma.user.create({
      data: { email, name, passwordHash: hash, role, verifyToken },
      select: {
        id: true, email: true, name: true, role: true,
        isActive: true, createdAt: true, telegramChatId: true,
      },
    })

    const loginUrl = `${process.env.NEXTAUTH_URL}/login`
    const tgLink = getTelegramBotLink(verifyToken)

    const { subject, html } = staffWelcomeEmail({
      name: user.name,
      email: user.email,
      password,
      role: user.role,
      loginUrl,
    })
    await sendEmail(user.email, subject, html)

    return NextResponse.json({ ...user, telegramDeepLink: tgLink }, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Email уже используется' }, { status: 409 })
    }
    throw e
  }
}