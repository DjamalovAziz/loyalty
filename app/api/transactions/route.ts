import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { sendEmail, bonusOperationEmail } from '@/lib/email'
import { sendTelegram, bonusOperationTg } from '@/lib/telegram'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('clientId')
  const type = searchParams.get('type') as 'CREDIT' | 'DEBIT' | null
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: any = {}
  if (clientId) where.clientId = clientId
  if (type) where.type = type
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) where.createdAt.lte = new Date(to + 'T23:59:59')
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      client: { select: { fullName: true, phone: true } },
      user: { select: { name: true, email: true } },
    },
  })

  return NextResponse.json(transactions)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clientId, type, amount, comment } = await req.json()
  if (!clientId || !type || !amount || amount <= 0) {
    return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 })
  }

  const sessionUser = session.user as any
  const dbUser = await prisma.user.findUnique({ where: { email: sessionUser?.email } })
  if (!dbUser) {
    return NextResponse.json({ error: 'Пользователь не найден' }, { status: 401 })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.client.findUnique({ where: { id: clientId } })
      if (!client) throw new Error('CLIENT_NOT_FOUND')

      if (type === 'DEBIT' && client.balance < amount) {
        throw new Error('INSUFFICIENT_BALANCE')
      }

      const newBalance = type === 'CREDIT' ? client.balance + amount : client.balance - amount
      await tx.client.update({ where: { id: clientId }, data: { balance: newBalance } })

      return await tx.transaction.create({
        data: {
          clientId,
          userId: dbUser.id,
          type,
          amount,
          balanceAfter: newBalance,
          comment: comment || null,
        },
        include: {
          client: { select: { fullName: true, phone: true } },
          user: { select: { name: true, email: true } },
        },
      })
    })

    // Уведомления после транзакции
    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (client) {
      const clientUrl = `${process.env.NEXTAUTH_URL}/client/${client.qrToken}`
      const params = {
        fullName: client.fullName,
        type: type as 'CREDIT' | 'DEBIT',
        amount,
        balanceAfter: result.balanceAfter,
        comment,
        clientUrl,
      }
      if (client.telegramChatId) {
        await sendTelegram(client.telegramChatId, bonusOperationTg(params))
      }
      if (client.email) {
        const { subject, html } = bonusOperationEmail(params)
        await sendEmail(client.email, subject, html)
      }
    }

    return NextResponse.json(result, { status: 201 })

  } catch (e: any) {
    if (e.message === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json({ error: 'Недостаточно бонусов на балансе' }, { status: 400 })
    }
    if (e.message === 'CLIENT_NOT_FOUND') {
      return NextResponse.json({ error: 'Клиент не найден' }, { status: 404 })
    }
    throw e
  }
}