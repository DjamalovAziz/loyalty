import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTelegram } from '@/lib/telegram'
import bcrypt from 'bcryptjs'

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'loyaltybotbotbot'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const message = body?.message
        if (!message) return NextResponse.json({ ok: true })

        const chatId = String(message.chat.id)
        const text: string = message.text || ''
        const firstName = message.from?.first_name || ''

        const botState = await prisma.botState.findUnique({ where: { chatId } })

        if (botState) {
            switch (botState.state) {
                case 'register_name': {
                    const name = text.trim()
                    if (name.length < 2) {
                        await sendTelegram(chatId, '❌ Имя слишком короткое. Введите ФИО:')
                        return NextResponse.json({ ok: true })
                    }
                    await prisma.botState.update({
                        where: { chatId },
                        data: { state: 'register_email', data: JSON.stringify({ name }) },
                    })
                    await sendTelegram(chatId, '📧 Введите ваш email:')
                    return NextResponse.json({ ok: true })
                }
                case 'register_email': {
                    const email = text.trim()
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    if (!emailRegex.test(email)) {
                        await sendTelegram(chatId, '❌ Некорректный email. Введите email:')
                        return NextResponse.json({ ok: true })
                    }
                    const existing = await prisma.user.findUnique({ where: { email } })
                    if (existing) {
                        await sendTelegram(chatId, '❌ Этот email уже зарегистрирован. Введите другой:')
                        return NextResponse.json({ ok: true })
                    }
                    const prev = JSON.parse(botState.data || '{}')
                    await prisma.botState.update({
                        where: { chatId },
                        data: { state: 'register_password', data: JSON.stringify({ ...prev, email }) },
                    })
                    await sendTelegram(chatId, '🔒 Введите пароль (минимум 6 символов) или отправьте любой символ для автоматической генерации:')
                    return NextResponse.json({ ok: true })
                }
                case 'register_password': {
                    const prev = JSON.parse(botState.data || '{}')
                    const password = text.trim().length >= 6 ? text.trim() : undefined
                    const finalPassword = password || Math.random().toString(36).slice(-8)
                    const hash = await bcrypt.hash(finalPassword, 12)

                    const isFirstUser = !(await prisma.user.findFirst())
                    const role: 'ADMIN' | 'CASHIER' = isFirstUser ? 'ADMIN' : 'CASHIER'

                    try {
                        const user = await prisma.user.create({
                            data: {
                                name: prev.name,
                                email: prev.email,
                                passwordHash: hash,
                                role,
                                telegramChatId: chatId,
                            },
                        })

                        const loginUrl = `${process.env.NEXTAUTH_URL}/login`
                        await sendTelegram(chatId, `✅ <b>Регистрация завершена!</b>\n\n👤 ${user.name}\n📧 ${user.email}\n🎭 Роль: ${role === 'ADMIN' ? 'Администратор' : 'Кассир'}\n🔗 <a href="${loginUrl}">Перейти в систему</a>`)
                    } catch (e: any) {
                        await sendTelegram(chatId, `❌ Ошибка при создании аккаунта: ${e.message}`)
                    }

                    await prisma.botState.delete({ where: { chatId } })
                    return NextResponse.json({ ok: true })
                }
                default:
                    await prisma.botState.delete({ where: { chatId } })
                    break
            }
        }

        if (text === '/register') {
            await prisma.botState.upsert({
                where: { chatId },
                update: { state: 'register_name', data: null },
                create: { chatId, state: 'register_name', data: null },
            })
            await sendTelegram(chatId, '👋 Давайте зарегистрируем вас как сотрудника!\n\nВведите ваше ФИО:')
            return NextResponse.json({ ok: true })
        }

        if (text.startsWith('/start ')) {
            const token = text.replace('/start ', '').trim()
            return handleClientStart(chatId, token)
        }

        const contactPhone = message.contact?.phone_number
        const isPhoneNumber = contactPhone || (text && /^\+?\d{10,15}$/.test(text.replace(/\s+/g, '')))
        if (isPhoneNumber) {
            const phone = contactPhone || text.replace(/\s+/g, '')
            return await handlePhoneVerification(chatId, phone)
        }

        if (text === '/start' || text === '/menu') {
            const existingUser = await prisma.user.findFirst({ where: { telegramChatId: chatId } })
            if (existingUser) {
                await sendTelegram(chatId, `👋 С возвращением, ${existingUser.name}!\n\nВаша роль: ${existingUser.role === 'ADMIN' ? 'Администратор' : 'Кассир'}\n🔗 <a href="${process.env.NEXTAUTH_URL}/login">Перейти в систему</a>`)
            } else {
                await sendTelegram(chatId, `👋 Привет!\n\nЯ бот программы лояльности.\n\nКоманды:\n/register — Регистрация персонала\n/start {токен} — Подтверждение клиента`)
            }
            return NextResponse.json({ ok: true })
        }

        return NextResponse.json({ ok: true })
    } catch (e) {
        console.error('Telegram webhook error:', e)
        return NextResponse.json({ ok: true })
    }
}

