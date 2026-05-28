import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail, clientWelcomeEmail } from '@/lib/email'
import { getTelegramBotLink } from '@/lib/telegram'
import { randomUUID } from 'crypto'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const verified = searchParams.get('verified')

  const clients = await prisma.client.findMany({
    where: {
      ...(verified !== null
        ? { isVerified: verified === 'true' }
        : { isVerified: true }),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
            ],
          }
        : undefined),
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(clients)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { fullName, phone, email } = await req.json()
  if (!fullName || !phone) {
    return NextResponse.json({ error: 'ФИО и телефон обязательны' }, { status: 400 })
  }

  try {
    const verifyToken = randomUUID()
    const client = await prisma.client.create({
      data: {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        verifyToken,
      },
    })

    const clientUrl = `${process.env.NEXTAUTH_URL}/client/${client.qrToken}`
    const tgLink = getTelegramBotLink(verifyToken)

    if (client.email) {
      const { subject, html } = clientWelcomeEmail({
        fullName: client.fullName,
        phone: client.phone,
        balance: 0,
        clientUrl,
      })
      await sendEmail(client.email, subject, html)
    }

    return NextResponse.json({ ...client, telegramDeepLink: tgLink }, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Телефон уже зарегистрирован' }, { status: 409 })
    }
    throw e
  }
}