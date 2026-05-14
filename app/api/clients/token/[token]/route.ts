import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const client = await prisma.client.findUnique({
    where: { qrToken: params.token },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      },
    },
  })
  if (!client) return NextResponse.json({ error: 'Не найден' }, { status: 404 })
  return NextResponse.json(client)
}
