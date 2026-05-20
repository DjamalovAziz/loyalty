import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTelegram } from '@/lib/telegram'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const message = body?.message
        if (!message) return NextResponse.json({ ok: true })

        const chatId = String(message.chat.id)
        const text: string = message.text || ''
        const firstName = message.from?.first_name || ''

        if (text.startsWith('/start ')) {
            const token = text.replace('/start ', '').trim()

            const client = await prisma.client.findFirst({
                where: { verifyToken: token },
            })
            if (client) {
                await prisma.client.update({
                    where: { id: client.id },
                    data: { telegramChatId: chatId, verifyToken: null },
                })
                await sendTelegram(chatId, `✅ <b>Привязка успешна!</b>\n\nТеперь вы будете получать уведомления о бонусах, ${client.fullName}!`)
                return NextResponse.json({ ok: true })
            }

            const user = await prisma.user.findFirst({
                where: { verifyToken: token },
            })
            if (user) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { telegramChatId: chatId, verifyToken: null },
                })
                await sendTelegram(chatId, `✅ <b>Telegram привязан!</b>\n\nДобро пожаловать, ${user.name}!`)
                return NextResponse.json({ ok: true })
            }

            await sendTelegram(chatId, '❌ Ссылка устарела. Попросите администратора выслать новую.')
            return NextResponse.json({ ok: true })
        }

        if (text === '/start') {
            await sendTelegram(chatId, `👋 Привет, ${firstName}!\n\nДля привязки используйте ссылку от администратора.`)
            return NextResponse.json({ ok: true })
        }

        return NextResponse.json({ ok: true })
    } catch (e) {
        console.error('Telegram webhook error:', e)
        return NextResponse.json({ ok: true })
    }
}