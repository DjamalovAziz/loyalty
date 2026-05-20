import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { isActive } = await req.json()
  const user = await prisma.user.update({
    where: { id: params.id },
    data: { isActive },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  })
  return NextResponse.json(user)
}
