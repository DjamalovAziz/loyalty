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

        // Handle phone verification flow (sent via contact or text)
        const contactPhone = message.contact?.phone_number
        if (contactPhone || (text && /^\+?\d+$/.test(text.replace(/\s+/g, '')))) {
            const phone = contactPhone || text.replace(/\s+/g, '')
            
            // Find pending verification session
            const session = await prisma.telegramVerification.findFirst({
                where: { chatId },
            })
            
            if (session) {
                // Find client by verifyToken from session
                const client = await prisma.client.findFirst({
                    where: { verifyToken: session.verifyToken },
                })
                if (client) {
                    // Verify phone matches
                    const normalizePhone = (p: string) => p.replace(/\D/g, '').replace(/^998/, '+998')
                    const clientPhone = normalizePhone(client.phone)
                    const userPhone = normalizePhone(phone)
                    
                    if (clientPhone === userPhone || client.phone === phone) {
                        await prisma.client.update({
                            where: { id: client.id },
                            data: { telegramChatId: chatId, verifyToken: null, isVerified: true },
                        })
                        await prisma.telegramVerification.delete({ where: { id: session.id } })
                        const clientUrl = `${process.env.NEXTAUTH_URL}/client/${client.qrToken}`
                        await sendTelegram(chatId, `✅ <b>Привязка успешна!</b>\n\nТеперь вы будете получать уведомления о бонусах, ${client.fullName}!\n\n🔗 <a href="${clientUrl}">Перейти в личный кабинет</a>`)
                        return NextResponse.json({ ok: true })
                    } else {
                        await sendTelegram(chatId, `❌ Номер телефона не совпадает. Проверьте номер и попробуйте снова.\n\nВаш телефон в системе: ${client.phone}`)
                        return NextResponse.json({ ok: true })
                    }
                }
            }
            
            await sendTelegram(chatId, '❌ Не найден процесс верификации. Попробуйте снова или обратитесь к администратору.')
            return NextResponse.json({ ok: true })
        }

        if (text.startsWith('/start ')) {
            const token = text.replace('/start ', '').trim()
            
            const client = await prisma.client.findFirst({
                where: { verifyToken: token },
            })
            if (client) {
                // Create pending verification session
                await prisma.telegramVerification.create({
                    data: { chatId, verifyToken: token },
                })
                await sendTelegram(chatId, `👋 Привет!\n\nДля подтверждения привязки отправьте свой номер телефона.\n\n📱 Ваш номер в системе: ${client.phone}\n\nОтправьте его или нажмите кнопку "Отправить номер" после сканирования QR-кода.`)
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
                await sendTelegram(chatId, `✅ <b>Telegram привязан!</b>\n\nДобро пожаловать, ${user.name}!\n\n🔗 <a href="${process.env.NEXTAUTH_URL}/cashier">Перейти к кассе</a>`)
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