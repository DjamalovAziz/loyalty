import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
})

export async function sendEmail(to: string, subject: string, html: string) {
    try {
        await transporter.sendMail({
            from: `"Программа лояльности" <${process.env.GMAIL_USER}>`,
            to,
            subject,
            html,
        })
        console.log(`✅ Email отправлен: ${to}`)
        return true
    } catch (e) {
        console.error(`❌ Ошибка отправки email:`, e)
        return false
    }
}

export function clientWelcomeEmail(params: {
    fullName: string
    phone: string
    balance: number
    clientUrl: string
}) {
    return {
        subject: 'Добро пожаловать в программу лояльности!',
        html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#4f46e5">Программа лояльности</h2>
        <p>Здравствуйте, <strong>${params.fullName}</strong>!</p>
        <p>Вы зарегистрированы в программе лояльности.</p>
        <div style="background:#f3f4f6;border-radius:12px;padding:16px;margin:16px 0">
          <p style="margin:0 0 4px;color:#6b7280;font-size:13px">Телефон</p>
          <p style="margin:0;font-weight:600">${params.phone}</p>
        </div>
        <div style="background:#eef2ff;border-radius:12px;padding:16px;margin:16px 0">
          <p style="margin:0 0 4px;color:#6b7280;font-size:13px">Текущий баланс</p>
          <p style="margin:0;font-size:24px;font-weight:700;color:#4f46e5">${params.balance} бонусов</p>
        </div>
        <a href="${params.clientUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
          Посмотреть мою страницу
        </a>
      </div>
    `,
    }
}

export function bonusOperationEmail(params: {
    fullName: string
    type: 'CREDIT' | 'DEBIT'
    amount: number
    balanceAfter: number
    comment?: string | null
    clientUrl: string
}) {
    const isCredit = params.type === 'CREDIT'
    return {
        subject: isCredit ? `+${params.amount} бонусов начислено` : `-${params.amount} бонусов списано`,
        html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#4f46e5">Программа лояльности</h2>
        <p>Здравствуйте, <strong>${params.fullName}</strong>!</p>
        <div style="background:${isCredit ? '#f0fdf4' : '#fef2f2'};border-radius:12px;padding:16px;margin:16px 0;border-left:4px solid ${isCredit ? '#22c55e' : '#ef4444'}">
          <p style="margin:0 0 4px;color:#6b7280;font-size:13px">${isCredit ? 'Начислено' : 'Списано'}</p>
          <p style="margin:0;font-size:28px;font-weight:700;color:${isCredit ? '#16a34a' : '#dc2626'}">
            ${isCredit ? '+' : '−'}${params.amount} бонусов
          </p>
          ${params.comment ? `<p style="margin:8px 0 0;color:#6b7280;font-size:13px">${params.comment}</p>` : ''}
        </div>
        <div style="background:#f3f4f6;border-radius:12px;padding:16px;margin:16px 0">
          <p style="margin:0 0 4px;color:#6b7280;font-size:13px">Текущий баланс</p>
          <p style="margin:0;font-size:20px;font-weight:700">${params.balanceAfter} бонусов</p>
        </div>
        <a href="${params.clientUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
          Посмотреть историю
        </a>
      </div>
    `,
    }
}

export function staffWelcomeEmail(params: {
    name: string
    email: string
    password: string
    role: string
    loginUrl: string
}) {
    return {
        subject: 'Ваш аккаунт в программе лояльности создан',
        html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#4f46e5">Программа лояльности</h2>
        <p>Здравствуйте, <strong>${params.name}</strong>!</p>
        <p>Для вас создан аккаунт <strong>${params.role === 'CASHIER' ? 'кассира' : 'администратора'}</strong>.</p>
        <div style="background:#f3f4f6;border-radius:12px;padding:16px;margin:16px 0">
          <p style="margin:0 0 8px;color:#6b7280;font-size:13px">Данные для входа:</p>
          <p style="margin:0 0 4px"><strong>Email:</strong> ${params.email}</p>
          <p style="margin:0"><strong>Пароль:</strong> ${params.password}</p>
        </div>
        <a href="${params.loginUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
          Войти в систему
        </a>
      </div>
    `,
    }
}