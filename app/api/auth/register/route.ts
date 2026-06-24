import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
    try {
        const { name, email, password } = await req.json()

        if (!name || !email) {
            return NextResponse.json({ error: 'Имя и email обязательны' }, { status: 400 })
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Некорректный email' }, { status: 400 })
        }

        // Check if any admin already exists
        const existingAdmin = await prisma.user.findFirst({
            where: { role: 'ADMIN' },
        })

        if (existingAdmin) {
            return NextResponse.json({ error: 'Администратор уже зарегистрирован. Обратитесь к нему для создания аккаунта.' }, { status: 403 })
        }

        const finalPassword = password || crypto.randomUUID().slice(0, 8)
        const hash = await bcrypt.hash(finalPassword, 12)

        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email: email.trim(),
                passwordHash: hash,
                role: 'ADMIN',
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        })

        return NextResponse.json({ ...user, tempPassword: finalPassword }, { status: 201 })
    } catch (e: any) {
        if (e.code === 'P2002') {
            return NextResponse.json({ error: 'Email уже используется' }, { status: 409 })
        }
        console.error('Register error:', e)
        return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
    }
}
