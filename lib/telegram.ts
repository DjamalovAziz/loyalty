const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`

export async function sendTelegram(chatId: string, text: string): Promise<boolean> {
    try {
        const res = await fetch(`${API_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
        })
        const data = await res.json()
        if (!data.ok) {
            console.error('❌ Telegram error:', data.description)
            return false
        }
        console.log(`✅ Telegram отправлен: ${chatId}`)
        return true
    } catch (e) {
        console.error('❌ Telegram fetch error:', e)
        return false
    }
}

export function clientWelcomeTg(params: {
    fullName: string
    phone: string
    clientUrl: string
}) {
    return `🎉 <b>Добро пожаловать в программу лояльности!</b>

👤 <b>${params.fullName}</b>
📱 ${params.phone}

💰 Ваш стартовый баланс: <b>0 бонусов</b>

🔗 Ваша персональная страница:
${params.clientUrl}`
}

export function bonusOperationTg(params: {
    fullName: string
    type: 'CREDIT' | 'DEBIT'
    amount: number
    balanceAfter: number
    comment?: string | null
    clientUrl: string
}) {
    const isCredit = params.type === 'CREDIT'
    const icon = isCredit ? '✅' : '➖'
    const sign = isCredit ? '+' : '−'
    return `${icon} <b>${isCredit ? 'Начислено' : 'Списано'}: ${sign}${params.amount} бонусов</b>

👤 ${params.fullName}
${params.comment ? `💬 ${params.comment}\n` : ''}
💰 Текущий баланс: <b>${params.balanceAfter} бонусов</b>

🔗 ${params.clientUrl}`
}

export function staffWelcomeTg(params: {
    name: string
    email: string
    password: string
    role: string
    loginUrl: string
}) {
    return `🔑 <b>Ваш аккаунт создан</b>

👤 ${params.name}
🎭 Роль: ${params.role === 'CASHIER' ? 'Кассир' : 'Администратор'}

📧 Email: <code>${params.email}</code>
🔒 Пароль: <code>${params.password}</code>

🔗 Войти: ${params.loginUrl}`
}

export function getTelegramBotLink(token: string) {
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'loyalty_notify_bot'
    return `https://t.me/${botUsername}?start=${token}`
}