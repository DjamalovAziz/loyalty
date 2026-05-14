import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') || 'csv'
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
      user: { select: { name: true } },
    },
  })

  const rows = transactions.map((t: typeof transactions[0]) => ({
    'Дата': new Date(t.createdAt).toLocaleString('ru'),
    'Тип': t.type === 'CREDIT' ? 'Начисление' : 'Списание',
    'Сумма': t.amount,
    'Остаток после': t.balanceAfter,
    'Клиент': t.client.fullName,
    'Телефон': t.client.phone,
    'Сотрудник': t.user.name,
    'Комментарий': t.comment || '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Операции')

  if (format === 'xlsx') {
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="report.xlsx"',
      },
    })
  }

  const csv = XLSX.utils.sheet_to_csv(ws)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="report.csv"',
    },
  })
}
