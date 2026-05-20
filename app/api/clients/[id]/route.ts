import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await prisma.client.findUnique({ where: { id: params.id } })
  if (!client) return NextResponse.json({ error: 'Не найден' }, { status: 404 })
  return NextResponse.json(client)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { fullName, phone } = await req.json()
  try {
    const client = await prisma.client.update({
      where: { id: params.id },
      data: { fullName: fullName.trim(), phone: phone.trim() },
    })
    return NextResponse.json(client)
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Телефон уже зарегистрирован' }, { status: 409 })
    }
    throw e
  }
}