async function handleClientStart(chatId: string, token: string) {
    const client = await prisma.client.findFirst({ where: { verifyToken: token } })
    if (client) {
        await prisma.telegramVerification.upsert({
            where: { chatId },
            update: { verifyToken: token },
            create: { chatId, verifyToken: token },
        })
        await sendTelegram(chatId, `👋 Привет!\n\nДля подтверждения привязки отправьте свой номер телефона.\n\n📱 Ваш номер в системе: ${client.phone}\n\nОтправьте его текстом или кнопкой "Отправить номер".`)
        return NextResponse.json({ ok: true })
    }

    const user = await prisma.user.findFirst({ where: { verifyToken: token } })
    if (user) {
        await prisma.user.update({
            where: { id: user.id },
            data: { telegramChatId: chatId, verifyToken: null },
        })
        await sendTelegram(chatId, `✅ <b>Telegram привязан!</b>\n\nДобро пожаловать, ${user.name}!\n\n🔗 <a href="${process.env.NEXTAUTH_URL}/login">Перейти в систему</a>`)
        return NextResponse.json({ ok: true })
    }

    await sendTelegram(chatId, '❌ Ссылка устарела. Попросите администратора выслать новую.')
    return NextResponse.json({ ok: true })
}

async function handlePhoneVerification(chatId: string, phone: string) {
    const session = await prisma.telegramVerification.findUnique({ where: { chatId } })
    if (!session) {
        await sendTelegram(chatId, '❌ Не найден процесс верификации. Попробуйте снова или обратитесь к администратору.')
        return NextResponse.json({ ok: true })
    }

    const client = await prisma.client.findFirst({ where: { verifyToken: session.verifyToken } })
    if (!client) {
        await sendTelegram(chatId, '❌ Клиент не найден. Обратитесь к администратору.')
        return NextResponse.json({ ok: true })
    }

    const normalize = (p: string) => p.replace(/\D/g, '').replace(/^998/, '998')
    if (normalize(client.phone) !== normalize(phone)) {
        await sendTelegram(chatId, `❌ Номер не совпадает. Проверьте и попробуйте снова.\n\nВаш номер в системе: ${client.phone}`)
        return NextResponse.json({ ok: true })
    }

    await prisma.client.update({
        where: { id: client.id },
        data: { telegramChatId: chatId, verifyToken: null, isVerified: true },
    })
    await prisma.telegramVerification.delete({ where: { chatId } })
    const clientUrl = `${process.env.NEXTAUTH_URL}/client/${client.qrToken}`
    await sendTelegram(chatId, `✅ <b>Привязка успешна!</b>\n\nТеперь вы будете получать уведомления, ${client.fullName}!\n\n🔗 <a href="${clientUrl}">Личный кабинет</a>`)
    return NextResponse.json({ ok: true })
}